const storageKey = 'labby-data-v4';
const themeKey = 'labby-theme';
const types = ['hardware', 'vm', 'lxc', 'app', 'network'];

const boards = document.getElementById('boards');
const stats = document.getElementById('stats');
const form = document.getElementById('resource-form');
const typeSelect = document.getElementById('type');
const seedDemo = document.getElementById('seed-demo');
const clearAll = document.getElementById('clear-all');
const themeToggle = document.getElementById('theme-toggle');
const template = document.getElementById('item-template');
const connectionsSelect = document.getElementById('connections');
const hostedOnSelect = document.getElementById('hosted-on');
const hostedOnWrap = document.getElementById('hosted-on-wrap');
const networkFields = document.getElementById('network-fields');
const ipInput = document.getElementById('ip-address');
const subnetInput = document.getElementById('subnet');
const gatewayInput = document.getElementById('gateway');
const cancelEditBtn = document.getElementById('cancel-edit');
const saveBtn = document.getElementById('save-btn');
const formTitle = document.getElementById('form-title');
const searchInput = document.getElementById('search');
const filterType = document.getElementById('filter-type');
const exportBtn = document.getElementById('export-btn');
const importFile = document.getElementById('import-file');

let items = sanitizeItems(loadItems());
let editingId = null;

initTheme();
applyTypeVisibility();
render();

typeSelect.addEventListener('change', applyTypeVisibility);

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const type = typeSelect.value;
  const name = document.getElementById('name').value.trim();
  const description = document.getElementById('description').value.trim();
  const connections = selectedConnections();
  const ip = ipInput.value.trim();
  const hostedOn = hostedOnSelect.value || '';
  const subnet = subnetInput.value.trim();
  const gateway = gatewayInput.value.trim();

  if (!name) return;

  if (type === 'network' && (!subnet || !gateway)) {
    alert('Network entries require subnet and gateway.');
    return;
  }

  if (editingId) {
    const existing = findById(editingId);
    if (!existing) return;
    existing.type = type;
    existing.name = name;
    existing.description = description;
    existing.connections = connections.filter((id) => id !== existing.id);
    existing.ip = ['hardware', 'vm', 'lxc'].includes(type) ? ip : '';
    existing.subnet = type === 'network' ? subnet : '';
    existing.gateway = type === 'network' ? gateway : '';
    existing.hostedOn = ['vm', 'lxc'].includes(type) ? hostedOn : '';
    stopEditing();
  } else {
    items.push({
      id: `${type}-${Date.now()}`,
      type,
      name,
      description,
      connections,
      ip: ['hardware', 'vm', 'lxc'].includes(type) ? ip : '',
      subnet: type === 'network' ? subnet : '',
      gateway: type === 'network' ? gateway : '',
      hostedOn: ['vm', 'lxc'].includes(type) ? hostedOn : '',
    });
  }

  normalizeItems();
  saveItems();
  form.reset();
  applyTypeVisibility();
  render();
});

cancelEditBtn.addEventListener('click', () => {
  stopEditing();
  form.reset();
  applyTypeVisibility();
  render();
});

searchInput.addEventListener('input', render);
filterType.addEventListener('change', render);

