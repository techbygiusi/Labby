const storageKey = 'labby-data-v8';
const themeKey = 'labby-theme';
const types = ['hardware', 'vm', 'lxc', 'app', 'network'];
const networkPalette = ['#3b82f6', '#10b981', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#14b8a6', '#84cc16', '#06b6d4', '#8b5cf6'];

const boards = document.getElementById('boards');
const stats = document.getElementById('stats');
const form = document.getElementById('resource-form');
const typeSelect = document.getElementById('type');
const seedDemo = document.getElementById('seed-demo');
const clearAll = document.getElementById('clear-all');
const themeToggle = document.getElementById('theme-toggle');
const template = document.getElementById('item-template');
const hostedOnSelect = document.getElementById('hosted-on');
const hostedOnWrap = document.getElementById('hosted-on-wrap');
const appHostedOnSelect = document.getElementById('app-hosted-on');
const appHostedOnWrap = document.getElementById('app-hosted-on-wrap');
const networkFields = document.getElementById('network-fields');
const ipInput = document.getElementById('ip-address');
const computeFields = document.getElementById('compute-fields');
const cpuInput = document.getElementById('cpu');
const ramInput = document.getElementById('ram');
const disksInput = document.getElementById('disks');
const ipPortInput = document.getElementById('ip-port');
const ipPortWrap = document.getElementById('ip-port-wrap');
const webUrlInput = document.getElementById('web-url');
const webUrlWrap = document.getElementById('web-url-wrap');
const notesInput = document.getElementById('notes');
const notesWrap = document.getElementById('notes-wrap');
const subnetInput = document.getElementById('subnet');
const gatewayInput = document.getElementById('gateway');
const colorPicker = document.getElementById('network-color-picker');
const cancelEditBtn = document.getElementById('cancel-edit');
const saveBtn = document.getElementById('save-btn');
const formTitle = document.getElementById('form-title');
const searchInput = document.getElementById('search');
const filterType = document.getElementById('filter-type');
const exportBtn = document.getElementById('export-btn');
const importFile = document.getElementById('import-file');
const treeToggle = document.getElementById('tree-toggle');
const treeClose = document.getElementById('tree-close');
const treeDialog = document.getElementById('tree-dialog');
const treeContent = document.getElementById('tree-content');
const configToggle = document.getElementById('config-toggle');
const configClose = document.getElementById('config-close');
const configDialog = document.getElementById('config-dialog');

let editingId = null;
let selectedNetworkColor = networkPalette[0];
let items = sanitizeItems(loadItems());

initColorPicker();
initTheme();
applyTypeVisibility();
render();

typeSelect.addEventListener('change', applyTypeVisibility);

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const type = typeSelect.value;
  const name = document.getElementById('name').value.trim();
  const description = document.getElementById('description').value.trim();
  const notes = notesInput.value.trim();
  const ip = ipInput.value.trim();
  const cpu = cpuInput.value.trim();
  const ram = ramInput.value.trim();
  const disks = disksInput.value.trim();
  const ipPort = ipPortInput.value.trim();
  const webUrl = webUrlInput.value.trim();
  const hostedOn = hostedOnSelect.value || '';
  const appHostedOn = appHostedOnSelect.value || '';
  const subnet = subnetInput.value.trim();
  const gateway = gatewayInput.value.trim();

  if (!name) return;
  if (type === 'network' && (!subnet || !gateway)) {
    alert('Network entries require subnet and gateway.');
    return;
  }

  const payload = {
    type,
    name,
    description,
    notes: supportsNotes(type) ? notes : '',
    ip: ['hardware', 'vm', 'lxc'].includes(type) ? ip : '',
    cpu: supportsComputeDetails(type) ? cpu : '',
    ram: supportsComputeDetails(type) ? ram : '',
    disks: supportsComputeDetails(type) ? disks : '',
    ipPort: type === 'app' ? ipPort : '',
    webUrl: type === 'app' ? webUrl : '',
    subnet: type === 'network' ? subnet : '',
    gateway: type === 'network' ? gateway : '',
    networkColor: type === 'network' ? selectedNetworkColor : '',
    hostedOn: ['vm', 'lxc'].includes(type) ? hostedOn : '',
    appHostedOn: type === 'app' ? appHostedOn : '',
    connections: [],
  };

  if (editingId) {
    const existing = findById(editingId);
    if (!existing) return;
    Object.assign(existing, payload);
    stopEditing();
  } else {
    items.push({ id: `${type}-${Date.now()}`, ...payload });
  }

  normalizeItems();
  saveItems();
  form.reset();
  setSelectedColor(networkPalette[0]);
  applyTypeVisibility();
  render();
});

