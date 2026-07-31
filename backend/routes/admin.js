const express = require('express');
const net = require('net');
const bcryptjs = require('bcryptjs');
const router = express.Router();

const { get, run, all } = require('../config/database');
const { adminMiddleware } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { HTTP_STATUS, ROLES } = require('../config/constants');
const { getClusterResources, testConnection, getCapabilities, getClusterFirewallStatus, getOnlineNodes, getNodeTemplates, getNodeIsos, getNodeStorages, getClusterDashboardStats } = require('../services/proxmoxService');
const { enrichResources } = require('../services/resourceService');
const { sendEmail, testSmtpConnection, initializeEmailService, encryptString, decryptString } = require('../services/emailService');
const { welcomeTemplate, maintenanceTemplate, testMailTemplate } = require('../services/emailTemplates');
const { encrypt, decrypt } = require('../services/cryptoService');
const { logAudit } = require('../services/auditService');
const { getPublicFrontendUrl } = require('../utils/publicUrl');
const {
  getPangolinConfig,
  savePangolinConfig,
  publicConfig: getPublicPangolinConfig,
  testPangolinConnection,
  discoverPangolin,
  deletePublication
} = require('../services/pangolinService');
const { syncClusterTemplates, ensureClusterTemplates, listClusterTemplates } = require('../services/templateService');

router.use(adminMiddleware);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function validateRole(role) {
  if (!Object.values(ROLES).includes(role)) {
    throw new AppError('Invalid role', HTTP_STATUS.BAD_REQUEST);
  }
}

function validatePassword(password, required = true) {
  if (!password && !required) return;
  if (!password || String(password).length < 8) {
    throw new AppError('Password must be at least 8 characters', HTTP_STATUS.BAD_REQUEST);
  }
}

function validateSmtp({ smtpHost, smtpPort, smtpUser, smtpPassword }, passwordRequired = true) {
  if (!smtpHost || !smtpPort || !smtpUser || (passwordRequired && !smtpPassword)) {
    throw new AppError('SMTP host, port, user, and password are required', HTTP_STATUS.BAD_REQUEST);
  }

  const parsedPort = Number(smtpPort);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new AppError('SMTP port is invalid', HTTP_STATUS.BAD_REQUEST);
  }
}

async function getStoredSmtpSettings() {
  const rows = await all(
    "SELECT key, value FROM settings WHERE key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_password')"
  );

  return rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

function resolveSmtpSettings(input, stored = {}) {
  const providedPassword = String(input.smtpPassword || '').trim();
  const shouldUseStoredPassword = !providedPassword || providedPassword === '***hidden***';

  return {
    smtpHost: String(input.smtpHost || stored.smtp_host || '').trim(),
    smtpPort: String(input.smtpPort || stored.smtp_port || '').trim(),
    smtpUser: String(input.smtpUser || stored.smtp_user || '').trim(),
    smtpPassword: shouldUseStoredPassword ? decryptString(stored.smtp_password || '') : input.smtpPassword
  };
}

function validateWebUrl(webUrl, label = 'Link') {
  if (!webUrl) return '';
  const normalized = String(webUrl).trim();
  if (!/^https?:\/\//i.test(normalized)) {
    throw new AppError(`${label} must start with http:// or https://`, HTTP_STATUS.BAD_REQUEST);
  }
  return normalized;
}

function normalizeManualIpv4(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (net.isIP(normalized) !== 4) {
    throw new AppError('The service IP must be a valid IPv4 address', HTTP_STATUS.BAD_REQUEST);
  }
  return normalized;
}

function normalizeSshPort(value) {
  const port = value === '' || value === null || value === undefined ? 22 : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new AppError('The SSH port must be between 1 and 65535', HTTP_STATUS.BAD_REQUEST);
  }
  return port;
}

function normalizeClusterLocation(input = {}) {
  const label = String(input.locationLabel || input.location_label || '').trim();
  const latRaw = input.locationLat ?? input.location_lat;
  const lonRaw = input.locationLon ?? input.location_lon;
  const lat = latRaw === '' || latRaw === null || latRaw === undefined ? null : Number(latRaw);
  const lon = lonRaw === '' || lonRaw === null || lonRaw === undefined ? null : Number(lonRaw);

  if (!label) {
    return { locationLabel: '', locationLat: null, locationLon: null };
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new AppError('Please select a valid location from the search results', HTTP_STATUS.BAD_REQUEST);
  }
  return {
    locationLabel: label,
    locationLat: lat,
    locationLon: lon
  };
}

async function searchLocations(query) {
  const search = String(query || '').trim();
  if (!search || search.length < 3) return [];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', search);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '5');

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Hosting-Portal/3.1.0 (TechByGiusi)',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new AppError('Location search failed', HTTP_STATUS.BAD_GATEWAY);
  }

  const results = await response.json();
  return (Array.isArray(results) ? results : []).map(item => ({
    label: item.display_name,
    lat: Number(item.lat),
    lon: Number(item.lon)
  })).filter(item => item.label && Number.isFinite(item.lat) && Number.isFinite(item.lon));
}

async function resolveClusterTestData(input) {
  const clusterId = input.clusterId || input.id;
  if (clusterId) {
    const cluster = await get('SELECT * FROM proxmox_clusters WHERE id = ?', [clusterId]);
    if (!cluster) throw new AppError('Cluster not found', HTTP_STATUS.NOT_FOUND);

    return {
      url: normalizeUrl(input.url || cluster.url),
      apiToken: String(input.apiToken || decrypt(cluster.api_token) || '').trim()
    };
  }

  return {
    url: normalizeUrl(input.url),
    apiToken: String(input.apiToken || '').trim()
  };
}


async function getResourceOwnership(resourceId) {
  const row = await get(`
    SELECT
      r.id,
      r.user_id,
      pm.id AS provisioned_id,
      pm.user_id AS provisioned_user_id
    FROM resources r
    LEFT JOIN provisioned_machines pm
      ON pm.cluster_id = r.cluster_id
     AND CAST(pm.vmid AS TEXT) = CAST(r.container_id AS TEXT)
    WHERE r.id = ?
  `, [resourceId]);

  if (!row) return null;

  return {
    exists: true,
    isSelfService: !!row.provisioned_id && String(row.provisioned_user_id || '') === String(row.user_id || '')
  };
}

async function assertResourceEditableByAdmin(resourceId, action = 'bearbeitet') {
  const ownership = await getResourceOwnership(resourceId);
  if (!ownership) throw new AppError('Resource not found', HTTP_STATUS.NOT_FOUND);
  if (ownership.isSelfService) {
    throw new AppError(`Benutzerverwaltete Dienste können vom Admin nicht ${action} werden`, HTTP_STATUS.FORBIDDEN);
  }
  return ownership;
}

async function getResourceRows(where = '', params = []) {
  return all(`
    SELECT
      r.*,
      pc.name as cluster_name,
      pc.url as cluster_url,
      pc.api_token,
      u.name as user_name,
      u.email as user_email,
      cg.name as group_name,
      pm.id as provisioned_id,
      pm.ip as provisioned_ip,
      pm.source_template as provisioned_template,
      pm.user_id as provisioned_user_id
    FROM resources r
    JOIN proxmox_clusters pc ON r.cluster_id = pc.id
    JOIN users u ON r.user_id = u.id
    LEFT JOIN customer_groups cg ON r.group_id = cg.id
    LEFT JOIN provisioned_machines pm ON pm.cluster_id = r.cluster_id AND CAST(pm.vmid AS TEXT) = CAST(r.container_id AS TEXT)
    ${where}
    ORDER BY r.created_at DESC
  `, params);
}

