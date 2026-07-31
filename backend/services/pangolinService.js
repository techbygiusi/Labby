const axios = require('axios');
const http = require('http');
const https = require('https');
const { all, run } = require('../config/database');
const { encrypt, decrypt } = require('./cryptoService');
const { AppError } = require('../middleware/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

const RAW_PORT_MIN = 20000;
const RAW_PORT_MAX = 26000;
const RAW_PORT_POLICY = `${RAW_PORT_MIN}-${RAW_PORT_MAX}`;
const HTTP_PORT_POLICY = '80,443,3000-9999';

const SETTING_KEYS = {
  enabled: 'pangolin_enabled',
  apiUrl: 'pangolin_api_url',
  apiKey: 'pangolin_api_key',
  orgId: 'pangolin_org_id',
  siteId: 'pangolin_site_id',
  domainId: 'pangolin_domain_id',
  baseDomain: 'pangolin_base_domain',
  httpEnabled: 'pangolin_http_enabled',
  tcpEnabled: 'pangolin_tcp_enabled',
  udpEnabled: 'pangolin_udp_enabled',
  allowedHttpPorts: 'pangolin_allowed_http_ports',
  allowedTcpPorts: 'pangolin_allowed_tcp_ports',
  allowedUdpPorts: 'pangolin_allowed_udp_ports',
  defaultTargetMethod: 'pangolin_default_target_method',
  reservedSubdomains: 'pangolin_reserved_subdomains'
};

const DEFAULTS = {
  enabled: false,
  apiUrl: '',
  apiKey: '',
  orgId: '',
  siteId: '',
  domainId: '',
  baseDomain: '',
  httpEnabled: true,
  tcpEnabled: true,
  udpEnabled: true,
  allowedHttpPorts: HTTP_PORT_POLICY,
  allowedTcpPorts: RAW_PORT_POLICY,
  allowedUdpPorts: RAW_PORT_POLICY,
  defaultTargetMethod: 'http',
  reservedSubdomains: 'www,api,admin,pangolin,pangolin-api,portal'
};

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function normalizeApiUrl(value) {
  let url = String(value || '').trim().replace(/\/+$/, '');
  url = url.replace(/\/v1\/docs\/?$/i, '/v1').replace(/\/v1\/openapi\.(json|yaml)$/i, '/v1');
  if (url && !/\/v1$/i.test(url)) url += '/v1';
  return url;
}

function normalizeBaseDomain(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
}

function normalizePortPolicy(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(\d{1,5})(?:-(\d{1,5}))?$/);
      if (!match) throw new AppError(`Invalid port entry: ${part}`, HTTP_STATUS.BAD_REQUEST);
      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : start;
      if (start < 1 || start > 65535 || end < 1 || end > 65535 || start > end) {
        throw new AppError(`Invalid port range: ${part}`, HTTP_STATUS.BAD_REQUEST);
      }
      return start === end ? String(start) : `${start}-${end}`;
    });
  return [...new Set(normalized)].join(',');
}

function parsePortPolicy(value) {
  const normalized = normalizePortPolicy(value);
  if (!normalized) return [];
  return normalized.split(',').map((part) => {
    const [start, end] = part.split('-').map(Number);
    return { start, end: end || start };
  });
}

function compactPortPolicy(value) {
  const ranges = parsePortPolicy(value);
  return ranges
    .filter((range, index) => {
      if (range.start !== range.end) return true;
      return !ranges.some((other, otherIndex) =>
        otherIndex !== index && other.start <= range.start && other.end >= range.end
      );
    })
    .map((range) => range.start === range.end ? String(range.start) : `${range.start}-${range.end}`)
    .join(',');
}

function isPortAllowed(port, policy) {
  const value = Number(port);
  if (!Number.isInteger(value) || value < 1 || value > 65535) return false;
  return parsePortPolicy(policy).some((range) => value >= range.start && value <= range.end);
}

function validateRawPortPolicy(protocol, policy) {
  if (!policy) return;
  const outsidePool = parsePortPolicy(policy).some((range) => range.start < RAW_PORT_MIN || range.end > RAW_PORT_MAX);
  if (outsidePool) {
    throw new AppError(`${protocol.toUpperCase()} port ranges must stay within ${RAW_PORT_MIN}-${RAW_PORT_MAX}`, HTTP_STATUS.BAD_REQUEST);
  }
}