cancelEditBtn.addEventListener('click', () => {
  stopEditing();
  form.reset();
  setSelectedColor(networkPalette[0]);
  applyTypeVisibility();
  render();
});

searchInput.addEventListener('input', render);
filterType.addEventListener('change', render);

treeToggle.addEventListener('click', () => {
  renderTreeView();
  treeDialog.showModal();
});

treeClose.addEventListener('click', () => treeDialog.close());

configToggle.addEventListener('click', () => configDialog.showModal());
configClose.addEventListener('click', () => configDialog.close());

seedDemo.addEventListener('click', () => {
  items = [
    { id: 'network-1', type: 'network', name: 'Core-LAN', description: 'General clients and internal nodes', notes: 'Main management network', connections: [], ip: '', ipPort: '', webUrl: '', subnet: '10.10.0.0/24', gateway: '10.10.0.1', networkColor: '#10b981', hostedOn: '', appHostedOn: '' },
    { id: 'network-2', type: 'network', name: 'Services', description: 'Private service VLAN', notes: 'Application backends', connections: [], ip: '', ipPort: '', webUrl: '', subnet: '10.20.0.0/24', gateway: '10.20.0.1', networkColor: '#3b82f6', hostedOn: '', appHostedOn: '' },
    { id: 'network-3', type: 'network', name: 'Edge', description: 'Public-facing services', notes: 'Reverse proxy + external endpoints', connections: [], ip: '', ipPort: '', webUrl: '', subnet: '10.30.0.0/24', gateway: '10.30.0.1', networkColor: '#f97316', hostedOn: '', appHostedOn: '' },

    { id: 'hardware-1', type: 'hardware', name: 'Host-A', description: 'Primary virtualization node', notes: 'Rack U2', connections: [], ip: '10.10.0.10/24', cpu: '16 cores', ram: '64 GB', disks: '2x 2TB NVMe', ipPort: '', webUrl: '', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: '' },
    { id: 'hardware-2', type: 'hardware', name: 'Host-B', description: 'Secondary compute node', notes: 'Rack U3', connections: [], ip: '10.10.0.11/24', cpu: '12 cores', ram: '48 GB', disks: '1x 2TB SSD', ipPort: '', webUrl: '', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: '' },
    { id: 'hardware-3', type: 'hardware', name: 'Host-C', description: 'Storage-focused node', notes: 'Rack U4', connections: [], ip: '10.10.0.12/24', cpu: '8 cores', ram: '32 GB', disks: '4x 4TB HDD', ipPort: '', webUrl: '', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: '' },

    { id: 'vm-1', type: 'vm', name: 'vm-apps-01', description: 'Container runtime host', notes: 'Ubuntu 24.04 LTS', connections: [], ip: '10.20.0.21/24', cpu: '6 vCPU', ram: '12 GB', disks: '120 GB', ipPort: '', webUrl: '', subnet: '', gateway: '', networkColor: '', hostedOn: 'hardware-1', appHostedOn: '' },
    { id: 'vm-2', type: 'vm', name: 'vm-apps-02', description: 'Media and automation host', notes: 'Debian 12', connections: [], ip: '10.20.0.22/24', cpu: '8 vCPU', ram: '16 GB', disks: '240 GB', ipPort: '', webUrl: '', subnet: '', gateway: '', networkColor: '', hostedOn: 'hardware-2', appHostedOn: '' },
    { id: 'vm-3', type: 'vm', name: 'vm-edge-01', description: 'Edge ingress and auth', notes: 'Hardened profile', connections: [], ip: '10.30.0.30/24', cpu: '4 vCPU', ram: '8 GB', disks: '100 GB', ipPort: '', webUrl: '', subnet: '', gateway: '', networkColor: '', hostedOn: 'hardware-2', appHostedOn: '' },

    { id: 'lxc-1', type: 'lxc', name: 'lxc-dns-01', description: 'Recursive DNS resolver', notes: 'Internal only', connections: [], ip: '10.10.0.40/24', cpu: '2 vCPU', ram: '2 GB', disks: '20 GB', ipPort: '', webUrl: '', subnet: '', gateway: '', networkColor: '', hostedOn: 'hardware-1', appHostedOn: '' },
    { id: 'lxc-2', type: 'lxc', name: 'lxc-monitor-01', description: 'Monitoring stack', notes: 'Node exporter + dashboard', connections: [], ip: '10.20.0.41/24', cpu: '2 vCPU', ram: '4 GB', disks: '40 GB', ipPort: '', webUrl: '', subnet: '', gateway: '', networkColor: '', hostedOn: 'hardware-3', appHostedOn: '' },

    { id: 'app-1', type: 'app', name: 'PhotoVault', description: 'Photo management', notes: '', connections: [], ip: '', ipPort: '10.20.0.21:2283', webUrl: 'https://photos.lab.local', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: 'vm-1' },
    { id: 'app-2', type: 'app', name: 'StreamBox', description: 'Media server', notes: '', connections: [], ip: '', ipPort: '10.20.0.22:8096', webUrl: 'https://media.lab.local', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: 'vm-2' },
    { id: 'app-3', type: 'app', name: 'DocHub', description: 'Internal wiki', notes: '', connections: [], ip: '', ipPort: '10.20.0.22:3000', webUrl: 'https://docs.lab.local', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: 'vm-2' },
    { id: 'app-4', type: 'app', name: 'ProxyGate', description: 'Reverse proxy dashboard', notes: '', connections: [], ip: '', ipPort: '10.30.0.30:443', webUrl: 'https://edge.lab.local', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: 'vm-3' },
    { id: 'app-5', type: 'app', name: 'MetricsUI', description: 'Monitoring frontend', notes: '', connections: [], ip: '', ipPort: '10.20.0.41:3000', webUrl: 'https://metrics.lab.local', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: 'lxc-2' },
  ];
  stopEditing();
  normalizeItems();
  saveItems();
  render();
});

