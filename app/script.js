const storageKey = 'labby-data-v3';
const themeKey = 'labby-theme';

const boards = document.getElementById('boards');
const stats = document.getElementById('stats');
const form = document.getElementById('resource-form');
const seedDemo = document.getElementById('seed-demo');
const clearAll = document.getElementById('clear-all');
const themeToggle = document.getElementById('theme-toggle');
const template = document.getElementById('item-template');
const connectionsSelect = document.getElementById('connections');
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
render();

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const type = document.getElementById('type').value;
  const name = document.getElementById('name').value.trim();
  const description = document.getElementById('description').value.trim();
  const connections = selectedConnections();

  if (!name) return;

  if (editingId) {
    const existing = findById(editingId);
    if (!existing) return;
    existing.type = type;
    existing.name = name;
    existing.description = description;
    existing.connections = connections.filter((id) => id !== existing.id);
    stopEditing();
  } else {
    items.push({
      id: `${type}-${Date.now()}`,
      type,
      name,
      description,
      connections,
    });
  }

  normalizeConnections();
  saveItems();
  form.reset();
  render();
});

cancelEditBtn.addEventListener('click', () => {
  stopEditing();
  form.reset();
  render();
});

searchInput.addEventListener('input', render);
filterType.addEventListener('change', render);

seedDemo.addEventListener('click', () => {
  items = [
    { id: 'hardware-1', type: 'hardware', name: 'Mini PC i5', description: 'Main Proxmox host', connections: ['network-1'] },
    { id: 'hardware-2', type: 'hardware', name: 'Synology NAS', description: 'Backups + media', connections: ['network-1'] },
    { id: 'network-1', type: 'network', name: 'LAN 192.168.10.0/24', description: 'Core VLAN', connections: [] },
    { id: 'network-2', type: 'network', name: 'DMZ 192.168.20.0/24', description: 'Public services VLAN', connections: [] },
    { id: 'vm-1', type: 'vm', name: 'Docker VM', description: 'Container workloads', connections: ['hardware-1', 'network-1'] },
    { id: 'vm-2', type: 'vm', name: 'Firewall VM', description: 'Routing + ACL', connections: ['hardware-1', 'network-1', 'network-2'] },
    { id: 'app-1', type: 'app', name: 'Home Assistant', description: 'Automation', connections: ['vm-1', 'network-1'] },
    { id: 'app-2', type: 'app', name: 'Immich', description: 'Photos', connections: ['vm-1', 'network-1'] },
    { id: 'app-3', type: 'app', name: 'Traefik', description: 'Reverse proxy', connections: ['vm-1', 'network-2'] },
  ];
  stopEditing();
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
  const allowed = ['hardware', 'vm', 'app', 'network'];

  const normalized = raw
    .filter((item) => item?.id && item?.name && item?.type)
    .map((item) => ({
      id: String(item.id),
      type: allowed.includes(item.type) ? item.type : 'app',
      name: String(item.name),
      description: item.description ? String(item.description) : '',
      connections: Array.isArray(item.connections) ? [...new Set(item.connections.map(String))] : [],
    }));

  const known = new Set(normalized.map((item) => item.id));
  normalized.forEach((item) => {
    item.connections = item.connections.filter((id) => known.has(id) && id !== item.id);
  });

  return normalized;
}

function render() {
  refreshConnectionOptions();

  const filtered = applyFilters(items);
  const groups = {
    hardware: filtered.filter((item) => item.type === 'hardware'),
    vm: filtered.filter((item) => item.type === 'vm'),
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
    const text = `${item.name} ${item.description}`.toLowerCase();
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

  node.querySelector('.edit-btn').addEventListener('click', () => startEditing(item.id));
  node.querySelector('.delete-btn').addEventListener('click', () => removeItem(item.id));

  return node;
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

function startEditing(id) {
  const item = findById(id);
  if (!item) return;

  editingId = id;
  formTitle.textContent = `Edit Resource: ${item.name}`;
  saveBtn.textContent = 'Save changes';
  cancelEditBtn.classList.remove('hidden');

  document.getElementById('type').value = item.type;
  document.getElementById('name').value = item.name;
  document.getElementById('description').value = item.description;

  refreshConnectionOptions();
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
  normalizeConnections();

  if (editingId === id) stopEditing();

  saveItems();
  render();
}

function normalizeConnections() {
  const known = new Set(items.map((item) => item.id));
  items.forEach((item) => {
    item.connections = item.connections.filter((id) => known.has(id) && id !== item.id);
  });
}

function findById(id) {
  return items.find((item) => item.id === id);
}

function totalConnections(list) {
  return list.reduce((sum, item) => sum + item.connections.length, 0);
}

function label(type) {
  return ({ hardware: 'Hardware', vm: 'VMs', app: 'Apps', network: 'Networks' })[type] || type;
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
