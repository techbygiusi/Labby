const storageKey = 'labby-data-v7';
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

seedDemo.addEventListener('click', () => {
  items = [
    { id: 'network-1', type: 'network', name: 'LAN', description: 'Main VLAN', notes: 'Client and servers', connections: [], ip: '', ipPort: '', webUrl: '', subnet: '10.10.0.0/24', gateway: '10.10.0.1', networkColor: '#10b981', hostedOn: '', appHostedOn: '' },
    { id: 'network-2', type: 'network', name: 'DMZ', description: 'Public services', notes: 'Reverse proxy edge', connections: [], ip: '', ipPort: '', webUrl: '', subnet: '10.20.0.0/24', gateway: '10.20.0.1', networkColor: '#f97316', hostedOn: '', appHostedOn: '' },
    { id: 'hardware-1', type: 'hardware', name: 'MS-01', description: 'Main Proxmox host', notes: 'Rack shelf A1', connections: [], ip: '10.10.0.10/24', ipPort: '', webUrl: '', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: '' },
    { id: 'vm-1', type: 'vm', name: 'onebitlabs', description: 'Docker workloads', notes: 'Ubuntu 24.04', connections: [], ip: '10.10.0.30/24', ipPort: '', webUrl: '', subnet: '', gateway: '', networkColor: '', hostedOn: 'hardware-1', appHostedOn: '' },
    { id: 'lxc-1', type: 'lxc', name: 'adguard-lxc', description: 'DNS filtering', notes: 'Port 53 internal only', connections: [], ip: '10.10.0.40/24', ipPort: '', webUrl: '', subnet: '', gateway: '', networkColor: '', hostedOn: 'hardware-1', appHostedOn: '' },
    { id: 'app-1', type: 'app', name: 'Immich', description: 'Photos', notes: '', connections: [], ip: '', ipPort: '10.10.0.30:2283', webUrl: 'https://immich.local', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: 'vm-1' },
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

function applyTypeVisibility() {
  const type = typeSelect.value;
  const isNetwork = type === 'network';
  const isVmOrLxc = type === 'vm' || type === 'lxc';
  const isApp = type === 'app';
  const supportsIp = type === 'hardware' || isVmOrLxc;

  networkFields.classList.toggle('hidden', !isNetwork);
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
    const text = `${item.name} ${item.description} ${item.notes} ${item.ip} ${appText} ${networkText}`.toLowerCase();
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
  const byType = {
    hardware: items.filter((item) => item.type === 'hardware'),
    vm: items.filter((item) => item.type === 'vm'),
    lxc: items.filter((item) => item.type === 'lxc'),
    app: items.filter((item) => item.type === 'app'),
    network: items.filter((item) => item.type === 'network'),
  };

  const root = document.createElement('ul');
  root.className = 'tree-root';

  Object.entries(byType).forEach(([type, list]) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${label(type)}</strong> (${list.length})`;
    const child = document.createElement('ul');

    list.forEach((item) => {
      const itemLi = document.createElement('li');
      itemLi.textContent = `${shape(type)} ${item.name}`;
      const details = [];
      if (item.type === 'network') details.push(`subnet ${item.subnet}, gw ${item.gateway}`);
      if (item.ip) details.push(`ip ${item.ip}`);
      if (item.type === 'app' && item.ipPort) details.push(`ip+port ${item.ipPort}`);
      if (item.type === 'app' && item.webUrl) details.push(`url ${item.webUrl}`);
      if (item.hostedOn) details.push(`hosted on ${findById(item.hostedOn)?.name || item.hostedOn}`);
      if (item.appHostedOn) details.push(`host app on ${findById(item.appHostedOn)?.name || item.appHostedOn}`);
      if (item.connections.length) details.push(`connected: ${item.connections.map((cid) => findById(cid)?.name || cid).join(', ')}`);
      if (item.notes) details.push(`notes: ${item.notes}`);
      if (details.length) {
        const meta = document.createElement('div');
        meta.className = 'tree-meta';
        meta.textContent = details.join(' • ');
        itemLi.appendChild(meta);
      }
      child.appendChild(itemLi);
    });

    li.appendChild(child);
    root.appendChild(li);
  });

  treeContent.innerHTML = '';
  treeContent.appendChild(root);
}

function shape(type) {
  if (type === 'hardware') return '■';
  if (type === 'vm' || type === 'lxc' || type === 'app') return '●';
  return '◆';
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