router.get('/users', async (req, res, next) => {
  try {
    const users = await all('SELECT id, email, name, role, preferred_language, created_at FROM users ORDER BY created_at DESC');
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.post('/users', async (req, res, next) => {
  try {
    const { email, name, password, role = ROLES.USER, sendWelcome = false, preferredLanguage = 'en' } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !name) {
      throw new AppError('Email and name are required', HTTP_STATUS.BAD_REQUEST);
    }

    validateRole(role);
    validatePassword(password, true);

    const passwordHash = await bcryptjs.hash(password, 12);
    const result = await run(
      'INSERT INTO users (email, name, password_hash, role, preferred_language) VALUES (?, ?, ?, ?, ?)',
      [normalizedEmail, String(name).trim(), passwordHash, role, ['de', 'en'].includes(String(preferredLanguage).toLowerCase()) ? String(preferredLanguage).toLowerCase() : 'en']
    );

    await logAudit(req, 'admin.user_created', normalizedEmail);

    if (sendWelcome) {
      const template = welcomeTemplate({
        name: String(name).trim(),
        email: normalizedEmail,
        loginUrl: getPublicFrontendUrl(req),
        language: ['de', 'en'].includes(String(preferredLanguage).toLowerCase()) ? String(preferredLanguage).toLowerCase() : 'en'
      });
      sendEmail(normalizedEmail, template.subject, template.text, template.html)
        .catch(err => console.error('Welcome mail failed:', err.message));
    }

    res.status(HTTP_STATUS.CREATED).json({
      user: {
        id: result.lastID,
        email: normalizedEmail,
        name: String(name).trim(),
        role,
        preferredLanguage: ['de', 'en'].includes(String(preferredLanguage).toLowerCase()) ? String(preferredLanguage).toLowerCase() : 'en'
      }
    });
  } catch (err) {
    next(err);
  }
});

router.put('/users/:id', async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { email, name, role, password } = req.body;

    const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    if (role) validateRole(role);
    if (password) validatePassword(password, false);

    const updates = [];
    const params = [];

    if (email !== undefined) {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) throw new AppError('Email and name are required', HTTP_STATUS.BAD_REQUEST);
      updates.push('email = ?');
      params.push(normalizedEmail);
    }

    if (name !== undefined) {
      const cleanName = String(name || '').trim();
      if (!cleanName) throw new AppError('Email and name are required', HTTP_STATUS.BAD_REQUEST);
      updates.push('name = ?');
      params.push(cleanName);
    }

    if (role) {
      updates.push('role = ?');
      params.push(role);
    }

    if (password) {
      const passwordHash = await bcryptjs.hash(password, 12);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(userId);
      await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const updated = await get('SELECT id, email, name, role, preferred_language, created_at FROM users WHERE id = ?', [userId]);
    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await get('SELECT * FROM users WHERE id = ?', [userId]);

    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    if (user.id === req.user.id) {
      throw new AppError('Cannot delete your own account', HTTP_STATUS.BAD_REQUEST);
    }

    await run('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
});


router.get('/geocode', async (req, res, next) => {
  try {
    const results = await searchLocations(req.query.q || '');
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

router.get('/clusters', async (req, res, next) => {
  try {
    const clusters = await all(`
      SELECT id, name, url, created_at,
             allow_provisioning, allow_publishing, allow_types, vmid_min, vmid_max, ip_start, ip_end, ip_prefix,
             gateway, bridge, storage, template_storage, iso_storage, max_cores, max_memory_mb, max_disk_gb,
             location_label, location_lat, location_lon
      FROM proxmox_clusters ORDER BY created_at DESC
    `);
    res.json({ clusters });
  } catch (err) {
    next(err);
  }
});

router.get('/cluster-stats', async (req, res, next) => {
  try {
    const clusters = await all('SELECT id, name, url, api_token, location_label, location_lat, location_lon FROM proxmox_clusters ORDER BY created_at DESC');
    const settled = await Promise.allSettled(clusters.map(async (cluster) => {
      const stats = await getClusterDashboardStats(normalizeUrl(cluster.url), decrypt(cluster.api_token));
      return {
        id: cluster.id,
        name: cluster.name,
        url: cluster.url,
        location_label: cluster.location_label || '',
        location_lat: cluster.location_lat,
        location_lon: cluster.location_lon,
        ...stats
      };
    }));

    const clusterStats = settled.map((result, index) => {
      const cluster = clusters[index];
      if (result.status === 'fulfilled') return result.value;
      return {
        id: cluster.id,
        name: cluster.name,
        url: cluster.url,
        location_label: cluster.location_label || '',
        location_lat: cluster.location_lat,
        location_lon: cluster.location_lon,
        nodes: [],
        totals: { nodes: 0, online: 0, cpuPercent: 0, mem: 0, maxmem: 0, memPercent: 0, rootUsed: 0, rootTotal: 0, rootPercent: 0, storageUsed: 0, storageTotal: 0, storagePercent: 0 },
        error: result.reason?.message || 'Cluster status unavailable'
      };
    });

    res.json({ clusters: clusterStats });
  } catch (err) {
    next(err);
  }
});

router.post('/clusters', async (req, res, next) => {
  try {
    const { name, url, apiToken } = req.body;
    const normalizedUrl = normalizeUrl(url);
    const location = normalizeClusterLocation(req.body || {});

    if (!name || !normalizedUrl || !apiToken) {
      throw new AppError('Name, URL, and API token are required', HTTP_STATUS.BAD_REQUEST);
    }

    const testResult = await testConnection(normalizedUrl, String(apiToken).trim());
    if (!testResult.success) {
      throw new AppError(`Failed to connect to Proxmox: ${testResult.message}`, HTTP_STATUS.BAD_REQUEST);
    }

    const allowProvisioning = req.body.allowProvisioning ? 1 : 0;
    const allowPublishing = req.body.allowPublishing !== undefined ? (req.body.allowPublishing ? 1 : 0) : 1;

    const result = await run(
      'INSERT INTO proxmox_clusters (name, url, api_token, allow_provisioning, allow_publishing, location_label, location_lat, location_lon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [String(name).trim(), normalizedUrl, encrypt(String(apiToken).trim()), allowProvisioning, allowPublishing, location.locationLabel || null, location.locationLat, location.locationLon]
    );

    await logAudit(req, 'cluster.create', `cluster:${result.lastID}`, String(name).trim());

    res.status(HTTP_STATUS.CREATED).json({
      cluster: {
        id: result.lastID,
        name: String(name).trim(),
        url: normalizedUrl,
        location_label: location.locationLabel || '',
        location_lat: location.locationLat,
        location_lon: location.locationLon,
        allow_publishing: allowPublishing
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Provisioning config is separated from the base cluster form.
 * It lives under Settings and is edited via PUT /clusters/:id/provisioning.
 */
function safeParseList(json) {
  try {
    const parsed = JSON.parse(json || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function normalizeProvisioning(body, existing = {}) {
  const toInt = (value, fallback = null) => {
    const parsed = parseInt(value, 10);
    return Number.isInteger(parsed) ? parsed : fallback;
  };
  const isIp = (value) => /^(\d{1,3}\.){3}\d{1,3}$/.test(String(value || '').trim());

  const allowProvisioning = (body.allowProvisioning ?? existing.allow_provisioning) ? 1 : 0;
  // Self-service is intentionally limited to LXC containers. VM creation
  // remains an admin-only task in Proxmox.
  const allowTypes = 'ct';

  const vmidMin = toInt(body.vmidMin ?? existing.vmid_min);
  const vmidMax = toInt(body.vmidMax ?? existing.vmid_max);
  const ipStart = body.ipStart ?? existing.ip_start;
  const ipEnd = body.ipEnd ?? existing.ip_end;
  const gateway = body.gateway ?? existing.gateway;

  if (allowProvisioning) {
    if (!vmidMin || !vmidMax || vmidMin < 100 || vmidMax < vmidMin) {
      throw new AppError('VMID range is invalid', HTTP_STATUS.BAD_REQUEST);
    }
    if (!isIp(ipStart) || !isIp(ipEnd) || !isIp(gateway)) {
      throw new AppError('IP range or gateway is invalid', HTTP_STATUS.BAD_REQUEST);
    }
  }

  const toJsonList = (value, fallbackJson) => {
    if (value === undefined) return fallbackJson ?? null;
    if (!Array.isArray(value)) return fallbackJson ?? null;
    const clean = value.map(v => String(v)).filter(Boolean);
    return clean.length ? JSON.stringify(clean) : null;
  };

  const allowedTemplates = toJsonList(body.allowedTemplates, existing.allowed_templates ?? null);
  if (allowProvisioning && !allowedTemplates) {
    throw new AppError('At least one template must be allowed', HTTP_STATUS.BAD_REQUEST);
  }

  return {
    allowProvisioning,
    allowTypes,
    vmidMin,
    vmidMax,
    ipStart: isIp(ipStart) ? String(ipStart).trim() : null,
    ipEnd: isIp(ipEnd) ? String(ipEnd).trim() : null,
    ipPrefix: Math.min(Math.max(toInt(body.ipPrefix ?? existing.ip_prefix, 24), 8), 32),
    gateway: isIp(gateway) ? String(gateway).trim() : null,
    bridge: String(body.bridge ?? existing.bridge ?? 'vmbr0').trim(),
    storage: String(body.storage ?? existing.storage ?? 'local').trim(),
    templateStorage: String(body.templateStorage ?? existing.template_storage ?? 'local').trim(),
    isoStorage: String(existing.iso_storage ?? 'local').trim(),
    allowedTemplates,
    allowedIsos: null,
    maxCores: Math.min(Math.max(toInt(body.maxCores ?? existing.max_cores, 2), 1), 64),
    maxMemoryMb: Math.min(Math.max(toInt(body.maxMemoryMb ?? existing.max_memory_mb, 2048), 256), 262144),
    maxDiskGb: Math.min(Math.max(toInt(body.maxDiskGb ?? existing.max_disk_gb, 20), 4), 64)
  };
}

router.put('/clusters/:id', async (req, res, next) => {
  try {
    const clusterId = req.params.id;
    const { name, url, apiToken } = req.body;
    const cluster = await get('SELECT * FROM proxmox_clusters WHERE id = ?', [clusterId]);

    if (!cluster) {
      throw new AppError('Cluster not found', HTTP_STATUS.NOT_FOUND);
    }

    const nextName = String(name || cluster.name).trim();
    const nextUrl = normalizeUrl(url || cluster.url);
    const nextToken = String(apiToken || decrypt(cluster.api_token)).trim();
    const location = normalizeClusterLocation({
      locationLabel: req.body.locationLabel !== undefined ? req.body.locationLabel : cluster.location_label,
      locationLat: req.body.locationLat !== undefined ? req.body.locationLat : cluster.location_lat,
      locationLon: req.body.locationLon !== undefined ? req.body.locationLon : cluster.location_lon
    });

    if (!nextName || !nextUrl || !nextToken) {
      throw new AppError('Name, URL, and API token are required', HTTP_STATUS.BAD_REQUEST);
    }

    const connectionChanged = nextUrl !== normalizeUrl(cluster.url) || !!String(apiToken || '').trim();
    if (connectionChanged) {
      const testResult = await testConnection(nextUrl, nextToken);
      if (!testResult.success) {
        throw new AppError(`Failed to connect to Proxmox: ${testResult.message}`, HTTP_STATUS.BAD_REQUEST);
      }
    }

    // Toggle-only changes, including publishing, remain possible while a cluster is temporarily offline.
    // Detailed provisioning config is managed under Settings.
    const allowProvisioning = req.body.allowProvisioning !== undefined
      ? (req.body.allowProvisioning ? 1 : 0)
      : cluster.allow_provisioning;
    const allowPublishing = req.body.allowPublishing !== undefined
      ? (req.body.allowPublishing ? 1 : 0)
      : Number(cluster.allow_publishing ?? 1);

    await run(
      'UPDATE proxmox_clusters SET name = ?, url = ?, api_token = ?, allow_provisioning = ?, allow_publishing = ?, location_label = ?, location_lat = ?, location_lon = ? WHERE id = ?',
      [nextName, nextUrl, encrypt(nextToken), allowProvisioning, allowPublishing, location.locationLabel || null, location.locationLat, location.locationLon, clusterId]
    );

    await logAudit(req, 'cluster.update', `cluster:${clusterId}`, `${nextName}; publishing=${allowPublishing ? 'enabled' : 'disabled'}`);
    res.json({ cluster: { id: Number(clusterId), name: nextName, url: nextUrl, location_label: location.locationLabel || '', location_lat: location.locationLat, location_lon: location.locationLon, allow_publishing: allowPublishing } });
  } catch (err) {
    next(err);
  }
});

/**
 * Full provisioning config for a cluster (Settings → Self-Service).
 */
router.get('/clusters/:id/provisioning', async (req, res, next) => {
  try {
    const cluster = await get('SELECT * FROM proxmox_clusters WHERE id = ?', [req.params.id]);
    if (!cluster) throw new AppError('Cluster not found', HTTP_STATUS.NOT_FOUND);

    res.json({
      provisioning: {
        allowProvisioning: !!cluster.allow_provisioning,
        allowTypes: 'ct',
        vmidMin: cluster.vmid_min ?? '',
        vmidMax: cluster.vmid_max ?? '',
        ipStart: cluster.ip_start || '',
        ipEnd: cluster.ip_end || '',
        ipPrefix: cluster.ip_prefix ?? 24,
        gateway: cluster.gateway || '',
        bridge: cluster.bridge || 'vmbr0',
        storage: cluster.storage || 'local',
        templateStorage: cluster.template_storage || 'local',
        isoStorage: cluster.iso_storage || 'local',
        allowedTemplates: safeParseList(cluster.allowed_templates),
        allowedIsos: safeParseList(cluster.allowed_isos),
        maxCores: cluster.max_cores ?? 2,
        maxMemoryMb: cluster.max_memory_mb ?? 2048,
        maxDiskGb: Math.min(cluster.max_disk_gb ?? 20, 64)
      }
    });
  } catch (err) {
    next(err);
  }
});

router.put('/clusters/:id/provisioning', async (req, res, next) => {
  try {
    const cluster = await get('SELECT * FROM proxmox_clusters WHERE id = ?', [req.params.id]);
    if (!cluster) throw new AppError('Cluster not found', HTTP_STATUS.NOT_FOUND);

    const provisioning = normalizeProvisioning(req.body, cluster);

    // Only verify live Proxmox prerequisites when self-service is being
    // activated. Existing settings such as approved templates must remain
    // editable while the Datacenter firewall is temporarily disabled. The
    // actual provisioning path performs the same checks again and therefore
    // still fails closed before a container can be created.
    const isEnablingProvisioning = provisioning.allowProvisioning && !cluster.allow_provisioning;

    let effectiveAllowProvisioning = provisioning.allowProvisioning;
    let activationWarning = null;

    if (isEnablingProvisioning) {
      try {
        const apiToken = decrypt(cluster.api_token);
        const capabilities = await getCapabilities(cluster.url, apiToken);
        if (!capabilities.canProvision) {
          throw new AppError('Provisioning is not permitted for this cluster token', HTTP_STATUS.FORBIDDEN);
        }
        if (!capabilities.canManageFirewall) {
          throw new AppError('Provisioning firewall permission is missing', HTTP_STATUS.FORBIDDEN);
        }
        if (!capabilities.canVerifyFirewall) {
          throw new AppError('Provisioning firewall audit permission is missing', HTTP_STATUS.FORBIDDEN);
        }
        const firewallStatus = await getClusterFirewallStatus(cluster.url, apiToken);
        if (!firewallStatus.enabled) {
          throw new AppError('Proxmox datacenter firewall is disabled', HTTP_STATUS.BAD_REQUEST);
        }
        const nodes = await getOnlineNodes(cluster.url, apiToken);
        if (nodes.length === 0) throw new AppError('No online node available', HTTP_STATUS.BAD_REQUEST);
        const liveStorages = await getNodeStorages(cluster.url, apiToken, nodes[0].node);
        const liveStorageNames = liveStorages.map(item => item.storage);
        if (!liveStorageNames.includes(provisioning.storage)) {
          throw new AppError('Disk storage is not available on the selected Proxmox node', HTTP_STATUS.BAD_REQUEST);
        }
      } catch (error) {
        // Preserve the edited settings, but never enable self-service when its
        // live safety prerequisites cannot be verified.
        effectiveAllowProvisioning = 0;
        activationWarning = error instanceof AppError
          ? error.message
          : 'Self-service activation prerequisites could not be verified';
      }
    }

    await run(
      `UPDATE proxmox_clusters SET
        allow_provisioning = ?, allow_types = ?, vmid_min = ?, vmid_max = ?, ip_start = ?, ip_end = ?, ip_prefix = ?,
        gateway = ?, bridge = ?, storage = ?, template_storage = ?, iso_storage = ?, allowed_templates = ?, allowed_isos = ?, max_cores = ?, max_memory_mb = ?, max_disk_gb = ?
      WHERE id = ?`,
      [
        effectiveAllowProvisioning, provisioning.allowTypes, provisioning.vmidMin, provisioning.vmidMax,
        provisioning.ipStart, provisioning.ipEnd, provisioning.ipPrefix,
        provisioning.gateway, provisioning.bridge, provisioning.storage,
        provisioning.templateStorage, provisioning.isoStorage,
        provisioning.allowedTemplates, provisioning.allowedIsos,
        provisioning.maxCores, provisioning.maxMemoryMb, provisioning.maxDiskGb,
        req.params.id
      ]
    );

    // Optional default root password for newly provisioned machines
    if (req.body.defaultPassword !== undefined && req.body.defaultPassword !== '') {
      await run('UPDATE proxmox_clusters SET default_password_encrypted = ? WHERE id = ?',
        [encrypt(String(req.body.defaultPassword)), req.params.id]);
    }

    await logAudit(req, 'cluster.provisioning', `cluster:${req.params.id}`, cluster.name);
    res.json({
      message: 'Provisioning updated',
      allowProvisioning: !!effectiveAllowProvisioning,
      activationWarning
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/clusters/:id', async (req, res, next) => {
  try {
    const clusterId = req.params.id;
    const cluster = await get('SELECT * FROM proxmox_clusters WHERE id = ?', [clusterId]);

    if (!cluster) {
      throw new AppError('Cluster not found', HTTP_STATUS.NOT_FOUND);
    }

    await run('DELETE FROM proxmox_clusters WHERE id = ?', [clusterId]);
    res.json({ message: 'Cluster deleted successfully' });
  } catch (err) {
    next(err);
  }
});

router.get('/clusters/:id/containers', async (req, res, next) => {
  try {
    const clusterId = req.params.id;
    const cluster = await get('SELECT * FROM proxmox_clusters WHERE id = ?', [clusterId]);

    if (!cluster) {
      throw new AppError('Cluster not found', HTTP_STATUS.NOT_FOUND);
    }

    const containers = await getClusterResources(cluster.url, decrypt(cluster.api_token));
    res.json({ containers });
  } catch (err) {
    next(err);
  }
});

/**
 * Live permissions of the configured API token - shows in the UI which
 * portal features (power, console, provisioning) the token allows.
 */
router.get('/clusters/:id/capabilities', async (req, res, next) => {
  try {
    const cluster = await get('SELECT * FROM proxmox_clusters WHERE id = ?', [req.params.id]);
    if (!cluster) throw new AppError('Cluster not found', HTTP_STATUS.NOT_FOUND);

    const capabilities = await getCapabilities(cluster.url, decrypt(cluster.api_token));
    res.json({ capabilities });
  } catch (err) {
    next(err);
  }
});

router.get('/clusters/:id/templates', async (req, res, next) => {
  try {
    const cluster = await get('SELECT * FROM proxmox_clusters WHERE id = ?', [req.params.id]);
    if (!cluster) throw new AppError('Cluster not found', HTTP_STATUS.NOT_FOUND);

    const apiToken = decrypt(cluster.api_token);
    const nodes = await getOnlineNodes(cluster.url, apiToken);
    if (nodes.length === 0) return res.json({ templates: [] });

    const storage = req.query.storage || cluster.template_storage || 'local';
    const templates = await getNodeTemplates(cluster.url, apiToken, nodes[0].node, storage);
    res.json({ templates });
  } catch (err) {
    next(err);
  }
});

router.get('/clusters/:id/isos', async (req, res, next) => {
  try {
    const cluster = await get('SELECT * FROM proxmox_clusters WHERE id = ?', [req.params.id]);
    if (!cluster) throw new AppError('Cluster not found', HTTP_STATUS.NOT_FOUND);

    const apiToken = decrypt(cluster.api_token);
    const nodes = await getOnlineNodes(cluster.url, apiToken);
    if (nodes.length === 0) return res.json({ isos: [] });

    const storage = req.query.storage || cluster.iso_storage || 'local';
    const isos = await getNodeIsos(cluster.url, apiToken, nodes[0].node, storage);
    res.json({ isos });
  } catch (err) {
    next(err);
  }
});

/**
 * Storages of the first online node, optionally filtered by content type.
 * Used in the Settings provisioning form to populate storage dropdowns.
 */
router.get('/clusters/:id/storages', async (req, res, next) => {
  try {
    const cluster = await get('SELECT * FROM proxmox_clusters WHERE id = ?', [req.params.id]);
    if (!cluster) throw new AppError('Cluster not found', HTTP_STATUS.NOT_FOUND);

    const apiToken = decrypt(cluster.api_token);
    const nodes = await getOnlineNodes(cluster.url, apiToken);
    if (nodes.length === 0) return res.json({ storages: [] });

    const storages = await getNodeStorages(cluster.url, apiToken, nodes[0].node, req.query.content || null);
    res.json({ storages });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------------------- ADMIN CREDENTIAL VAULT -- */
router.get('/credentials', async (req, res, next) => {
  try {
    const rows = await all(`
      SELECT ac.id, ac.label, ac.username, ac.url, ac.notes, ac.cluster_id, ac.user_id,
             ac.created_at, ac.updated_at,
             pc.name as cluster_name, u.name as user_name, u.email as user_email
      FROM admin_credentials ac
      LEFT JOIN proxmox_clusters pc ON ac.cluster_id = pc.id
      LEFT JOIN users u ON ac.user_id = u.id
      ORDER BY ac.label
    `);
    res.json({ credentials: rows.map(row => ({ ...row, hasSecret: true })) });
  } catch (err) {
    next(err);
  }
});

router.get('/credentials/:id/reveal', async (req, res, next) => {
  try {
    const cred = await get('SELECT id, label, secret_encrypted FROM admin_credentials WHERE id = ?', [req.params.id]);
    if (!cred) throw new AppError('Credential not found', HTTP_STATUS.NOT_FOUND);

    await logAudit(req, 'admin.credential.reveal', `credential:${cred.id}`, cred.label);
    res.json({ secret: decrypt(cred.secret_encrypted) });
  } catch (err) {
    next(err);
  }
});

router.post('/credentials', async (req, res, next) => {
  try {
    const { label, username, secret, url, notes, clusterId, userId } = req.body;
    if (!label || !String(label).trim()) {
      throw new AppError('Label is required', HTTP_STATUS.BAD_REQUEST);
    }

    const result = await run(
      'INSERT INTO admin_credentials (label, username, secret_encrypted, url, notes, cluster_id, user_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [String(label).trim(), String(username || '').trim(), encrypt(secret || ''), String(url || '').trim(), String(notes || '').trim(), clusterId || null, userId || null, req.user.id]
    );

    await logAudit(req, 'admin.credential.create', `credential:${result.lastID}`, String(label).trim());
    res.status(HTTP_STATUS.CREATED).json({ id: result.lastID, message: 'Credential saved' });
  } catch (err) {
    next(err);
  }
});

router.put('/credentials/:id', async (req, res, next) => {
  try {
    const cred = await get('SELECT * FROM admin_credentials WHERE id = ?', [req.params.id]);
    if (!cred) throw new AppError('Credential not found', HTTP_STATUS.NOT_FOUND);

    const { label, username, secret, url, notes, clusterId, userId } = req.body;
    const nextLabel = String(label ?? cred.label).trim();
    if (!nextLabel) throw new AppError('Label is required', HTTP_STATUS.BAD_REQUEST);

    const nextSecret = secret !== undefined && secret !== '' ? encrypt(secret) : cred.secret_encrypted;

    await run(
      'UPDATE admin_credentials SET label = ?, username = ?, secret_encrypted = ?, url = ?, notes = ?, cluster_id = ?, user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [
        nextLabel, String(username ?? cred.username ?? '').trim(), nextSecret,
        String(url ?? cred.url ?? '').trim(), String(notes ?? cred.notes ?? '').trim(),
        clusterId !== undefined ? (clusterId || null) : cred.cluster_id,
        userId !== undefined ? (userId || null) : cred.user_id,
        req.params.id
      ]
    );

    await logAudit(req, 'admin.credential.update', `credential:${req.params.id}`, nextLabel);
    res.json({ message: 'Credential saved' });
  } catch (err) {
    next(err);
  }
});

router.delete('/credentials/:id', async (req, res, next) => {
  try {
    const cred = await get('SELECT id, label FROM admin_credentials WHERE id = ?', [req.params.id]);
    if (!cred) throw new AppError('Credential not found', HTTP_STATUS.NOT_FOUND);

    await run('DELETE FROM admin_credentials WHERE id = ?', [req.params.id]);
    await logAudit(req, 'admin.credential.delete', `credential:${req.params.id}`, cred.label);
    res.json({ message: 'Credential deleted' });
  } catch (err) {
    next(err);
  }
});

/* --------------------------- ADMIN → RESOURCE-ATTACHED CREDENTIALS ------ */
/**
 * The admin can attach credentials directly to a user's resource. These show
 * up in the user's resource credential list. Rules:
 * - Admin sees all credentials of a resource, but may only edit/delete the
 *   ones the admin created (created_by_role = 'admin').
 * - User-created credentials (created_by_role = 'user') are NEVER touched or
 *   deleted by the admin.
 * - The user themselves may keep or delete admin-provided credentials.
 */
router.get('/resources/:id/credentials', async (req, res, next) => {
  try {
    const ownership = await getResourceOwnership(req.params.id);
    if (!ownership) throw new AppError('Resource not found', HTTP_STATUS.NOT_FOUND);
    if (ownership.isSelfService) {
      return res.json({ credentials: [], locked: true });
    }

    const rows = await all(
      `SELECT id, label, username, url, notes, created_by_role, COALESCE(purpose, 'general') AS purpose, created_at, updated_at
       FROM resource_credentials
       WHERE resource_id = ?
       ORDER BY CASE WHEN COALESCE(purpose, 'general') = 'management' THEN 0 ELSE 1 END, label`,
      [req.params.id]
    );
    res.json({
      credentials: rows.map(row => ({
        ...row,
        hasSecret: true,
        fromAdmin: row.created_by_role === 'admin',
        canManage: row.created_by_role === 'admin' || row.purpose === 'management'
      }))
    });
  } catch (err) {
    next(err);
  }
});

router.get('/resources/:id/credentials/:credId/reveal', async (req, res, next) => {
  try {
    await assertResourceEditableByAdmin(req.params.id, 'eingesehen');
    const cred = await get(
      "SELECT id, label, secret_encrypted, created_by_role, COALESCE(purpose, 'general') AS purpose FROM resource_credentials WHERE id = ? AND resource_id = ?",
      [req.params.credId, req.params.id]
    );
    if (!cred) throw new AppError('Credential not found', HTTP_STATUS.NOT_FOUND);
    if (cred.created_by_role !== 'admin' && cred.purpose !== 'management') {
      throw new AppError('This credential belongs to the user and cannot be viewed', HTTP_STATUS.FORBIDDEN);
    }

    await logAudit(req, 'admin.resource_credential.reveal', `resource:${req.params.id}`, cred.label);
    res.json({ secret: decrypt(cred.secret_encrypted) });
  } catch (err) {
    next(err);
  }
});

router.post('/resources/:id/credentials', async (req, res, next) => {
  try {
    await assertResourceEditableByAdmin(req.params.id, 'verwaltet');
    const resource = await get('SELECT id, name, admin_url FROM resources WHERE id = ?', [req.params.id]);
    if (!resource) throw new AppError('Resource not found', HTTP_STATUS.NOT_FOUND);

    const { label, username, secret, url, notes, purpose: requestedPurpose } = req.body;
    const purpose = requestedPurpose === 'management' ? 'management' : 'general';
    const nextLabel = String(label || (purpose === 'management' ? 'Verwaltungsseite' : '')).trim();
    if (!nextLabel) {
      throw new AppError('Label is required', HTTP_STATUS.BAD_REQUEST);
    }

    const nextUrl = String(url || (purpose === 'management' ? (resource.admin_url || '') : '')).trim();

    if (purpose === 'management') {
      const existing = await get(
        "SELECT * FROM resource_credentials WHERE resource_id = ? AND COALESCE(purpose, 'general') = 'management'",
        [req.params.id]
      );
      if (existing) {
        const nextSecret = secret !== undefined && secret !== '' ? encrypt(secret) : existing.secret_encrypted;
        await run(
          'UPDATE resource_credentials SET label = ?, username = ?, secret_encrypted = ?, url = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [nextLabel, String(username ?? existing.username ?? '').trim(), nextSecret, nextUrl, String(notes ?? existing.notes ?? '').trim(), existing.id]
        );
        await logAudit(req, 'admin.resource_credential.update', `resource:${req.params.id}`, `${resource.name}: ${nextLabel}`);
        return res.json({ id: existing.id, message: 'Credential saved' });
      }
    }

    const result = await run(
      "INSERT INTO resource_credentials (resource_id, label, username, secret_encrypted, url, notes, created_by, created_by_role, purpose) VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', ?)",
      [req.params.id, nextLabel, String(username || '').trim(), encrypt(secret || ''), nextUrl, String(notes || '').trim(), req.user.id, purpose]
    );

    await logAudit(req, 'admin.resource_credential.create', `resource:${req.params.id}`, `${resource.name}: ${nextLabel}`);
    res.status(HTTP_STATUS.CREATED).json({ id: result.lastID, message: 'Credential saved' });
  } catch (err) {
    next(err);
  }
});

router.put('/resources/:id/credentials/:credId', async (req, res, next) => {
  try {
    await assertResourceEditableByAdmin(req.params.id, 'verwaltet');
    const cred = await get(
      'SELECT * FROM resource_credentials WHERE id = ? AND resource_id = ?',
      [req.params.credId, req.params.id]
    );
    if (!cred) throw new AppError('Credential not found', HTTP_STATUS.NOT_FOUND);
    if (cred.created_by_role !== 'admin' && cred.purpose !== 'management') {
      throw new AppError('This credential belongs to the user and cannot be edited', HTTP_STATUS.FORBIDDEN);
    }

    const { label, username, secret, url, notes, purpose: requestedPurpose } = req.body;
    const purpose = cred.purpose === 'management' || requestedPurpose === 'management' ? 'management' : 'general';
    const nextLabel = String(label ?? cred.label ?? (purpose === 'management' ? 'Verwaltungsseite' : '')).trim();
    if (!nextLabel) throw new AppError('Label is required', HTTP_STATUS.BAD_REQUEST);

    if (purpose === 'management') {
      const duplicate = await get(
        "SELECT id FROM resource_credentials WHERE resource_id = ? AND COALESCE(purpose, 'general') = 'management' AND id != ?",
        [req.params.id, req.params.credId]
      );
      if (duplicate) throw new AppError('Management credential already exists', HTTP_STATUS.BAD_REQUEST);
    }

    const nextSecret = secret !== undefined && secret !== '' ? encrypt(secret) : cred.secret_encrypted;

    await run(
      'UPDATE resource_credentials SET label = ?, username = ?, secret_encrypted = ?, url = ?, notes = ?, purpose = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [nextLabel, String(username ?? cred.username ?? '').trim(), nextSecret, String(url ?? cred.url ?? '').trim(), String(notes ?? cred.notes ?? '').trim(), purpose, req.params.credId]
    );

    await logAudit(req, 'admin.resource_credential.update', `resource:${req.params.id}`, nextLabel);
    res.json({ message: 'Credential saved' });
  } catch (err) {
    next(err);
  }
});

router.delete('/resources/:id/credentials/:credId', async (req, res, next) => {
  try {
    await assertResourceEditableByAdmin(req.params.id, 'verwaltet');
    const cred = await get(
      "SELECT id, label, created_by_role, COALESCE(purpose, 'general') AS purpose FROM resource_credentials WHERE id = ? AND resource_id = ?",
      [req.params.credId, req.params.id]
    );
    if (!cred) throw new AppError('Credential not found', HTTP_STATUS.NOT_FOUND);
    // Shared management credentials may be removed by admin or authorized users.
    if (cred.created_by_role !== 'admin' && cred.purpose !== 'management') {
      throw new AppError('This credential belongs to the user and cannot be deleted', HTTP_STATUS.FORBIDDEN);
    }

    await run('DELETE FROM resource_credentials WHERE id = ?', [req.params.credId]);
    await logAudit(req, 'admin.resource_credential.delete', `resource:${req.params.id}`, cred.label);
    res.json({ message: 'Credential deleted' });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------- GROUPS -- */
router.get('/groups', async (req, res, next) => {
  try {
    const groups = await all(`
      SELECT cg.id, cg.name, cg.created_at,
        (SELECT COUNT(*) FROM user_groups ug WHERE ug.group_id = cg.id) as member_count,
        (SELECT COUNT(*) FROM resources r WHERE r.group_id = cg.id) as resource_count
      FROM customer_groups cg ORDER BY cg.name
    `);

    const memberships = await all(`
      SELECT ug.group_id, u.id, u.name, u.email
      FROM user_groups ug JOIN users u ON ug.user_id = u.id
    `);

    res.json({
      groups: groups.map(group => ({
        ...group,
        members: memberships.filter(member => member.group_id === group.id)
          .map(member => ({ id: member.id, name: member.name, email: member.email }))
      }))
    });
  } catch (err) {
    next(err);
  }
});

router.post('/groups', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) throw new AppError('Group name is required', HTTP_STATUS.BAD_REQUEST);

    const result = await run('INSERT INTO customer_groups (name) VALUES (?)', [name]);
    await logAudit(req, 'group.create', `group:${result.lastID}`, name);
    res.status(HTTP_STATUS.CREATED).json({ group: { id: result.lastID, name } });
  } catch (err) {
    next(err);
  }
});

router.put('/groups/:id', async (req, res, next) => {
  try {
    const group = await get('SELECT * FROM customer_groups WHERE id = ?', [req.params.id]);
    if (!group) throw new AppError('Group not found', HTTP_STATUS.NOT_FOUND);

    const name = String(req.body.name || group.name).trim();
    if (!name) throw new AppError('Group name is required', HTTP_STATUS.BAD_REQUEST);

    await run('UPDATE customer_groups SET name = ? WHERE id = ?', [name, req.params.id]);

    if (Array.isArray(req.body.memberIds)) {
      await run('DELETE FROM user_groups WHERE group_id = ?', [req.params.id]);
      for (const memberId of req.body.memberIds) {
        const user = await get('SELECT id FROM users WHERE id = ?', [memberId]);
        if (user) {
          await run('INSERT OR IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)', [memberId, req.params.id]);
        }
      }
    }

    await logAudit(req, 'group.update', `group:${req.params.id}`, name);
    res.json({ group: { id: Number(req.params.id), name } });
  } catch (err) {
    next(err);
  }
});

router.delete('/groups/:id', async (req, res, next) => {
  try {
    const group = await get('SELECT * FROM customer_groups WHERE id = ?', [req.params.id]);
    if (!group) throw new AppError('Group not found', HTTP_STATUS.NOT_FOUND);

    await run('DELETE FROM customer_groups WHERE id = ?', [req.params.id]);
    await logAudit(req, 'group.delete', `group:${req.params.id}`, group.name);
    res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------------------------------------- AUDIT -- */
router.get('/audit', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const where = [];
    const params = [];

    if (search) {
      where.push('(action LIKE ? OR target LIKE ? OR details LIKE ? OR user_email LIKE ? OR ip LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countRow = await get(`SELECT COUNT(*) AS total FROM audit_log ${whereSql}`, params);
    const total = Number(countRow?.total || 0);
    const entries = await all(
      `SELECT id, user_id, user_email, action, target, details, ip, created_at
       FROM audit_log ${whereSql}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      entries,
      pagination: {
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/resources', async (req, res, next) => {
  try {
    const rows = await getResourceRows();
    const resources = await enrichResources(rows);
    const publishingConfig = await getPangolinConfig();
    res.json({
      resources: resources.map((resource) => {
        const pangolinAvailable = !!publishingConfig.enabled && resource.clusterPublishingEnabled !== false;
        const effectivePublicUrl = pangolinAvailable
          ? (resource.publicUrl || resource.webUrl || '')
          : (resource.manualPublicUrl || resource.publicUrl || resource.webUrl || '');
        return { ...resource, publicUrl: effectivePublicUrl, webUrl: effectivePublicUrl };
      })
    });
  } catch (err) {
    next(err);
  }
});

router.post('/resources', async (req, res, next) => {
  try {
    const { name, containerId, clusterId, userId, groupId, adminUrl } = req.body;

    if (!containerId || !clusterId || !userId) {
      throw new AppError('Resource, cluster, and user are required', HTTP_STATUS.BAD_REQUEST);
    }

    const cluster = await get('SELECT * FROM proxmox_clusters WHERE id = ?', [clusterId]);
    if (!cluster) {
      throw new AppError('Cluster not found', HTTP_STATUS.NOT_FOUND);
    }

    const user = await get('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    let cleanGroupId = null;
    if (groupId) {
      const group = await get('SELECT id FROM customer_groups WHERE id = ?', [groupId]);
      if (!group) throw new AppError('Group not found', HTTP_STATUS.NOT_FOUND);
      cleanGroupId = group.id;
    }

    let resourceName = String(name || '').trim();
    let selectedResource = null;
    try {
      const containers = await getClusterResources(cluster.url, decrypt(cluster.api_token));
      selectedResource = containers.find(item => String(item.vmid) === String(containerId));
      if (!selectedResource) {
        throw new AppError('Selected Proxmox resource was not found', HTTP_STATUS.BAD_REQUEST);
      }
      if (!resourceName) resourceName = selectedResource.name || `Ressource ${containerId}`;
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (!resourceName) resourceName = `Ressource ${containerId}`;
    }

    const resourceType = String(selectedResource?.type || '').toLowerCase();

    const cleanPublicUrl = '';
    const cleanAdminUrl = validateWebUrl(adminUrl, 'Admin link');
    // A manual service IP is deliberately not accepted while the portal
    // assignment is being created. It becomes available only after an
    // administrator-assigned QEMU VM exists as a visible user service.
    const cleanManualIp = '';
    const cleanSshPort = 22;

    const result = await run(
      'INSERT INTO resources (name, container_id, cluster_id, user_id, group_id, web_url, public_url, admin_url, manual_ip, ssh_port, resource_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [resourceName, String(containerId), clusterId, userId, cleanGroupId, cleanPublicUrl, cleanPublicUrl, cleanAdminUrl, cleanManualIp || null, cleanSshPort, resourceType || null]
    );

    await logAudit(req, 'resource.create', `resource:${result.lastID}`, resourceName);

    const rows = await getResourceRows('WHERE r.id = ?', [result.lastID]);
    const resources = await enrichResources(rows);
    res.status(HTTP_STATUS.CREATED).json({ resource: resources[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/resources/:id', async (req, res, next) => {
  try {
    const resourceId = req.params.id;
    const { name, containerId, clusterId, userId, groupId, adminUrl, manualIp, sshPort } = req.body;
    const resource = await get('SELECT * FROM resources WHERE id = ?', [resourceId]);

    if (!resource) {
      throw new AppError('Resource not found', HTTP_STATUS.NOT_FOUND);
    }

    await assertResourceEditableByAdmin(resourceId, 'bearbeitet');

    const nextClusterId = clusterId || resource.cluster_id;
    const nextContainerId = String(containerId || resource.container_id);
    const nextUserId = userId || resource.user_id;

    let nextGroupId = resource.group_id;
    if (groupId !== undefined) {
      if (groupId === null || groupId === '' || groupId === 0) {
        nextGroupId = null;
      } else {
        const group = await get('SELECT id FROM customer_groups WHERE id = ?', [groupId]);
        if (!group) throw new AppError('Group not found', HTTP_STATUS.NOT_FOUND);
        nextGroupId = group.id;
      }
    }

    const cluster = await get('SELECT * FROM proxmox_clusters WHERE id = ?', [nextClusterId]);
    if (!cluster) throw new AppError('Cluster not found', HTTP_STATUS.NOT_FOUND);

    const user = await get('SELECT id FROM users WHERE id = ?', [nextUserId]);
    if (!user) throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);

    let nextName = String(name || resource.name || '').trim();
    if (!nextName) nextName = `Ressource ${nextContainerId}`;

    let resourceType = String(resource.resource_type || '').toLowerCase();
    try {
      const containers = await getClusterResources(cluster.url, decrypt(cluster.api_token));
      const selectedResource = containers.find(item => String(item.vmid) === nextContainerId);
      if (!selectedResource) {
        throw new AppError('Selected Proxmox resource was not found', HTTP_STATUS.BAD_REQUEST);
      }
      resourceType = String(selectedResource.type || resourceType).toLowerCase();
      if (!name && selectedResource.name) nextName = selectedResource.name;
    } catch (err) {
      if (err instanceof AppError) throw err;
    }

    const suppliedManualIp = manualIp !== undefined ? normalizeManualIpv4(manualIp) : '';
    if (suppliedManualIp && resourceType !== 'qemu') {
      throw new AppError('Manual service IPs are only available for administrator-assigned QEMU VMs', HTTP_STATUS.BAD_REQUEST);
    }

    const cleanPublicUrl = resource.public_url || resource.web_url || '';
    const cleanAdminUrl = validateWebUrl(adminUrl ?? resource.admin_url, 'Admin link');
    const cleanManualIp = resourceType === 'qemu'
      ? normalizeManualIpv4(manualIp !== undefined ? manualIp : resource.manual_ip)
      : '';
    const cleanSshPort = resourceType === 'qemu'
      ? normalizeSshPort(sshPort !== undefined ? sshPort : resource.ssh_port)
      : 22;

    await run(
      'UPDATE resources SET name = ?, container_id = ?, cluster_id = ?, user_id = ?, group_id = ?, web_url = ?, public_url = ?, admin_url = ?, manual_ip = ?, ssh_port = ?, resource_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [nextName, nextContainerId, nextClusterId, nextUserId, nextGroupId, cleanPublicUrl, cleanPublicUrl, cleanAdminUrl, cleanManualIp || null, cleanSshPort, resourceType || null, resourceId]
    );

    await logAudit(req, 'resource.update', `resource:${resourceId}`, nextName);

    const rows = await getResourceRows('WHERE r.id = ?', [resourceId]);
    const resources = await enrichResources(rows);
    res.json({ resource: resources[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/resources/:id', async (req, res, next) => {
  try {
    const resourceId = req.params.id;
    const resource = await get('SELECT * FROM resources WHERE id = ?', [resourceId]);

    if (!resource) {
      throw new AppError('Resource not found', HTTP_STATUS.NOT_FOUND);
    }

    await assertResourceEditableByAdmin(resourceId, 'entfernt');

    const publications = await all('SELECT * FROM resource_publications WHERE resource_id = ?', [resourceId]);
    if (publications.length > 0) {
      const publishingConfig = await getPangolinConfig();
      for (const publication of publications) {
        await deletePublication(publishingConfig, publication);
      }
      await run('DELETE FROM resource_publications WHERE resource_id = ?', [resourceId]);
    }

    await run('DELETE FROM resources WHERE id = ?', [resourceId]);
    res.json({ message: 'Resource deleted successfully' });
  } catch (err) {
    next(err);
  }
});

router.get('/assignments', async (req, res, next) => {
  try {
    const assignments = await all(`
      SELECT
        ca.*,
        pc.name as cluster_name,
        u.email as assigned_to_name,
        u.name as assigned_user_name
      FROM container_assignments ca
      LEFT JOIN proxmox_clusters pc ON ca.cluster_id = pc.id
      LEFT JOIN users u ON ca.assigned_to_id = u.id
      WHERE ca.assigned_to_type = 'user'
      ORDER BY ca.created_at DESC
    `);

    res.json({ assignments });
  } catch (err) {
    next(err);
  }
});

router.post('/assignments', async (req, res, next) => {
  try {
    const { containerId, clusterId, assignedToId } = req.body;

    if (!containerId || !clusterId || !assignedToId) {
      throw new AppError('Missing required fields', HTTP_STATUS.BAD_REQUEST);
    }

    const user = await get('SELECT id FROM users WHERE id = ?', [assignedToId]);
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    const cluster = await get('SELECT id FROM proxmox_clusters WHERE id = ?', [clusterId]);
    if (!cluster) {
      throw new AppError('Cluster not found', HTTP_STATUS.NOT_FOUND);
    }

    const result = await run(
      'INSERT INTO container_assignments (container_id, cluster_id, assigned_to_type, assigned_to_id) VALUES (?, ?, ?, ?)',
      [String(containerId), clusterId, 'user', assignedToId]
    );

    res.status(HTTP_STATUS.CREATED).json({
      assignment: {
        id: result.lastID,
        containerId: String(containerId),
        clusterId,
        assignedToType: 'user',
        assignedToId
      }
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/assignments/:id', async (req, res, next) => {
  try {
    const assignmentId = req.params.id;
    const assignment = await get('SELECT * FROM container_assignments WHERE id = ?', [assignmentId]);

    if (!assignment) {
      throw new AppError('Assignment not found', HTTP_STATUS.NOT_FOUND);
    }

    await run('DELETE FROM container_assignments WHERE id = ?', [assignmentId]);
    res.json({ message: 'Assignment deleted successfully' });
  } catch (err) {
    next(err);
  }
});

router.get('/pangolin-publications', async (req, res, next) => {
  try {
    const publications = await all(`
      SELECT
        rp.*,
        r.name AS resource_name,
        r.container_id,
        u.name AS user_name,
        u.email AS user_email,
        pc.name AS cluster_name
      FROM resource_publications rp
      JOIN resources r ON r.id = rp.resource_id
      JOIN users u ON u.id = r.user_id
      JOIN proxmox_clusters pc ON pc.id = r.cluster_id
      ORDER BY rp.updated_at DESC
    `);
    res.json({
      publications: publications.map((item) => ({
        id: item.id,
        resourceId: item.resource_id,
        resourceName: item.resource_name,
        containerId: item.container_id,
        userName: item.user_name,
        userEmail: item.user_email,
        clusterName: item.cluster_name,
        protocol: item.protocol,
        subdomain: item.subdomain || '',
        publicPort: item.public_port,
        targetPort: item.target_port,
        targetMethod: item.target_method || '',
        publicUrl: item.public_url || '',
        status: item.status || 'active',
        lastError: item.last_error || '',
        updatedAt: item.updated_at
      }))
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/pangolin-publications/:publicationId', async (req, res, next) => {
  try {
    const publication = await get('SELECT * FROM resource_publications WHERE id = ?', [req.params.publicationId]);
    if (!publication) throw new AppError('Publication not found', HTTP_STATUS.NOT_FOUND);
    const config = await getPangolinConfig();
    await deletePublication(config, publication);
    await run('DELETE FROM resource_publications WHERE id = ?', [publication.id]);
    const primary = await get(
      `SELECT public_url
       FROM resource_publications
       WHERE resource_id = ? AND protocol = 'http' AND status = 'active'
       ORDER BY created_at ASC, id ASC
       LIMIT 1`,
      [publication.resource_id]
    );
    const publicUrl = primary?.public_url || '';
    await run(
      'UPDATE resources SET web_url = ?, public_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [publicUrl, publicUrl, publication.resource_id]
    );
    await logAudit(req, 'resource.publication.admin-remove', `resource:${publication.resource_id}:publication:${publication.id}`);
    res.json({ message: 'Public access removed' });
  } catch (err) {
    next(err);
  }
});

router.get('/pangolin-settings', async (req, res, next) => {
  try {
    const config = await getPangolinConfig();
    const publicationCount = await get('SELECT COUNT(*) AS total FROM resource_publications');
    res.json({
      settings: getPublicPangolinConfig(config),
      publicationCount: Number(publicationCount?.total || 0)
    });
  } catch (err) {
    next(err);
  }
});

router.put('/pangolin-settings', async (req, res, next) => {
  try {
    const config = await savePangolinConfig(req.body || {});
    await logAudit(req, 'settings.pangolin.update', 'pangolin', `enabled=${config.enabled}`);
    res.json({ message: 'Pangolin settings updated successfully', settings: getPublicPangolinConfig(config) });
  } catch (err) {
    next(err);
  }
});

router.post('/pangolin-settings/test', async (req, res, next) => {
  try {
    const result = await testPangolinConnection(req.body || {});
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/pangolin-settings/discover', async (req, res, next) => {
  try {
    const result = await discoverPangolin(req.body || {});
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/settings', async (req, res, next) => {
  try {
    const settings = await all('SELECT key, value FROM settings');
    const settingsObj = {};

    settings.forEach(setting => {
      settingsObj[setting.key] = ['smtp_password', 'pangolin_api_key'].includes(setting.key) ? '***hidden***' : setting.value;
    });

    res.json({ settings: settingsObj });
  } catch (err) {
    next(err);
  }
});

router.put('/settings', async (req, res, next) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPassword } = req.body;
    const currentPassword = await get('SELECT value FROM settings WHERE key = ?', ['smtp_password']);
    const passwordRequired = !currentPassword?.value || (smtpPassword && smtpPassword !== '***hidden***');

    validateSmtp({ smtpHost, smtpPort, smtpUser, smtpPassword }, passwordRequired);

    await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['smtp_host', String(smtpHost).trim()]);
    await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['smtp_port', String(smtpPort).trim()]);
    await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['smtp_user', String(smtpUser).trim()]);

    if (smtpPassword && smtpPassword !== '***hidden***') {
      await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['smtp_password', encryptString(smtpPassword)]);
    }

    await initializeEmailService();
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/settings/test-smtp', async (req, res, next) => {
  try {
    const storedSmtp = await getStoredSmtpSettings();
    const smtp = resolveSmtpSettings(req.body, storedSmtp);
    validateSmtp(smtp, true);

    const result = await testSmtpConnection(
      smtp.smtpHost,
      smtp.smtpPort,
      smtp.smtpUser,
      smtp.smtpPassword
    );
    res.status(result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/settings/test-proxmox', async (req, res, next) => {
  try {
    const { url, apiToken } = await resolveClusterTestData(req.body);
    const result = await testConnection(url, apiToken);
    res.status(result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST).json(result);
  } catch (err) {
    next(err);
  }
});


/* ------------------------------------------------------------------------
 * v3.0: Maintenance windows (announcements)
 * ---------------------------------------------------------------------- */

function validateMaintenanceInput({ title, startsAt, endsAt, severity }) {
  if (!title || !String(title).trim()) {
    throw new AppError('Maintenance title is required', HTTP_STATUS.BAD_REQUEST);
  }
  const starts = new Date(startsAt);
  const ends = new Date(endsAt);
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()) || ends <= starts) {
    throw new AppError('Maintenance time window is invalid', HTTP_STATUS.BAD_REQUEST);
  }
  if (severity && !['info', 'warning', 'critical'].includes(severity)) {
    throw new AppError('Maintenance severity is invalid', HTTP_STATUS.BAD_REQUEST);
  }
  return { starts, ends };
}

async function notifyMaintenance(windowRow) {
  const users = await all('SELECT id, email, name, preferred_language FROM users WHERE notify_maintenance = 1');
  for (const user of users) {
    const template = maintenanceTemplate({
      name: user.name,
      title: windowRow.title,
      message: windowRow.message,
      startsAt: windowRow.starts_at,
      endsAt: windowRow.ends_at,
      severity: windowRow.severity,
      language: user.preferred_language || 'en'
    });
    try {
      await sendEmail(user.email, template.subject, template.text, template.html);
    } catch (err) {
      console.error(`Maintenance mail to ${user.email} failed:`, err.message);
    }
  }
  return users.length;
}

router.get('/maintenance', async (req, res, next) => {
  try {
    const windows = await all(
      `SELECT m.*, u.name AS created_by_name
       FROM maintenance_windows m
       LEFT JOIN users u ON u.id = m.created_by
       ORDER BY datetime(m.starts_at) DESC
       LIMIT 100`
    );
    res.json({ windows });
  } catch (err) {
    next(err);
  }
});

router.post('/maintenance', async (req, res, next) => {
  try {
    const { title, message = '', startsAt, endsAt, severity = 'info', notifyUsers = false } = req.body;
    const { starts, ends } = validateMaintenanceInput({ title, startsAt, endsAt, severity });

    const result = await run(
      `INSERT INTO maintenance_windows (title, message, severity, starts_at, ends_at, notify_users, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [String(title).trim(), String(message || '').trim(), severity, starts.toISOString(), ends.toISOString(), notifyUsers ? 1 : 0, req.user.id]
    );

    await logAudit(req, 'admin.maintenance_created', String(title).trim(), `${starts.toISOString()} - ${ends.toISOString()}`);

    const windowRow = await get('SELECT * FROM maintenance_windows WHERE id = ?', [result.lastID]);

    let notified = 0;
    if (notifyUsers) {
      notified = await notifyMaintenance(windowRow);
      await run('UPDATE maintenance_windows SET notified_at = CURRENT_TIMESTAMP WHERE id = ?', [result.lastID]);
    }

    res.status(HTTP_STATUS.CREATED).json({ message: 'Maintenance window created', window: windowRow, notified });
  } catch (err) {
    next(err);
  }
});

router.put('/maintenance/:id', async (req, res, next) => {
  try {
    const existing = await get('SELECT * FROM maintenance_windows WHERE id = ?', [req.params.id]);
    if (!existing) {
      throw new AppError('Maintenance window not found', HTTP_STATUS.NOT_FOUND);
    }

    const { title = existing.title, message = existing.message, startsAt = existing.starts_at, endsAt = existing.ends_at, severity = existing.severity, notifyUsers } = req.body;
    const { starts, ends } = validateMaintenanceInput({ title, startsAt, endsAt, severity });

    await run(
      `UPDATE maintenance_windows
       SET title = ?, message = ?, severity = ?, starts_at = ?, ends_at = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [String(title).trim(), String(message || '').trim(), severity, starts.toISOString(), ends.toISOString(), req.params.id]
    );

    await logAudit(req, 'admin.maintenance_updated', String(title).trim());

    const windowRow = await get('SELECT * FROM maintenance_windows WHERE id = ?', [req.params.id]);

    let notified = 0;
    if (notifyUsers) {
      notified = await notifyMaintenance(windowRow);
      await run('UPDATE maintenance_windows SET notified_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    }

    res.json({ message: 'Maintenance window updated', window: windowRow, notified });
  } catch (err) {
    next(err);
  }
});

router.delete('/maintenance/:id', async (req, res, next) => {
  try {
    const existing = await get('SELECT * FROM maintenance_windows WHERE id = ?', [req.params.id]);
    if (!existing) {
      throw new AppError('Maintenance window not found', HTTP_STATUS.NOT_FOUND);
    }
    await run('DELETE FROM maintenance_windows WHERE id = ?', [req.params.id]);
    await logAudit(req, 'admin.maintenance_deleted', existing.title);
    res.json({ message: 'Maintenance window deleted' });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------------
 * v3.0: Status events from the monitoring service
 * ---------------------------------------------------------------------- */

router.get('/status-events', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '25', 10) || 25, 1), 100);
    const events = await all(
      `SELECT e.*, c.name AS cluster_name
       FROM status_events e
       LEFT JOIN proxmox_clusters c ON c.id = e.cluster_id
       ORDER BY datetime(e.created_at) DESC
       LIMIT ?`,
      [limit]
    );
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------------
 * v3.0: Send a branded test e-mail to the current admin
 * ---------------------------------------------------------------------- */

router.post('/settings/send-test-mail', async (req, res, next) => {
  try {
    const admin = await get('SELECT email, name, preferred_language FROM users WHERE id = ?', [req.user.id]);
    const template = testMailTemplate({ name: admin?.name || 'Admin', language: admin?.preferred_language || 'en' });
    const result = await sendEmail(admin.email, template.subject, template.text, template.html);
    if (!result.success) {
      throw new AppError(result.message || 'Email service not configured', HTTP_STATUS.BAD_REQUEST);
    }
    await logAudit(req, 'admin.test_mail_sent', admin.email);
    res.json({ success: true, message: 'Test email sent', to: admin.email });
  } catch (err) {
    next(err);
  }
});


/* --------------------------------------------------------- TEMPLATES ---- */
router.get('/templates', async (req, res, next) => {
  try {
    const clusterId = Number(req.query.clusterId);
    if (!clusterId) throw new AppError('Cluster is required', HTTP_STATUS.BAD_REQUEST);
    const cluster = await get('SELECT id FROM proxmox_clusters WHERE id = ?', [clusterId]);
    if (!cluster) throw new AppError('Cluster not found', HTTP_STATUS.NOT_FOUND);
    const templates = await ensureClusterTemplates(clusterId);
    res.json({ templates });
  } catch (err) { next(err); }
});

router.post('/templates/sync', async (req, res, next) => {
  try {
    const clusterId = Number(req.body.clusterId);
    if (!clusterId) throw new AppError('Cluster is required', HTTP_STATUS.BAD_REQUEST);
    const templates = await syncClusterTemplates(clusterId);
    await logAudit(req, 'template.sync', `cluster:${clusterId}`, `${templates.length} templates`);
    res.json({ templates });
  } catch (err) { next(err); }
});

router.put('/templates/:id', async (req, res, next) => {
  try {
    const current = await get('SELECT * FROM template_profiles WHERE id = ?', [req.params.id]);
    if (!current) throw new AppError('Template not found', HTTP_STATUS.NOT_FOUND);
    const displayName = String(req.body.displayName || '').trim();
    if (!displayName) throw new AppError('Display name is required', HTTP_STATUS.BAD_REQUEST);
    await run(`UPDATE template_profiles SET display_name = ?, os_family = ?, os_version = ?, description = ?, tags = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
      displayName, String(req.body.osFamily || '').trim(), String(req.body.osVersion || '').trim(),
      String(req.body.description || '').trim(), String(req.body.tags || '').trim(), req.body.enabled ? 1 : 0, req.params.id
    ]);
    const updated = await get(`SELECT id, cluster_id AS clusterId, volid, storage, display_name AS displayName,
      os_family AS osFamily, os_version AS osVersion, description, tags, enabled, present,
      source_type AS sourceType, source_node AS sourceNode, source_vmid AS sourceVmid, min_disk_gb AS minDiskGb
      FROM template_profiles WHERE id = ?`, [req.params.id]);
    await logAudit(req, 'template.update', `template:${req.params.id}`, displayName);
    res.json({ template: updated });
  } catch (err) { next(err); }
});

router.get('/provisioning-jobs', async (req, res, next) => {
  try {
    const rows = await all(`SELECT j.id, j.status, j.phase, j.progress, j.hostname, j.vmid, j.ip, j.node, j.error_message AS error, j.created_at AS createdAt, j.finished_at AS finishedAt, u.name AS userName, u.email AS userEmail, c.name AS clusterName, tp.display_name AS templateName FROM provisioning_jobs j JOIN users u ON u.id = j.user_id JOIN proxmox_clusters c ON c.id = j.cluster_id LEFT JOIN template_profiles tp ON tp.id = j.template_profile_id ORDER BY j.id DESC LIMIT 100`);
    for (const job of rows) {
      job.events = await all(`SELECT id, level, phase, message_en AS messageEn, message_de AS messageDe, technical_message AS technicalMessage, created_at AS createdAt FROM provisioning_job_events WHERE job_id = ? ORDER BY id ASC`, [job.id]);
    }
    res.json({ jobs: rows });
  } catch (err) { next(err); }
});

module.exports = router;
