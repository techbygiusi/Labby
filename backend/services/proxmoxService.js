const axios = require('axios');
const crypto = require('crypto');
const https = require('https');
const WebSocket = require('ws');

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

const VM_DISK_KEY = /^(ide|sata|scsi|virtio)\d+$/;
const LXC_DISK_KEY = /^(rootfs|mp\d+)$/;

function createProxmoxClient(baseURL, token) {
  return axios.create({
    baseURL,
    headers: {
      Authorization: `PVEAPIToken=${token}`,
      'Content-Type': 'application/json'
    },
    httpsAgent,
    timeout: 10000,
    validateStatus: () => true
  });
}

function proxmoxErrorDetails(response) {
  const data = response?.data;
  const details = [];

  if (typeof data?.message === 'string' && data.message.trim()) details.push(data.message.trim());
  if (data?.errors && typeof data.errors === 'object') {
    for (const [field, value] of Object.entries(data.errors)) {
      const message = typeof value === 'string' ? value : JSON.stringify(value);
      if (message) details.push(`${field}: ${message}`);
    }
  }
  if (typeof data?.data === 'string' && data.data.trim()) details.push(data.data.trim());

  return Array.from(new Set(details)).join('; ').slice(0, 900);
}

function ensureSuccess(response, fallbackMessage) {
  if (response.status >= 200 && response.status < 300) return;
  const details = proxmoxErrorDetails(response);
  throw new Error(`${fallbackMessage} HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}${details ? ` - ${details}` : ''}`);
}



function parseSizeToBytes(value) {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const raw = String(value).trim();
  const match = raw.match(/^(\d+(?:\.\d+)?)([kmgtpe]?i?b?)?$/i);
  if (!match) return 0;

  const amount = Number(match[1]);
  const unit = (match[2] || '').toLowerCase().replace('ib', '').replace('b', '');
  const powers = { '': 0, k: 1, m: 2, g: 3, t: 4, p: 5, e: 6 };
  return Math.round(amount * Math.pow(1024, powers[unit] || 0));
}

function parseDiskDefinition(key, value) {
  const parts = String(value || '').split(',').map(part => part.trim()).filter(Boolean);
  const first = parts.shift() || '';
  const options = {};

  for (const part of parts) {
    const index = part.indexOf('=');
    if (index === -1) {
      options[part] = true;
    } else {
      options[part.slice(0, index)] = part.slice(index + 1);
    }
  }

  if (options.media === 'cdrom' || first.includes('cloudinit')) return null;

  const storage = first.includes(':') ? first.split(':')[0] : '';
  const volume = first.includes(':') ? first.slice(first.indexOf(':') + 1) : first;
  const size = parseSizeToBytes(options.size);

  return {
    id: key,
    name: key === 'rootfs' ? 'Root-Disk' : key.toUpperCase(),
    storage,
    volume,
    used: null,
    maxdisk: size,
    source: 'config'
  };
}

function normalizeClusterResource(item) {
  return {
    ...item,
    vmid: item.vmid,
    id: String(item.vmid),
    name: item.name || item.id || `${item.type || 'vm'}-${item.vmid}`,
    type: item.type,
    node: item.node || '',
    status: item.status || 'unknown',
    cpu: Number(item.cpu || 0),
    maxcpu: Number(item.maxcpu || 0),
    mem: Number(item.mem || 0),
    maxmem: Number(item.maxmem || 0),
    disk: Number(item.disk || 0),
    maxdisk: Number(item.maxdisk || 0),
    uptime: Number(item.uptime || 0)
  };
}

async function getClusterResources(clusterUrl, apiToken) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const response = await client.get('/api2/json/cluster/resources?type=vm');
  ensureSuccess(response, 'Proxmox Ressourcenabfrage fehlgeschlagen:');

  const resources = response.data?.data || [];
  if (!Array.isArray(resources)) {
    throw new Error('Proxmox hat eine unerwartete Antwort geliefert.');
  }

  return resources
    .filter(item => item.type === 'lxc' || item.type === 'qemu')
    .map(normalizeClusterResource)
    .sort((a, b) => Number(a.vmid) - Number(b.vmid));
}

async function getAllContainers(clusterUrl, apiToken) {
  return getClusterResources(clusterUrl, apiToken);
}

async function getContainerDetails(clusterUrl, apiToken, node, type, vmid) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const endpoint = type === 'lxc'
    ? `/api2/json/nodes/${node}/lxc/${vmid}/status/current`
    : `/api2/json/nodes/${node}/qemu/${vmid}/status/current`;

  const response = await client.get(endpoint);
  ensureSuccess(response, 'Proxmox Detailabfrage fehlgeschlagen:');
  return response.data?.data || {};
}

async function getVmConfig(client, node, type, vmid) {
  const endpoint = type === 'lxc'
    ? `/api2/json/nodes/${node}/lxc/${vmid}/config`
    : `/api2/json/nodes/${node}/qemu/${vmid}/config`;

  const response = await client.get(endpoint);
  if (response.status < 200 || response.status >= 300) return {};
  return response.data?.data || {};
}