function assertRawPort(port, protocol) {
  const value = Number(port);
  if (!Number.isInteger(value) || value < RAW_PORT_MIN || value > RAW_PORT_MAX) {
    throw new AppError(`Public ${protocol.toUpperCase()} ports must be between ${RAW_PORT_MIN} and ${RAW_PORT_MAX}`, HTTP_STATUS.FORBIDDEN);
  }
}

function normalizeSubdomain(value) {
  const subdomain = String(value || '').trim().toLowerCase();
  if (!subdomain) {
    throw new AppError('Subdomain is required', HTTP_STATUS.BAD_REQUEST);
  }
  if (subdomain.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
    throw new AppError('Subdomain may only contain lowercase letters, numbers and hyphens', HTTP_STATUS.BAD_REQUEST);
  }
  return subdomain;
}

function extractCollection(payload, keys = []) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  if (data && typeof data === 'object') {
    const firstArray = Object.values(data).find(Array.isArray);
    if (firstArray) return firstArray;
  }
  return [];
}

async function readSettingRows() {
  const values = Object.values(SETTING_KEYS);
  const placeholders = values.map(() => '?').join(',');
  const rows = await all(`SELECT key, value FROM settings WHERE key IN (${placeholders})`, values);
  return rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

function configFromRows(rows = {}) {
  const storedHttpPolicy = String(rows[SETTING_KEYS.allowedHttpPorts] ?? '').trim();
  const storedTcpPolicy = String(rows[SETTING_KEYS.allowedTcpPorts] ?? '').trim();
  const storedUdpPolicy = String(rows[SETTING_KEYS.allowedUdpPorts] ?? '').trim();
  const legacyPreparedRawState = !storedTcpPolicy && !storedUdpPolicy;

  return {
    enabled: toBoolean(rows[SETTING_KEYS.enabled], DEFAULTS.enabled),
    apiUrl: normalizeApiUrl(rows[SETTING_KEYS.apiUrl] ?? DEFAULTS.apiUrl),
    apiKey: decrypt(rows[SETTING_KEYS.apiKey] || ''),
    orgId: String(rows[SETTING_KEYS.orgId] ?? DEFAULTS.orgId).trim(),
    siteId: String(rows[SETTING_KEYS.siteId] ?? DEFAULTS.siteId).trim(),
    domainId: String(rows[SETTING_KEYS.domainId] ?? DEFAULTS.domainId).trim(),
    baseDomain: normalizeBaseDomain(rows[SETTING_KEYS.baseDomain] ?? DEFAULTS.baseDomain),
    httpEnabled: toBoolean(rows[SETTING_KEYS.httpEnabled], DEFAULTS.httpEnabled),
    // v3.1.49: turn the previous empty "prepared" raw state into the active fixed pool.
    tcpEnabled: legacyPreparedRawState ? true : toBoolean(rows[SETTING_KEYS.tcpEnabled], DEFAULTS.tcpEnabled),
    udpEnabled: legacyPreparedRawState ? true : toBoolean(rows[SETTING_KEYS.udpEnabled], DEFAULTS.udpEnabled),
    // Remove redundant single-port entries already covered by a configured range.
    allowedHttpPorts: storedHttpPolicy ? compactPortPolicy(storedHttpPolicy) : DEFAULTS.allowedHttpPorts,
    allowedTcpPorts: storedTcpPolicy || DEFAULTS.allowedTcpPorts,
    allowedUdpPorts: storedUdpPolicy || DEFAULTS.allowedUdpPorts,
    defaultTargetMethod: ['http', 'https', 'h2c'].includes(String(rows[SETTING_KEYS.defaultTargetMethod] || '').toLowerCase())
      ? String(rows[SETTING_KEYS.defaultTargetMethod]).toLowerCase()
      : DEFAULTS.defaultTargetMethod,
    reservedSubdomains: String(rows[SETTING_KEYS.reservedSubdomains] ?? DEFAULTS.reservedSubdomains)
  };
}

async function getPangolinConfig() {
  return configFromRows(await readSettingRows());
}

function mergeInputWithStored(input = {}, stored = DEFAULTS) {
  const submittedKey = String(input.apiKey || '').trim();
  const apiKey = !submittedKey || submittedKey === '***hidden***' ? stored.apiKey : submittedKey;
  return {
    enabled: toBoolean(input.enabled, stored.enabled),
    apiUrl: normalizeApiUrl(input.apiUrl ?? stored.apiUrl),
    apiKey,
    orgId: String(input.orgId ?? stored.orgId ?? '').trim(),
    siteId: String(input.siteId ?? stored.siteId ?? '').trim(),
    domainId: String(input.domainId ?? stored.domainId ?? '').trim(),
    baseDomain: normalizeBaseDomain(input.baseDomain ?? stored.baseDomain),
    httpEnabled: toBoolean(input.httpEnabled, stored.httpEnabled),
    tcpEnabled: toBoolean(input.tcpEnabled, stored.tcpEnabled),
    udpEnabled: toBoolean(input.udpEnabled, stored.udpEnabled),
    allowedHttpPorts: normalizePortPolicy(input.allowedHttpPorts ?? stored.allowedHttpPorts),
    allowedTcpPorts: normalizePortPolicy(input.allowedTcpPorts ?? stored.allowedTcpPorts),
    allowedUdpPorts: normalizePortPolicy(input.allowedUdpPorts ?? stored.allowedUdpPorts),
    defaultTargetMethod: ['http', 'https', 'h2c'].includes(String(input.defaultTargetMethod ?? stored.defaultTargetMethod).toLowerCase())
      ? String(input.defaultTargetMethod ?? stored.defaultTargetMethod).toLowerCase()
      : 'http',
    reservedSubdomains: String(input.reservedSubdomains ?? stored.reservedSubdomains ?? '').trim().toLowerCase()
  };
}

function validateConfig(config, { requireSelection = true } = {}) {
  validateRawPortPolicy('tcp', config.allowedTcpPorts);
  validateRawPortPolicy('udp', config.allowedUdpPorts);
  if (!config.apiUrl || !/^https?:\/\//i.test(config.apiUrl)) {
    throw new AppError('Pangolin API URL must start with http:// or https://', HTTP_STATUS.BAD_REQUEST);
  }
  if (!config.apiKey) throw new AppError('Pangolin API key is required', HTTP_STATUS.BAD_REQUEST);
  if (!config.orgId) throw new AppError('Pangolin organization ID is required', HTTP_STATUS.BAD_REQUEST);
  if (requireSelection) {
    if (!/^\d+$/.test(String(config.siteId))) throw new AppError('Pangolin site ID is required', HTTP_STATUS.BAD_REQUEST);
    if (!config.domainId) throw new AppError('Pangolin domain ID is required', HTTP_STATUS.BAD_REQUEST);
    if (!config.baseDomain || !/^[a-z0-9.-]+$/.test(config.baseDomain)) {
      throw new AppError('Pangolin base domain is required', HTTP_STATUS.BAD_REQUEST);
    }
  }
  if (config.httpEnabled && !config.allowedHttpPorts) throw new AppError('Set at least one allowed HTTP port', HTTP_STATUS.BAD_REQUEST);
  if (config.tcpEnabled && !config.allowedTcpPorts) throw new AppError('Set at least one allowed TCP port', HTTP_STATUS.BAD_REQUEST);
  if (config.udpEnabled && !config.allowedUdpPorts) throw new AppError('Set at least one allowed UDP port', HTTP_STATUS.BAD_REQUEST);
  return config;
}

async function savePangolinConfig(input = {}) {
  const stored = await getPangolinConfig();
  const config = mergeInputWithStored(input, stored);
  validateRawPortPolicy('tcp', config.allowedTcpPorts);
  validateRawPortPolicy('udp', config.allowedUdpPorts);
  if (config.enabled) validateConfig(config);

  const entries = [
    [SETTING_KEYS.enabled, config.enabled ? '1' : '0'],
    [SETTING_KEYS.apiUrl, config.apiUrl],
    [SETTING_KEYS.apiKey, config.apiKey ? encrypt(config.apiKey) : ''],
    [SETTING_KEYS.orgId, config.orgId],
    [SETTING_KEYS.siteId, config.siteId],
    [SETTING_KEYS.domainId, config.domainId],
    [SETTING_KEYS.baseDomain, config.baseDomain],
    [SETTING_KEYS.httpEnabled, config.httpEnabled ? '1' : '0'],
    [SETTING_KEYS.tcpEnabled, config.tcpEnabled ? '1' : '0'],
    [SETTING_KEYS.udpEnabled, config.udpEnabled ? '1' : '0'],
    [SETTING_KEYS.allowedHttpPorts, config.allowedHttpPorts],
    [SETTING_KEYS.allowedTcpPorts, config.allowedTcpPorts],
    [SETTING_KEYS.allowedUdpPorts, config.allowedUdpPorts],
    [SETTING_KEYS.defaultTargetMethod, config.defaultTargetMethod],
    [SETTING_KEYS.reservedSubdomains, config.reservedSubdomains]
  ];

  for (const [key, value] of entries) {
    await run(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );
  }
  return config;
}

function publicConfig(config) {
  return {
    enabled: !!config.enabled,
    apiUrl: config.apiUrl,
    apiKey: config.apiKey ? '***hidden***' : '',
    apiKeyConfigured: !!config.apiKey,
    orgId: config.orgId,
    siteId: config.siteId,
    domainId: config.domainId,
    baseDomain: config.baseDomain,
    httpEnabled: !!config.httpEnabled,
    tcpEnabled: !!config.tcpEnabled,
    udpEnabled: !!config.udpEnabled,
    allowedHttpPorts: config.allowedHttpPorts,
    allowedTcpPorts: config.allowedTcpPorts,
    allowedUdpPorts: config.allowedUdpPorts,
    defaultTargetMethod: config.defaultTargetMethod,
    reservedSubdomains: config.reservedSubdomains
  };
}

function createClient(config) {
  validateConfig(config, { requireSelection: false });
  return axios.create({
    baseURL: config.apiUrl,
    timeout: 20000,
    maxRedirects: 5,
    httpAgent: new http.Agent({ keepAlive: true, family: 4 }),
    httpsAgent: new https.Agent({ keepAlive: true, family: 4 }),
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  });
}

function pangolinError(err, fallback = 'Pangolin request failed') {
  const responseData = err?.response?.data;
  const responseMessage = typeof responseData === 'string'
    ? responseData.trim().slice(0, 500)
    : responseData?.message || responseData?.error?.message || responseData?.error;
  const status = err?.response?.status;
  const code = err?.code;
  let message = responseMessage || err?.message || fallback;

  if (!status && code === 'ENOTFOUND') message = 'Pangolin API hostname could not be resolved';
  if (!status && code === 'ECONNREFUSED') message = 'Pangolin API refused the connection';
  if (!status && ['ETIMEDOUT', 'ECONNABORTED'].includes(code)) message = 'Pangolin API connection timed out';
  if (!status && ['SELF_SIGNED_CERT_IN_CHAIN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(code)) {
    message = 'Pangolin API TLS certificate could not be verified';
  }

  const details = [status ? `HTTP ${status}` : '', code || ''].filter(Boolean).join(', ');
  return new AppError(details ? `${message} (${details})` : message, HTTP_STATUS.BAD_GATEWAY);
}

async function request(config, method, url, data) {
  try {
    const response = await createClient(config).request({ method, url, data });
    if (response.data?.success === false || response.data?.error === true) {
      throw new Error(response.data?.message || 'Pangolin returned an error');
    }
    return response.data?.data ?? response.data;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw pangolinError(err);
  }
}

async function discoverPangolin(input = {}) {
  const stored = await getPangolinConfig();
  const config = mergeInputWithStored(input, stored);
  validateConfig(config, { requireSelection: false });
  const [organization, domainsPayload, sitesPayload] = await Promise.all([
    request(config, 'get', `/org/${encodeURIComponent(config.orgId)}`),
    request(config, 'get', `/org/${encodeURIComponent(config.orgId)}/domains?limit=1000&offset=0`),
    request(config, 'get', `/org/${encodeURIComponent(config.orgId)}/sites?pageSize=100&page=1`)
  ]);
  const domains = extractCollection(domainsPayload, ['domains', 'orgDomains']).map((domain) => ({
    id: String(domain.domainId ?? domain.id ?? domain.niceId ?? ''),
    name: domain.baseDomain || domain.domain || domain.name || domain.fullDomain || ''
  })).filter((item) => item.id && item.name);
  const sites = extractCollection(sitesPayload, ['sites']).map((site) => ({
    id: String(site.siteId ?? site.id ?? ''),
    name: site.name || site.niceId || `Site ${site.siteId ?? site.id}`,
    type: site.type || ''
  })).filter((item) => item.id);
  return { organization, domains, sites };
}

async function testPangolinConnection(input = {}) {
  const stored = await getPangolinConfig();
  const config = mergeInputWithStored(input, stored);
  validateConfig(config);

  // Use the Integration API root endpoint for the connection test. This uses
  // the same base URL and Bearer authentication as publication creation, but
  // does not require extra organization catalogue permissions.
  await request(config, 'get', '/');

  return {
    success: true,
    message: 'Pangolin connection successful',
    apiUrl: config.apiUrl
  };
}

function assertPublishingEnabled(config, protocol, targetPort, publicPort = targetPort) {
  if (!Number.isInteger(Number(targetPort)) || Number(targetPort) < 1 || Number(targetPort) > 65535) {
    throw new AppError('Target port must be between 1 and 65535', HTTP_STATUS.BAD_REQUEST);
  }
  if (protocol === 'tcp' || protocol === 'udp') assertRawPort(publicPort, protocol);
  if (!config.enabled) throw new AppError('Public publishing is not configured', HTTP_STATUS.SERVICE_UNAVAILABLE);
  const enabledKey = `${protocol}Enabled`;
  if (!config[enabledKey]) throw new AppError(`${protocol.toUpperCase()} publishing is disabled`, HTTP_STATUS.FORBIDDEN);
  const policy = protocol === 'http' ? config.allowedHttpPorts : protocol === 'tcp' ? config.allowedTcpPorts : config.allowedUdpPorts;
  const policyPort = protocol === 'http' ? targetPort : publicPort;
  if (!isPortAllowed(policyPort, policy)) {
    const label = protocol === 'http' ? 'Port' : 'Public port';
    throw new AppError(`${label} ${policyPort} is outside the allowed ${protocol.toUpperCase()} port ranges`, HTTP_STATUS.FORBIDDEN);
  }
}

function reservedSubdomainSet(config) {
  return new Set(String(config.reservedSubdomains || '').split(/[\s,;]+/).map((item) => item.trim().toLowerCase()).filter(Boolean));
}

async function createPublication(config, input) {
  validateConfig(config);
  const protocol = ['http', 'tcp', 'udp'].includes(input.protocol) ? input.protocol : 'http';
  const targetPort = Number(input.targetPort);
  const publicPort = Number(input.publicPort || targetPort);
  assertPublishingEnabled(config, protocol, targetPort, publicPort);

  const subdomain = normalizeSubdomain(input.subdomain);
  if (reservedSubdomainSet(config).has(subdomain)) {
    throw new AppError('This subdomain is reserved by the administrator', HTTP_STATUS.CONFLICT);
  }

  const resourceBody = protocol === 'http'
    ? {
        name: String(input.name || subdomain).slice(0, 255),
        subdomain,
        domainId: config.domainId,
        mode: 'http',
        stickySession: false
      }
    : {
        name: String(input.name || `${protocol}-${publicPort}`).slice(0, 255),
        mode: protocol,
        proxyPort: publicPort
      };

  const pangolinResource = await request(config, 'put', `/org/${encodeURIComponent(config.orgId)}/resource`, resourceBody);
  const resourceId = Number(pangolinResource?.resourceId ?? pangolinResource?.id);
  if (!resourceId) throw new AppError('Pangolin did not return a resource ID', HTTP_STATUS.BAD_GATEWAY);

  try {
    const targetBody = {
      siteId: Number(config.siteId),
      ip: input.ip,
      mode: protocol,
      port: targetPort,
      enabled: true,
      hcEnabled: false
    };
    if (protocol === 'http') targetBody.method = ['http', 'https', 'h2c'].includes(input.targetMethod) ? input.targetMethod : config.defaultTargetMethod;
    const pangolinTarget = await request(config, 'put', `/resource/${resourceId}/target`, targetBody);
    const targetId = Number(pangolinTarget?.targetId ?? pangolinTarget?.id);
    if (!targetId) throw new Error('Pangolin did not return a target ID');

    return {
      pangolinResourceId: resourceId,
      pangolinTargetId: targetId,
      protocol,
      subdomain,
      publicPort: protocol === 'http' ? 443 : publicPort,
      targetPort,
      targetMethod: protocol === 'http' ? targetBody.method : '',
      publicUrl: protocol === 'http'
        ? `https://${subdomain}.${config.baseDomain}`
        : `${protocol}://${subdomain}.${config.baseDomain}:${publicPort}`
    };
  } catch (err) {
    await request(config, 'delete', `/resource/${resourceId}`).catch(() => {});
    if (err instanceof AppError) throw err;
    throw pangolinError(err, 'Pangolin target creation failed');
  }
}

async function updatePublication(config, publication, input) {
  validateConfig(config);
  const protocol = publication.protocol;
  const targetPort = Number(input.targetPort);
  const publicPort = Number(input.publicPort || publication.public_port || targetPort);
  assertPublishingEnabled(config, protocol, targetPort, publicPort);
  const subdomain = normalizeSubdomain(input.subdomain);
  if (reservedSubdomainSet(config).has(subdomain) && subdomain !== publication.subdomain) {
    throw new AppError('This subdomain is reserved by the administrator', HTTP_STATUS.CONFLICT);
  }

  if (protocol === 'http') {
    await request(config, 'post', `/resource/${publication.pangolin_resource_id}`, {
      name: String(input.name || subdomain).slice(0, 255),
      subdomain,
      domainId: config.domainId,
      ssl: true,
      enabled: true
    });
  } else {
    await request(config, 'post', `/resource/${publication.pangolin_resource_id}`, {
      name: String(input.name || `${protocol}-${publicPort}`).slice(0, 255),
      proxyPort: publicPort,
      enabled: true
    });
  }

  const targetBody = {
    siteId: Number(config.siteId),
    ip: input.ip,
    mode: protocol,
    port: targetPort,
    enabled: true,
    hcEnabled: false
  };
  if (protocol === 'http') targetBody.method = ['http', 'https', 'h2c'].includes(input.targetMethod) ? input.targetMethod : config.defaultTargetMethod;
  await request(config, 'post', `/target/${publication.pangolin_target_id}`, targetBody);

  return {
    pangolinResourceId: Number(publication.pangolin_resource_id),
    pangolinTargetId: Number(publication.pangolin_target_id),
    protocol,
    subdomain,
    publicPort: protocol === 'http' ? 443 : publicPort,
    targetPort,
    targetMethod: protocol === 'http' ? targetBody.method : '',
    publicUrl: protocol === 'http'
      ? `https://${subdomain}.${config.baseDomain}`
      : `${protocol}://${subdomain}.${config.baseDomain}:${publicPort}`
  };
}

async function deletePublication(config, publication) {
  if (!publication) return;
  if (publication.pangolin_target_id) {
    await request(config, 'delete', `/target/${publication.pangolin_target_id}`).catch((err) => {
      if (!/404/.test(err.message)) throw err;
    });
  }
  if (publication.pangolin_resource_id) {
    await request(config, 'delete', `/resource/${publication.pangolin_resource_id}`).catch((err) => {
      if (!/404/.test(err.message)) throw err;
    });
  }
}

module.exports = {
  DEFAULTS,
  SETTING_KEYS,
  RAW_PORT_MIN,
  RAW_PORT_MAX,
  RAW_PORT_POLICY,
  getPangolinConfig,
  savePangolinConfig,
  publicConfig,
  mergeInputWithStored,
  validateConfig,
  testPangolinConnection,
  discoverPangolin,
  normalizePortPolicy,
  parsePortPolicy,
  isPortAllowed,
  validateRawPortPolicy,
  assertRawPort,
  normalizeSubdomain,
  createPublication,
  updatePublication,
  deletePublication
};