clearAll.addEventListener('click', () => {
  if (!confirm('Delete all resources?')) return;
  items = [];
  stopEditing();
  saveItems();
  render();
});

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  setTheme(current === 'dark' ? 'light' : 'dark');
});

exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'labby-config.json';
  link.click();
  URL.revokeObjectURL(url);
});

importFile.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    items = sanitizeItems(JSON.parse(text));
    stopEditing();
    saveItems();
    render();
  } catch {
    alert('Invalid config file. Please upload a Labby JSON export.');
  } finally {
    importFile.value = '';
  }
});

function initColorPicker() {
  colorPicker.innerHTML = '';
  networkPalette.forEach((color) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-dot';
    btn.style.background = color;
    btn.dataset.color = color;
    btn.addEventListener('click', () => setSelectedColor(color));
    colorPicker.appendChild(btn);
  });
  setSelectedColor(selectedNetworkColor);
}

function setSelectedColor(color) {
  selectedNetworkColor = color;
  colorPicker.querySelectorAll('.color-dot').forEach((dot) => {
    dot.classList.toggle('active', dot.dataset.color === color);
  });
}

function loadItems() {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveItems() {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

function supportsNotes(type) {
  return ['hardware', 'vm', 'lxc', 'network'].includes(type);
}

function supportsComputeDetails(type) {
  return ['hardware', 'vm', 'lxc'].includes(type);
}

function sanitizeItems(raw) {
  if (!Array.isArray(raw)) return [];
  const normalized = raw
    .filter((item) => item?.id && item?.name && item?.type)
    .map((item) => ({
      id: String(item.id),
      type: types.includes(item.type) ? item.type : 'app',
      name: String(item.name),
      description: item.description ? String(item.description) : '',
      notes: item.notes ? String(item.notes) : '',
      connections: Array.isArray(item.connections) ? [...new Set(item.connections.map(String))] : [],
      ip: item.ip ? String(item.ip) : '',
      cpu: item.cpu ? String(item.cpu) : '',
      ram: item.ram ? String(item.ram) : '',
      disks: item.disks ? String(item.disks) : '',
      ipPort: item.ipPort ? String(item.ipPort) : '',
      webUrl: item.webUrl ? String(item.webUrl) : '',
      subnet: item.subnet ? String(item.subnet) : '',
      gateway: item.gateway ? String(item.gateway) : '',
      networkColor: networkPalette.includes(item.networkColor) ? item.networkColor : networkPalette[0],
      hostedOn: item.hostedOn ? String(item.hostedOn) : '',
      appHostedOn: item.appHostedOn ? String(item.appHostedOn) : '',
    }));
  return normalizeList(normalized);
}

function normalizeItems() {
  items = normalizeList(items);
}

function normalizeList(list) {
  const known = new Set(list.map((item) => item.id));
  const hardwareIds = new Set(list.filter((item) => item.type === 'hardware').map((item) => item.id));
  const hostableAppIds = new Set(list.filter((item) => item.type === 'vm' || item.type === 'lxc').map((item) => item.id));

  const normalized = list.map((item) => {
    const next = { ...item };
    next.connections = next.connections.filter((id) => known.has(id) && id !== next.id);
    if (!supportsNotes(next.type)) next.notes = '';
    if (!['hardware', 'vm', 'lxc'].includes(next.type)) next.ip = '';
    if (!supportsComputeDetails(next.type)) {
      next.cpu = '';
      next.ram = '';
      next.disks = '';
    }
    if (next.type !== 'app') {
      next.ipPort = '';
      next.webUrl = '';
      next.appHostedOn = '';
    }
    if (next.type !== 'network') {
      next.subnet = '';
      next.gateway = '';
      next.networkColor = '';
    } else if (!networkPalette.includes(next.networkColor)) {
      next.networkColor = networkPalette[0];
    }
    if (!['vm', 'lxc'].includes(next.type) || !hardwareIds.has(next.hostedOn)) next.hostedOn = '';
    if (next.type === 'app' && !hostableAppIds.has(next.appHostedOn)) next.appHostedOn = '';
    return next;
  });

  return applyAutoConnections(normalized);
}

function applyAutoConnections(list) {
  const byId = Object.fromEntries(list.map((item) => [item.id, item]));
  const networkIdsByItemId = Object.fromEntries(list.map((item) => [item.id, inferNetworks(item, list).map((net) => net.id)]));

  return list.map((item) => {
    const next = { ...item };
    const manual = next.connections.filter((id) => byId[id]);
    const auto = [];

    if (item.type === 'app' && item.appHostedOn && byId[item.appHostedOn]) {
      auto.push(item.appHostedOn);
    }

    const networkIds = networkIdsByItemId[item.id] || [];
    auto.push(...networkIds);

    next.connections = [...new Set([...manual, ...auto])].filter((id) => id !== next.id);
    return next;
  });
}

function inferNetworks(item, list) {
  if (item.type === 'network') return [];
  const networks = list.filter((candidate) => candidate.type === 'network');

  const ips = [];
  if (item.ip) ips.push(item.ip);
  if (item.type === 'app' && item.ipPort) {
    const hostIp = item.ipPort.split(':')[0].trim();
    if (hostIp) ips.push(hostIp);
  }

  return networks.filter((network) => ips.some((ip) => ipInSubnet(ip, network.subnet)));
}

function ipInSubnet(ipWithMask, subnetCidr) {
  const ipPart = String(ipWithMask).split('/')[0].trim();
  const [subnetIp, prefixRaw] = String(subnetCidr).split('/');
  const prefix = Number(prefixRaw);

  const ipInt = toIPv4Int(ipPart);
  const subnetInt = toIPv4Int((subnetIp || '').trim());
  if (ipInt === null || subnetInt === null || Number.isNaN(prefix) || prefix < 0 || prefix > 32) return false;

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (subnetInt & mask);
}

function toIPv4Int(ip) {
  const parts = String(ip).split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return null;
  return (((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0)) >>> 0;
}

function inferNetworks(item, list) {
  if (item.type === 'network') return [];
  const networks = list.filter((candidate) => candidate.type === 'network');

  const ips = [];
  if (item.ip) ips.push(item.ip);
  if (item.type === 'app' && item.ipPort) {
    const hostIp = item.ipPort.split(':')[0].trim();
    if (hostIp) ips.push(hostIp);
  }

  return networks.filter((network) => ips.some((ip) => ipInSubnet(ip, network.subnet)));
}

function ipInSubnet(ipWithMask, subnetCidr) {
  const ipPart = String(ipWithMask).split('/')[0].trim();
  const [subnetIp, prefixRaw] = String(subnetCidr).split('/');
  const prefix = Number(prefixRaw);

  const ipInt = toIPv4Int(ipPart);
  const subnetInt = toIPv4Int((subnetIp || '').trim());
  if (ipInt === null || subnetInt === null || Number.isNaN(prefix) || prefix < 0 || prefix > 32) return false;

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (subnetInt & mask);
}

function toIPv4Int(ip) {
  const parts = String(ip).split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return null;
  return (((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0)) >>> 0;
}

function inferNetworks(item, list) {
  if (item.type === 'network') return [];
  const networks = list.filter((candidate) => candidate.type === 'network');

  const ips = [];
  if (item.ip) ips.push(item.ip);
  if (item.type === 'app' && item.ipPort) {
    const hostIp = item.ipPort.split(':')[0].trim();
    if (hostIp) ips.push(hostIp);
  }

  return networks.filter((network) => ips.some((ip) => ipInSubnet(ip, network.subnet)));
}

function ipInSubnet(ipWithMask, subnetCidr) {
  const ipPart = String(ipWithMask).split('/')[0].trim();
  const [subnetIp, prefixRaw] = String(subnetCidr).split('/');
  const prefix = Number(prefixRaw);

  const ipInt = toIPv4Int(ipPart);
  const subnetInt = toIPv4Int((subnetIp || '').trim());
  if (ipInt === null || subnetInt === null || Number.isNaN(prefix) || prefix < 0 || prefix > 32) return false;

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (subnetInt & mask);
}

function toIPv4Int(ip) {
  const parts = String(ip).split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return null;
  return (((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0)) >>> 0;
}

function inferNetworks(item, list) {
  if (item.type === 'network') return [];
  const networks = list.filter((candidate) => candidate.type === 'network');

  const ips = [];
  if (item.ip) ips.push(item.ip);
  if (item.type === 'app' && item.ipPort) {
    const hostIp = item.ipPort.split(':')[0].trim();
    if (hostIp) ips.push(hostIp);
  }

  return networks.filter((network) => ips.some((ip) => ipInSubnet(ip, network.subnet)));
}

function ipInSubnet(ipWithMask, subnetCidr) {
  const ipPart = String(ipWithMask).split('/')[0].trim();
  const [subnetIp, prefixRaw] = String(subnetCidr).split('/');
  const prefix = Number(prefixRaw);

  const ipInt = toIPv4Int(ipPart);
  const subnetInt = toIPv4Int((subnetIp || '').trim());
  if (ipInt === null || subnetInt === null || Number.isNaN(prefix) || prefix < 0 || prefix > 32) return false;

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (subnetInt & mask);
}

function toIPv4Int(ip) {
  const parts = String(ip).split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return null;
  return (((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0)) >>> 0;
}

function applyTypeVisibility() {
  const type = typeSelect.value;
  const isNetwork = type === 'network';
  const isVmOrLxc = type === 'vm' || type === 'lxc';
  const isApp = type === 'app';
  const supportsIp = type === 'hardware' || isVmOrLxc;
  const supportsCompute = supportsComputeDetails(type);

  networkFields.classList.toggle('hidden', !isNetwork);
  computeFields.classList.toggle('hidden', !supportsCompute);
  hostedOnWrap.classList.toggle('hidden', !isVmOrLxc);
  appHostedOnWrap.classList.toggle('hidden', !isApp);
  ipInput.closest('label').classList.toggle('hidden', !supportsIp);
  ipPortWrap.classList.toggle('hidden', !isApp);
  webUrlWrap.classList.toggle('hidden', !isApp);
  notesWrap.classList.toggle('hidden', !supportsNotes(type));

  subnetInput.required = isNetwork;
  gatewayInput.required = isNetwork;
}

function render() {
  refreshHostOptions();
  refreshAppHostOptions();

  const filtered = applyFilters(items);
  const groups = {
    hardware: filtered.filter((item) => item.type === 'hardware'),
    vm: filtered.filter((item) => item.type === 'vm'),
    lxc: filtered.filter((item) => item.type === 'lxc'),
    app: filtered.filter((item) => item.type === 'app'),
    network: filtered.filter((item) => item.type === 'network'),
  };

  stats.textContent = `${filtered.length} visible / ${items.length} total • ${totalConnections(items)} links`;
  boards.innerHTML = '';

  Object.entries(groups).forEach(([type, list]) => {
    const col = document.createElement('section');
    col.className = 'column';
    col.innerHTML = `<h3>${label(type)} (${list.length})</h3>`;
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'card-desc';
      empty.textContent = 'No resources found.';
      col.appendChild(empty);
    }
    list.forEach((item) => col.appendChild(cardNode(item)));
    boards.appendChild(col);
  });
}

function applyFilters(list) {
  const query = searchInput.value.trim().toLowerCase();
  const selectedType = filterType.value;
  return list.filter((item) => {
    const typeMatch = selectedType === 'all' || item.type === selectedType;
    const networkText = item.type === 'network' ? `${item.subnet} ${item.gateway}` : '';
    const appText = item.type === 'app' ? `${item.ipPort} ${item.webUrl}` : '';
    const specsText = `${item.cpu || ''} ${item.ram || ''} ${item.disks || ''}`;
    const text = `${item.name} ${item.description} ${item.notes} ${item.ip} ${specsText} ${appText} ${networkText}`.toLowerCase();
    return typeMatch && (!query || text.includes(query));
  });
}

function cardNode(item) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.dataset.type = item.type;

  const border = networkBorderColor(item);
  if (border) node.style.borderColor = border;

  node.querySelector('.card-title').textContent = item.name;
  node.querySelector('.card-desc').textContent = item.description || 'No description';
  node.querySelector('.card-notes').textContent = item.notes ? `Notes: ${item.notes}` : '';
  node.querySelector('.card-ip').textContent = item.ip ? `IP: ${item.ip}` : '';
  node.querySelector('.card-app').textContent = item.type === 'app' ? appDetails(item) : '';
  node.querySelector('.card-specs').textContent = specsLabel(item);
  node.querySelector('.card-network').textContent = item.type === 'network' ? `Subnet: ${item.subnet} | Gateway: ${item.gateway}` : '';
  node.querySelector('.card-hosting').textContent = hostingLabel(item);
  node.querySelector('.card-id').textContent = `ID: ${item.id}`;
  node.querySelector('.card-links').textContent = connectionLabel(item);

  node.querySelector('.type-badge').className = `type-badge ${item.type}`;
  node.querySelector('.edit-btn').addEventListener('click', () => startEditing(item.id));
  node.querySelector('.delete-btn').addEventListener('click', () => removeItem(item.id));
  return node;
}

function appDetails(item) {
  const parts = [];
  if (item.ipPort) parts.push(`IP+Port: ${item.ipPort}`);
  if (item.webUrl) parts.push(`URL: ${item.webUrl}`);
  return parts.join(' | ');
}

function specsLabel(item) {
  if (!supportsComputeDetails(item.type)) return '';
  const bits = [];
  if (item.cpu) bits.push(`CPU: ${item.cpu}`);
  if (item.ram) bits.push(`RAM: ${item.ram}`);
  if (item.disks) bits.push(`Disks: ${item.disks}`);
  return bits.length ? bits.join(' | ') : '';
}

function networkBorderColor(item) {
  if (item.type === 'network') return item.networkColor;
  const byId = Object.fromEntries(items.map((entry) => [entry.id, entry]));
  const connectedNetwork = item.connections.map((id) => byId[id]).find((entry) => entry?.type === 'network');
  if (connectedNetwork) return connectedNetwork.networkColor;
  if ((item.type === 'vm' || item.type === 'lxc') && item.hostedOn) {
    const host = byId[item.hostedOn];
    const hostNet = host?.connections.map((id) => byId[id]).find((entry) => entry?.type === 'network');
    return hostNet?.networkColor || '';
  }
  return '';
}

function hostingLabel(item) {
  if (item.type === 'hardware') {
    const guests = items.filter((candidate) => (candidate.type === 'vm' || candidate.type === 'lxc') && candidate.hostedOn === item.id);
    return guests.length ? `Host VMs/LXCs: ${guests.map((guest) => guest.name).join(', ')}` : 'Host VMs/LXCs: none';
  }
  if (item.type === 'vm' || item.type === 'lxc') {
    if (!item.hostedOn) return 'Hosted on: not set';
    const host = findById(item.hostedOn);
    return `Hosted on: ${host ? host.name : item.hostedOn}`;
  }
  if (item.type === 'app') {
    if (!item.appHostedOn) return 'Host application on: not set';
    const host = findById(item.appHostedOn);
    return `Host application on: ${host ? host.name : item.appHostedOn}`;
  }
  return '';
}

function connectionLabel(item) {
  if (!item.connections.length) return 'Connected to: none';
  const byId = Object.fromEntries(items.map((entry) => [entry.id, entry]));
  const names = item.connections.map((id) => byId[id]?.name || id).join(', ');
  return `Connected to: ${names}`;
}

function refreshHostOptions() {
  const selected = hostedOnSelect.value;
  hostedOnSelect.innerHTML = '<option value="">Not set</option>';
  items.filter((item) => item.type === 'hardware').forEach((host) => {
    if (editingId && host.id === editingId) return;
    const option = document.createElement('option');
    option.value = host.id;
    option.textContent = host.name;
    hostedOnSelect.appendChild(option);
  });
  hostedOnSelect.value = selected;
}

function refreshAppHostOptions() {
  const selected = appHostedOnSelect.value;
  appHostedOnSelect.innerHTML = '<option value="">Not set</option>';
  items.filter((item) => item.type === 'vm' || item.type === 'lxc').forEach((host) => {
    if (editingId && host.id === editingId) return;
    const option = document.createElement('option');
    option.value = host.id;
    option.textContent = `${host.name} (${label(host.type)})`;
    appHostedOnSelect.appendChild(option);
  });
  appHostedOnSelect.value = selected;
}

function startEditing(id) {
  const item = findById(id);
  if (!item) return;

  editingId = id;
  formTitle.textContent = `Edit Resource: ${item.name}`;
  saveBtn.textContent = 'Save changes';
  cancelEditBtn.classList.remove('hidden');

  typeSelect.value = item.type;
  document.getElementById('name').value = item.name;
  document.getElementById('description').value = item.description;
  notesInput.value = item.notes || '';
  ipInput.value = item.ip || '';
  cpuInput.value = item.cpu || '';
  ramInput.value = item.ram || '';
  disksInput.value = item.disks || '';
  ipPortInput.value = item.ipPort || '';
  webUrlInput.value = item.webUrl || '';
  subnetInput.value = item.subnet || '';
  gatewayInput.value = item.gateway || '';
  setSelectedColor(item.networkColor || networkPalette[0]);

  applyTypeVisibility();
  refreshHostOptions();
  refreshAppHostOptions();
  hostedOnSelect.value = item.hostedOn || '';
  appHostedOnSelect.value = item.appHostedOn || '';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function stopEditing() {
  editingId = null;
  formTitle.textContent = 'Add Resource';
  saveBtn.textContent = 'Add item';
  cancelEditBtn.classList.add('hidden');
}

function removeItem(id) {
  const target = findById(id);
  if (!target) return;
  if (!confirm(`Delete "${target.name}"?`)) return;

  items = items.filter((item) => item.id !== id);
  normalizeItems();
  if (editingId === id) stopEditing();
  saveItems();
  render();
}

function renderTreeView() {
  const treeShell = document.createElement('div');
  treeShell.className = 'tree-shell';

  treeShell.appendChild(buildInfrastructureTree());
  treeShell.appendChild(buildNetworksTree());

  treeContent.innerHTML = '';
  treeContent.appendChild(treeShell);
}

function buildInfrastructureTree() {
  const section = document.createElement('section');
  section.className = 'tree-section';
  section.innerHTML = '<h4>Infrastructure</h4>';

  const body = document.createElement('div');
  body.className = 'tree-body';

  const hardware = items.filter((item) => item.type === 'hardware');
  const vms = items.filter((item) => item.type === 'vm');
  const lxcs = items.filter((item) => item.type === 'lxc');
  const apps = items.filter((item) => item.type === 'app');

  hardware.forEach((host) => {
    const lane = document.createElement('div');
    lane.className = 'tree-lane';

    lane.appendChild(treeChip(host));
    const hostMeta = infraMeta(host);
    if (hostMeta) lane.appendChild(hostMeta);

    const guestsWrap = document.createElement('div');
    guestsWrap.className = 'tree-children';
    const guests = [...vms, ...lxcs].filter((guest) => guest.hostedOn === host.id);

    if (!guests.length) {
      const none = document.createElement('p');
      none.className = 'tree-empty';
      none.textContent = 'No VMs/LXCs on this hardware';
      guestsWrap.appendChild(none);
    }

    guests.forEach((guest) => {
      const guestLane = document.createElement('div');
      guestLane.className = 'tree-lane nested';
      guestLane.appendChild(treeChip(guest));
      const guestMeta = infraMeta(guest);
      if (guestMeta) guestLane.appendChild(guestMeta);

      const guestApps = apps.filter((app) => app.appHostedOn === guest.id);
      const appWrap = document.createElement('div');
      appWrap.className = 'tree-children';
      if (!guestApps.length) {
        const emptyApp = document.createElement('p');
        emptyApp.className = 'tree-empty';
        emptyApp.textContent = 'No app assigned';
        appWrap.appendChild(emptyApp);
      } else {
        guestApps.forEach((app) => {
          const appLane = document.createElement('div');
          appLane.className = 'tree-lane nested';
          appLane.appendChild(treeChip(app));
          const meta = appMeta(app);
          if (meta) appLane.appendChild(meta);
          appWrap.appendChild(appLane);
        });
      }
      guestLane.appendChild(appWrap);
      guestsWrap.appendChild(guestLane);
    });

    lane.appendChild(guestsWrap);
    body.appendChild(lane);
  });

  const orphanGuests = [...vms, ...lxcs].filter((guest) => !guest.hostedOn);
  if (orphanGuests.length) {
    const orphan = document.createElement('div');
    orphan.className = 'tree-subgroup';
    orphan.innerHTML = '<p class="tree-subtitle">Unassigned VMs/LXCs</p>';
    orphanGuests.forEach((guest) => {
      const row = document.createElement('div');
      row.className = 'tree-lane';
      row.appendChild(treeChip(guest));
      const meta = infraMeta(guest);
      if (meta) row.appendChild(meta);
      orphan.appendChild(row);
    });
    body.appendChild(orphan);
  }

  const orphanApps = apps.filter((app) => !app.appHostedOn);
  if (orphanApps.length) {
    const orphan = document.createElement('div');
    orphan.className = 'tree-subgroup';
    orphan.innerHTML = '<p class="tree-subtitle">Unassigned Apps</p>';
    orphanApps.forEach((app) => {
      const row = document.createElement('div');
      row.className = 'tree-lane';
      row.appendChild(treeChip(app));
      const meta = appMeta(app);
      if (meta) row.appendChild(meta);
      orphan.appendChild(row);
    });
    body.appendChild(orphan);
  }

  if (!hardware.length && !vms.length && !lxcs.length && !apps.length) {
    const empty = document.createElement('p');
    empty.className = 'tree-empty';
    empty.textContent = 'No infrastructure resources yet.';
    body.appendChild(empty);
  }

  section.appendChild(body);
  return section;
}

function buildNetworksTree() {
  const section = document.createElement('section');
  section.className = 'tree-section';
  section.innerHTML = '<h4>Networks (auto-matched by IP/CIDR)</h4>';

  const body = document.createElement('div');
  body.className = 'tree-body';

  const networks = items.filter((item) => item.type === 'network');
  networks.forEach((network) => {
    const lane = document.createElement('div');
    lane.className = 'tree-lane';
    lane.appendChild(treeChip(network));

    const meta = document.createElement('div');
    meta.className = 'tree-meta';
    meta.textContent = `Subnet ${network.subnet} • Gateway ${network.gateway}`;
    lane.appendChild(meta);

    const membersWrap = document.createElement('div');
    membersWrap.className = 'tree-children';
    const members = items.filter((item) => item.type !== 'network' && item.connections.includes(network.id));

    if (!members.length) {
      const empty = document.createElement('p');
      empty.className = 'tree-empty';
      empty.textContent = 'No matched resources';
      membersWrap.appendChild(empty);
    } else {
      members.forEach((member) => {
        const memberLane = document.createElement('div');
        memberLane.className = 'tree-lane nested';
        memberLane.appendChild(treeChip(member));
        membersWrap.appendChild(memberLane);
      });
    }

    lane.appendChild(membersWrap);
    body.appendChild(lane);
  });

  if (!networks.length) {
    const empty = document.createElement('p');
    empty.className = 'tree-empty';
    empty.textContent = 'No network resources yet.';
    body.appendChild(empty);
  }

  section.appendChild(body);
  return section;
}

function treeChip(item) {
  const chip = document.createElement('span');
  chip.className = `tree-chip ${item.type}`;
  chip.textContent = `${icon(item.type)} ${item.name}`;
  return chip;
}

function infraMeta(item) {
  const details = specsLabel(item);
  if (!details && !item.ip) return null;
  const meta = document.createElement('div');
  meta.className = 'tree-meta';
  if (item.ip) {
    const ip = document.createElement('span');
    ip.textContent = `IP: ${item.ip}`;
    meta.appendChild(ip);
  }
  if (details) {
    if (meta.childNodes.length) {
      const dot = document.createElement('span');
      dot.className = 'tree-dot';
      dot.textContent = '•';
      meta.appendChild(dot);
    }
    const d = document.createElement('span');
    d.textContent = details;
    meta.appendChild(d);
  }
  return meta;
}

function appMeta(app) {
  if (!app.ipPort && !app.webUrl) return null;
  const meta = document.createElement('div');
  meta.className = 'tree-meta';

  if (app.ipPort) {
    const ip = document.createElement('span');
    ip.textContent = `IP+Port: ${app.ipPort}`;
    meta.appendChild(ip);
  }

  if (app.webUrl) {
    if (meta.childNodes.length) {
      const dot = document.createElement('span');
      dot.className = 'tree-dot';
      dot.textContent = '•';
      meta.appendChild(dot);
    }
    const link = document.createElement('a');
    link.href = app.webUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'tree-link';
    link.textContent = app.webUrl;
    meta.appendChild(link);
  }

  return meta;
}

function icon(type) {
  if (type === 'network') return '◆';
  return '●';
}

function findById(id) {
  return items.find((item) => item.id === id);
}

function totalConnections(list) {
  return list.reduce((sum, item) => sum + item.connections.length, 0);
}

function label(type) {
  return ({ hardware: 'Hardware', vm: 'VMs', lxc: 'LXCs', app: 'Apps', network: 'Networks' })[type] || type;
}

function initTheme() {
  const saved = localStorage.getItem(themeKey);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(saved || (prefersDark ? 'dark' : 'light'));
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(themeKey, theme);
  themeToggle.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
}