seedDemo.addEventListener('click', () => {
  items = [
    { id: 'hardware-1', type: 'hardware', name: 'MS-01', description: 'Main Proxmox host', connections: ['network-1'], ip: '192.168.10.10', subnet: '', gateway: '', hostedOn: '' },
    { id: 'hardware-2', type: 'hardware', name: 'NUC-11', description: 'Second node', connections: ['network-1'], ip: '192.168.10.11', subnet: '', gateway: '', hostedOn: '' },
    { id: 'network-1', type: 'network', name: 'LAN', description: 'Main VLAN', connections: [], ip: '', subnet: '192.168.10.0/24', gateway: '192.168.10.1', hostedOn: '' },
    { id: 'network-2', type: 'network', name: 'DMZ', description: 'Public services', connections: [], ip: '', subnet: '192.168.20.0/24', gateway: '192.168.20.1', hostedOn: '' },
    { id: 'vm-1', type: 'vm', name: 'onebitlabs', description: 'Docker workloads', connections: ['network-1'], ip: '192.168.10.30', subnet: '', gateway: '', hostedOn: 'hardware-1' },
    { id: 'lxc-1', type: 'lxc', name: 'adguard-lxc', description: 'DNS filtering', connections: ['network-1'], ip: '192.168.10.40', subnet: '', gateway: '', hostedOn: 'hardware-1' },
    { id: 'app-1', type: 'app', name: 'Immich', description: 'Photos', connections: ['vm-1', 'network-1'], ip: '', subnet: '', gateway: '', hostedOn: '' },
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

function sanitizeItems(raw) {
  if (!Array.isArray(raw)) return [];

  const normalized = raw
    .filter((item) => item?.id && item?.name && item?.type)
    .map((item) => ({
      id: String(item.id),
      type: types.includes(item.type) ? item.type : 'app',
      name: String(item.name),
      description: item.description ? String(item.description) : '',
      connections: Array.isArray(item.connections) ? [...new Set(item.connections.map(String))] : [],
      ip: item.ip ? String(item.ip) : '',
      subnet: item.subnet ? String(item.subnet) : '',
      gateway: item.gateway ? String(item.gateway) : '',
      hostedOn: item.hostedOn ? String(item.hostedOn) : '',
    }));

  items = normalized;
  normalizeItems();
  return items;
}

function normalizeItems() {
  const known = new Set(items.map((item) => item.id));
  const hardwareIds = new Set(items.filter((item) => item.type === 'hardware').map((item) => item.id));

  items.forEach((item) => {
    item.connections = item.connections.filter((id) => known.has(id) && id !== item.id);
    if (!['hardware', 'vm', 'lxc'].includes(item.type)) item.ip = '';
    if (item.type !== 'network') {
      item.subnet = '';
      item.gateway = '';
    }
    if (!['vm', 'lxc'].includes(item.type) || !hardwareIds.has(item.hostedOn)) item.hostedOn = '';
  });
}

function applyTypeVisibility() {
  const type = typeSelect.value;
  const isNetwork = type === 'network';
  const isHosted = type === 'vm' || type === 'lxc';
  const supportsIp = type === 'hardware' || type === 'vm' || type === 'lxc';

  networkFields.classList.toggle('hidden', !isNetwork);
  hostedOnWrap.classList.toggle('hidden', !isHosted);
  ipInput.closest('label').classList.toggle('hidden', !supportsIp);

  subnetInput.required = isNetwork;
  gatewayInput.required = isNetwork;
}

function render() {
  refreshConnectionOptions();
  refreshHostOptions();

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
    const text = `${item.name} ${item.description} ${item.ip} ${networkText}`.toLowerCase();
    const searchMatch = !query || text.includes(query);
    return typeMatch && searchMatch;
  });
}

function cardNode(item) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.dataset.type = item.type;

  node.querySelector('.card-title').textContent = item.name;
  node.querySelector('.card-desc').textContent = item.description || 'No description';
  node.querySelector('.card-id').textContent = `ID: ${item.id}`;
  node.querySelector('.card-links').textContent = connectionLabel(item);
  node.querySelector('.card-ip').textContent = item.ip ? `IP: ${item.ip}` : '';
  node.querySelector('.card-network').textContent = item.type === 'network' ? `Subnet: ${item.subnet} | Gateway: ${item.gateway}` : '';
  node.querySelector('.card-hosting').textContent = hostingLabel(item);

  node.querySelector('.edit-btn').addEventListener('click', () => startEditing(item.id));
  node.querySelector('.delete-btn').addEventListener('click', () => removeItem(item.id));

  return node;
}

function hostingLabel(item) {
  if (item.type === 'hardware') {
    const guests = items.filter((candidate) => (candidate.type === 'vm' || candidate.type === 'lxc') && candidate.hostedOn === item.id);
    return guests.length ? `Running: ${guests.map((guest) => guest.name).join(', ')}` : 'Running: none';
  }

  if (item.type === 'vm' || item.type === 'lxc') {
    if (!item.hostedOn) return 'Hosted on: not set';
    const host = findById(item.hostedOn);
    return `Hosted on: ${host ? host.name : item.hostedOn}`;
  }

  return '';
}

function connectionLabel(item) {
  if (!item.connections.length) return 'Connected to: none';
  const byId = Object.fromEntries(items.map((entry) => [entry.id, entry]));
  const text = item.connections.map((id) => byId[id]?.name || id).join(', ');
  return `Connected to: ${text}`;
}

function selectedConnections() {
  return Array.from(connectionsSelect.selectedOptions).map((option) => option.value);
}

function refreshConnectionOptions() {
  const selected = new Set(selectedConnections());

  connectionsSelect.innerHTML = '';
  items.forEach((item) => {
    if (editingId && item.id === editingId) return;

    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `${item.name} (${label(item.type)})`;
    option.selected = selected.has(item.id);
    connectionsSelect.appendChild(option);
  });

  if (editingId) {
    const editing = findById(editingId);
    if (editing) {
      Array.from(connectionsSelect.options).forEach((option) => {
        option.selected = editing.connections.includes(option.value);
      });
    }
  }
}

function refreshHostOptions() {
  const selected = hostedOnSelect.value;
  const hardware = items.filter((item) => item.type === 'hardware');

  hostedOnSelect.innerHTML = '<option value="">Not set</option>';
  hardware.forEach((host) => {
    if (editingId && host.id === editingId) return;
    const option = document.createElement('option');
    option.value = host.id;
    option.textContent = host.name;
    hostedOnSelect.appendChild(option);
  });

  hostedOnSelect.value = selected;
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
  ipInput.value = item.ip || '';
  subnetInput.value = item.subnet || '';
  gatewayInput.value = item.gateway || '';

  applyTypeVisibility();
  refreshConnectionOptions();
  refreshHostOptions();
  hostedOnSelect.value = item.hostedOn || '';

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