function getVmConfigDisks(config, type) {
  const matcher = type === 'lxc' ? LXC_DISK_KEY : VM_DISK_KEY;
  return Object.entries(config || {})
    .filter(([key]) => matcher.test(key))
    .map(([key, value]) => parseDiskDefinition(key, value))
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

async function getQemuGuestFilesystems(client, node, vmid) {
  const response = await client.get(`/api2/json/nodes/${node}/qemu/${vmid}/agent/get-fsinfo`);
  if (response.status < 200 || response.status >= 300) return [];

  const payload = response.data?.data?.result || response.data?.data || [];
  if (!Array.isArray(payload)) return [];

  return payload
    .map((item, index) => {
      const maxdisk = Number(item['total-bytes'] || item.totalBytes || 0);
      const used = Number(item['used-bytes'] || item.usedBytes || 0);
      if (!maxdisk) return null;
      return {
        id: item.mountpoint || item.name || `fs-${index}`,
        name: item.mountpoint || item.name || `Dateisystem ${index + 1}`,
        storage: item.type || '',
        volume: Array.isArray(item.disk) ? item.disk.map(disk => disk.dev || disk.serial || '').filter(Boolean).join(', ') : '',
        used,
        maxdisk,
        source: 'guest-agent'
      };
    })
    .filter(Boolean);
}


const LXC_OS_LABELS = {
  alpine: 'Alpine Linux',
  archlinux: 'Arch Linux',
  centos: 'CentOS',
  debian: 'Debian',
  devuan: 'Devuan',
  fedora: 'Fedora',
  gentoo: 'Gentoo Linux',
  nixos: 'NixOS',
  opensuse: 'openSUSE',
  ubuntu: 'Ubuntu',
  unmanaged: 'Unmanaged Linux container'
};

const QEMU_OS_LABELS = {
  other: 'Other operating system',
  wxp: 'Microsoft Windows XP',
  w2k: 'Microsoft Windows 2000',
  w2k3: 'Microsoft Windows Server 2003',
  w2k8: 'Microsoft Windows Server 2008',
  wvista: 'Microsoft Windows Vista',
  win7: 'Microsoft Windows 7 / Server 2008 R2',
  win8: 'Microsoft Windows 8 / Server 2012',
  win10: 'Microsoft Windows 10 / Server 2016 or later',
  win11: 'Microsoft Windows 11 / Server 2022 or later',
  l24: 'Linux 2.4 kernel',
  l26: 'Linux',
  solaris: 'Solaris'
};

function formatConfiguredOs(type, ostype) {
  const code = String(ostype || '').trim().toLowerCase();
  if (!code) return '';
  const labels = type === 'lxc' ? LXC_OS_LABELS : QEMU_OS_LABELS;
  return labels[code] || code;
}

/**
 * Query the QEMU Guest Agent for the installed operating system. Callers fall
 * back to the configured Proxmox OS type when the agent is unavailable.
 */
async function getQemuGuestOperatingSystem(client, node, vmid) {
  const response = await client.get(`/api2/json/nodes/${node}/qemu/${vmid}/agent/get-osinfo`);
  if (response.status < 200 || response.status >= 300) return '';
  const info = response.data?.data?.result || response.data?.data || {};
  return String(info['pretty-name'] || info.prettyName || info.name || '').trim();
}

function getConfiguredSystemInfo(type, config) {
  const operatingSystemCode = String(config?.ostype || '').trim();
  return {
    operatingSystem: formatConfiguredOs(type, operatingSystemCode),
    operatingSystemCode,
    sourceTemplate: String(config?.ostemplate || '').trim()
  };
}

async function getResourceDiskDetails(clusterUrl, apiToken, resource) {
  if (!resource?.node || !resource?.vmid || !resource?.type) {
    return { disks: [], filesystems: [], disk: Number(resource?.disk || 0), maxdisk: Number(resource?.maxdisk || 0) };
  }

  const client = createProxmoxClient(clusterUrl, apiToken);
  const type = resource.type;
  const vmid = resource.vmid;
  const node = resource.node;
  const config = await getVmConfig(client, node, type, vmid);
  const disks = getVmConfigDisks(config, type);
  const configuredSystemInfo = getConfiguredSystemInfo(type, config);
  const liveDisk = Number(resource.disk || 0);
  const liveMaxDisk = Number(resource.maxdisk || 0);

  if (type === 'qemu') {
    const [filesystems, detectedOperatingSystem] = await Promise.all([
      getQemuGuestFilesystems(client, node, vmid),
      getQemuGuestOperatingSystem(client, node, vmid)
    ]);
    const configuredTotal = disks.reduce((sum, disk) => sum + Number(disk.maxdisk || 0), 0);
    const fsUsed = filesystems.reduce((sum, disk) => sum + Number(disk.used || 0), 0);
    const fsTotal = filesystems.reduce((sum, disk) => sum + Number(disk.maxdisk || 0), 0);

    return {
      disks,
      filesystems,
      disk: fsUsed || liveDisk,
      maxdisk: fsTotal || configuredTotal || liveMaxDisk,
      systemInfo: {
        ...configuredSystemInfo,
        operatingSystem: detectedOperatingSystem || configuredSystemInfo.operatingSystem
      }
    };
  }

  const normalizedDisks = disks.map((disk, index) => {
    const shouldUseLiveValues = index === 0 && liveMaxDisk;
    return {
      ...disk,
      used: shouldUseLiveValues ? liveDisk : null,
      maxdisk: disk.maxdisk || (shouldUseLiveValues ? liveMaxDisk : 0)
    };
  });

  return {
    disks: normalizedDisks,
    filesystems: [],
    disk: liveDisk,
    maxdisk: liveMaxDisk || normalizedDisks.reduce((sum, disk) => sum + Number(disk.maxdisk || 0), 0),
    systemInfo: configuredSystemInfo
  };
}

function stripCidrAddress(value) {
  return String(value || '').split('/')[0].trim();
}

function isUsableIpv4(value) {
  const ip = stripCidrAddress(value);
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return false;
  const parts = ip.split('.').map(Number);
  if (parts.some(part => part < 0 || part > 255)) return false;
  if (parts[0] === 127 || parts[0] === 0) return false;
  if (parts[0] === 169 && parts[1] === 254) return false;
  if (ip === '255.255.255.255') return false;
  return true;
}

function isUsableIpv6(value) {
  const ip = stripCidrAddress(value).toLowerCase();
  if (!ip || ip === '::1' || ip.startsWith('fe80:')) return false;
  return ip.includes(':');
}

function parseKeyValueOptions(value) {
  const options = {};
  String(value || '').split(',').map(part => part.trim()).filter(Boolean).forEach((part) => {
    const index = part.indexOf('=');
    if (index === -1) options[part] = true;
    else options[part.slice(0, index)] = part.slice(index + 1);
  });
  return options;
}

function parseLxcNetworkConfig(key, value) {
  const options = parseKeyValueOptions(value);
  const ipv4 = isUsableIpv4(options.ip) ? stripCidrAddress(options.ip) : '';
  const ipv6 = isUsableIpv6(options.ip6) ? stripCidrAddress(options.ip6) : '';
  if (!ipv4 && !ipv6) return null;
  return {
    interface: options.name || key,
    ipv4,
    ipv6,
    source: 'config'
  };
}

function normalizeInterfaceIp(name, iface) {
  const interfaceName = iface?.name || name;
  const ipv4 = isUsableIpv4(iface?.inet) ? stripCidrAddress(iface.inet) : '';
  const ipv6 = isUsableIpv6(iface?.inet6) ? stripCidrAddress(iface.inet6) : '';
  if (!ipv4 && !ipv6) return null;
  return {
    interface: interfaceName,
    ipv4,
    ipv6,
    source: 'live'
  };
}

function mergeIpEntries(...groups) {
  const seen = new Set();
  return groups.flat().filter((entry) => {
    if (!entry) return false;
    const key = `${entry.interface}|${entry.ipv4 || ''}|${entry.ipv6 || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => {
    const aEth = /^(eth0|net0)$/i.test(a.interface || '') ? 0 : 1;
    const bEth = /^(eth0|net0)$/i.test(b.interface || '') ? 0 : 1;
    if (aEth !== bEth) return aEth - bEth;
    const aStatic = a.source === 'config' ? 0 : 1;
    const bStatic = b.source === 'config' ? 0 : 1;
    if (aStatic !== bStatic) return aStatic - bStatic;
    return String(a.interface || '').localeCompare(String(b.interface || ''), undefined, { numeric: true });
  });
}

async function getLxcConfigIps(client, node, vmid) {
  const response = await client.get(`/api2/json/nodes/${node}/lxc/${vmid}/config`);
  if (response.status < 200 || response.status >= 300) return [];
  const config = response.data?.data || {};
  return Object.entries(config)
    .filter(([key]) => /^net\d+$/.test(key))
    .map(([key, value]) => parseLxcNetworkConfig(key, value))
    .filter(Boolean);
}

async function getLxcLiveIps(client, node, vmid) {
  const response = await client.get(`/api2/json/nodes/${node}/lxc/${vmid}/interfaces`);
  if (response.status < 200 || response.status >= 300) return [];
  const interfaces = response.data?.data || {};
  return Object.entries(interfaces)
    .map(([name, iface]) => normalizeInterfaceIp(name, iface))
    .filter(Boolean);
}

async function getContainerIps(clusterUrl, apiToken, node, type, vmid) {
  try {
    if (type !== 'lxc') return [];

    const client = createProxmoxClient(clusterUrl, apiToken);
    const [configIps, liveIps] = await Promise.all([
      getLxcConfigIps(client, node, vmid).catch(() => []),
      getLxcLiveIps(client, node, vmid).catch(() => [])
    ]);

    // Prefer static LXC config because it is visible in Proxmox even when the
    // container has not fully reported guest interfaces yet. Loopback and
    // link-local addresses are filtered out before the UI sees them.
    return mergeIpEntries(configIps, liveIps);
  } catch (error) {
    return [];
  }
}

async function testConnection(clusterUrl, apiToken) {
  try {
    const resources = await getClusterResources(clusterUrl, apiToken);
    return {
      success: true,
      message: `Verbindung erfolgreich. ${resources.length} Ressourcen gefunden.`
    };
  } catch (error) {
    return {
      success: false,
      message: `Verbindung fehlgeschlagen: ${error.message}`
    };
  }
}

/* ------------------------------------------------------------------ v2.0 */

const POWER_ACTIONS = ['start', 'stop', 'shutdown', 'reboot'];

/**
 * Start / stop / shutdown / reboot a VM or container. Returns the task UPID.
 */
async function powerAction(clusterUrl, apiToken, node, type, vmid, action) {
  if (!POWER_ACTIONS.includes(action)) {
    throw new Error(`Unsupported power action: ${action}`);
  }
  const client = createProxmoxClient(clusterUrl, apiToken);
  const kind = type === 'lxc' ? 'lxc' : 'qemu';
  const response = await client.post(`/api2/json/nodes/${node}/${kind}/${vmid}/status/${action}`, {});
  ensureSuccess(response, `Proxmox ${action} fehlgeschlagen:`);
  return { upid: response.data?.data || '' };
}

/**
 * Recent tasks for a specific VM/CT on its node.
 */
async function getVmTasks(clusterUrl, apiToken, node, vmid, limit = 30) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const response = await client.get(`/api2/json/nodes/${node}/tasks?vmid=${vmid}&limit=${limit}`);
  ensureSuccess(response, 'Proxmox Task-Abfrage fehlgeschlagen:');
  const tasks = response.data?.data || [];
  return tasks.map(task => ({
    upid: task.upid,
    type: task.type,
    status: task.status || (task.endtime ? 'unknown' : 'running'),
    user: task.user,
    starttime: task.starttime,
    endtime: task.endtime || null
  }));
}

/**
 * Log lines of a single task (UPID).
 */
async function getTaskLog(clusterUrl, apiToken, node, upid, start = 0, limit = 500) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const response = await client.get(
    `/api2/json/nodes/${node}/tasks/${encodeURIComponent(upid)}/log?start=${start}&limit=${limit}`
  );
  ensureSuccess(response, 'Proxmox Log-Abfrage fehlgeschlagen:');
  const lines = response.data?.data || [];
  return lines.map(line => ({ n: line.n, t: line.t }));
}

async function getTaskStatus(clusterUrl, apiToken, node, upid) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const response = await client.get(`/api2/json/nodes/${node}/tasks/${encodeURIComponent(upid)}/status`);
  ensureSuccess(response, 'Proxmox Task-Status fehlgeschlagen:');
  return response.data?.data || {};
}

/**
 * Read the permissions of the configured API token and derive portal capabilities.
 * Read-only tokens automatically hide power/console/provisioning in the UI.
 */
async function getCapabilities(clusterUrl, apiToken) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const response = await client.get('/api2/json/access/permissions');

  if (response.status < 200 || response.status >= 300) {
    // Older Proxmox or restricted token: assume read-only, portal stays usable
    return { readOnly: true, canPower: false, canConsole: false, canProvision: false, canClone: false, canManageFirewall: false, canVerifyFirewall: false, privileges: [] };
  }

  const perms = response.data?.data || {};
  const privileges = new Set();
  for (const path of Object.keys(perms)) {
    for (const priv of Object.keys(perms[path] || {})) {
      if (perms[path][priv]) privileges.add(priv);
    }
  }

  const canPower = privileges.has('VM.PowerMgmt');
  const canConsole = privileges.has('VM.Console');
  const canProvision = privileges.has('VM.Allocate');
  const canClone = privileges.has('VM.Clone');
  const canManageFirewall = privileges.has('VM.Config.Network');
  const canVerifyFirewall = privileges.has('Sys.Audit');

  return {
    readOnly: !canPower && !canConsole && !canProvision && !canClone && !canManageFirewall && !canVerifyFirewall,
    canPower,
    canConsole,
    canProvision,
    canClone,
    canManageFirewall,
    canVerifyFirewall,
    privileges: Array.from(privileges).sort()
  };
}

/**
 * Create a termproxy session (xterm.js console) for a VM/CT.
 * Returns ticket, port and user needed to open the websocket.
 */
async function createTermProxy(clusterUrl, apiToken, node, type, vmid) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const kind = type === 'lxc' ? 'lxc' : 'qemu';
  const response = await client.post(`/api2/json/nodes/${node}/${kind}/${vmid}/termproxy`, {});
  ensureSuccess(response, 'Konsole konnte nicht geöffnet werden:');
  const data = response.data?.data || {};
  return { ticket: data.ticket, port: data.port, user: data.user };
}

/**
 * List online cluster nodes sorted by free memory (best target first).
 */
async function getOnlineNodes(clusterUrl, apiToken) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const response = await client.get('/api2/json/cluster/resources?type=node');
  ensureSuccess(response, 'Proxmox Node-Abfrage fehlgeschlagen:');
  const nodes = (response.data?.data || [])
    .filter(item => item.type === 'node' && item.status === 'online')
    .map(item => ({
      node: item.node,
      freeMem: Number(item.maxmem || 0) - Number(item.mem || 0)
    }))
    .sort((a, b) => b.freeMem - a.freeMem);
  return nodes;
}


function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function percentOf(value, max) {
  const used = safeNumber(value);
  const total = safeNumber(max);
  if (!total) return 0;
  return Math.min(Math.max((used / total) * 100, 0), 100);
}

function normalizeTemperatureValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > -50 && value < 150 ? value : null;
  }

  if (typeof value === 'string') {
    const match = value.trim().match(/(-?\d+(?:\.\d+)?)\s*(?:°?\s*c|celsius)?/i);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) && parsed > -50 && parsed < 150 ? parsed : null;
  }

  return null;
}

function buildTemperatureSummary(values, source = 'proxmox') {
  const clean = (values || [])
    .map(normalizeTemperatureValue)
    .filter(value => value !== null);

  if (!clean.length) return null;

  const max = Math.max(...clean);
  const avg = clean.reduce((sum, value) => sum + value, 0) / clean.length;
  return {
    current: avg,
    max,
    count: clean.length,
    source
  };
}

function mergeTemperatureSummaries(...summaries) {
  const values = [];
  let source = '';

  summaries.filter(Boolean).forEach(summary => {
    if (summary.current !== undefined && summary.current !== null) values.push(summary.current);
    if (summary.max !== undefined && summary.max !== null) values.push(summary.max);
    if (!source && summary.source) source = summary.source;
  });

  return buildTemperatureSummary(values, source || 'proxmox');
}

function collectSensorTemperatures(value, list = [], trustedThermalState = false, parentKey = '') {
  if (value === null || value === undefined) return list;

  const keyName = String(parentKey || '').toLowerCase();
  const isTemperatureContext = trustedThermalState || /(temp|thermal|temperature|core|package|cpu|tctl|tdie|composite)/i.test(keyName);
  const isSensorReadingKey = /(temp|thermal|temperature)/i.test(keyName) && !/(crit|max|high|alarm|label|offset|lowest|highest|limit)/i.test(keyName);

  if (typeof value !== 'object') {
    const parsed = normalizeTemperatureValue(value);
    if (parsed !== null && (trustedThermalState || isSensorReadingKey || (isTemperatureContext && typeof value === 'string' && /(?:°?\s*c|celsius)/i.test(value)))) {
      list.push(parsed);
    }
    return list;
  }

  if (Array.isArray(value)) {
    value.forEach(item => collectSensorTemperatures(item, list, trustedThermalState, parentKey));
    return list;
  }

  Object.entries(value).forEach(([key, entry]) => {
    const childKey = String(key || '').toLowerCase();
    const childTrusted = trustedThermalState || /thermalstate|thermal_state/.test(childKey);

    if (entry && typeof entry === 'object') {
      const candidates = [entry.input, entry.value, entry.current, entry.temp, entry.temperature, entry.reading];
      candidates.forEach(candidate => {
        const parsed = normalizeTemperatureValue(candidate);
        if (parsed !== null && (childTrusted || /(temp|thermal|temperature|current|input|value|reading)/i.test(childKey))) {
          list.push(parsed);
        }
      });
    }

    collectSensorTemperatures(entry, list, childTrusted, childKey);
  });

  return list;
}

function extractStatusTemperatures(status) {
  const values = [];
  collectSensorTemperatures(status?.thermalstate, values, true, 'thermalstate');
  collectSensorTemperatures(status?.thermal_state, values, true, 'thermal_state');
  collectSensorTemperatures(status?.sensors, values, false, 'sensors');
  return buildTemperatureSummary(values, 'node-status');
}

async function getNodeSensors(client, node) {
  const endpoints = [
    `/api2/json/nodes/${node}/sensors`,
    `/api2/json/nodes/${node}/hardware/sensors`
  ];

  for (const endpoint of endpoints) {
    const response = await client.get(endpoint);
    if (response.status < 200 || response.status >= 300) continue;
    const values = collectSensorTemperatures(response.data?.data || [], [], false, 'sensors');
    const summary = buildTemperatureSummary(values, endpoint.includes('hardware') ? 'hardware-sensors' : 'sensors');
    if (summary) return summary;
  }

  return null;
}

async function getNodeStorageSummary(client, node) {
  const response = await client.get(`/api2/json/nodes/${node}/storage`);
  if (response.status < 200 || response.status >= 300) return { used: 0, total: 0, items: [] };

  const items = (response.data?.data || [])
    .filter(item => item && item.storage)
    .filter(item => item.enabled !== 0 && item.active !== 0 && item.status !== 'disabled')
    .map(item => {
      const total = safeNumber(item.total || item.maxdisk || 0);
      const used = safeNumber(item.used || item.disk || 0);
      return {
        storage: item.storage,
        type: item.type || '',
        shared: item.shared === true || item.shared === 1 || item.shared === '1',
        used,
        total,
        percent: percentOf(used, total)
      };
    })
    .filter(item => item.total > 0)
    .sort((a, b) => b.percent - a.percent);

  return {
    used: items.reduce((sum, item) => sum + item.used, 0),
    total: items.reduce((sum, item) => sum + item.total, 0),
    items
  };
}

function isSharedStorageItem(item) {
  const type = String(item?.type || '').toLowerCase();
  return item?.shared === true || item?.shared === 1 || item?.shared === '1' ||
    ['rbd', 'cephfs', 'nfs', 'cifs', 'pbs', 'iscsi', 'iscsidirect', 'glusterfs', 'zfs over iscsi'].includes(type);
}

function summarizeClusterStorage(nodes) {
  const unique = new Map();

  (nodes || []).forEach(node => {
    (node.storages || []).forEach(item => {
      const total = safeNumber(item.total);
      if (!item || !item.storage || total <= 0) return;

      const storageKey = isSharedStorageItem(item)
        ? `shared:${item.storage}:${item.type || ''}`
        : `node:${node.node}:${item.storage}:${item.type || ''}`;

      if (!unique.has(storageKey)) {
        unique.set(storageKey, item);
        return;
      }

      const existing = unique.get(storageKey);
      if (safeNumber(item.total) > safeNumber(existing.total)) unique.set(storageKey, item);
    });
  });

  const items = Array.from(unique.values());
  const used = items.reduce((sum, item) => sum + safeNumber(item.used), 0);
  const total = items.reduce((sum, item) => sum + safeNumber(item.total), 0);

  return {
    used,
    total,
    percent: percentOf(used, total),
    items
  };
}

async function getNodeStatusSummary(client, nodeResource) {
  const nodeName = nodeResource.node;
  const isOnline = nodeResource.status === 'online';
  let status = {};
  let storage = { used: 0, total: 0, items: [] };
  let sensors = null;

  if (isOnline) {
    const [statusResult, storageResult, sensorResult] = await Promise.allSettled([
      client.get(`/api2/json/nodes/${nodeName}/status`),
      getNodeStorageSummary(client, nodeName),
      getNodeSensors(client, nodeName)
    ]);

    if (statusResult.status === 'fulfilled' && statusResult.value.status >= 200 && statusResult.value.status < 300) {
      status = statusResult.value.data?.data || {};
    }
    if (storageResult.status === 'fulfilled') storage = storageResult.value;
    if (sensorResult.status === 'fulfilled') sensors = sensorResult.value;

    const statusTemperatures = extractStatusTemperatures(status);
    if (statusTemperatures) sensors = mergeTemperatureSummaries(statusTemperatures, sensors);
  }

  const memory = status.memory || {};
  const rootfs = status.rootfs || {};
  const cpuinfo = status.cpuinfo || {};
  const cpu = safeNumber(status.cpu, safeNumber(nodeResource.cpu));
  const maxcpu = safeNumber(cpuinfo.cpus, safeNumber(nodeResource.maxcpu));
  const mem = safeNumber(memory.used, safeNumber(nodeResource.mem));
  const maxmem = safeNumber(memory.total, safeNumber(nodeResource.maxmem));
  const rootUsed = safeNumber(rootfs.used, safeNumber(nodeResource.disk));
  const rootTotal = safeNumber(rootfs.total, safeNumber(nodeResource.maxdisk));
  const uptime = safeNumber(status.uptime, safeNumber(nodeResource.uptime));

  return {
    node: nodeName,
    status: nodeResource.status || 'unknown',
    cpu,
    maxcpu,
    cpuPercent: Math.min(Math.max(cpu * 100, 0), 100),
    loadavg: Array.isArray(status.loadavg) ? status.loadavg.map(value => String(value)) : [],
    mem,
    maxmem,
    memPercent: percentOf(mem, maxmem),
    rootUsed,
    rootTotal,
    rootPercent: percentOf(rootUsed, rootTotal),
    storageUsed: storage.used,
    storageTotal: storage.total,
    storagePercent: percentOf(storage.used, storage.total),
    storages: storage.items.slice(0, 4),
    uptime,
    temperature: sensors
  };
}

async function getClusterDashboardStats(clusterUrl, apiToken) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const response = await client.get('/api2/json/cluster/resources?type=node');
  ensureSuccess(response, 'Proxmox Node-Status konnte nicht geladen werden:');

  const nodeResources = (response.data?.data || [])
    .filter(item => item.type === 'node' && item.node)
    .sort((a, b) => String(a.node).localeCompare(String(b.node), undefined, { numeric: true }));

  const settled = await Promise.allSettled(nodeResources.map(item => getNodeStatusSummary(client, item)));
  const nodes = settled.map((result, index) => {
    if (result.status === 'fulfilled') return result.value;
    const fallback = nodeResources[index] || {};
    return {
      node: fallback.node || 'unknown',
      status: fallback.status || 'unknown',
      cpu: safeNumber(fallback.cpu),
      maxcpu: safeNumber(fallback.maxcpu),
      cpuPercent: Math.min(Math.max(safeNumber(fallback.cpu) * 100, 0), 100),
      loadavg: [],
      mem: safeNumber(fallback.mem),
      maxmem: safeNumber(fallback.maxmem),
      memPercent: percentOf(fallback.mem, fallback.maxmem),
      rootUsed: safeNumber(fallback.disk),
      rootTotal: safeNumber(fallback.maxdisk),
      rootPercent: percentOf(fallback.disk, fallback.maxdisk),
      storageUsed: 0,
      storageTotal: 0,
      storagePercent: 0,
      storages: [],
      uptime: safeNumber(fallback.uptime),
      temperature: null,
      error: result.reason?.message || 'Node status unavailable'
    };
  });

  const totals = nodes.reduce((acc, node) => {
    acc.nodes += 1;
    if (node.status === 'online') acc.online += 1;
    acc.cpuPercentSum += safeNumber(node.cpuPercent);
    acc.cpuSamples += node.status === 'online' ? 1 : 0;
    acc.mem += safeNumber(node.mem);
    acc.maxmem += safeNumber(node.maxmem);
    acc.rootUsed += safeNumber(node.rootUsed);
    acc.rootTotal += safeNumber(node.rootTotal);
    return acc;
  }, { nodes: 0, online: 0, cpuPercentSum: 0, cpuSamples: 0, mem: 0, maxmem: 0, rootUsed: 0, rootTotal: 0 });

  const clusterStorage = summarizeClusterStorage(nodes);

  return {
    nodes,
    totals: {
      nodes: totals.nodes,
      online: totals.online,
      cpuPercent: totals.cpuSamples ? totals.cpuPercentSum / totals.cpuSamples : 0,
      mem: totals.mem,
      maxmem: totals.maxmem,
      memPercent: percentOf(totals.mem, totals.maxmem),
      rootUsed: totals.rootUsed,
      rootTotal: totals.rootTotal,
      rootPercent: percentOf(totals.rootUsed, totals.rootTotal),
      storageUsed: clusterStorage.used,
      storageTotal: clusterStorage.total,
      storagePercent: clusterStorage.percent
    }
  };
}

/**
 * LXC templates available on a template storage of a node.
 */
async function getNodeTemplates(clusterUrl, apiToken, node, storage) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const response = await client.get(`/api2/json/nodes/${node}/storage/${storage}/content?content=vztmpl`);
  if (response.status < 200 || response.status >= 300) return [];
  return (response.data?.data || []).map(item => ({
    volid: item.volid,
    name: String(item.volid || '').split('/').pop()
  }));
}

/**
 * Prepared Proxmox LXC templates. These are existing CTs converted to a
 * template and are provisioned exclusively through a full clone.
 */
async function getPreparedLxcTemplates(clusterUrl, apiToken) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const resources = await getClusterResources(clusterUrl, apiToken);
  const templates = resources.filter(item => item.type === 'lxc' && Number(item.template) === 1);
  const result = [];

  for (const item of templates) {
    try {
      const configResponse = await client.get(`/api2/json/nodes/${item.node}/lxc/${item.vmid}/config`);
      ensureSuccess(configResponse, 'LXC template configuration could not be read:');
      const config = configResponse.data?.data || {};
      const rootfs = parseDiskDefinition('rootfs', config.rootfs);
      const rootBytes = Number(rootfs?.maxdisk || item.maxdisk || 0);
      const minDiskGb = Math.max(4, Math.ceil(rootBytes / (1024 ** 3)) || 4);
      const name = String(config.hostname || item.name || `LXC ${item.vmid}`).trim();
      const rootStorage = rootfs?.storage || '';
      result.push({
        volid: `lxc-template:${item.node}:${item.vmid}`,
        name,
        displayName: name,
        storage: rootStorage,
        description: String(config.description || '').trim(),
        tags: String(config.tags || '').trim(),
        osFamily: formatConfiguredOs('lxc', config.ostype || 'l26'),
        osVersion: '',
        sourceType: 'lxc-template',
        sourceNode: item.node,
        sourceVmid: Number(item.vmid),
        minDiskGb
      });
    } catch (_) {
      // A single inaccessible template must not hide the remaining catalog.
    }
  }

  return result.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * ISO images available on a storage of a node (for VM provisioning).
 */
async function getNodeIsos(clusterUrl, apiToken, node, storage) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const response = await client.get(`/api2/json/nodes/${node}/storage/${storage}/content?content=iso`);
  if (response.status < 200 || response.status >= 300) return [];
  return (response.data?.data || []).map(item => ({
    volid: item.volid,
    name: String(item.volid || '').split('/').pop()
  }));
}

/**
 * Storages of a node, optionally filtered by a content type (iso, vztmpl, images, rootdir).
 */
async function getNodeStorages(clusterUrl, apiToken, node, contentType = null) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const response = await client.get(`/api2/json/nodes/${node}/storage`);
  if (response.status < 200 || response.status >= 300) return [];
  return (response.data?.data || [])
    .filter(item => item && item.storage)
    .filter(item => item.enabled !== 0 && item.active !== 0 && item.status !== 'disabled')
    .filter(item => !contentType || String(item.content || '').split(',').map(value => value.trim()).includes(contentType))
    .map(item => ({
      storage: item.storage,
      content: item.content,
      type: item.type,
      active: item.active,
      enabled: item.enabled
    }));
}

/**
 * Next free VMID within the admin-configured range, checked against live cluster IDs.
 */
async function getNextVmidInRange(clusterUrl, apiToken, min, max, reservedIds = []) {
  const resources = await getClusterResources(clusterUrl, apiToken);
  const used = new Set(resources.map(item => Number(item.vmid)));
  reservedIds.forEach(id => used.add(Number(id)));

  for (let vmid = Number(min); vmid <= Number(max); vmid += 1) {
    if (!used.has(vmid)) return vmid;
  }
  throw new Error('Keine freie VMID im konfigurierten Bereich verfügbar.');
}

/**
 * Create an LXC container and return the task UPID.
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForProxmoxTask(client, node, upid, timeoutMs = 180000) {
  if (!upid) return;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await client.get(`/api2/json/nodes/${node}/tasks/${encodeURIComponent(upid)}/status`);
    ensureSuccess(response, 'Proxmox Task-Status konnte nicht gelesen werden:');
    const task = response.data?.data || {};
    if (task.status === 'stopped') {
      if (task.exitstatus && task.exitstatus !== 'OK') {
        throw new Error(`Proxmox task failed: ${task.exitstatus}`);
      }
      return;
    }
    await delay(1000);
  }

  throw new Error('Proxmox task timed out');
}

function ipv4ToLong(ip) {
  const parts = String(ip || '').split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

function longToIpv4(value) {
  const num = Number(value) >>> 0;
  return [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
}

function ipv4NetworkCidr(ip, prefix) {
  const value = ipv4ToLong(ip);
  const bits = Number(prefix);
  if (value === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return null;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return `${longToIpv4(value & mask)}/${bits}`;
}

function ipv4InCidr(ip, cidr) {
  const [network, prefixValue] = String(cidr || '').split('/');
  const value = ipv4ToLong(ip);
  const networkValue = ipv4ToLong(network);
  const prefix = Number(prefixValue);
  if (value === null || networkValue === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (networkValue & mask);
}

function normalizeDnsServers(value) {
  const configured = String(value || process.env.SELF_SERVICE_DNS_SERVERS || '1.1.1.1 1.0.0.1')
    .split(/[\s,;]+/)
    .map(item => item.trim())
    .filter(Boolean);
  const nonPublicRanges = [
    '0.0.0.0/8',
    '10.0.0.0/8',
    '100.64.0.0/10',
    '127.0.0.0/8',
    '169.254.0.0/16',
    '172.16.0.0/12',
    '192.168.0.0/16',
    '224.0.0.0/4',
    '240.0.0.0/4'
  ];
  const valid = configured.filter(item => (
    ipv4ToLong(item) !== null && !nonPublicRanges.some(range => ipv4InCidr(item, range))
  ));
  if (configured.length === 0 || valid.length !== configured.length) {
    throw new Error('Self-service DNS servers must be public IPv4 addresses');
  }
  return Array.from(new Set(valid)).slice(0, 3);
}

function normalizeBlockedDestinations(value) {
  const values = Array.isArray(value)
    ? value
    : String(value || process.env.SELF_SERVICE_BLOCKED_NETWORKS || '')
      .split(/[\s,;]+/);

  return Array.from(new Set(values
    .map(item => String(item || '').trim())
    .filter(item => {
      if (!item) return false;
      const [network, prefixValue] = item.split('/');
      const prefix = prefixValue === undefined ? 32 : Number(prefixValue);
      return ipv4ToLong(network) !== null && Number.isInteger(prefix) && prefix >= 0 && prefix <= 32;
    })
    .map(item => item.includes('/') ? item : `${item}/32`)));
}

function getIsolationDestinations(ip, prefix, additionalDestinations = []) {
  const privateAndLocalRanges = [
    '0.0.0.0/8',
    '10.0.0.0/8',
    '100.64.0.0/10',
    '127.0.0.0/8',
    '169.254.0.0/16',
    '172.16.0.0/12',
    '192.168.0.0/16',
    '224.0.0.0/4',
    '240.0.0.0/4'
  ];
  const guestNetwork = ipv4NetworkCidr(ip, prefix);
  const configuredBlocks = normalizeBlockedDestinations(additionalDestinations);
  const environmentBlocks = normalizeBlockedDestinations(process.env.SELF_SERVICE_BLOCKED_NETWORKS || '');
  return Array.from(new Set([
    guestNetwork,
    ...privateAndLocalRanges,
    ...configuredBlocks,
    ...environmentBlocks
  ].filter(Boolean)));
}

async function getClusterFirewallStatus(clusterUrl, apiToken) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const response = await client.get('/api2/json/cluster/firewall/options');
  if (response.status < 200 || response.status >= 300) {
    throw new Error('Proxmox datacenter firewall status could not be verified');
  }
  return { enabled: Number(response.data?.data?.enable) === 1 };
}

async function addContainerFirewallRule(client, node, vmid, rule) {
  const response = await client.post(`/api2/json/nodes/${node}/lxc/${vmid}/firewall/rules`, {
    enable: 1,
    iface: 'net0',
    ...rule
  });
  ensureSuccess(response, 'Container-Firewallregel konnte nicht erstellt werden:');
}

async function getClusterNodeAddresses(clusterUrl, apiToken) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const addresses = new Set();

  try {
    const clusterStatus = await client.get('/api2/json/cluster/status');
    ensureSuccess(clusterStatus, 'Proxmox Cluster-Status konnte nicht gelesen werden:');
    for (const item of clusterStatus.data?.data || []) {
      if (item.type === 'node' && ipv4ToLong(item.ip) !== null) addresses.add(item.ip);
    }
  } catch (_) {
    // The configured API endpoint is still added below when it is an IPv4 address.
  }

  try {
    const hostname = new URL(clusterUrl).hostname;
    if (ipv4ToLong(hostname) !== null) addresses.add(hostname);
  } catch (_) { /* invalid URLs are handled by the normal Proxmox client path */ }

  return Array.from(addresses);
}

async function applyInternetOnlyIsolation(client, node, vmid, options) {
  // The Datacenter firewall is never disabled or modified here. The portal
  // enables only this container firewall and applies an outbound allow-list.
  const firewallOptions = await client.put(`/api2/json/nodes/${node}/lxc/${vmid}/firewall/options`, {
    enable: 1,
    policy_in: 'ACCEPT',
    policy_out: 'DROP',
    // ipfilter pins each interface to the IP(s) configured in the container's
    // network config (Proxmox auto-populates ipfilter-net0). Even if a root user
    // inside the container changes its IP, packets with a different source IP are
    // dropped at the bridge, so the assigned IP cannot be spoofed or swapped for
    // another container's address. macfilter (on by default) blocks MAC spoofing.
    ipfilter: 1,
    macfilter: 1
  });
  ensureSuccess(firewallOptions, 'Container-Firewall konnte nicht aktiviert werden:');

  const dnsServers = normalizeDnsServers(options.dnsServers);
  for (const dns of dnsServers) {
    await addContainerFirewallRule(client, node, vmid, {
      type: 'out', action: 'ACCEPT', dest: dns, proto: 'udp', dport: '53',
      comment: 'Hosting Portal: allow external DNS'
    });
    await addContainerFirewallRule(client, node, vmid, {
      type: 'out', action: 'ACCEPT', dest: dns, proto: 'tcp', dport: '53',
      comment: 'Hosting Portal: allow external DNS over TCP'
    });
  }

  const blockedDestinations = getIsolationDestinations(
    options.ip,
    options.ipPrefix,
    options.blockedDestinations || []
  );
  for (const destination of blockedDestinations) {
    await addContainerFirewallRule(client, node, vmid, {
      type: 'out', action: 'DROP', dest: destination,
      comment: 'Hosting Portal: block host, guests and non-public IPv4 networks'
    });
  }

  await addContainerFirewallRule(client, node, vmid, {
    type: 'out', action: 'DROP', dest: '::/0',
    comment: 'Hosting Portal: block all IPv6 egress'
  });

  // Rules are evaluated before the default DROP policy. This final rule permits
  // public IPv4 destinations only after all local and lateral destinations were blocked.
  await addContainerFirewallRule(client, node, vmid, {
    type: 'out', action: 'ACCEPT', dest: '0.0.0.0/0',
    comment: 'Hosting Portal: allow public IPv4 internet access'
  });

  return { dnsServers, blockedDestinations };
}

/**
 * Create an LXC container, apply mandatory internet-only isolation and only
 * then start it. If isolation cannot be installed, the new container is
 * removed instead of being started without the required protection.
 */
async function createLxcContainer(clusterUrl, apiToken, node, options) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const firewallStatus = await getClusterFirewallStatus(clusterUrl, apiToken);
  if (!firewallStatus.enabled) {
    throw new Error('Proxmox datacenter firewall is disabled');
  }

  const dnsServers = normalizeDnsServers(options.dnsServers);
  const payload = {
    vmid: options.vmid,
    hostname: options.hostname,
    ostemplate: options.ostemplate,
    storage: options.storage,
    rootfs: `${options.storage}:${options.diskGb}`,
    cores: options.cores,
    memory: options.memoryMb,
    swap: 0,
    password: options.password,
    unprivileged: 1,
    tags: Array.from(new Set(['client-lxc', ...String(options.tags || '').split(/[;,]/).map(tag => tag.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')).filter(Boolean)])).join(';'),
    features: options.profileType === 'docker' ? 'nesting=1,keyctl=1' : 'nesting=1',
    nameserver: dnsServers.join(' '),
    net0: `name=eth0,bridge=${options.bridge},ip=${options.ip}/${options.ipPrefix},gw=${options.gateway},firewall=1`,
    start: 0
  };

  if (typeof options.onProgress === 'function') await options.onProgress('create');
  const response = await client.post(`/api2/json/nodes/${node}/lxc`, payload);
  ensureSuccess(response, 'Container konnte nicht erstellt werden:');
  const createUpid = response.data?.data || '';

  try {
    if (typeof options.onProgress === 'function') await options.onProgress('filesystem');
    await waitForProxmoxTask(client, node, createUpid);
    if (typeof options.onProgress === 'function') await options.onProgress('firewall');
    const isolation = await applyInternetOnlyIsolation(client, node, options.vmid, { ...options, dnsServers });
    if (typeof options.onProgress === 'function') await options.onProgress('start');
    const startResponse = await client.post(`/api2/json/nodes/${node}/lxc/${options.vmid}/status/start`, {});
    ensureSuccess(startResponse, 'Container konnte nach der Absicherung nicht gestartet werden:');
    await waitForProxmoxTask(client, node, startResponse.data?.data || '');
    return {
      upid: startResponse.data?.data || createUpid,
      createUpid,
      node,
      isolation: 'internet-only',
      dnsServers: isolation.dnsServers,
      blockedDestinations: isolation.blockedDestinations
    };
  } catch (error) {
    let cleanupSucceeded = true;
    try {
      const deleteResponse = await client.delete(`/api2/json/nodes/${node}/lxc/${options.vmid}`, {
        params: { purge: 1, force: 1 }
      });
      ensureSuccess(deleteResponse, 'Ungeschützter Container konnte nicht entfernt werden:');
      await waitForProxmoxTask(client, node, deleteResponse.data?.data || '');
    } catch (cleanupError) {
      cleanupSucceeded = false;
      console.error(`Failed to remove stopped LXC ${options.vmid} after isolation error:`, cleanupError.message);
    }
    const isolationError = new Error(cleanupSucceeded
      ? 'Container network isolation failed'
      : 'Container network isolation failed and cleanup was unsuccessful');
    isolationError.cause = error;
    throw isolationError;
  }
}

function normalizeLxcTags(...values) {
  const tags = values
    .flatMap(value => String(value || '').split(/[;,]/))
    .map(tag => tag.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean);
  return Array.from(new Set(['client-lxc', ...tags])).join(';');
}

function buildProxmoxWebSocketUrl(clusterUrl, path, query) {
  const url = new URL(clusterUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = path;
  url.search = new URLSearchParams(query).toString();
  url.hash = '';
  return url.toString();
}

function sendTermProxyInput(socket, value) {
  const input = String(value || '');
  socket.send(`0:${Buffer.byteLength(input, 'utf8')}:${input}`);
}

/**
 * A cloned LXC already contains an /etc/shadow file. Proxmox only accepts the
 * password option while creating/restoring a container, not while updating an
 * existing LXC config. Temporarily use Proxmox cmode=shell and the authenticated
 * termproxy to run chpasswd inside the new clone without requiring node SSH.
 */
async function setClonedLxcRootPassword(client, clusterUrl, apiToken, node, vmid, password) {
  const proxyResponse = await client.post(`/api2/json/nodes/${node}/lxc/${vmid}/termproxy`, {});
  ensureSuccess(proxyResponse, 'Temporary LXC shell could not be opened:');
  const proxy = proxyResponse.data?.data || {};
  if (!proxy.ticket || !proxy.port || !proxy.user) {
    throw new Error('Temporary LXC shell did not return a complete Proxmox ticket');
  }

  const successToken = crypto.randomBytes(12).toString('hex');
  const failureToken = crypto.randomBytes(12).toString('hex');
  const successMarker = `__HOSTING_PORTAL_PASSWORD_OK_${successToken}__`;
  const failureMarker = `__HOSTING_PORTAL_PASSWORD_FAILED_${failureToken}__`;
  const passwordPayload = Buffer.from(`root:${String(password)}\n`, 'utf8').toString('base64');
  // Build each marker from two shell variables so the complete marker never
  // occurs in the echoed command line, even if PTY echo disables slowly.
  const command = `ok_a='__HOSTING_PORTAL_PASSWORD_OK_'; ok_b='${successToken}__'; fail_a='__HOSTING_PORTAL_PASSWORD_FAILED_'; fail_b='${failureToken}__'; printf '%s' '${passwordPayload}' | base64 -d | chpasswd && printf '\n%s%s\n' "$ok_a" "$ok_b" || printf '\n%s%s\n' "$fail_a" "$fail_b"`;
  const target = buildProxmoxWebSocketUrl(
    clusterUrl,
    `/api2/json/nodes/${node}/lxc/${vmid}/vncwebsocket`,
    { port: proxy.port, vncticket: proxy.ticket }
  );

  await new Promise((resolve, reject) => {
    const socket = new WebSocket(target, ['binary'], {
      rejectUnauthorized: false,
      headers: { Authorization: `PVEAPIToken=${apiToken}` }
    });
    let settled = false;
    let output = '';
    let commandTimer = null;
    let passwordCommandTimer = null;
    const timeout = setTimeout(() => finish(new Error('Timed out while setting the cloned LXC root password')), 30000);

    function finish(error = null) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (commandTimer) clearTimeout(commandTimer);
      if (passwordCommandTimer) clearTimeout(passwordCommandTimer);
      try { socket.close(); } catch (_) { /* noop */ }
      if (error) reject(error); else resolve();
    }

    socket.on('open', () => {
      socket.send(`${proxy.user}:${proxy.ticket}\n`);
      socket.send('1:120:34:');
      commandTimer = setTimeout(() => {
        // Disable PTY echo before sending the base64-encoded password payload,
        // so it never appears in Proxmox task or portal logs.
        if (socket.readyState !== WebSocket.OPEN) return;
        sendTermProxyInput(socket, 'stty -echo\r');
        passwordCommandTimer = setTimeout(() => {
          if (socket.readyState === WebSocket.OPEN) sendTermProxyInput(socket, `${command}\r`);
        }, 180);
      }, 500);
    });

    socket.on('message', data => {
      output = (output + (Buffer.isBuffer(data) ? data.toString('utf8') : String(data || ''))).slice(-12000);
      if (output.includes(successMarker)) {
        try { sendTermProxyInput(socket, 'exit\r'); } catch (_) { /* noop */ }
        finish();
      } else if (output.includes(failureMarker)) {
        finish(new Error('The cloned LXC root password could not be written inside the container'));
      }
    });
    socket.on('error', error => finish(new Error(`Temporary LXC shell connection failed: ${error.message || 'unknown error'}`)));
    socket.on('close', () => {
      if (!settled) finish(new Error('Temporary LXC shell closed before the root password was applied'));
    });
  });
}

async function clearContainerFirewallRules(client, node, vmid) {
  const response = await client.get(`/api2/json/nodes/${node}/lxc/${vmid}/firewall/rules`);
  ensureSuccess(response, 'Existing container firewall rules could not be read:');
  const positions = (response.data?.data || [])
    .map(rule => Number(rule.pos))
    .filter(Number.isInteger)
    .sort((a, b) => b - a);
  for (const position of positions) {
    const deleteResponse = await client.delete(`/api2/json/nodes/${node}/lxc/${vmid}/firewall/rules/${position}`);
    ensureSuccess(deleteResponse, 'Existing container firewall rule could not be removed:');
  }
}

/**
 * Create a prepared Proxmox LXC template as a full clone, overwrite all
 * customer-specific resources and network settings, then apply the portal
 * firewall policy before the clone is started.
 */
async function clonePreparedLxcTemplate(clusterUrl, apiToken, sourceNode, sourceVmid, options) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const firewallStatus = await getClusterFirewallStatus(clusterUrl, apiToken);
  if (!firewallStatus.enabled) throw new Error('Proxmox datacenter firewall is disabled');

  const targetNode = options.node || sourceNode;
  const sourceResponse = await client.get(`/api2/json/nodes/${sourceNode}/lxc/${sourceVmid}/config`);
  ensureSuccess(sourceResponse, 'Prepared LXC template could not be read:');
  const sourceConfig = sourceResponse.data?.data || {};
  const dnsServers = normalizeDnsServers(options.dnsServers);
  const clonePayload = {
    newid: options.vmid,
    full: 1,
    hostname: options.hostname,
    storage: options.storage
  };
  if (targetNode && targetNode !== sourceNode) clonePayload.target = targetNode;

  if (typeof options.onProgress === 'function') await options.onProgress('clone');
  const cloneResponse = await client.post(`/api2/json/nodes/${sourceNode}/lxc/${sourceVmid}/clone`, clonePayload);
  ensureSuccess(cloneResponse, 'Prepared LXC template could not be cloned:');
  const cloneUpid = cloneResponse.data?.data || '';

  try {
    await waitForProxmoxTask(client, sourceNode, cloneUpid, 600000);
    if (typeof options.onProgress === 'function') await options.onProgress('configure');

    const clonedResponse = await client.get(`/api2/json/nodes/${targetNode}/lxc/${options.vmid}/config`);
    ensureSuccess(clonedResponse, 'Cloned LXC configuration could not be read:');
    const clonedConfig = clonedResponse.data?.data || {};
    const extraNetworks = Object.keys(clonedConfig).filter(key => /^net\d+$/.test(key) && key !== 'net0');

    // Apply cloned-container settings after the full clone has completed. Keep
    // the requests separate so Proxmox can report the exact rejected setting
    // and so deleting inherited interfaces cannot invalidate the main update.
    if (extraNetworks.length) {
      const deleteNetworksResponse = await client.put(`/api2/json/nodes/${targetNode}/lxc/${options.vmid}/config`, {
        delete: extraNetworks.join(',')
      });
      ensureSuccess(deleteNetworksResponse, 'Inherited LXC network interfaces could not be removed:');
    }

    const identityResponse = await client.put(`/api2/json/nodes/${targetNode}/lxc/${options.vmid}/config`, {
      hostname: options.hostname,
      cores: options.cores,
      memory: options.memoryMb,
      swap: 0,
      tags: normalizeLxcTags(sourceConfig.tags, options.tags),
      onboot: 0,
      console: 1,
      tty: 2,
      // Proxmox has no password field on the existing-LXC config endpoint.
      // Shell mode is used only for the backend-only password initialization
      // after startup and is changed back to tty before provisioning completes.
      cmode: 'shell'
    });
    ensureSuccess(identityResponse, 'Cloned LXC identity and resource settings could not be applied:');

    const networkPayload = {
      net0: `name=eth0,bridge=${options.bridge},ip=${options.ip}/${options.ipPrefix},gw=${options.gateway},firewall=1`
    };
    if (dnsServers.length) networkPayload.nameserver = dnsServers.join(' ');
    const networkResponse = await client.put(`/api2/json/nodes/${targetNode}/lxc/${options.vmid}/config`, networkPayload);
    ensureSuccess(networkResponse, 'Cloned LXC network settings could not be applied:');

    // Validate the requested disk size against the template here, but perform the
    // actual resize online after the container has started (further below) so
    // Proxmox grows the ext4/xfs filesystem with resize2fs and not only the
    // underlying volume. An offline resize on dir/raw storage can leave the
    // filesystem at the template size even though the block device already
    // reports the larger size.
    const rootfs = parseDiskDefinition('rootfs', clonedConfig.rootfs);
    const currentDiskGb = Math.ceil(Number(rootfs?.maxdisk || 0) / (1024 ** 3));
    if (currentDiskGb && Number(options.diskGb) < currentDiskGb) {
      throw new Error(`Prepared LXC template requires at least ${currentDiskGb} GB disk space`);
    }

    if (typeof options.onProgress === 'function') await options.onProgress('firewall');
    await clearContainerFirewallRules(client, targetNode, options.vmid);
    const isolation = await applyInternetOnlyIsolation(client, targetNode, options.vmid, { ...options, dnsServers });

    if (typeof options.onProgress === 'function') await options.onProgress('start');
    const startResponse = await client.post(`/api2/json/nodes/${targetNode}/lxc/${options.vmid}/status/start`, {});
    ensureSuccess(startResponse, 'Cloned LXC could not be started after reconfiguration:');
    await waitForProxmoxTask(client, targetNode, startResponse.data?.data || '');

    // Grow the disk while the container is running so Proxmox runs resize2fs and
    // the root filesystem fills the requested size. Wait for the task so it
    // releases the container config lock before the next steps run.
    if (!currentDiskGb || Number(options.diskGb) > currentDiskGb) {
      if (typeof options.onProgress === 'function') await options.onProgress('filesystem');
      const resizeResponse = await client.put(`/api2/json/nodes/${targetNode}/lxc/${options.vmid}/resize`, {
        disk: 'rootfs',
        size: `${options.diskGb}G`
      });
      ensureSuccess(resizeResponse, 'Cloned LXC disk size could not be applied:');
      await waitForProxmoxTask(client, targetNode, resizeResponse.data?.data || '');
    }

    if (typeof options.onProgress === 'function') await options.onProgress('password');
    await setClonedLxcRootPassword(client, clusterUrl, apiToken, targetNode, options.vmid, options.password);

    // Never leave a self-service container in no-login shell console mode.
    // tty gives the user the normal password-protected LXC console afterwards.
    const consoleResponse = await client.put(`/api2/json/nodes/${targetNode}/lxc/${options.vmid}/config`, {
      cmode: 'tty',
      console: 1,
      tty: 2
    });
    ensureSuccess(consoleResponse, 'The cloned LXC console mode could not be secured:');

    // cmode/console/tty are pending LXC settings: the running container keeps the
    // no-login shell console used for password initialization until it is fully
    // stopped and started again. Cycle it so the tty (login, password-protected)
    // console becomes active and the user's console opens at a normal login shell
    // (root@host:~#) instead of a raw /root shell with an unset HOME.
    if (typeof options.onProgress === 'function') await options.onProgress('restart');
    const stopResponse = await client.post(`/api2/json/nodes/${targetNode}/lxc/${options.vmid}/status/stop`, {});
    ensureSuccess(stopResponse, 'Cloned LXC could not be stopped to apply the console mode:');
    await waitForProxmoxTask(client, targetNode, stopResponse.data?.data || '', 120000);
    const restartResponse = await client.post(`/api2/json/nodes/${targetNode}/lxc/${options.vmid}/status/start`, {});
    ensureSuccess(restartResponse, 'Cloned LXC could not be started after applying the console mode:');
    await waitForProxmoxTask(client, targetNode, restartResponse.data?.data || '');

    return {
      upid: startResponse.data?.data || cloneUpid,
      cloneUpid,
      node: targetNode,
      isolation: 'internet-only',
      dnsServers: isolation.dnsServers,
      blockedDestinations: isolation.blockedDestinations
    };
  } catch (error) {
    let cleanupSucceeded = true;
    try {
      const deleteResponse = await client.delete(`/api2/json/nodes/${targetNode}/lxc/${options.vmid}`, {
        params: { purge: 1, force: 1 }
      });
      ensureSuccess(deleteResponse, 'Failed clone could not be removed:');
      await waitForProxmoxTask(client, targetNode, deleteResponse.data?.data || '');
    } catch (cleanupError) {
      cleanupSucceeded = false;
      console.error(`Failed to remove cloned LXC ${options.vmid}:`, cleanupError.message);
    }
    const cloneError = new Error(cleanupSucceeded
      ? String(error?.message || 'Prepared LXC template clone failed')
      : `${String(error?.message || 'Prepared LXC template clone failed')} and cleanup was unsuccessful`);
    cloneError.cause = error;
    throw cloneError;
  }
}

/**
 * Destroy a VM or LXC and return the task UPID. Used only for user-owned
 * self-service machines after the backend has verified ownership.
 */
async function destroyProxmoxResource(clusterUrl, apiToken, node, type, vmid) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const kind = type === 'lxc' ? 'lxc' : 'qemu';
  const params = type === 'lxc'
    ? { purge: 1, force: 1 }
    : { purge: 1, 'destroy-unreferenced-disks': 1, skiplock: 1 };

  const response = await client.delete(`/api2/json/nodes/${node}/${kind}/${vmid}`, { params });
  ensureSuccess(response, 'Maschine konnte nicht gelöscht werden:');
  return { upid: response.data?.data || '', node };
}

/**
 * Create an empty QEMU VM booting from an ISO and return the task UPID.
 * Network is configured but the guest OS must be installed via the console.
 */
async function createQemuVm(clusterUrl, apiToken, node, options) {
  const client = createProxmoxClient(clusterUrl, apiToken);
  const payload = {
    vmid: options.vmid,
    name: options.hostname,
    cores: options.cores,
    sockets: 1,
    memory: options.memoryMb,
    scsihw: 'virtio-scsi-single',
    scsi0: `${options.storage}:${options.diskGb},iothread=1`,
    ide2: `${options.iso},media=cdrom`,
    net0: `virtio,bridge=${options.bridge},firewall=1`,
    ostype: 'l26',
    boot: 'order=ide2;scsi0',
    agent: 1
  };

  const response = await client.post(`/api2/json/nodes/${node}/qemu`, payload);
  ensureSuccess(response, 'VM konnte nicht erstellt werden:');
  return { upid: response.data?.data || '', node };
}

module.exports = {
  getAllContainers,
  getClusterResources,
  getContainerDetails,
  getContainerIps,
  getResourceDiskDetails,
  testConnection,
  createProxmoxClient,
  powerAction,
  getVmTasks,
  getTaskLog,
  getTaskStatus,
  getCapabilities,
  getClusterFirewallStatus,
  getClusterNodeAddresses,
  createTermProxy,
  getOnlineNodes,
  getClusterDashboardStats,
  getNodeTemplates,
  getPreparedLxcTemplates,
  getNodeIsos,
  getNodeStorages,
  getNextVmidInRange,
  createLxcContainer,
  clonePreparedLxcTemplate,
  createQemuVm,
  destroyProxmoxResource,
  POWER_ACTIONS
};
