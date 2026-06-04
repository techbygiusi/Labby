const storageKey = 'labby-data-v8';
const themeKey = 'labby-theme';
const types = ['hardware', 'vm', 'lxc', 'app', 'network'];
const networkPalette = ['#3b82f6', '#10b981', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#14b8a6', '#84cc16', '#06b6d4', '#8b5cf6'];

const boards = document.getElementById('boards');
const stats = document.getElementById('stats');
const form = document.getElementById('resource-form');
const typeSelect = document.getElementById('type');
const symbolInput = document.getElementById('symbol');
const clearAll = document.getElementById('clear-all');
const template = document.getElementById('item-template');
const hostedOnSelect = document.getElementById('hosted-on');
const hostedOnWrap = document.getElementById('hosted-on-wrap');
const appHostedOnSelect = document.getElementById('app-hosted-on');
const appHostedOnWrap = document.getElementById('app-hosted-on-wrap');
const networkFields = document.getElementById('network-fields');
const ipInput = document.getElementById('ip-address');
const hardwareKindSelect = document.getElementById('hardware-kind');
const hardwareKindWrap = document.getElementById('hardware-kind-wrap');
const manufacturerInput = document.getElementById('manufacturer');
const manufacturerWrap = document.getElementById('manufacturer-wrap');
const osInput = document.getElementById('os');
const osWrap = document.getElementById('os-wrap');
const computeFields = document.getElementById('compute-fields');
const cpuCountSelect = document.getElementById('cpu-count');
const ramModulesWrap = document.getElementById('ram-modules-wrap');
const ramModules = document.getElementById('ram-modules');
const addRamModuleBtn = document.getElementById('add-ram-module');
const diskListWrap = document.getElementById('disk-list-wrap');
const diskList = document.getElementById('disk-list');
const addDiskBtn = document.getElementById('add-disk');
const switchPortsWrap = document.getElementById('switch-ports-wrap');
const switchPortsInput = document.getElementById('switch-ports');
const routerSwitchesWrap = document.getElementById('router-switches-wrap');
const routerSwitches = document.getElementById('router-switches');
const switchLinksWrap = document.getElementById('switch-links-wrap');
const switchLinks = document.getElementById('switch-links');
const switchDeviceLinksWrap = document.getElementById('switch-device-links-wrap');
const switchDeviceLinks = document.getElementById('switch-device-links');
const nasSharesWrap = document.getElementById('nas-shares-wrap');
const nasShares = document.getElementById('nas-shares');
const addShareBtn = document.getElementById('add-share');
const nasRaidsWrap = document.getElementById('nas-raids-wrap');
const nasRaids = document.getElementById('nas-raids');
const addRaidBtn = document.getElementById('add-raid');
const nasSharesLegend = nasSharesWrap?.querySelector('legend');
const nasRaidsLegend = nasRaidsWrap?.querySelector('legend');
const ipPortInput = document.getElementById('ip-port');
const ipPortWrap = document.getElementById('ip-port-wrap');
const webUrlInput = document.getElementById('web-url');
const webUrlWrap = document.getElementById('web-url-wrap');
const hardwareWebUrlInput = document.getElementById('hardware-web-url');
const hardwareWebUrlWrap = document.getElementById('hardware-web-url-wrap');
const notesInput = document.getElementById('notes');
const statusSelect = document.getElementById('status');
const notesWrap = document.getElementById('notes-wrap');
const ipStatusSelect = document.getElementById('ip-status');
const ipStatusWrap = document.getElementById('ip-status-wrap');
const urlStatusSelect = document.getElementById('url-status');
const urlStatusWrap = document.getElementById('url-status-wrap');
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
const treeDialog = document.getElementById('tree-dialog');
const treeContent = document.getElementById('tree-content');
const treeModeTree = document.getElementById('tree-mode-tree');
const treeModeGraph = document.getElementById('tree-mode-graph');
const configToggle = document.getElementById('config-toggle');
const configDialog = document.getElementById('config-dialog');
const toast = document.getElementById('toast');

let editingId = null;
let selectedNetworkColor = networkPalette[0];
let items = [];
let locations = [];
let racks = [];
let toastTimer = null;
let treeViewMode = 'tree';
let lastTypeSelection = typeSelect.value;
let lastHardwareKindSelection = hardwareKindSelect.value;
let pollingInterval = null;
let liveStatusData = {}; // Store live status data { itemId: { ipStatus: 'online'|'offline', urlStatus: 'online'|'offline' } }

const API_BASE = (() => {
  const loc = window.location;
  return window.LABBY_API || (loc.hostname === 'localhost' && loc.port === '8080' ? 'http://localhost:3001' : '');
})();

async function loadItemsFromAPI() {
  try {
    const res = await fetch(`${API_BASE}/api/data`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      // Legacy: bare array
      return { items: data, locations: [], racks: [] };
    }
    return {
      items: Array.isArray(data.items) ? data.items : [],
      locations: Array.isArray(data.locations) ? data.locations : [],
      racks: Array.isArray(data.racks) ? data.racks : [],
    };
  } catch (err) {
    console.warn('Labby: API not reachable, falling back to localStorage.', err);
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const lsItems = Array.isArray(parsed) ? parsed : (parsed.items || []);
      const lsLocations = Array.isArray(parsed) ? [] : (parsed.locations || []);
      const lsRacks = Array.isArray(parsed) ? [] : (parsed.racks || []);
      return { items: lsItems, locations: lsLocations, racks: lsRacks };
    } catch {
      return { items: [], locations: [], racks: [] };
    }
  }
}

async function saveItemsToAPI(itemList) {
  const payload = {
    items: itemList,
    locations: locations,
    racks: racks,
  };
  try {
    const res = await fetch(`${API_BASE}/api/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.warn('Labby: API save failed, writing to localStorage as fallback.', err);
    try { localStorage.setItem(storageKey, JSON.stringify(payload)); } catch {}
  }
}

cleanupDuplicateIds(['symbol-wrap', 'hardware-kind-wrap', 'manufacturer-wrap', 'os-wrap', 'symbol', 'hardware-kind', 'manufacturer', 'os']);
cleanupDuplicateFieldLabels();

initColorPicker();
appendShareRow();
appendRamModuleRow();
appendDiskRow();
appendRaidRow();
symbolInput.value = defaultSymbol('hardware', 'server');
// initTheme moved to end

applyTypeVisibility();

(async () => {
  const loaded = await loadItemsFromAPI();
  items = sanitizeItems(loaded.items);
  locations = loaded.locations || [];
  racks = loaded.racks || [];
  render();
  startPolling();
})();

async function startPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(async () => {
    await pollLiveStatus();
  }, 5000);
}

async function pollLiveStatus() {
  const toMonitor = items.filter((item) => item.ipStatus === 'live' || item.urlStatus === 'live');

  for (const item of toMonitor) {
    if (item.ipStatus === 'live' && item.ip && ['hardware', 'vm', 'lxc'].includes(item.type)) {
      try {
        const res = await fetch(`${API_BASE}/api/ping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip: item.ip.split('/')[0].trim() }),
        });
        const data = await res.json();
        if (!liveStatusData[item.id]) liveStatusData[item.id] = {};
        liveStatusData[item.id].ipStatus = data.status;
      } catch (err) {
        if (!liveStatusData[item.id]) liveStatusData[item.id] = {};
        liveStatusData[item.id].ipStatus = 'offline';
      }
    }

    if (item.urlStatus === 'live' && item.webUrl && (item.type === 'app' || item.type === 'hardware')) {
      try {
        const res = await fetch(`${API_BASE}/api/check-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.webUrl }),
        });
        const data = await res.json();
        if (!liveStatusData[item.id]) liveStatusData[item.id] = {};
        liveStatusData[item.id].urlStatus = data.status;
      } catch (err) {
        if (!liveStatusData[item.id]) liveStatusData[item.id] = {};
        liveStatusData[item.id].urlStatus = 'offline';
      }
    }
  }

  render();
}

function cleanupDuplicateIds(ids) {
  ids.forEach((id) => {
    const matches = document.querySelectorAll(`[id="${id}"]`);
    matches.forEach((node, index) => {
      if (index > 0) node.remove();
    });
  });
}

function cleanupDuplicateFieldLabels() {
  removeDuplicateLabels((labelNode) => labelNode.querySelector('#symbol'));
  removeDuplicateLabels((labelNode) => labelNode.querySelector('#hardware-kind'));
  removeDuplicateLabels((labelNode) => labelNode.querySelector('#manufacturer'));
  removeDuplicateLabels((labelNode) => labelNode.querySelector('#os'));
}

function removeDuplicateLabels(matchFn) {
  const labels = [...form.querySelectorAll('label')].filter((node) => matchFn(node));
  labels.forEach((node, index) => {
    if (index > 0) node.remove();
  });
}

typeSelect.addEventListener('change', applyTypeVisibility);
hardwareKindSelect.addEventListener('change', applyTypeVisibility);
ipInput.addEventListener('input', applyTypeVisibility);
webUrlInput.addEventListener('input', applyTypeVisibility);
hardwareWebUrlInput.addEventListener('input', applyTypeVisibility);
ipPortInput.addEventListener('input', applyTypeVisibility);
addShareBtn.addEventListener('click', () => appendShareRow());
addRamModuleBtn.addEventListener('click', () => appendRamModuleRow());
addDiskBtn.addEventListener('click', () => appendDiskRow());
addRaidBtn.addEventListener('click', () => appendRaidRow());
if (treeModeTree && treeModeGraph) {
  treeModeTree.addEventListener('click', () => setTreeMode('tree'));
  treeModeGraph.addEventListener('click', () => setTreeMode('graph'));
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const type = typeSelect.value;
  const hardwareKind = hardwareKindSelect.value;
  const manufacturer = manufacturerInput.value.trim();
  const os = osInput.value.trim();
  const symbol = symbolInput.value.trim();
  const name = document.getElementById('name').value.trim();
  const description = document.getElementById('description').value.trim();
  const notes = notesInput.value.trim();
  const status = statusSelect.value || '';
  const ip = ipInput.value.trim();
  const cpuCount = cpuCountSelect.value.trim();
  const ramModuleList = getRamModules();
  const diskRows = getDiskRows();
  const ipPort = ipPortInput.value.trim();
  const webUrl = webUrlInput.value.trim();
  const hardwareWebUrl = (document.getElementById('hardware-web-url') ? document.getElementById('hardware-web-url').value.trim() : '') || hardwareWebUrlInput.value.trim();
  const hostedOn = hostedOnSelect.value || '';
  const appHostedOn = appHostedOnSelect.value || '';
  const subnet = subnetInput.value.trim();
  const gateway = gatewayInput.value.trim();
  const switchPorts = switchPortsInput.value.trim();
  const selectedRouterSwitches = getMultiValues(routerSwitches);
  const selectedSwitchLinks = getMultiValues(switchLinks);
  const selectedSwitchDeviceLinks = getMultiValues(switchDeviceLinks);
  const shareList = getShares();
  const raidList = getRaids();

  if (!name) return;
  if (type === 'network' && (!subnet || !gateway)) {
    showToast('Network entries require subnet and gateway.', 'error');
    return;
  }

  const payload = {
    type,
    hardwareKind: type === 'hardware' ? hardwareKind : '',
    manufacturer: type === 'hardware' ? manufacturer : '',
    os: ['hardware', 'vm', 'lxc'].includes(type) ? os : '',
    symbol: symbol || defaultSymbol(type, hardwareKind),
    name,
    description,
    notes: supportsNotes(type) ? notes : '',
    status: document.getElementById('status').value || '',
    ip: ['hardware', 'vm', 'lxc'].includes(type) ? ip : '',
    cpu: supportsComputeDetails(type) ? formatCpuLabel(type, cpuCount) : '',
    ram: supportsComputeDetails(type) ? formatRamLabel(ramModuleList) : '',
    disks: supportsComputeDetails(type) ? formatDiskLabel(diskRows) : '',
    cpuCount: supportsComputeDetails(type) ? cpuCount : '',
    ramModules: supportsComputeDetails(type) ? ramModuleList : [],
    diskRows: supportsComputeDetails(type) ? diskRows : [],
    ipPort: type === 'app' ? ipPort : '',
    webUrl: type === 'app' ? webUrl : (type === 'hardware' ? hardwareWebUrl : ''),
    subnet: type === 'network' ? subnet : '',
    gateway: type === 'network' ? gateway : '',
    networkColor: type === 'network' ? selectedNetworkColor : '',
    hostedOn: ['vm', 'lxc'].includes(type) ? hostedOn : '',
    appHostedOn: type === 'app' ? appHostedOn : '',
    switchPorts: type === 'hardware' && hardwareKind === 'switch' ? switchPorts : '',
    nasShares: supportsStorageGroups(type, hardwareKind) ? shareList : [],
    nasRaids: supportsStorageGroups(type, hardwareKind) ? raidList : [],
    connections: type === 'hardware' && hardwareKind === 'router-gateway'
      ? selectedRouterSwitches
      : type === 'hardware' && hardwareKind === 'switch'
        ? [...selectedSwitchLinks, ...selectedSwitchDeviceLinks]
        : [],
    ipStatus: ipStatusSelect.value || '',
    urlStatus: urlStatusSelect.value || '',
  };

  const wasEditing = Boolean(editingId);

  if (editingId) {
    const existing = findById(editingId);
    if (!existing) return;
    Object.assign(existing, payload);
    stopEditing();
  } else {
    items.push({ id: `${type}-${Date.now()}`, ...payload });
  }

  normalizeItems();
  await saveItems();
  showToast(wasEditing ? 'Resource updated.' : 'Resource added.');
  form.reset();
  statusSelect.value = '';
  hardwareWebUrlInput.value = '';
  statusSelect.value = '';
  symbolInput.value = defaultSymbol('hardware', 'server');
  hardwareKindSelect.value = 'server';
  ipStatusSelect.value = '';
  urlStatusSelect.value = '';
  resetDynamicHardwareFields();
  setMultiValues(routerSwitches, []);
  setMultiValues(switchLinks, []);
  setMultiValues(switchDeviceLinks, []);
  setSelectedColor(networkPalette[0]);
  applyTypeVisibility();
  render();
});

cancelEditBtn.addEventListener('click', () => {
  stopEditing();
  form.reset();
  symbolInput.value = defaultSymbol('hardware', 'server');
  hardwareKindSelect.value = 'server';
  ipStatusSelect.value = '';
  urlStatusSelect.value = '';
  resetDynamicHardwareFields();
  setMultiValues(routerSwitches, []);
  setMultiValues(switchLinks, []);
  setMultiValues(switchDeviceLinks, []);
  setSelectedColor(networkPalette[0]);
  applyTypeVisibility();
  render();
});

searchInput.addEventListener('input', render);
filterType.addEventListener('change', render);

treeToggle.addEventListener('click', () => {
  if (ipDialog.open) ipDialog.close();
  if (configDialog.open) configDialog.close();
  setTreeMode(treeViewMode);
  treeDialog.showModal();
});


const ipToggle = document.getElementById('ip-toggle');
const ipDialog = document.getElementById('ip-dialog');
const ipContent = document.getElementById('ip-content');
const ipSearch = document.getElementById('ip-search');

ipToggle.addEventListener('click', () => {
  if (treeDialog.open) treeDialog.close();
  if (configDialog.open) configDialog.close();
  renderIPView();
  ipDialog.showModal();
});
if (ipSearch) ipSearch.addEventListener('input', renderIPView);

function extractIPs(item) {
  const ips = [];
  if (item.ip) ips.push({ addr: item.ip.split('/')[0].trim(), port: null, item });
  if (item.type === 'app' && item.ipPort) {
    const parts = item.ipPort.split(':');
    const host = parts[0].trim();
    const port = parts[1] ? parts[1].trim() : null;
    if (host) ips.push({ addr: host, port, item });
  }
  return ips;
}

function renderIPView() {
  if (!ipContent) return;
  ipContent.innerHTML = '';
  const query = (ipSearch && ipSearch.value) ? ipSearch.value.trim().toLowerCase() : '';
  renderIPInto(ipContent, query);
}

function buildIPRow(entry, query) {
  const row = document.createElement('div');
  row.className = 'ip-row';
  const addr = document.createElement('span');
  addr.className = 'ip-row-addr';
  const addrText = entry.port ? `${entry.addr}:${entry.port}` : entry.addr;
  const searchText = entry.addr + (entry.port ? ':' + entry.port : '');
  addr.innerHTML = query ? highlightMatch(addrText, query) : addrText;
  if (entry.port) {
    addr.title = `Port: ${entry.port}`;
  }
  const nameEl = document.createElement('span');
  nameEl.className = 'ip-row-name';
  nameEl.innerHTML = query ? highlightMatch(entry.item.name, query) : entry.item.name;
  const typeEl = document.createElement('span');
  typeEl.className = 'ip-row-type';
  typeEl.textContent = entry.item.type === 'hardware'
    ? hardwareTypeLabel(entry.item.hardwareKind)
    : labelSingle(entry.item.type);
  row.appendChild(addr);
  row.appendChild(nameEl);
  row.appendChild(typeEl);
  return row;
}

function highlightMatch(text, query) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return text.slice(0, idx) +
    '<span class="ip-highlight">' + text.slice(idx, idx + query.length) + '</span>' +
    text.slice(idx + query.length);
}


configToggle.addEventListener('click', () => {
  if (treeDialog.open) treeDialog.close();
  if (ipDialog.open) ipDialog.close();
  configDialog.showModal();
});

clearAll.addEventListener('click', async () => {
  if (!confirm('Delete all resources? This also clears all rack, location and custom theme data.')) return;
  items = []; locations = []; racks = [];
  localStorage.removeItem('labby-custom-themes');
  stopEditing();
  await saveItems();
  showToast('All resources and custom themes cleared.');
  render();
  if (typeof renderThemeLists === 'function') renderThemeLists();
});

let themePickerReturnToConfig = false;

document.getElementById('theme-btn').addEventListener('click', () => {
  themePickerReturnToConfig = true;
  configDialog.close();
  openThemePicker({ returnToConfig: true });
});
document.getElementById('theme-btn-mobile').addEventListener('click', () => openThemePicker({ returnToConfig: false }));
document.querySelectorAll('.theme-tab').forEach(b => b.addEventListener('click', () => switchThemeTab(b.dataset.tab)));
const themePickerClose = document.getElementById('theme-picker-close');
if (themePickerClose) themePickerClose.addEventListener('click', () => document.getElementById('theme-picker-dialog').close());

exportBtn.addEventListener('click', () => {
  const config = { items, locations, racks, customThemes: getCustomThemes() };
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'labby-config.json';
  link.click();
  URL.revokeObjectURL(url);
  showToast('Config exported.');
});

importFile.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    // Support both old bare-array format and new { items, locations, racks } format
    if (Array.isArray(parsed)) {
      items = sanitizeItems(parsed);
    } else {
      items     = sanitizeItems(parsed.items     || []);
      locations = Array.isArray(parsed.locations) ? parsed.locations : [];
      racks     = Array.isArray(parsed.racks)     ? parsed.racks     : [];
      if (Array.isArray(parsed.customThemes)) importCustomThemes(parsed.customThemes);
    }
    stopEditing();
    await saveItems();
    showToast('Config imported successfully.');
    render();
  } catch {
    showToast('Invalid config file. Please upload a Labby JSON export.', 'error');
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


function appendRamModuleRow(module = { size: '', type: 'DDR4' }) {
  const row = document.createElement('div');
  row.className = 'share-row';
  row.innerHTML = `
    <input type="text" placeholder="Size (e.g. 16 GB)" value="${escapeAttr(module.size)}" data-ram-size />
    <select data-ram-type>
      <option value="DDR3">DDR3</option>
      <option value="DDR4">DDR4</option>
      <option value="DDR5">DDR5</option>
      <option value="LPDDR4">LPDDR4</option>
      <option value="LPDDR5">LPDDR5</option>
      <option value="ECC DDR4">ECC DDR4</option>
      <option value="ECC DDR5">ECC DDR5</option>
    </select>
    <button class="icon-btn" type="button">Remove</button>
  `;
  row.querySelector('[data-ram-type]').value = module.type || 'DDR4';
  row.querySelector('button').addEventListener('click', () => row.remove());
  ramModules.appendChild(row);
}

function getRamModules() {
  return [...ramModules.querySelectorAll('.share-row')]
    .map((row) => ({
      size: row.querySelector('[data-ram-size]').value.trim(),
      type: row.querySelector('[data-ram-type]').value.trim(),
    }))
    .filter((module) => module.size);
}

function appendDiskRow(disk = { size: '', type: 'SSD' }) {
  const row = document.createElement('div');
  row.className = 'share-row';
  row.innerHTML = `
    <input type="text" placeholder="Size (e.g. 2 TB)" value="${escapeAttr(disk.size)}" data-disk-size />
    <select data-disk-type>
      <option value="HDD">HDD</option>
      <option value="SSD">SSD</option>
      <option value="NVMe">NVMe</option>
      <option value="SATA SSD">SATA SSD</option>
      <option value="SAS">SAS</option>
    </select>
    <button class="icon-btn" type="button">Remove</button>
  `;
  row.querySelector('[data-disk-type]').value = disk.type || 'SSD';
  row.querySelector('button').addEventListener('click', () => row.remove());
  diskList.appendChild(row);
}

function getDiskRows() {
  return [...diskList.querySelectorAll('.share-row')]
    .map((row) => ({
      size: row.querySelector('[data-disk-size]').value.trim(),
      type: row.querySelector('[data-disk-type]').value.trim(),
    }))
    .filter((disk) => disk.size);
}

function appendRaidRow(raid = { name: '', level: 'RAID1', size: '' }) {
  const row = document.createElement('div');
  row.className = 'share-row raid-row';
  row.innerHTML = `
    <input type="text" placeholder="RAID name" value="${escapeAttr(raid.name)}" data-raid-name />
    <select data-raid-level>
      <option value="RAID0">RAID0</option>
      <option value="RAID1">RAID1</option>
      <option value="RAID5">RAID5</option>
      <option value="RAID6">RAID6</option>
      <option value="RAID10">RAID10</option>
      <option value="JBOD">JBOD</option>
    </select>
    <input type="text" placeholder="Size (e.g. 12 TB)" value="${escapeAttr(raid.size)}" data-raid-size />
    <button class="icon-btn" type="button">Remove</button>
  `;
  row.querySelector('[data-raid-level]').value = raid.level || 'RAID1';
  row.querySelector('button').addEventListener('click', () => row.remove());
  nasRaids.appendChild(row);
}

function getRaids() {
  return [...nasRaids.querySelectorAll('.share-row')]
    .map((row) => ({
      name: row.querySelector('[data-raid-name]').value.trim(),
      level: row.querySelector('[data-raid-level]').value.trim(),
      size: row.querySelector('[data-raid-size]').value.trim(),
    }))
    .filter((raid) => raid.name || raid.size);
}

function formatCpuLabel(type, cpuCount) {
  if (!cpuCount) return '';
  return type === 'hardware' ? `${cpuCount} cores` : `${cpuCount} vCPU`;
}

function formatGroupedLabel(rows, sizeKey, typeKey) {
  if (!rows.length) return '';
  const grouped = new Map();
  rows.forEach((row) => {
    const size = String(row?.[sizeKey] || '?').trim() || '?';
    const type = String(row?.[typeKey] || '').trim();
    const key = `${size.toLowerCase()}::${type.toLowerCase()}`;
    const existing = grouped.get(key);
    if (existing) existing.count += 1;
    else grouped.set(key, { count: 1, size, type });
  });

  return [...grouped.values()]
    .map((entry) => {
      const label = `${entry.size}${entry.type ? ` ${entry.type}` : ''}`.trim();
      return entry.count > 1 ? `${entry.count} x ${label}` : label;
    })
    .join(', ');
}

function formatRamLabel(ramModuleList) {
  return formatGroupedLabel(ramModuleList, 'size', 'type');
}

function formatDiskLabel(diskRows) {
  return formatGroupedLabel(diskRows, 'size', 'type');
}

function inferCpuCount(cpuLabel) {
  const match = String(cpuLabel || '').match(/(\d+)/);
  return match ? match[1] : '';
}

function resetDynamicHardwareFields() {
  nasShares.innerHTML = '';
  nasRaids.innerHTML = '';
  ramModules.innerHTML = '';
  diskList.innerHTML = '';
  appendShareRow();
  appendRaidRow();
  appendRamModuleRow();
  appendDiskRow();
  cpuCountSelect.value = '';
}

function appendShareRow(share = { name: '', link: '' }) {
  const row = document.createElement('div');
  row.className = 'share-row';
  row.innerHTML = `
    <input type="text" placeholder="Share name" value="${escapeAttr(share.name)}" data-share-name />
    <input type="text" placeholder="Path / URL" value="${escapeAttr(share.link)}" data-share-link />
    <button class="icon-btn" type="button">Remove</button>
  `;
  row.querySelector('button').addEventListener('click', () => row.remove());
  nasShares.appendChild(row);
}

function getShares() {
  return [...nasShares.querySelectorAll('.share-row')]
    .map((row) => ({
      name: row.querySelector('[data-share-name]').value.trim(),
      link: row.querySelector('[data-share-link]').value.trim(),
    }))
    .filter((share) => share.name || share.link);
}

function getMultiValues(select) {
  return [...select.selectedOptions].map((option) => option.value);
}

function setMultiValues(select, values) {
  const set = new Set(values || []);
  [...select.options].forEach((option) => {
    option.selected = set.has(option.value);
  });
}

function escapeAttr(value) {
  return String(value || '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function loadItems() {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveItems() {
  await saveItemsToAPI(items);
}

function supportsNotes(type) {
  return ['hardware', 'vm', 'lxc', 'network'].includes(type);
}

function supportsComputeDetails(type, hardwareKind = hardwareKindSelect.value) {
  if (type === 'hardware') return !['router-gateway', 'switch'].includes(hardwareKind);
  return ['vm', 'lxc'].includes(type);
}

function defaultSymbol(type, hardwareKind = 'server') {
  if (type === 'hardware') {
    return {
      server: '🖥️',
      hypervisor: '📦',
      nas: '🗄️',
      backup: '💾',
      pc: '💻',
      'router-gateway': '📡',
      switch: '🔀',
    }[hardwareKind] || '🖥️';
  }
  return ({ vm: '🧩', lxc: '📦', app: '⚙️', network: '🌐' })[type] || '●';
}

function sanitizeItems(raw) {
  if (!Array.isArray(raw)) return [];
  const normalized = raw
    .filter((item) => item?.id && item?.name && item?.type)
    .map((item) => ({
      id: String(item.id),
      type: types.includes(item.type) ? item.type : 'app',
      hardwareKind: item.hardwareKind ? String(item.hardwareKind) : 'server',
      manufacturer: item.manufacturer ? String(item.manufacturer) : '',
      os: item.os ? String(item.os) : '',
      symbol: item.symbol ? String(item.symbol) : defaultSymbol(item.type, item.hardwareKind),
      name: String(item.name),
      status: ['online','offline','maintenance'].includes(item.status) ? item.status : '',
      description: item.description ? String(item.description) : '',
      notes: item.notes ? String(item.notes) : '',
      connections: Array.isArray(item.connections) ? [...new Set(item.connections.map(String))] : [],
      ip: item.ip ? String(item.ip) : '',
      cpu: item.cpu ? String(item.cpu) : '',
      ram: item.ram ? String(item.ram) : '',
      disks: item.disks ? String(item.disks) : '',
      cpuCount: item.cpuCount ? String(item.cpuCount) : inferCpuCount(item.cpu),
      ramModules: Array.isArray(item.ramModules)
        ? item.ramModules.map((module) => ({ size: String(module?.size || ''), type: String(module?.type || 'DDR4') })).filter((module) => module.size)
        : [],
      diskRows: Array.isArray(item.diskRows)
        ? item.diskRows.map((disk) => ({ size: String(disk?.size || ''), type: String(disk?.type || 'SSD') })).filter((disk) => disk.size)
        : [],
      ipPort: item.ipPort ? String(item.ipPort) : '',
      webUrl: item.webUrl ? String(item.webUrl) : '',
      subnet: item.subnet ? String(item.subnet) : '',
      gateway: item.gateway ? String(item.gateway) : '',
      networkColor: networkPalette.includes(item.networkColor) ? item.networkColor : networkPalette[0],
      hostedOn: item.hostedOn ? String(item.hostedOn) : '',
      appHostedOn: item.appHostedOn ? String(item.appHostedOn) : '',
      switchPorts: item.switchPorts ? String(item.switchPorts) : '',
      nasShares: Array.isArray(item.nasShares)
        ? item.nasShares.map((share) => ({ name: String(share?.name || ''), link: String(share?.link || '') })).filter((share) => share.name || share.link)
        : [],
      nasRaids: Array.isArray(item.nasRaids)
        ? item.nasRaids.map((raid) => ({ name: String(raid?.name || ''), level: String(raid?.level || 'RAID1'), size: String(raid?.size || '') })).filter((raid) => raid.name || raid.size)
        : [],
      ipStatus: ['', 'online', 'offline', 'maintenance', 'live'].includes(item.ipStatus) ? item.ipStatus : '',
      urlStatus: ['', 'online', 'offline', 'maintenance', 'live'].includes(item.urlStatus) ? item.urlStatus : '',
    }));
  return normalizeList(normalized);
}

function normalizeItems() {
  items = normalizeList(items);
}

function normalizeList(list) {
  const known = new Set(list.map((item) => item.id));
  const hardwareIds = new Set(list.filter((item) => item.type === 'hardware').map((item) => item.id));
  const switchIds = new Set(list.filter((item) => item.type === 'hardware' && item.hardwareKind === 'switch').map((item) => item.id));
  const hostableAppIds = new Set(list.filter((item) => item.type === 'vm' || item.type === 'lxc').map((item) => item.id));

  const normalized = list.map((item) => {
    const next = { ...item };
    next.connections = next.connections.filter((id) => known.has(id) && id !== next.id);
    if (!supportsNotes(next.type)) next.notes = '';
    if (!['hardware', 'vm', 'lxc'].includes(next.type)) {
      next.ip = '';
      next.os = '';
    }
    if (next.type !== 'hardware') {
      next.hardwareKind = '';
      next.manufacturer = '';
      next.switchPorts = '';
      next.nasShares = [];
      next.nasRaids = [];
    }
    if (!next.symbol) next.symbol = defaultSymbol(next.type, next.hardwareKind);
    if (next.type === 'hardware' && !next.hardwareKind) next.hardwareKind = 'server';
    if (!supportsComputeDetails(next.type)) {
      next.cpu = '';
      next.ram = '';
      next.disks = '';
      next.cpuCount = '';
      next.ramModules = [];
      next.diskRows = [];
    }
    if (next.type === 'hardware' && ['router-gateway', 'switch'].includes(next.hardwareKind)) {
      next.cpu = '';
      next.ram = '';
      next.disks = '';
      next.cpuCount = '';
      next.ramModules = [];
      next.diskRows = [];
    }
    if (!(next.type === 'hardware' && next.hardwareKind === 'switch')) next.switchPorts = '';
    if (!supportsStorageGroups(next.type, next.hardwareKind)) {
      next.nasShares = [];
      next.nasRaids = [];
    }
    if (next.type === 'hardware' && next.hardwareKind === 'router-gateway') {
      next.connections = next.connections.filter((id) => switchIds.has(id));
    }
    if (next.type === 'hardware' && next.hardwareKind === 'switch') {
      next.connections = next.connections.filter((id) => {
        const target = list.find((entry) => entry.id === id);
        return target && target.type === 'hardware';
      });
    }
    if (next.type !== 'app') {
      next.ipPort = '';
      next.appHostedOn = '';
    }
    if (next.type !== 'app' && next.type !== 'hardware') {
      next.webUrl = '';
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
    if (!['', 'online', 'offline', 'maintenance', 'live'].includes(next.ipStatus)) next.ipStatus = '';
    if (!['', 'online', 'offline', 'maintenance', 'live'].includes(next.urlStatus)) next.urlStatus = '';
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


function supportsStorageGroups(type, hardwareKind) {
  return type === 'hardware' && ['nas', 'backup'].includes(hardwareKind);
}

function updateStorageFieldLabels(hardwareKind) {
  const backupMode = hardwareKind === 'backup';
  if (nasSharesLegend) nasSharesLegend.textContent = backupMode ? 'Backup shares' : 'NAS shares';
  if (nasRaidsLegend) nasRaidsLegend.textContent = backupMode ? 'Backup RAID groups' : 'NAS RAID groups';
  if (addShareBtn) addShareBtn.textContent = backupMode ? '+ Add Backup Share' : '+ Add Share';
  if (addRaidBtn) addRaidBtn.textContent = backupMode ? '+ Add Backup RAID group' : '+ Add RAID';
}

function applyTypeVisibility() {
  const type = typeSelect.value;
  const hardwareKind = hardwareKindSelect.value;
  const isNetwork = type === 'network';
  const isVmOrLxc = type === 'vm' || type === 'lxc';
  const isApp = type === 'app';
  const supportsIp = type === 'hardware' || isVmOrLxc;
  const isHardware = type === 'hardware';
  const supportsCompute = supportsComputeDetails(type, hardwareKind);
  const isRouter = isHardware && hardwareKind === 'router-gateway';
  const isSwitch = isHardware && hardwareKind === 'switch';
  const supportsStorage = supportsStorageGroups(type, hardwareKind);

  networkFields.classList.toggle('hidden', !isNetwork);
  computeFields.classList.toggle('hidden', !supportsCompute);
  ramModulesWrap.classList.toggle('hidden', !supportsCompute);
  diskListWrap.classList.toggle('hidden', !supportsCompute);
  hardwareKindWrap.classList.toggle('hidden', !isHardware);
  manufacturerWrap.classList.toggle('hidden', !isHardware);
  osWrap.classList.toggle('hidden', !supportsIp);
  hostedOnWrap.classList.toggle('hidden', !isVmOrLxc);
  appHostedOnWrap.classList.toggle('hidden', !isApp);
  ipInput.closest('label').classList.toggle('hidden', !supportsIp);
  switchPortsWrap.classList.toggle('hidden', !isSwitch);
  routerSwitchesWrap.classList.toggle('hidden', !isRouter);
  switchLinksWrap.classList.toggle('hidden', !isSwitch);
  switchDeviceLinksWrap.classList.toggle('hidden', !isSwitch);
  nasSharesWrap.classList.toggle('hidden', !supportsStorage);
  nasRaidsWrap.classList.toggle('hidden', !supportsStorage);
  ipPortWrap.classList.toggle('hidden', !isApp);
  webUrlWrap.classList.toggle('hidden', !isApp);
  hardwareWebUrlWrap.classList.toggle('hidden', !isHardware);
  notesWrap.classList.toggle('hidden', !supportsNotes(type));

  const canHaveIp = ['hardware', 'vm', 'lxc', 'app'].includes(type);
  const canHaveUrl = isApp || isHardware;
  ipStatusWrap.classList.toggle('hidden', !canHaveIp);
  urlStatusWrap.classList.toggle('hidden', !canHaveUrl);

  subnetInput.required = isNetwork;
  gatewayInput.required = isNetwork;
  switchPortsInput.required = isSwitch;

  const nextDefaultSymbol = defaultSymbol(type, hardwareKind);
  const previousDefaultSymbol = defaultSymbol(lastTypeSelection, lastHardwareKindSelection);
  symbolInput.placeholder = `e.g. ${nextDefaultSymbol}`;
  updateStorageFieldLabels(hardwareKind);
  if (!editingId && (!symbolInput.value.trim() || symbolInput.value === previousDefaultSymbol)) {
    symbolInput.value = nextDefaultSymbol;
  }
  lastTypeSelection = type;
  lastHardwareKindSelection = hardwareKind;

  refreshHardwareConnectionOptions();
}

function render() {
  refreshHostOptions();
  refreshAppHostOptions();
  refreshHardwareConnectionOptions();

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
    const hardwareText = item.type === 'hardware'
      ? `${item.manufacturer || ''} ${hardwareTypeLabel(item.hardwareKind)} ${item.switchPorts || ''} ${(item.nasShares || []).map((share) => `${share.name} ${share.link}`).join(' ')}`
      : '';
    const specsText = `${item.os || ''} ${item.cpu || ''} ${item.ram || ''} ${item.disks || ''}`;
    const text = `${item.name} ${item.description} ${item.notes} ${item.ip} ${specsText} ${appText} ${networkText} ${hardwareText}`.toLowerCase();
    return typeMatch && (!query || text.includes(query));
  });
}

function cardNode(item) {
  const node = createCardShell();
  node.dataset.type = item.type;

  const border = networkBorderColor(item);
  if (border) node.style.borderColor = border;

  setCardText(node, '.card-title', item.name);
  setCardText(node, '.card-desc', item.description || 'No description');
  setCardText(node, '.card-notes', item.notes ? `Notes: ${item.notes}` : '');
  setCardText(node, '.card-ip', item.ip ? `IP: ${item.ip}` : '');
  setCardText(node, '.card-app', item.type === 'app' ? appDetails(item) : '');
  setCardText(node, '.card-specs', hardwareDetailsLabel(item) || specsLabel(item));
  setCardText(node, '.card-network', item.type === 'network' ? `Subnet: ${item.subnet} | Gateway: ${item.gateway}` : '');
  setCardText(node, '.card-hosting', hostingLabel(item));
  setCardText(node, '.card-links', connectionLabel(item));

  // Live status display
  const liveStatusEl = node.querySelector('.card-live-status');
  if (liveStatusEl) {
    liveStatusEl.innerHTML = buildLiveStatusHtml(item);
  }

  const badge = node.querySelector('.type-badge');
  if (badge) badge.className = `type-badge ${item.type}`;

  const statusEl = node.querySelector('.card-status');
  if (statusEl) {
    const statusMap = { online: '🟢 Online', offline: '🔴 Offline', maintenance: '🟡 Maintenance' };
    if (item.status && statusMap[item.status]) {
      statusEl.textContent = statusMap[item.status];
      statusEl.className = `card-status status-${item.status}`;
    } else {
      statusEl.textContent = '';
      statusEl.className = 'card-status';
    }
  }

  if (item.status === 'offline') node.classList.add('card-offline');
  else if (item.status === 'maintenance') node.classList.add('card-maintenance');
  else node.classList.remove('card-offline', 'card-maintenance');

  const actionsEl = node.querySelector('.card-actions');
  if (actionsEl) {
    const actions = buildCardActions(item);
    actions.forEach(el => actionsEl.appendChild(el));
  }

  const editButton = node.querySelector('.edit-btn');
  if (editButton) editButton.addEventListener('click', () => isMobile() ? window.startEditingMobile(item.id) : startEditing(item.id));

  const deleteButton = node.querySelector('.delete-btn');
  if (deleteButton) deleteButton.addEventListener('click', () => removeItem(item.id));
  return node;
}

function buildCardActions(item) {
  const els = [];

  if (item.ip) {
    els.push(makeCopyBtn(item.ip.split('/')[0], 'Copy IP'));
  }

  if (item.type === 'app' && item.ipPort) {
    els.push(makeCopyBtn(item.ipPort, 'Copy IP:Port'));
  }

  if ((item.type === 'app' || item.type === 'hardware') && item.webUrl) {
    const link = document.createElement('a');
    link.href = item.webUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'card-action-link';
    link.textContent = '🔗 Open';
    link.title = item.webUrl;
    els.push(link);

    els.push(makeCopyBtn(item.webUrl, 'Copy URL'));
  }

  return els;
}

function makeCopyBtn(value, label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'card-action-copy';
  btn.textContent = '📋 ' + value;
  btn.title = label;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value).then(() => {
      const orig = btn.textContent;
      btn.textContent = '✓ Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = orig;
        btn.classList.remove('copied');
      }, 1500);
    }).catch(() => {
      showToast('Could not copy to clipboard.', 'error');
    });
  });
  return btn;
}

function createCardShell() {
  const shell = template?.content?.firstElementChild;
  if (shell) return shell.cloneNode(true);

  const fallback = document.createElement('article');
  fallback.className = 'card';
  fallback.innerHTML = `
    <div class="card-head">
      <div class="title-wrap">
        <span class="type-badge"></span>
        <h3 class="card-title"></h3>
      </div>
      <div class="card-controls">
        <button class="icon-btn edit-btn" type="button">Edit</button>
        <button class="icon-btn delete-btn" type="button">Delete</button>
      </div>
    </div>
    <p class="card-desc"></p>
    <span class="card-status"></span>
    <p class="card-notes"></p>
    <p class="card-ip"></p>
    <p class="card-app"></p>
    <div class="card-actions"></div>
    <p class="card-specs"></p>
    <p class="card-network"></p>
    <p class="card-hosting"></p>
    <p class="card-links"></p>
  `;
  return fallback;
}

function setCardText(node, selector, value) {
  const target = node.querySelector(selector);
  if (target) target.textContent = value || '';
}

function buildLiveStatusHtml(item) {
  const statusMap = { online: '🟢', offline: '🔴', maintenance: '🟡', live: '📡' };
  const statusLabelMap = { online: 'Online', offline: 'Offline', maintenance: 'Maintenance', live: 'Live' };
  const parts = [];

  if (item.ipStatus) {
    if (item.ipStatus === 'live') {
      const liveData = liveStatusData[item.id] || {};
      const liveStatus = liveData.ipStatus ? (liveData.ipStatus === 'online' ? '🟢' : '🔴') : '⏳';
      parts.push(`<span class="status-badge">IP: ${liveStatus} <strong>Live</strong></span>`);
    } else {
      const icon = statusMap[item.ipStatus] || '⚪';
      const label = statusLabelMap[item.ipStatus] || item.ipStatus;
      parts.push(`<span class="status-badge">IP: ${icon} ${label}</span>`);
    }
  }

  if (item.urlStatus) {
    if (item.urlStatus === 'live') {
      const liveData = liveStatusData[item.id] || {};
      const liveStatus = liveData.urlStatus ? (liveData.urlStatus === 'online' ? '🟢' : '🔴') : '⏳';
      parts.push(`<span class="status-badge">URL: ${liveStatus} <strong>Live</strong></span>`);
    } else {
      const icon = statusMap[item.urlStatus] || '⚪';
      const label = statusLabelMap[item.urlStatus] || item.urlStatus;
      parts.push(`<span class="status-badge">URL: ${icon} ${label}</span>`);
    }
  }

  return parts.join('');
}

function appDetails(item) {
  const parts = [];
  if (item.ipPort) parts.push(`IP+Port: ${item.ipPort}`);
  if (item.webUrl) parts.push(`URL: ${item.webUrl}`);
  return parts.join(' | ');
}

function specsLabel(item) {
  const bits = [];
  if (['hardware', 'vm', 'lxc'].includes(item.type) && item.os) bits.push(`OS: ${item.os}`);
  if (!supportsComputeDetails(item.type, item.hardwareKind)) return bits.join(' | ');
  if (item.cpu) bits.push(`CPU: ${item.cpu}`);
  if (item.ram) bits.push(`RAM: ${item.ram}`);
  if (item.disks) bits.push(`Disks: ${item.disks}`);
  return bits.length ? bits.join(' | ') : '';
}

function hardwareDetailsLabel(item) {
  if (item.type !== 'hardware') return '';
  const bits = [];
  bits.push(`Hardware type: ${hardwareTypeLabel(item.hardwareKind || 'server')}`);
  if (item.manufacturer) bits.push(`Manufacturer: ${item.manufacturer}`);
  if (item.hardwareKind === 'switch' && item.switchPorts) bits.push(`Ports: ${item.switchPorts}`);
  if (supportsStorageGroups(item.type, item.hardwareKind) && item.nasShares?.length) {
    bits.push(`${item.hardwareKind === 'backup' ? 'Backup shares' : 'Shares'}: ${item.nasShares.map((share) => `${share.name} (${share.link || 'no link'})`).join(', ')}`);
  }
  if (supportsStorageGroups(item.type, item.hardwareKind) && item.nasRaids?.length) {
    bits.push(`${item.hardwareKind === 'backup' ? 'Backup RAID groups' : 'RAIDs'}: ${item.nasRaids.map((raid) => `${raid.name || 'raid'} ${raid.level}${raid.size ? ` (${raid.size})` : ''}`).join(', ')}`);
  }
  const compute = specsLabel(item);
  if (compute) bits.push(compute);
  return bits.join(' | ');
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

function refreshHardwareConnectionOptions() {
  const selectedRouter = getMultiValues(routerSwitches);
  const selectedSwitches = getMultiValues(switchLinks);
  const selectedDevices = getMultiValues(switchDeviceLinks);

  const switches = items.filter((item) => item.type === 'hardware' && item.hardwareKind === 'switch' && item.id !== editingId);
  routerSwitches.innerHTML = '';
  switchLinks.innerHTML = '';
  switches.forEach((sw) => {
    const option = document.createElement('option');
    option.value = sw.id;
    option.textContent = sw.name;
    routerSwitches.appendChild(option.cloneNode(true));
    switchLinks.appendChild(option);
  });

  switchDeviceLinks.innerHTML = '';
  items
    .filter((item) => item.type === 'hardware' && item.id !== editingId)
    .forEach((device) => {
      const option = document.createElement('option');
      option.value = device.id;
      option.textContent = `${device.name} (${hardwareTypeLabel(device.hardwareKind)})`;
      switchDeviceLinks.appendChild(option);
    });

  setMultiValues(routerSwitches, selectedRouter);
  setMultiValues(switchLinks, selectedSwitches);
  setMultiValues(switchDeviceLinks, selectedDevices);
}

function startEditing(id) {
  const item = findById(id);
  if (!item) return;

  editingId = id;
  formTitle.textContent = `Edit Resource: ${item.name}`;
  saveBtn.textContent = 'Save changes';
  cancelEditBtn.classList.remove('hidden');

  typeSelect.value = item.type;
  hardwareKindSelect.value = item.hardwareKind || 'server';
  manufacturerInput.value = item.manufacturer || '';
  osInput.value = item.os || '';
  symbolInput.value = item.symbol || defaultSymbol(item.type, item.hardwareKind);
  document.getElementById('name').value = item.name;
  document.getElementById('description').value = item.description;
  statusSelect.value = item.status || '';
  notesInput.value = item.notes || '';
  ipInput.value = item.ip || '';
  cpuCountSelect.value = String(item.cpuCount || inferCpuCount(item.cpu));
  switchPortsInput.value = item.switchPorts || '';
  ipPortInput.value = item.ipPort || '';
  webUrlInput.value = item.type === 'app' ? (item.webUrl || '') : '';
  hardwareWebUrlInput.value = item.type === 'hardware' ? (item.webUrl || '') : '';
  subnetInput.value = item.subnet || '';
  gatewayInput.value = item.gateway || '';
  setSelectedColor(item.networkColor || networkPalette[0]);

  applyTypeVisibility();
  refreshHostOptions();
  refreshAppHostOptions();
  refreshHardwareConnectionOptions();
  hostedOnSelect.value = item.hostedOn || '';
  appHostedOnSelect.value = item.appHostedOn || '';
  if (item.type === 'hardware' && item.hardwareKind === 'router-gateway') {
    setMultiValues(routerSwitches, item.connections || []);
  }
  if (item.type === 'hardware' && item.hardwareKind === 'switch') {
    const switchIds = items.filter((entry) => entry.type === 'hardware' && entry.hardwareKind === 'switch').map((entry) => entry.id);
    setMultiValues(switchLinks, (item.connections || []).filter((id) => switchIds.includes(id)));
    setMultiValues(switchDeviceLinks, (item.connections || []).filter((id) => !switchIds.includes(id)));
  }
  nasShares.innerHTML = '';
  nasRaids.innerHTML = '';
  ramModules.innerHTML = '';
  diskList.innerHTML = '';

  if (item.ramModules?.length) item.ramModules.forEach((module) => appendRamModuleRow(module));
  else appendRamModuleRow();

  if (item.diskRows?.length) item.diskRows.forEach((disk) => appendDiskRow(disk));
  else appendDiskRow();

  if (supportsStorageGroups(item.type, item.hardwareKind) && item.nasShares?.length) item.nasShares.forEach((share) => appendShareRow(share));
  else appendShareRow();

  if (supportsStorageGroups(item.type, item.hardwareKind) && item.nasRaids?.length) item.nasRaids.forEach((raid) => appendRaidRow(raid));
  else appendRaidRow();

  ipStatusSelect.value = item.ipStatus || '';
  urlStatusSelect.value = item.urlStatus || '';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function stopEditing() {
  editingId = null;
  formTitle.textContent = 'Add Resource';
  saveBtn.textContent = 'Add item';
  cancelEditBtn.classList.add('hidden');
}

async function removeItem(id) {
  const target = findById(id);
  if (!target) return;
  if (!confirm(`Delete "${target.name}"?`)) return;

  items = items.filter((item) => item.id !== id);
  normalizeItems();
  if (editingId === id) stopEditing();
  await saveItems();
  showToast('Resource removed.');
  render();
}

function showToast(message, kind = 'success') {
  if (!toast) return;
  toast.textContent = message;
  toast.style.borderColor = kind === 'error' ? 'var(--danger)' : 'var(--line)';
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function setTreeMode(mode) {
  treeViewMode = mode;
  if (!treeModeTree || !treeModeGraph) return;
  treeModeTree.classList.toggle('active', mode === 'tree');
  treeModeGraph.classList.toggle('active', mode === 'graph');
  treeModeTree.setAttribute('aria-pressed', String(mode === 'tree'));
  treeModeGraph.setAttribute('aria-pressed', String(mode === 'graph'));
  renderTreeView();
}

function renderTreeView() {
  treeContent.innerHTML = '';
  treeContent.classList.toggle('graph-mode', treeViewMode === 'graph');
  const treeShell = document.createElement('div');
  treeShell.className = 'tree-shell';

  if (treeViewMode === 'graph') {
    treeShell.appendChild(buildGraphView());
  } else {
    treeShell.appendChild(buildInfrastructureTree());
  }

  treeContent.appendChild(treeShell);
}

function buildGraphView() {
  const wrap = document.createElement('div');
  wrap.className = 'graph-wrap';

  const hoverTip = document.createElement('div');
  hoverTip.className = 'graph-tooltip hidden';
  hoverTip.textContent = '';
  wrap.appendChild(hoverTip);

  const canvas = document.createElement('div');
  canvas.className = 'graph-canvas';
  wrap.appendChild(canvas);

  const tip = document.createElement('aside');
  tip.className = 'graph-info-panel';
  wrap.appendChild(tip);

  const graphItems = items.filter((item) => item.type !== 'network');

  if (!graphItems.length) {
    const empty = document.createElement('p');
    empty.className = 'tree-empty';
    empty.textContent = 'No non-network resources to display in graph view.';
    canvas.appendChild(empty);
    return wrap;
  }

  const viewportWidth = Math.max(760, treeContent.clientWidth - 30);
  const viewportHeight = Math.max(460, treeContent.clientHeight - 34);
  const minWidthForItems = Math.max(680, graphItems.length * 84);
  const minHeightForItems = Math.max(460, Math.ceil(graphItems.length / 8) * 180);
  const width = Math.max(viewportWidth, minWidthForItems);
  const height = Math.max(viewportHeight, minHeightForItems);
  canvas.style.setProperty('--graph-width', `${width}px`);
  canvas.style.setProperty('--graph-height', `${height}px`);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const positions = new Map();
  const byId = Object.fromEntries(items.map((item) => [item.id, item]));

  const hardware = graphItems.filter((item) => item.type === 'hardware');
  const graphById = Object.fromEntries(graphItems.map((item) => [item.id, item]));

  function linkedHardware(from, filterFn) {
    const peers = hardware.filter((candidate) => candidate.id !== from.id && filterFn(candidate));
    return peers.find((candidate) => (from.connections || []).includes(candidate.id) || (candidate.connections || []).includes(from.id));
  }

  function parentIdFor(item) {
    if (item.type === 'vm' || item.type === 'lxc') return graphById[item.hostedOn]?.id || '';
    if (item.type === 'app') return graphById[item.appHostedOn]?.id || '';
    if (item.type === 'hardware' && item.hardwareKind === 'switch') return linkedHardware(item, (hw) => hw.hardwareKind === 'router-gateway')?.id || '';
    if (item.type === 'hardware' && item.hardwareKind !== 'router-gateway') {
      const switchParent = linkedHardware(item, (hw) => hw.hardwareKind === 'switch')?.id;
      if (switchParent) return switchParent;
      return linkedHardware(item, (hw) => hw.hardwareKind === 'router-gateway')?.id || '';
    }
    return '';
  }

  function nodeOrder(a, b) {
    const typeRank = { hardware: 0, vm: 1, lxc: 2, app: 3 };
    const hardwareRank = { 'router-gateway': 0, switch: 1 };
    const aType = typeRank[a.type] ?? 9;
    const bType = typeRank[b.type] ?? 9;
    if (aType !== bType) return aType - bType;
    if (a.type === 'hardware' && b.type === 'hardware') {
      const aHw = hardwareRank[a.hardwareKind] ?? 2;
      const bHw = hardwareRank[b.hardwareKind] ?? 2;
      if (aHw !== bHw) return aHw - bHw;
    }
    return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
  }

  const parentById = new Map();
  const childrenById = new Map(graphItems.map((item) => [item.id, []]));
  const graphNodeRadius = 23;
  graphItems.forEach((item) => {
    const candidateParentId = parentIdFor(item);
    const parentId = candidateParentId && candidateParentId !== item.id ? candidateParentId : '';
    parentById.set(item.id, parentId);
    if (parentId && childrenById.has(parentId)) childrenById.get(parentId).push(item.id);
  });

  childrenById.forEach((childIds, parentId) => {
    childIds.sort((aId, bId) => nodeOrder(graphById[aId], graphById[bId]));
    childrenById.set(parentId, childIds);
  });

  const roots = graphItems
    .filter((item) => !parentById.get(item.id))
    .sort(nodeOrder)
    .map((item) => item.id);

  const rawX = new Map();
  let cursor = 0;
  const horizontalStep = 108;

  function assignX(nodeId, trail = new Set()) {
    if (rawX.has(nodeId)) return rawX.get(nodeId);
    if (trail.has(nodeId)) {
      rawX.set(nodeId, cursor);
      cursor += horizontalStep;
      return rawX.get(nodeId);
    }

    trail.add(nodeId);
    const children = childrenById.get(nodeId) || [];
    const childCoords = children
      .map((childId) => assignX(childId, new Set(trail)))
      .filter((value) => Number.isFinite(value));

    if (!childCoords.length) {
      rawX.set(nodeId, cursor);
      cursor += horizontalStep;
      return rawX.get(nodeId);
    }

    const center = childCoords.reduce((sum, value) => sum + value, 0) / childCoords.length;
    rawX.set(nodeId, center);
    return center;
  }

  if (roots.length) {
    roots.forEach((rootId) => assignX(rootId));
  }

  graphItems.sort(nodeOrder).forEach((item) => {
    if (!rawX.has(item.id)) {
      rawX.set(item.id, cursor);
      cursor += horizontalStep;
    }
  });

  const depthCache = new Map();
  const visiting = new Set();
  function depthFor(nodeId) {
    if (depthCache.has(nodeId)) return depthCache.get(nodeId);
    if (visiting.has(nodeId)) return 0;
    visiting.add(nodeId);
    const parentId = parentById.get(nodeId);
    const depth = parentId ? depthFor(parentId) + 1 : 0;
    visiting.delete(nodeId);
    depthCache.set(nodeId, depth);
    return depth;
  }

  graphItems.forEach((item) => depthFor(item.id));

  const allRawX = [...rawX.values()].filter((value) => Number.isFinite(value));
  const depthValues = [...depthCache.values()].filter((value) => Number.isFinite(value));
  const canUseHierarchy = allRawX.length && depthValues.length;

  if (canUseHierarchy) {
    const minRawX = Math.min(...allRawX);
    const maxRawX = Math.max(...allRawX);
    const rawSpan = Math.max(1, maxRawX - minRawX);
    const horizontalPadding = 46;
    const usableWidth = Math.max(240, width - horizontalPadding * 2);
    const compress = rawSpan > usableWidth ? usableWidth / rawSpan : 1;
    const finalSpan = rawSpan * compress;
    const startX = (width - finalSpan) / 2;

    const topPadding = 44;
    const maxDepth = Math.max(1, Math.max(...depthValues));
    const layerGap = Math.max(54, Math.round((height - topPadding - 30) / maxDepth));

    graphItems.forEach((item) => {
      const x = startX + (rawX.get(item.id) - minRawX) * compress;
      const y = topPadding + depthFor(item.id) * layerGap;
      positions.set(item.id, {
        x: Math.max(36, Math.min(width - 36, Math.round(x))),
        y: Math.max(36, Math.min(height - 36, Math.round(y))),
      });
    });
  }

  if (positions.size !== graphItems.length) {
    const fallbackStep = width / (graphItems.length + 1);
    const fallbackTop = Math.round(height * 0.22);
    graphItems.sort(nodeOrder).forEach((item, idx) => {
      if (positions.has(item.id)) return;
      positions.set(item.id, {
        x: Math.round((idx + 1) * fallbackStep),
        y: fallbackTop + (idx % 3) * 96,
      });
    });
  }

  const svgNS = 'http://www.w3.org/2000/svg';
  const links = document.createElementNS(svgNS, 'svg');
  links.setAttribute('class', 'graph-links');
  links.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const seen = new Set();
  graphItems.forEach((item) => {
    const from = positions.get(item.id);
    if (!from) return;
    const graphConnections = new Set();

    if ((item.type === 'vm' || item.type === 'lxc') && item.hostedOn) graphConnections.add(item.hostedOn);
    if (item.type === 'app' && item.appHostedOn) graphConnections.add(item.appHostedOn);
    if (item.type === 'hardware' && Array.isArray(item.connections)) {
      item.connections.forEach((targetId) => {
        const target = byId[targetId];
        if (target?.type === 'hardware') graphConnections.add(targetId);
      });
    }

    [...graphConnections].forEach((targetId) => {
      const targetPos = positions.get(targetId);
      if (!targetPos) return;
      const key = [item.id, targetId].sort().join('::');
      if (seen.has(key)) return;
      seen.add(key);

      const drawDownward = from.y <= targetPos.y;
      const source = drawDownward ? from : targetPos;
      const target = drawDownward ? targetPos : from;

      const startX = source.x;
      const startY = source.y + graphNodeRadius;
      const endX = target.x;
      const endY = target.y - graphNodeRadius;

      const curve = document.createElementNS(svgNS, 'path');
      const yGap = Math.max(26, endY - startY);
      const bend = Math.min(96, Math.round(yGap * 0.45));
      const c1x = startX;
      const c1y = startY + bend;
      const c2x = endX;
      const c2y = endY - bend;
      curve.setAttribute('d', `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`);
      curve.setAttribute('stroke', '#6ca4ff');
      curve.setAttribute('stroke-width', '2');
      curve.setAttribute('stroke-opacity', '0.78');
      curve.setAttribute('fill', 'none');
      curve.setAttribute('stroke-linecap', 'round');
      links.appendChild(curve);
    });
  });

  canvas.appendChild(links);

  graphItems.forEach((item) => {
    const pos = positions.get(item.id);
    if (!pos) return;
    const node = document.createElement('button');
    node.type = 'button';
    node.className = `graph-node ${item.type}`;
    node.textContent = item.symbol || defaultSymbol(item.type, item.hardwareKind);
    node.style.left = `${pos.x}px`;
    node.style.top = `${pos.y}px`;
    node.style.borderColor = networkBorderColor(item) || 'var(--line)';

    node.addEventListener('mouseenter', (event) => {
      hoverTip.textContent = item.name;
      hoverTip.classList.remove('hidden');
      positionGraphTooltip(event, hoverTip, wrap);
    });
    node.addEventListener('mousemove', (event) => positionGraphTooltip(event, hoverTip, wrap));
    node.addEventListener('mouseleave', () => {
      hoverTip.classList.add('hidden');
      hoverTip.textContent = '';
    });
    node.addEventListener('click', () => {
      startEditing(item.id);
      treeDialog.close();
      showToast(`Editing ${item.name}`);
    });

    canvas.appendChild(node);
  });

  const graphBounds = getGraphBounds(positions, graphItems);
  requestAnimationFrame(() => {
    enableGraphPanZoom(wrap, canvas, width, height, graphBounds);
  });

  return wrap;
}




function getGraphBounds(positions, graphItems) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  graphItems.forEach((item) => {
    const pos = positions.get(item.id);
    if (!pos) return;
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x);
    maxY = Math.max(maxY, pos.y);
  });

  if (!Number.isFinite(minX)) return null;

  const xs = [];
  const ys = [];
  graphItems.forEach((item) => {
    const pos = positions.get(item.id);
    if (!pos) return;
    xs.push(pos.x);
    ys.push(pos.y);
  });
  xs.sort((a, b) => a - b);
  ys.sort((a, b) => a - b);
  const mid = Math.floor(xs.length / 2);
  const medianX = xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
  const medianY = ys.length % 2 ? ys[mid] : (ys[mid - 1] + ys[mid]) / 2;

  return { minX, minY, maxX, maxY, medianX, medianY };
}

function enableGraphPanZoom(wrap, canvas, width, height, bounds) {
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  function applyTransform() {
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }

  function centerView() {
    const defaultPanX = (wrap.clientWidth - width * scale) / 2;
    const defaultPanY = (wrap.clientHeight - height * scale) / 2;
    if (!bounds) {
      panX = defaultPanX;
      panY = defaultPanY;
      applyTransform();
      return;
    }

    const focusCenterX = Number.isFinite(bounds.medianX) ? bounds.medianX : (bounds.minX + bounds.maxX) / 2;
    const focusCenterY = Number.isFinite(bounds.medianY) ? bounds.medianY : (bounds.minY + bounds.maxY) / 2;

    panX = wrap.clientWidth / 2 - focusCenterX * scale;
    panY = wrap.clientHeight / 2 - focusCenterY * scale;

    if (!Number.isFinite(panX)) panX = defaultPanX;
    if (!Number.isFinite(panY)) panY = defaultPanY;
    applyTransform();
  }

  centerView();

  wrap.addEventListener('wheel', (event) => {
    event.preventDefault();
    const rect = wrap.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const nextScale = Math.max(0.5, Math.min(2.4, scale * zoomFactor));
    if (nextScale === scale) return;

    const graphX = (pointerX - panX) / scale;
    const graphY = (pointerY - panY) / scale;

    scale = nextScale;
    panX = pointerX - graphX * scale;
    panY = pointerY - graphY * scale;
    applyTransform();
  }, { passive: false });

  wrap.addEventListener('pointerdown', (event) => {
    const target = event.target;
    if (target.closest('.graph-node')) return;
    dragging = true;
    dragStartX = event.clientX - panX;
    dragStartY = event.clientY - panY;
    wrap.setPointerCapture(event.pointerId);
    wrap.style.cursor = 'grabbing';
  });

  wrap.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    panX = event.clientX - dragStartX;
    panY = event.clientY - dragStartY;
    applyTransform();
  });

  const stopDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    if (event && wrap.hasPointerCapture?.(event.pointerId)) wrap.releasePointerCapture(event.pointerId);
    wrap.style.cursor = 'grab';
  };

  wrap.addEventListener('pointerup', stopDrag);
  wrap.addEventListener('pointercancel', stopDrag);
  wrap.style.cursor = 'grab';
}

function positionGraphTooltip(event, tip, wrap) {
  const wrapRect = wrap.getBoundingClientRect();
  const x = event.clientX - wrapRect.left;
  const y = event.clientY - wrapRect.top;
  const gap = 14;
  const edge = 8;
  const tipRect = tip.getBoundingClientRect();
  const tipWidth = Math.max(90, Math.round(tipRect.width || tip.offsetWidth || 120));
  const tipHeight = Math.max(28, Math.round(tipRect.height || tip.offsetHeight || 32));

  const minX = edge;
  const maxX = wrap.clientWidth - tipWidth - edge;
  const minY = edge;
  const maxY = wrap.clientHeight - tipHeight - edge;

  const canRight = x + gap + tipWidth <= wrap.clientWidth - edge;
  const preferredLeft = canRight ? x + gap : x - gap - tipWidth;
  const preferredTop = y - tipHeight / 2;

  const left = Math.max(minX, Math.min(preferredLeft, maxX));
  const top = Math.max(minY, Math.min(preferredTop, maxY));

  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
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

  const kindOrder = ['router-gateway', 'switch', 'hypervisor', 'server', 'nas', 'backup', 'pc'];
  const groupedHardware = kindOrder
    .map((kind) => ({
      kind,
      hosts: hardware
        .filter((host) => (host.hardwareKind || 'server') === kind)
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })),
    }))
    .filter((group) => group.hosts.length);

  groupedHardware.forEach((group) => {
    const groupBlock = document.createElement('div');
    groupBlock.className = 'tree-subgroup';

    const groupHead = document.createElement('div');
    groupHead.className = 'tree-summary tree-group-head';
    groupHead.textContent = `${hardwareTypeLabel(group.kind)} (${group.hosts.length})`;
    groupBlock.appendChild(groupHead);

    const groupBody = document.createElement('div');
    groupBody.className = 'tree-children';

    group.hosts.forEach((host) => {
      const hostGuests = [...vms, ...lxcs].filter((guest) => guest.hostedOn === host.id);

      const hostBlock = document.createElement('details');
      hostBlock.className = 'tree-collapsible tree-host';
      hostBlock.open = false;

      const hostSummary = document.createElement('summary');
      hostSummary.className = 'tree-summary tree-summary-host';
      hostSummary.appendChild(treeChip(host));
      const hostIp = treeIpMeta(host);
      if (hostIp) hostSummary.appendChild(hostIp);
      const guestCount = document.createElement('span');
      guestCount.className = 'tree-count';
      guestCount.textContent = `${hostGuests.length} guest${hostGuests.length === 1 ? '' : 's'}`;
      hostSummary.appendChild(guestCount);
      hostBlock.appendChild(hostSummary);

      const hostChildren = document.createElement('div');
      hostChildren.className = 'tree-children tree-layer-host';

      hostGuests.forEach((guest) => {
        const guestApps = apps.filter((app) => app.appHostedOn === guest.id);

        if (!guestApps.length) {
          const guestLane = document.createElement('div');
          guestLane.className = 'tree-lane nested';
          guestLane.appendChild(treeChip(guest));
          const guestIp = treeIpMeta(guest);
          if (guestIp) guestLane.appendChild(guestIp);
          hostChildren.appendChild(guestLane);
          return;
        }

        const guestBlock = document.createElement('details');
        guestBlock.className = 'tree-collapsible tree-guest';

        const guestSummary = document.createElement('summary');
        guestSummary.className = 'tree-summary tree-summary-guest';
        guestSummary.appendChild(treeChip(guest));
        const guestIp = treeIpMeta(guest);
        if (guestIp) guestSummary.appendChild(guestIp);
        const appCount = document.createElement('span');
        appCount.className = 'tree-count';
        appCount.textContent = `${guestApps.length} app${guestApps.length === 1 ? '' : 's'}`;
        guestSummary.appendChild(appCount);
        guestBlock.appendChild(guestSummary);

        const appWrap = document.createElement('div');
        appWrap.className = 'tree-children tree-layer-guest';
        guestApps.forEach((app) => {
          const appLane = document.createElement('div');
          appLane.className = 'tree-lane nested';
          appLane.appendChild(treeChip(app));
          const appIp = treeIpMeta(app);
          if (appIp) appLane.appendChild(appIp);
          const appLink = appTreeLink(app);
          if (appLink) appLane.appendChild(appLink);
          appWrap.appendChild(appLane);
        });

        guestBlock.appendChild(appWrap);
        hostChildren.appendChild(guestBlock);
      });

      hostBlock.appendChild(hostChildren);
      groupBody.appendChild(hostBlock);
    });

    groupBlock.appendChild(groupBody);
    body.appendChild(groupBlock);
  });


  const orphanGuests = [...vms, ...lxcs].filter((guest) => !guest.hostedOn);
  if (orphanGuests.length) {
    const orphan = document.createElement('details');
    orphan.className = 'tree-subgroup tree-collapsible';

    const title = document.createElement('summary');
    title.className = 'tree-summary';
    title.textContent = `Unassigned VMs/LXCs (${orphanGuests.length})`;
    orphan.appendChild(title);

    const orphanBody = document.createElement('div');
    orphanBody.className = 'tree-children';
    orphanGuests.forEach((guest) => {
      const row = document.createElement('div');
      row.className = 'tree-lane';
      row.appendChild(treeChip(guest));
      const guestIp = treeIpMeta(guest);
      if (guestIp) row.appendChild(guestIp);
      orphanBody.appendChild(row);
    });
    orphan.appendChild(orphanBody);
    body.appendChild(orphan);
  }

  const orphanApps = apps.filter((app) => !app.appHostedOn);
  if (orphanApps.length) {
    const orphan = document.createElement('details');
    orphan.className = 'tree-subgroup tree-collapsible';

    const title = document.createElement('summary');
    title.className = 'tree-summary';
    title.textContent = `Unassigned Apps (${orphanApps.length})`;
    orphan.appendChild(title);

    const orphanBody = document.createElement('div');
    orphanBody.className = 'tree-children';
    orphanApps.forEach((app) => {
      const row = document.createElement('div');
      row.className = 'tree-lane';
      row.appendChild(treeChip(app));
      const appIp = treeIpMeta(app);
      if (appIp) row.appendChild(appIp);
      const appLink = appTreeLink(app);
      if (appLink) row.appendChild(appLink);
      orphanBody.appendChild(row);
    });
    orphan.appendChild(orphanBody);
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
  const netColor = networkBorderColor(item);
  if (netColor) chip.style.borderColor = netColor;
  chip.textContent = item.name;
  return chip;
}

function treeIpMeta(item) {
  const value = item.type === 'app' ? (item.ipPort || item.ip || '') : (item.ip || '');
  if (!value) return null;
  const meta = document.createElement('div');
  meta.className = 'tree-meta';
  meta.textContent = `IP: ${value}`;
  return meta;
}

function appTreeLink(app) {
  const url = app.webUrl || app.url;
  if (!url) return null;
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = 'tree-link';
  link.textContent = url;
  return link;
}

function infraMeta(item) {
  const details = item.type === 'hardware' ? hardwareDetailsLabel(item) : specsLabel(item);
  if (!details && !item.ip && !item.manufacturer && !item.os) return null;
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

function hardwareTypeLabel(kind) {
  return {
    server: 'Server',
    hypervisor: 'Hypervisor',
    nas: 'NAS',
    backup: 'Backup',
    pc: 'PC',
    'router-gateway': 'Router / Gateway',
    switch: 'Switch',
  }[kind] || 'Server';
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

function treeConnectionsMeta(item) {
  const text = connectionLabel(item);
  const meta = document.createElement('div');
  meta.className = 'tree-meta';
  meta.textContent = text;
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

function labelSingle(type) {
  return ({ hardware: 'Hardware', vm: 'VM', lxc: 'LXC', app: 'App', network: 'Network' })[type] || type;
}

function label(type) {
  return ({ hardware: 'Hardware', vm: 'VMs', lxc: 'LXCs', app: 'Apps', network: 'Networks' })[type] || type;
}

const customThemesKey = 'labby-custom-themes';
let themePreviewPrev = null;
let editingThemeId = null;
const themeVars = [
  { key: '--bg',          label: 'Background' },
  { key: '--bg-bottom',   label: 'Background (bottom)' },
  { key: '--phone',       label: 'Panel surface' },
  { key: '--panel',       label: 'Card / input surface' },
  { key: '--text',        label: 'Text' },
  { key: '--muted',       label: 'Muted text' },
  { key: '--line',        label: 'Borders' },
  { key: '--yellow',      label: 'Accent (buttons)' },
  { key: '--blue',        label: 'Info box' },
  { key: '--mint',        label: 'Highlight' },
  { key: '--danger',      label: 'Danger' },
  { key: '--type-hardware', label: 'Hardware' },
  { key: '--type-vm',       label: 'VM' },
  { key: '--type-lxc',      label: 'LXC' },
  { key: '--type-app',      label: 'App' },
  { key: '--type-network',  label: 'Network' },
];
const presetThemes = [
  { id: 'light',    name: 'Light',    dark: false, sw: ['#f5f1e7', '#2e2f36', '#b8d9ff', '#b8efca', '#f4d371'] },
  { id: 'ocean',    name: 'Ocean',    dark: false, sw: ['#eef6fa', '#1d4456', '#bfe2f5', '#b4ecd9', '#ffd36b'] },
  { id: 'forest',   name: 'Forest',   dark: false, sw: ['#f2f7ec', '#2d4429', '#cfe6d4', '#c2eabf', '#f2cf65'] },
  { id: 'rose',     name: 'Rose',     dark: false, sw: ['#fbf0f3', '#4a2535', '#f2cdd9', '#d8ecd0', '#f6cf7d'] },
  { id: 'solar',    name: 'Solar',    dark: false, sw: ['#fbf3e1', '#4a3a20', '#ffe2b3', '#d8e8b0', '#f3c441'] },
  { id: 'dark',     name: 'Dark',     dark: true,  sw: ['#231d30', '#5c4d7a', '#352c4a', '#356f71', '#e8b4d8'] },
  { id: 'midnight', name: 'Midnight', dark: true,  sw: ['#14253c', '#34557d', '#1f3a5c', '#1d5258', '#6cb6e8'] },
  { id: 'carbon',   name: 'Carbon',   dark: true,  sw: ['#1e2125', '#444b54', '#283540', '#2a3a32', '#e0c060'] },
  { id: 'nord',     name: 'Nord',     dark: true,  sw: ['#3b4252', '#5a6478', '#3e4a5e', '#3b4a44', '#ebcb8b'] },
  { id: 'grape',    name: 'Grape',    dark: true,  sw: ['#241634', '#6b3fa0', '#3d2a5c', '#2f5868', '#d68ce8'] },
];

function defaultThemeVars() {
  return {
    '--bg': '#ece9df', '--bg-bottom': '#d6ccc2', '--phone': '#f5f1e7',
    '--panel': '#ffffff', '--text': '#202126', '--muted': '#575a64',
    '--line': '#2e2f36', '--yellow': '#f4d371', '--blue': '#b8d9ff',
    '--mint': '#b8efca', '--danger': '#d84b4b',
    '--type-hardware': '#b8d9ff', '--type-vm': '#d6f0ff', '--type-lxc': '#d0f7ef',
    '--type-app': '#fce7d9', '--type-network': '#b8efca',
  };
}

function getCustomThemes() {
  try {
    const raw = localStorage.getItem(customThemesKey);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.map(t => ({
      id: t.id || ('custom-' + Math.random().toString(36).slice(2)),
      name: (t.name || 'Custom').toString().slice(0, 24),
      dark: !!t.dark,
      vars: { ...defaultThemeVars(), ...(t.vars || {}) },
    }));
  } catch { return []; }
}

function saveCustomThemes(arr) {
  localStorage.setItem(customThemesKey, JSON.stringify(arr));
  applyCustomThemeStyles(arr);
}

function importCustomThemes(imported) {
  if (!Array.isArray(imported)) return;
  const existing = getCustomThemes();
  const byId = new Map(existing.map(t => [t.id, t]));
  imported.forEach(t => {
    if (!t || typeof t !== 'object') return;
    const theme = {
      id: t.id || ('custom-' + Date.now() + '-' + Math.random().toString(36).slice(2)),
      name: (t.name || 'Custom').toString().slice(0, 24),
      dark: !!t.dark,
      vars: { ...defaultThemeVars(), ...(t.vars || {}) },
    };
    byId.set(theme.id, theme);
  });
  saveCustomThemes([...byId.values()]);
}

function customThemeById(id) {
  return getCustomThemes().find(t => t.id === id) || null;
}

function themeStyleRule(id, dark, vars) {
  const decls = themeVars.map(v => v.key + ': ' + (vars[v.key] || '') + ';').join(' ');
  return ":root[data-theme='" + id + "'] { color-scheme: " + (dark ? 'dark' : 'light') + '; ' + decls + ' }';
}

function applyCustomThemeStyles(arr) {
  let el = document.getElementById('custom-theme-style');
  if (!el) {
    el = document.createElement('style');
    el.id = 'custom-theme-style';
    document.head.appendChild(el);
  }
  el.textContent = arr.map(t => themeStyleRule(t.id, t.dark, t.vars)).join('\n');
}

function currentResolvedVars() {
  const cs = getComputedStyle(document.documentElement);
  const fallback = defaultThemeVars();
  const out = {};
  themeVars.forEach(v => {
    let val = cs.getPropertyValue(v.key).trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(val)) val = fallback[v.key];
    out[v.key] = val;
  });
  return out;
}

function applyPreviewTheme(dark, vars) {
  let el = document.getElementById('preview-theme-style');
  if (!el) {
    el = document.createElement('style');
    el.id = 'preview-theme-style';
    document.head.appendChild(el);
  }
  el.textContent = themeStyleRule('__preview', dark, vars);
  if (themePreviewPrev === null) themePreviewPrev = document.documentElement.dataset.theme || 'light';
  document.documentElement.dataset.theme = '__preview';
  if (dark) document.documentElement.setAttribute('data-dark', '');
  else document.documentElement.removeAttribute('data-dark');
}

function clearPreviewTheme() {
  const el = document.getElementById('preview-theme-style');
  if (el) el.textContent = '';
  if (themePreviewPrev !== null) {
    const prev = themePreviewPrev;
    themePreviewPrev = null;
    setTheme(prev);
  }
}

function initTheme() {
  const saved = localStorage.getItem(themeKey);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyCustomThemeStyles(getCustomThemes());
  const valid = [...presetThemes.map(t => t.id), ...getCustomThemes().map(t => t.id)];
  setTheme(saved && valid.includes(saved) ? saved : (prefersDark ? 'dark' : 'light'));
}

function isDarkTheme(theme) {
  const p = presetThemes.find(t => t.id === theme);
  if (p) return p.dark;
  const c = customThemeById(theme);
  return c ? c.dark : false;
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  if (isDarkTheme(theme)) document.documentElement.setAttribute('data-dark', '');
  else document.documentElement.removeAttribute('data-dark');
  localStorage.setItem(themeKey, theme);
}

function themePreviewColors(theme) {
  const p = presetThemes.find(t => t.id === theme);
  if (p) return { bg: p.sw[0], line: p.sw[1], a: p.sw[2], b: p.sw[3], c: p.sw[4] };
  const c = customThemeById(theme);
  const v = c ? c.vars : defaultThemeVars();
  return { bg: v['--phone'], line: v['--line'], a: v['--type-hardware'], b: v['--type-network'], c: v['--yellow'] };
}

function makeThemeSwatch(theme, name, opts) {
  opts = opts || {};
  const current = document.documentElement.dataset.theme || 'light';
  const pc = themePreviewColors(theme);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'theme-swatch' + (current === theme ? ' active' : '');
  btn.innerHTML =
    (opts.deletable ? '<span class="theme-swatch-del" title="Delete">✕</span>' : '') +
    '<span class="theme-swatch-preview" style="background:' + pc.bg + '">' +
      '<span class="tsc" style="background:' + pc.line + '"></span>' +
      '<span class="tsc" style="background:' + pc.a + '"></span>' +
      '<span class="tsc" style="background:' + pc.b + '"></span>' +
      '<span class="tsc" style="background:' + pc.c + '"></span>' +
    '</span>' +
    '<span class="theme-swatch-name">' + name + '</span>';
  btn.addEventListener('click', () => { clearPreviewTheme(); setTheme(theme); renderThemeGrids(); });
  if (opts.deletable) {
    btn.querySelector('.theme-swatch-del').addEventListener('click', (e) => {
      e.stopPropagation();
      const arr = getCustomThemes().filter(t => t.id !== theme);
      saveCustomThemes(arr);
      if ((document.documentElement.dataset.theme || '') === theme) setTheme('light');
      renderThemeGrids();
      showToast('Theme deleted.');
    });
  }
  return btn;
}

function renderThemeGrids() {
  const dg = document.getElementById('theme-default-grid');
  const cg = document.getElementById('theme-custom-grid');
  const empty = document.getElementById('theme-custom-empty');
  if (!dg || !cg) return;
  dg.innerHTML = '';
  presetThemes.forEach(t => dg.appendChild(makeThemeSwatch(t.id, t.name, {})));
  const customs = getCustomThemes();
  cg.innerHTML = '';
  customs.forEach(t => {
    const el = makeThemeSwatch(t.id, t.name, { deletable: true });
    const editBtn = document.createElement('button');
    editBtn.className='theme-edit-btn';
    editBtn.type='button';
    editBtn.textContent='Edit';
    editBtn.onclick=(e)=>{e.stopPropagation();editCustomTheme(t.id);};
    el.appendChild(editBtn);
    cg.appendChild(el);
  });
  if (empty) empty.style.display = customs.length ? 'none' : '';
}


function editCustomTheme(id) {
  const theme = customThemeById(id);
  if (!theme) return;
  editingThemeId = id;
  switchThemeTab('customize');
  setTimeout(() => {
    const nameInput = document.getElementById('tb-name');
    if (nameInput) nameInput.value = theme.name || '';
    Object.entries(theme.vars || {}).forEach(([k,v]) => {
      const el = document.querySelector('[data-var="' + k + '"]');
      if (el) el.value = v;
    });
  }, 0);
}

function renderCustomizeTab() {
  const body = document.getElementById('theme-customize-body');
  if (!body) return;
  const start = currentResolvedVars();
  body.innerHTML = '';

  const nameRow = document.createElement('label');
  nameRow.className = 'tb-base-row';
  nameRow.innerHTML = '<span>Name</span><input id="tb-name" type="text" maxlength="24" placeholder="My Theme" value="My Theme" />';
  body.appendChild(nameRow);

  const grid = document.createElement('div');
  grid.className = 'tb-grid';
  themeVars.forEach(v => {
    const row = document.createElement('label');
    row.className = 'tb-color-row';
    row.innerHTML = '<input type="color" data-var="' + v.key + '" value="' + start[v.key] + '" /><span>' + v.label + '</span>';
    grid.appendChild(row);
  });
  body.appendChild(grid);

  const actions = document.createElement('div');
  actions.className = 'tb-actions';
  actions.innerHTML = '<button id="tb-save" class="button" type="button">Save Theme</button>';
  body.appendChild(actions);

  const collect = () => {
    const vars = {};
    body.querySelectorAll('input[type="color"]').forEach(inp => { vars[inp.dataset.var] = inp.value; });
    return { dark: false, vars };
  };
  const preview = () => { const d = collect(); applyPreviewTheme(d.dark, d.vars); };

  body.querySelectorAll('input[type="color"]').forEach(inp => inp.addEventListener('input', preview));
  document.getElementById('tb-save').onclick = () => {
    const d = collect();
    const name = (document.getElementById('tb-name').value || '').trim().slice(0, 24) || 'My Theme';
    const arr = getCustomThemes();
    let savedThemeId = editingThemeId;
    if (editingThemeId) {
      const idx = arr.findIndex(t => t.id === editingThemeId);
      if (idx !== -1) arr[idx] = { id: editingThemeId, name, dark: false, vars: d.vars };
      editingThemeId = null;
    } else {
      savedThemeId = 'custom-' + Date.now();
      const theme = { id: savedThemeId, name, dark: false, vars: d.vars };
      arr.push(theme);
    }
    saveCustomThemes(arr);
    themePreviewPrev = null;
    const pv = document.getElementById('preview-theme-style');
    if (pv) pv.textContent = '';
    setTheme(savedThemeId || 'light');
    switchThemeTab('themes');
    showToast('Theme saved.');
  };

  preview();
}

function switchThemeTab(tab) {
  const themeDialog = document.getElementById('theme-picker-dialog');
  if (themeDialog) themeDialog.classList.toggle('customize-active', tab === 'customize');
  document.querySelectorAll('.theme-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const tt = document.getElementById('theme-tab-themes');
  const tc = document.getElementById('theme-tab-customize');
  if (tt) tt.style.display = tab === 'themes' ? '' : 'none';
  if (tc) tc.style.display = tab === 'customize' ? '' : 'none';
  if (tab === 'themes') { clearPreviewTheme(); renderThemeGrids(); }
  else renderCustomizeTab();
}

function openThemePicker(options) {
  const dlg = document.getElementById('theme-picker-dialog');
  const opts = options || {};
  themePickerReturnToConfig = !!opts.returnToConfig;
  switchThemeTab('themes');
  dlg.onclose = () => {
    clearPreviewTheme();
    editingThemeId = null;
    const shouldReturn = themePickerReturnToConfig;
    themePickerReturnToConfig = false;
    if (shouldReturn && configDialog && !configDialog.open) {
      configDialog.showModal();
    }
  };
  if (typeof dlg.showModal === 'function' && !dlg.open) dlg.showModal();
}

function isMobile() {
  return window.innerWidth <= 1100;
}

function showMobileView(id) {
  document.querySelectorAll('.mobile-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
  const view = document.getElementById(id);
  if (view) view.classList.add('active');
}

function hideMobileViews() {
  document.querySelectorAll('.mobile-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
  const topo = document.getElementById('nav-topology');
  if (topo) topo.classList.add('active');
}

const navTopology = document.getElementById('nav-topology');
const navAdd = document.getElementById('nav-add');
const navIp = document.getElementById('nav-ip');
const navTree = document.getElementById('nav-tree');
const navConfig = document.getElementById('nav-config');

if (navTopology) {
  navTopology.classList.add('active');
  navTopology.addEventListener('click', () => {
    hideMobileViews();
    navTopology.classList.add('active');
  });
}

if (navAdd) navAdd.addEventListener('click', () => {
  showMobileView('mobile-add');
  navAdd.classList.add('active');
  document.getElementById('mobile-form-title').textContent = 'Add Resource';
  const body = document.getElementById('mobile-form-body');
  const formEl = document.getElementById('resource-form');
  if (body && formEl && !body.contains(formEl)) body.appendChild(formEl);
  setTimeout(() => document.getElementById('name').focus(), 50);
});

if (navIp) navIp.addEventListener('click', () => {
  showMobileView('mobile-ip');
  navIp.classList.add('active');
  renderIPViewMobile();
});

if (navTree) navTree.addEventListener('click', () => {
  showMobileView('mobile-tree');
  navTree.classList.add('active');
  renderMobileTree();
});

if (navConfig) navConfig.addEventListener('click', () => {
  showMobileView('mobile-config');
  navConfig.classList.add('active');
});

const mobileFormClose = document.getElementById('mobile-form-close');
if (mobileFormClose) mobileFormClose.addEventListener('click', () => {
  stopEditing();
  form.reset();
  symbolInput.value = defaultSymbol('hardware', 'server');
  hardwareKindSelect.value = 'server';
  resetDynamicHardwareFields();
  setMultiValues(routerSwitches, []);
  setMultiValues(switchLinks, []);
  setMultiValues(switchDeviceLinks, []);
  setSelectedColor(networkPalette[0]);
  applyTypeVisibility();
  render();
  hideMobileViews();
});

const mobileIpClose = document.getElementById('mobile-ip-close');
if (mobileIpClose) mobileIpClose.addEventListener('click', hideMobileViews);

const mobileTreeClose = document.getElementById('mobile-tree-close');
if (mobileTreeClose) mobileTreeClose.addEventListener('click', hideMobileViews);

const mobileConfigClose = document.getElementById('mobile-config-close');
if (mobileConfigClose) mobileConfigClose.addEventListener('click', hideMobileViews);

const mobileTreeModeTree = document.getElementById('mobile-tree-mode-tree');
const mobileTreeModeGraph = document.getElementById('mobile-tree-mode-graph');
if (mobileTreeModeTree) mobileTreeModeTree.addEventListener('click', () => {
  treeViewMode = 'tree';
  mobileTreeModeTree.classList.add('active');
  mobileTreeModeGraph.classList.remove('active');
  renderMobileTree();
});
if (mobileTreeModeGraph) mobileTreeModeGraph.addEventListener('click', () => {
  treeViewMode = 'graph';
  mobileTreeModeGraph.classList.add('active');
  mobileTreeModeTree.classList.remove('active');
  renderMobileTree();
});

function renderMobileTree() {
  const container = document.getElementById('mobile-tree-content');
  if (!container) return;
  container.innerHTML = '';
  const shell = document.createElement('div');
  shell.className = 'tree-shell';
  shell.appendChild(treeViewMode === 'graph' ? buildGraphView() : buildInfrastructureTree());
  container.appendChild(shell);
}

const ipSearchMobile = document.getElementById('ip-search-mobile');
if (ipSearchMobile) ipSearchMobile.addEventListener('input', renderIPViewMobile);

function renderIPViewMobile() {
  const container = document.getElementById('ip-content-mobile');
  const searchEl = document.getElementById('ip-search-mobile');
  if (!container || !searchEl) return;
  container.innerHTML = '';
  renderIPInto(container, searchEl.value.trim().toLowerCase());
}

function renderIPInto(container, query) {
  const networks = items.filter(i => i.type === 'network');
  const allIPs = [];
  items.forEach(item => extractIPs(item).forEach(e => allIPs.push(e)));
  const matched = query ? allIPs.filter(e => e.addr.includes(query) || (e.port && e.port.includes(query)) || e.item.name.toLowerCase().includes(query)) : allIPs;

  if (!matched.length) {
    const empty = document.createElement('p');
    empty.className = 'tree-empty';
    empty.textContent = query ? 'No matching IP addresses found.' : 'No IP addresses defined yet.';
    container.appendChild(empty);
    return;
  }

  const bySubnet = new Map();
  const unmatched = [];
  matched.forEach(entry => {
    const net = networks.find(n => ipInSubnet(entry.addr, n.subnet));
    if (net) {
      if (!bySubnet.has(net.id)) bySubnet.set(net.id, { net, entries: [] });
      bySubnet.get(net.id).entries.push(entry);
    } else {
      unmatched.push(entry);
    }
  });

  bySubnet.forEach(({ net, entries }) => {
    entries.sort((a, b) => toIPv4Int(a.addr) - toIPv4Int(b.addr));
    const block = document.createElement('div');
    block.className = 'ip-subnet-block';
    const head = document.createElement('div');
    head.className = 'ip-subnet-head';
    const lbl = document.createElement('span');
    lbl.className = 'ip-subnet-label';
    lbl.textContent = net.subnet;
    if (net.networkColor) lbl.style.background = net.networkColor;
    const nm = document.createElement('span');
    nm.className = 'ip-subnet-name';
    nm.textContent = net.name + (net.gateway ? ' · GW: ' + net.gateway : '');
    head.appendChild(lbl);
    head.appendChild(nm);
    block.appendChild(head);
    entries.forEach(e => block.appendChild(buildIPRow(e, query)));
    container.appendChild(block);
  });

  if (unmatched.length) {
    unmatched.sort((a, b) => (toIPv4Int(a.addr) || 0) - (toIPv4Int(b.addr) || 0));
    const block = document.createElement('div');
    block.className = 'ip-subnet-block';
    const head = document.createElement('div');
    head.className = 'ip-subnet-head';
    const lbl = document.createElement('span');
    lbl.className = 'ip-subnet-label';
    lbl.textContent = 'No subnet match';
    head.appendChild(lbl);
    block.appendChild(head);
    unmatched.forEach(e => block.appendChild(buildIPRow(e, query)));
    container.appendChild(block);
  }
}

const exportBtnMobile = document.getElementById('export-btn-mobile');
if (exportBtnMobile) exportBtnMobile.addEventListener('click', () => {
  const config = { items, locations, racks, customThemes: getCustomThemes() };
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'labby-config.json';
  link.click();
  URL.revokeObjectURL(url);
  showToast('Config exported.');
});

const importFileMobile = document.getElementById('import-file-mobile');
if (importFileMobile) importFileMobile.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      items = sanitizeItems(parsed);
    } else {
      items     = sanitizeItems(parsed.items     || []);
      locations = Array.isArray(parsed.locations) ? parsed.locations : [];
      racks     = Array.isArray(parsed.racks)     ? parsed.racks     : [];
      if (Array.isArray(parsed.customThemes)) importCustomThemes(parsed.customThemes);
    }
    stopEditing();
    await saveItems();
    showToast('Config imported successfully.');
    render();
  } catch {
    showToast('Invalid config file.', 'error');
  } finally {
    importFileMobile.value = '';
  }
});

const clearAllMobile = document.getElementById('clear-all-mobile');
if (clearAllMobile) clearAllMobile.addEventListener('click', async () => {
  if (!confirm('Delete all resources? This also clears all rack and location data.')) return;
  items = []; locations = []; racks = [];
  stopEditing();
  await saveItems();
  showToast('All resources cleared.');
  render();
  hideMobileViews();
});

const editCardOriginal = startEditing;
window.startEditingMobile = function(id) {
  startEditing(id);
  if (isMobile()) {
    showMobileView('mobile-add');
    navAdd.classList.add('active');
    document.getElementById('mobile-form-title').textContent = 'Edit Resource';
    const body = document.getElementById('mobile-form-body');
    const formEl = document.getElementById('resource-form');
    if (body && formEl && !body.contains(formEl)) body.appendChild(formEl);
  }
};

let tutorialStep = 0;
const tutorialSteps = [
  { title: 'Welcome to Labby! 👋', text: 'Labby helps you map your homelab. Track hardware, VMs, apps and networks, and visualize how everything connects.'},
  { title: 'Your Topology', text: 'The main view shows all your resources grouped by type. Each card shows specs, IP, status and quick actions.', icon: '🗂️' },
  { title: 'Add Resources', text: 'Use the form on the left (desktop) or tap ➕ Add (mobile) to create hardware, VMs, LXCs, apps or networks.', icon: '➕' },
  { title: 'IP View', text: 'The IP View shows all used IPs sorted by subnet. Search by IP, hostname or port to find devices instantly.', icon: '🌐' },
  { title: 'Relationship Tree', text: 'Tree and Graph views visualize how your infrastructure connects. Which VMs run on which hardware, which apps run on which VMs.', icon: '🌳' },
  { title: 'Status Indicators', text: 'Mark devices as 🟢 Online, 🔴 Offline or 🟡 Maintenance. Offline cards are dimmed, maintenance cards get a dashed border.', icon: '🟢' },
  { title: 'Copy & Open', text: 'Click any IP or URL on a card to copy it to clipboard. Apps with a web URL show an Open button to launch directly.', icon: '📋' },
  { title: 'Config & Backup', text: 'Use Config → Export to back up your data as JSON. Import to restore or migrate to another instance.', icon: '💾' },
];

function openTutorial() {
  tutorialStep = 0;
  renderTutorialStep();
  document.getElementById('welcome-overlay').classList.add('active');
  document.getElementById('config-dialog').close();
  hideMobileViews();
}

function renderTutorialStep() {
  const step = tutorialSteps[tutorialStep];
  document.getElementById('tutorial-icon').textContent = step.icon;
  document.getElementById('tutorial-title').textContent = step.title;
  document.getElementById('tutorial-text').textContent = step.text;
  document.getElementById('tutorial-progress').textContent = `${tutorialStep + 1} / ${tutorialSteps.length}`;
  document.getElementById('tutorial-prev').style.display = tutorialStep === 0 ? 'none' : 'block';
  document.getElementById('tutorial-next').textContent = tutorialStep === tutorialSteps.length - 1 ? "Let's go! 🚀" : 'Next →';
  const dots = document.getElementById('tutorial-dots');
  dots.innerHTML = '';
  tutorialSteps.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'tutorial-dot' + (i === tutorialStep ? ' active' : '');
    dot.addEventListener('click', () => { tutorialStep = i; renderTutorialStep(); });
    dots.appendChild(dot);
  });
}

function closeTutorial() {
  document.getElementById('welcome-overlay').classList.remove('active');
  localStorage.setItem('labby-tutorial-seen', '1');
}

document.getElementById('tutorial-next').addEventListener('click', () => {
  if (tutorialStep < tutorialSteps.length - 1) {
    tutorialStep++;
    renderTutorialStep();
  } else {
    closeTutorial();
  }
});

document.getElementById('tutorial-prev').addEventListener('click', () => {
  if (tutorialStep > 0) { tutorialStep--; renderTutorialStep(); }
});

document.getElementById('tutorial-skip').addEventListener('click', closeTutorial);

document.getElementById('welcome-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('welcome-overlay')) closeTutorial();
});

document.getElementById('show-tutorial-btn').addEventListener('click', openTutorial);
document.getElementById('show-tutorial-btn-mobile').addEventListener('click', openTutorial);

/* ================================================================
   RACK FEATURE
   ================================================================ */

// ---- Palette component definitions ----
const RACK_COMPONENTS = [
  // ── Compute ─────────────────────────────────────────────────
  { componentType: '1u-server',      heightU: 1, label: '1U Server',      category: 'compute' },
  { componentType: '2u-server',      heightU: 2, label: '2U Server',      category: 'compute' },
  { componentType: '4u-server',      heightU: 4, label: '4U Server',      category: 'compute' },
  { componentType: '2pc-1u',         heightU: 1, label: '2× PC (1U)',     category: 'compute', multiDevice: 2 },
  { componentType: '2pc-2u',         heightU: 2, label: '2× PC (2U)',     category: 'compute', multiDevice: 2 },
  { componentType: '3pc-1u',         heightU: 1, label: '3× PC (1U)',     category: 'compute', multiDevice: 3 },
  { componentType: '3pc-2u',         heightU: 2, label: '3× PC (2U)',     category: 'compute', multiDevice: 3 },
  // ── Networking ──────────────────────────────────────────────
  { componentType: '1u-router',      heightU: 1, label: '1U Router',      category: 'network' },
  { componentType: '2u-router',      heightU: 2, label: '2U Router',      category: 'network' },
  { componentType: '1u-switch',      heightU: 1, label: '1U Switch',      category: 'network' },
  { componentType: '2u-switch',      heightU: 2, label: '2U Switch',      category: 'network' },
  { componentType: '1u-patch-panel', heightU: 1, label: '1U Patch Panel', category: 'network' },
  { componentType: '2u-patch-panel', heightU: 2, label: '2U Patch Panel', category: 'network' },
  { componentType: '1u-cable-mgmt',  heightU: 1, label: '1U Cable Mgmt',  category: 'network', isPassive: true },
  // ── Power ────────────────────────────────────────────────────
  { componentType: '1u-ups',         heightU: 1, label: '1U UPS',         category: 'power' },
  { componentType: '2u-ups',         heightU: 2, label: '2U UPS',         category: 'power' },
  { componentType: '4u-ups',         heightU: 4, label: '4U UPS',         category: 'power' },
  { componentType: '1u-pdu',         heightU: 1, label: '1U PDU',         category: 'power', isPDU: true },
  { componentType: '2u-pdu',         heightU: 2, label: '2U PDU',         category: 'power', isPDU: true },
  // ── Management ───────────────────────────────────────────────
  { componentType: '1u-kvm',         heightU: 1, label: '1U KVM',         category: 'mgmt' },
  // ── Filler ───────────────────────────────────────────────────
  { componentType: '1u-blank',       heightU: 1, label: '1U Blank',       category: 'filler', isBlank: true },
  { componentType: '2u-blank',       heightU: 2, label: '2U Blank',       category: 'filler', isBlank: true },
  { componentType: '4u-blank',       heightU: 4, label: '4U Blank',       category: 'filler', isBlank: true },
];

// ---- State ----
let rackEditorRackId = null;
let rackDragComponent = null;
let rackLinkPanelTarget = null;
let rackFormMode = null;
let rackFormPendingLocationId = null;

// ---- DOM refs ----
const rackOverview     = document.getElementById('rack-overview');
const rackEditor       = document.getElementById('rack-editor');
const rackFormDialog   = document.getElementById('rack-form-dialog');
const rackFormPage     = rackFormDialog; // alias for compatibility
const rackToggleBtn    = document.getElementById('rack-toggle');
const rackCloseBtn     = document.getElementById('rack-close-btn');
const rackAddLocBtn    = document.getElementById('rack-add-location-btn');
const rackAddRackBtn   = document.getElementById('rack-add-rack-btn');
const rackOverviewBody = document.getElementById('rack-overview-body');
const rackEditorBack   = document.getElementById('rack-editor-back');
const rackEditorSave   = document.getElementById('rack-editor-save');
const rackEditorName   = document.getElementById('rack-editor-name');
const rackEditorLocBadge = document.getElementById('rack-editor-location-badge');
const rackFront        = document.getElementById('rack-front');
const rackRear         = document.getElementById('rack-rear');
const rackPaletteItems = document.getElementById('rack-palette-items');
const rackFormPageTitle = document.getElementById('rack-form-page-title');
const rackFormPageBody  = document.getElementById('rack-form-page-body');
// rackFormBack removed — dialog now uses inline close buttons
const phoneGrid         = document.querySelector('.phone-grid');

// ---- Helpers ----
function rackById(id)     { return racks.find(r => r.id === id); }
function locationById(id) { return locations.find(l => l.id === id); }

async function saveRackData() { await saveItemsToAPI(items); }

function showRackOverlay(id) {
  // Only toggle the full-screen overlays — never the form dialog
  [rackOverview, rackEditor].forEach(el => el && el.classList.add('hidden'));
  if (phoneGrid) phoneGrid.style.display = '';
  if (id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
    if (phoneGrid) phoneGrid.style.display = 'none';
  }
}

// ---- Main toggle ----
if (rackToggleBtn) {
  rackToggleBtn.addEventListener('click', () => {
    if (isMobile()) { showToast('Rack View ist nur auf dem Desktop verfügbar.', 'error'); return; }
    renderRackOverview();
    showRackOverlay('rack-overview');
  });
}
// Header buttons are now rendered dynamically inside renderRackOverview()

// ---- Rack Overview ----
function renderRackOverview() {
  if (!rackOverviewBody) return;
  rackOverviewBody.innerHTML = '';

  // Inner wrapper — same max-width as dashboard
  const inner = document.createElement('div');
  inner.className = 'rack-overview-inner';
  rackOverviewBody.appendChild(inner);

  // ── Floating top bar (title + action buttons) ───────────────
  const topBar = document.createElement('div');
  topBar.className = 'rack-ov-topbar';
  topBar.innerHTML = `
    <h2 class="rack-ov-title">🗄️ Rack View</h2>
    <div class="rack-ov-actions">
      <button class="button rack-ov-btn-loc" id="rov-add-loc" type="button">+ Location</button>
      <button class="button rack-ov-btn-rack" id="rov-add-rack" type="button">+ Rack</button>
      <button class="button secondary rack-ov-btn-close" id="rov-close" type="button">✕ Close</button>
    </div>
  `;
  inner.appendChild(topBar);
  topBar.querySelector('#rov-add-loc').addEventListener('click', () => openLocationForm(null, null));
  topBar.querySelector('#rov-add-rack').addEventListener('click', () => openRackForm(null, null));
  topBar.querySelector('#rov-close').addEventListener('click', () => showRackOverlay(null));

  // ── Rounded panel (like dashboard .phone) ───────────────────
  const panel = document.createElement('div');
  panel.className = 'rack-ov-panel';
  inner.appendChild(panel);

  if (locations.length === 0) {
    const es = document.createElement('div');
    es.className = 'rack-empty-state';
    es.innerHTML = `
      <div style="font-size:3rem">🗄️</div>
      <h3>No Racks Yet</h3>
      <p>Start by creating a location, then add your first rack.</p>
      <button class="button" id="rack-create-first">+ Create your first Rack</button>
    `;
    panel.appendChild(es);
    document.getElementById('rack-create-first').addEventListener('click', () => openLocationForm('create-flow', null));
    return;
  }

  // Location selector row
  const locBar = document.createElement('div');
  locBar.className = 'rack-location-bar';

  const locLabel = document.createElement('label');
  locLabel.textContent = 'Location:';

  const locSel = document.createElement('select');
  locSel.id = 'rack-location-select';
  locations.forEach(loc => {
    const opt = document.createElement('option');
    opt.value = loc.id;
    opt.textContent = loc.name;
    locSel.appendChild(opt);
  });

  // Edit location button
  const editLocBtn = document.createElement('button');
  editLocBtn.className = 'button secondary';
  editLocBtn.textContent = '✏️ Edit';
  editLocBtn.type = 'button';
  editLocBtn.addEventListener('click', () => openLocationForm(null, locSel.value));

  locBar.appendChild(locLabel);
  locBar.appendChild(locSel);
  locBar.appendChild(editLocBtn);
  panel.appendChild(locBar);

  const grid = document.createElement('div');
  grid.className = 'rack-cards-grid';
  panel.appendChild(grid);

  function renderCards() {
    grid.innerHTML = '';
    const locationRacks = racks.filter(r => r.locationId === locSel.value);
    if (locationRacks.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:var(--muted);font:0.8rem/1.4 Space Mono,monospace;padding:1rem 0;';
      empty.textContent = 'No racks at this location.';
      grid.appendChild(empty);
    } else {
      locationRacks.forEach(rack => {
        const card = document.createElement('div');
        card.className = 'rack-card';
        card.innerHTML = `
          <div class="rack-card-icon">🗄️</div>
          <p class="rack-card-name">${escapeHtml(rack.name)}</p>
          <p class="rack-card-meta">${rack.heightUnits}U · ${rack.formFactor === '10inch' ? '10″' : '19″'}</p>
        `;
        card.addEventListener('click', () => openRackEditor(rack.id));
        // Right-click context menu
        card.addEventListener('contextmenu', e => {
          e.preventDefault();
          showRackContextMenu(e.clientX, e.clientY, rack, renderCards);
        });
        grid.appendChild(card);
      });
    }
  }

  locSel.addEventListener('change', renderCards);
  renderCards();
}

// ── Context menu ─────────────────────────────────────────────
function closeContextMenu() {
  const existing = document.getElementById('rack-ctx-menu');
  if (existing) existing.remove();
}

function showRackContextMenu(x, y, rack, onDelete) {
  closeContextMenu();
  const menu = document.createElement('div');
  menu.className = 'rack-ctx-menu';
  menu.id = 'rack-ctx-menu';

  menu.innerHTML = `
    <div class="rack-ctx-item" id="ctx-open">📂 Open Editor</div>
    <div class="rack-ctx-item" id="ctx-edit">✏️ Edit Rack</div>
    <div class="rack-ctx-sep"></div>
    <div class="rack-ctx-item danger" id="ctx-delete">🗑 Delete Rack</div>
  `;

  // Position — keep inside viewport
  menu.style.left = Math.min(x, window.innerWidth  - 200) + 'px';
  menu.style.top  = Math.min(y, window.innerHeight - 150) + 'px';
  document.body.appendChild(menu);

  menu.querySelector('#ctx-open').addEventListener('mousedown', e => e.stopPropagation());
  menu.querySelector('#ctx-open').addEventListener('click', e => {
    e.stopPropagation();
    closeContextMenu();
    openRackEditor(rack.id);
  });
  menu.querySelector('#ctx-edit').addEventListener('mousedown', e => e.stopPropagation());
  menu.querySelector('#ctx-edit').addEventListener('click', e => {
    e.stopPropagation();
    closeContextMenu();
    openRackForm(rack.id, null);
  });
  menu.querySelector('#ctx-delete').addEventListener('mousedown', e => e.stopPropagation());
  menu.querySelector('#ctx-delete').addEventListener('click', e => {
    e.stopPropagation();
    closeContextMenu();
    if (!confirm(`Delete rack "${rack.name}"? This cannot be undone.`)) return;
    racks = racks.filter(r => r.id !== rack.id);
    saveRackData();
    renderRackOverview();
    showToast('Rack deleted.');
  });

  // Close on outside mousedown (after this event cycle finishes)
  const outsideHandler = e => {
    if (!menu.contains(e.target)) {
      closeContextMenu();
      document.removeEventListener('mousedown', outsideHandler);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', outsideHandler), 50);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeContextMenu();
});

// ---- Location form ----
function openLocationForm(mode, existingId) {
  rackFormMode = mode === 'create-flow' ? 'location-flow' : (existingId ? 'editLocation' : 'location');
  const existing = existingId ? locationById(existingId) : null;
  rackFormPageTitle.textContent = existing ? 'Edit Location' : 'Create Location';
  rackFormPageBody.innerHTML = '';

  const inner = document.createElement('div');
  inner.className = 'rack-form-inner';
  inner.innerHTML = `
    <label>Name *
      <input id="rf-loc-name" type="text" placeholder="e.g. Server Room 1" value="${existing ? escapeHtml(existing.name) : ''}" />
    </label>
    <label>Address
      <input id="rf-loc-address" type="text" placeholder="e.g. Basement, Rack Bay A" value="${existing ? escapeHtml(existing.address || '') : ''}" />
    </label>
    <label>Notes
      <textarea id="rf-loc-notes" rows="3" placeholder="Any details...">${existing ? escapeHtml(existing.notes || '') : ''}</textarea>
    </label>
    ${existing ? `<button class="button rack-form-btn-danger" id="rf-loc-delete" type="button">🗑 Delete Location</button>` : ''}
    <div class="rack-form-btns">
      <button class="button rack-form-btn-primary" id="rf-loc-submit" type="button">${mode === 'create-flow' ? 'Next: Create Rack →' : (existing ? 'Save Location' : 'Add Location')}</button>
      <button class="button secondary rack-form-btn-close" id="rf-loc-close" type="button">✕ Close</button>
    </div>
  `;
  rackFormPageBody.appendChild(inner);

  document.getElementById('rf-loc-submit').addEventListener('click', () => {
    const name = document.getElementById('rf-loc-name').value.trim();
    if (!name) { showToast('Location name is required.', 'error'); return; }
    if (existing) {
      existing.name    = name;
      existing.address = document.getElementById('rf-loc-address').value.trim();
      existing.notes   = document.getElementById('rf-loc-notes').value.trim();
    } else {
      const loc = {
        id: 'location-' + Date.now(),
        name,
        address: document.getElementById('rf-loc-address').value.trim(),
        notes:   document.getElementById('rf-loc-notes').value.trim(),
      };
      locations.push(loc);
      rackFormPendingLocationId = loc.id;
    }
    saveRackData();
    if (mode === 'create-flow') {
      openRackForm(null, rackFormPendingLocationId);
    } else {
      renderRackOverview();
      showRackOverlay('rack-overview');
      showToast(existing ? 'Location updated.' : 'Location added.');
    }
  });

  if (existing) {
    document.getElementById('rf-loc-delete').addEventListener('click', () => {
      if (!confirm(`Delete location "${existing.name}"? All racks there will also be deleted.`)) return;
      racks = racks.filter(r => r.locationId !== existing.id);
      locations = locations.filter(l => l.id !== existing.id);
      saveRackData();
      renderRackOverview();
      showRackOverlay('rack-overview');
      showToast('Location deleted.');
    });
  }

  rackFormDialog.showModal();
  const rfLocClose = document.getElementById('rf-loc-close');
  if (rfLocClose) rfLocClose.addEventListener('click', () => rackFormDialog.close());
}

// ---- Rack form ----
function openRackForm(existingId, preselectedLocationId) {
  const existing = existingId ? rackById(existingId) : null;
  rackFormPageTitle.textContent = existing ? 'Edit Rack' : 'Create Rack';
  rackFormPageBody.innerHTML = '';

  const inner = document.createElement('div');
  inner.className = 'rack-form-inner';

  const locOpts = locations.map(loc =>
    `<option value="${loc.id}" ${(preselectedLocationId || existing?.locationId) === loc.id ? 'selected' : ''}>${escapeHtml(loc.name)}</option>`
  ).join('');

  inner.innerHTML = `
    <label>Name *
      <input id="rf-rack-name" type="text" placeholder="e.g. Main Rack" value="${existing ? escapeHtml(existing.name) : ''}" />
    </label>
    <label>Notes
      <textarea id="rf-rack-notes" rows="3" placeholder="Any details...">${existing ? escapeHtml(existing.notes || '') : ''}</textarea>
    </label>
    <label>Height Units
      <input id="rf-rack-hu" type="number" min="1" max="100" placeholder="e.g. 42" value="${existing ? existing.heightUnits : 42}" />
    </label>
    <label>Form Factor
      <select id="rf-rack-ff">
        <option value="19inch" ${(!existing || existing.formFactor === '19inch') ? 'selected' : ''}>19 inch</option>
        <option value="10inch" ${existing?.formFactor === '10inch' ? 'selected' : ''}>10 inch</option>
      </select>
    </label>
    <label>Location
      <select id="rf-rack-loc">${locOpts}</select>
    </label>
    <div class="rack-form-btns">
      <button class="button rack-form-btn-primary" id="rf-rack-submit" type="button">${existing ? 'Save Rack' : 'Create Rack & Open Editor'}</button>
      <button class="button secondary rack-form-btn-close" id="rf-rack-close" type="button">✕ Close</button>
    </div>
  `;
  rackFormPageBody.appendChild(inner);

  document.getElementById('rf-rack-submit').addEventListener('click', () => {
    const name  = document.getElementById('rf-rack-name').value.trim();
    if (!name) { showToast('Rack name is required.', 'error'); return; }
    const hu    = parseInt(document.getElementById('rf-rack-hu').value, 10) || 42;
    const ff    = document.getElementById('rf-rack-ff').value;
    const locId = document.getElementById('rf-rack-loc').value;
    if (existing) {
      existing.name = name;
      existing.notes = document.getElementById('rf-rack-notes').value.trim();
      existing.heightUnits = hu;
      existing.formFactor = ff;
      existing.locationId = locId;
      saveRackData();
      showToast('Rack updated.');
      renderRackOverview();
      showRackOverlay('rack-overview');
    } else {
      const rack = { id: 'rack-' + Date.now(), name, notes: document.getElementById('rf-rack-notes').value.trim(), heightUnits: hu, formFactor: ff, locationId: locId, slots: {} };
      racks.push(rack);
      saveRackData();
      openRackEditor(rack.id);
    }
  });

  rackFormDialog.showModal();
  const rfRackClose = document.getElementById('rf-rack-close');
  if (rfRackClose) rfRackClose.addEventListener('click', () => rackFormDialog.close());
}

// ---- Rack Editor ----
function openRackEditor(rackId) {
  rackEditorRackId = rackId;
  const rack = rackById(rackId);
  if (!rack) return;
  const loc = locationById(rack.locationId);
  rackEditorName.textContent = rack.name;
  rackEditorLocBadge.textContent = loc ? `📍 ${loc.name}` : '';
  renderPalette();
  renderRackDiagram('front');
  renderRackDiagram('rear');
  equaliseRackHeights();
  showRackOverlay('rack-editor');
}

if (rackEditorBack) {
  rackEditorBack.addEventListener('click', () => {
    autoSaveRack();
    renderRackOverview();
    showRackOverlay('rack-overview');
  });
}


function autoSaveRack() {
  const rack = rackById(rackEditorRackId);
  if (!rack) return;
  rack.name = rackEditorName.textContent.trim() || rack.name;
  saveRackData();
}

// ---- Palette ----
const CATEGORY_META = {
  compute: { label: 'Compute',    icon: '🖥' },
  network: { label: 'Network',    icon: '🔌' },
  power:   { label: 'Power',      icon: '⚡' },
  mgmt:    { label: 'Management', icon: '🖱' },
  filler:  { label: 'Filler',     icon: '▭'  },
};

function renderPalette() {
  if (!rackPaletteItems) return;
  rackPaletteItems.innerHTML = '';
  let lastCategory = null;
  RACK_COMPONENTS.forEach(comp => {
    // Section header when category changes
    if (comp.category !== lastCategory) {
      lastCategory = comp.category;
      const meta = CATEGORY_META[comp.category] || { label: comp.category, icon: '' };
      const hdr = document.createElement('div');
      hdr.className = 'rack-palette-section';
      hdr.innerHTML = `<span>${meta.icon}</span><span>${meta.label}</span>`;
      rackPaletteItems.appendChild(hdr);
    }
    const el = document.createElement('div');
    el.className = `rack-palette-item cat-${comp.category}`;
    el.draggable = true;
    el.dataset.componentType = comp.componentType;
    el.dataset.heightU = comp.heightU;
    el.dataset.label   = comp.label;
    el.innerHTML = `<span class="rack-palette-drag">⠿</span><span class="rack-palette-label">${comp.label}</span><span class="rack-palette-hu">${comp.heightU}U</span>`;
    el.addEventListener('dragstart', e => {
      rackDragComponent = { componentType: comp.componentType, heightU: comp.heightU, label: comp.label, category: comp.category || 'compute', multiDevice: comp.multiDevice || null, isPDU: comp.isPDU || false, isBlank: comp.isBlank || false, isPassive: comp.isPassive || false, source: 'palette' };
      e.dataTransfer.effectAllowed = 'copy';
    });
    el.addEventListener('dragend', () => { rackDragComponent = null; });
    rackPaletteItems.appendChild(el);
  });
}

// ---- Rack diagram ----
function renderRackDiagram(side) {
  const container = side === 'front' ? rackFront : rackRear;
  if (!container) return;
  container.innerHTML = '';
  const rack = rackById(rackEditorRackId);
  if (!rack) return;

  const hu = rack.heightUnits || 42;
  const occupiedMap = {};
  Object.entries(rack.slots || {}).forEach(([key, comp]) => {
    if (!key.startsWith(side + '-')) return;
    const u = parseInt(key.split('-')[1], 10);
    for (let i = 0; i < comp.heightU; i++) occupiedMap[u + i] = { comp, startU: u, key };
  });

  let u = 1;
  while (u <= hu) {
    const info = occupiedMap[u];
    if (info && info.startU === u) {
      container.appendChild(createOccupiedSlot(side, u, info.comp, info.key, rack));
      u += info.comp.heightU;
    } else if (info) {
      u++;
    } else {
      container.appendChild(createEmptySlot(side, u, rack));
      u++;
    }
  }
  // Re-equalise after every diagram render (requestAnimationFrame so DOM has updated)
  requestAnimationFrame(equaliseRackHeights);
}

function createEmptySlot(side, u, rack) {
  const el = document.createElement('div');
  el.className = 'rack-slot empty';
  el.dataset.u    = u;
  el.dataset.side = side;
  el.innerHTML = `<span class="rack-slot-num">${u}</span><div class="rack-slot-content"><span class="rack-slot-label">— empty —</span></div>`;

  el.addEventListener('dragover', e => {
    e.preventDefault();
    if (!rackDragComponent) return;
    const fits = canFit(side, u, rackDragComponent.heightU, rack, rackDragComponent.fromSlot);
    el.classList.toggle('drag-over',   fits);
    el.classList.toggle('drag-invalid', !fits);
  });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over', 'drag-invalid'));
  el.addEventListener('drop', e => {
    e.preventDefault();
    el.classList.remove('drag-over', 'drag-invalid');
    if (!rackDragComponent) return;
    const fits = canFit(side, u, rackDragComponent.heightU, rack, rackDragComponent.fromSlot);
    if (!fits) { showToast('Not enough space.', 'error'); return; }
    if (rackDragComponent.fromSlot) delete rack.slots[rackDragComponent.fromSlot];
    const slotKey = `${side}-${u}`;
    rack.slots[slotKey] = {
      componentType: rackDragComponent.componentType,
      heightU: rackDragComponent.heightU,
      label: rackDragComponent.label,
      category: rackDragComponent.category || 'compute',
      linkedDeviceId: rackDragComponent.linkedDeviceId || null,
      multiDevice: rackDragComponent.multiDevice || null,
      linkedDevices: rackDragComponent.linkedDevices || null,
      isPDU: rackDragComponent.isPDU || false,
      pduPorts: rackDragComponent.pduPorts || null,
      pduLinks: rackDragComponent.pduLinks || null,
      isBlank: rackDragComponent.isBlank || false,
      isPassive: rackDragComponent.isPassive || false,
    };
    saveRackData();
    renderRackDiagram(side);
    // Blanks and cable management have no hardware to link
    if (!rackDragComponent.isBlank && !rackDragComponent.isPassive) {
      showLinkPanel(slotKey, side);
    }
    rackDragComponent = null;
  });
  return el;
}

function createOccupiedSlot(side, u, comp, slotKey, rack) {
  const el = document.createElement('div');
  const cat = comp.category || (comp.isBlank ? 'filler' : 'compute');
  el.className = `rack-slot occupied cat-${cat}`;
  el.dataset.u    = u;
  el.dataset.side = side;
  el.draggable    = true;
  // Match the CSS --rack-u-height variable exactly
  const uPx = Math.max(28, Math.min(42, window.innerHeight * 0.018));
  const totalH = comp.heightU * uPx;
  el.style.height    = totalH + 'px';
  el.style.minHeight = totalH + 'px';
  el.style.maxHeight = totalH + 'px';

  // Build device label(s) — consistent plain-text style for all types
  let deviceHtml = '';
  if (comp.multiDevice && comp.linkedDevices) {
    // Same plain style as single-device, each PC on its own .rack-slot-device line
    const lines = comp.linkedDevices.map((id, i) => {
      const dev = id ? findById(id) : null;
      const name = dev ? escapeHtml((dev.symbol || '') + ' ' + dev.name) : '—';
      return `<span class="rack-slot-device"><span class="rack-slot-device-idx">${i + 1}.</span> ${name}</span>`;
    }).join('');
    deviceHtml = `<div class="rack-multi-lines">${lines}</div>`;
  } else if (comp.linkedDeviceId) {
    const dev = findById(comp.linkedDeviceId);
    if (dev) deviceHtml = `<span class="rack-slot-device">${escapeHtml((dev.symbol || '') + ' ' + dev.name)}</span>`;
  } else if (comp.isPDU && comp.pduPorts) {
    deviceHtml = `<span class="rack-slot-device">${comp.pduPorts} ports</span>`;
  }

  el.innerHTML = `
    <span class="rack-slot-num">${u}</span>
    <div class="rack-slot-content">
      <span class="rack-slot-label">${escapeHtml(comp.label)}</span>
      ${deviceHtml}
    </div>
    <button class="rack-slot-remove" title="Remove" data-key="${slotKey}" data-side="${side}">✕</button>
  `;

  el.addEventListener('click', e => {
    if (e.target.classList.contains('rack-slot-remove')) return;
    if (comp.isBlank || comp.isPassive) return;
    showLinkPanel(slotKey, side);
  });
  el.querySelector('.rack-slot-remove').addEventListener('click', e => {
    e.stopPropagation();
    delete rack.slots[slotKey];
    saveRackData();
    renderRackDiagram(side);
  });
  el.addEventListener('dragstart', e => {
    rackDragComponent = { componentType: comp.componentType, heightU: comp.heightU, label: comp.label, category: comp.category || 'compute', linkedDeviceId: comp.linkedDeviceId || null, multiDevice: comp.multiDevice || null, linkedDevices: comp.linkedDevices || null, isPDU: comp.isPDU || false, pduPorts: comp.pduPorts || null, pduLinks: comp.pduLinks || null, isBlank: comp.isBlank || false, isPassive: comp.isPassive || false, fromSlot: slotKey, source: 'rack' };
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => el.style.opacity = '0.4', 0);
  });
  el.addEventListener('dragend', () => { el.style.opacity = ''; rackDragComponent = null; });
  el.addEventListener('dragover', e => { if (!rackDragComponent || rackDragComponent.fromSlot === slotKey) return; e.preventDefault(); });
  el.addEventListener('drop', e => {
    e.preventDefault();
    if (!rackDragComponent || rackDragComponent.fromSlot === slotKey) return;
    showToast('Slot is occupied. Remove it first.', 'error');
    rackDragComponent = null;
  });
  return el;
}

function canFit(side, startU, heightU, rack, excludeSlot) {
  const hu = rack.heightUnits || 42;
  if (startU + heightU - 1 > hu) return false;
  for (let u = startU; u < startU + heightU; u++) {
    const key = `${side}-${u}`;
    if (rack.slots[key] && key !== excludeSlot) return false;
    const occupied = Object.entries(rack.slots).find(([k, c]) => {
      if (k === excludeSlot || !k.startsWith(side + '-')) return false;
      const slotU = parseInt(k.split('-')[1], 10);
      return u > slotU && u < slotU + c.heightU;
    });
    if (occupied) return false;
  }
  return true;
}

// ---- Link panel ----
// ---- Link panel ----
// The panel is rendered as a FIXED overlay appended to body so it never
// gets clipped by overflow:hidden ancestors (rack-frame, rack-editor-body).
// Closing: only via OK / Skip / Escape — NO outside-click-to-close, because
// that interferes with native <select> dropdowns on every platform.

function showLinkPanel(slotKey, side) {
  closeLinkPanel();
  const rack = rackById(rackEditorRackId);
  if (!rack || !rack.slots[slotKey]) return;
  const comp = rack.slots[slotKey];

  const container = side === 'front' ? rackFront : rackRear;
  const u = parseInt(slotKey.split('-')[1], 10);
  const slotEl = container.querySelector(`[data-u="${u}"][data-side="${side}"]`);
  if (!slotEl) return;

  // Measure where the slot is on screen so we can anchor the panel
  const slotRect  = slotEl.getBoundingClientRect();
  const frameRect = container.getBoundingClientRect();

  const panel = document.createElement('div');
  panel.className = 'rack-link-panel';
  panel.id = 'rack-link-panel-active';

  // Position: fixed, left-aligned to the rack frame, top just below the slot
  // Width matches the rack frame exactly
  panel.style.position = 'fixed';
  panel.style.left     = frameRect.left + 'px';
  panel.style.width    = frameRect.width + 'px';
  panel.style.top      = (slotRect.bottom) + 'px';
  panel.style.zIndex   = '200';

  const hardwareItems = items.filter(i => i.type === 'hardware');

  function buildHwOpts(selectedId) {
    return hardwareItems.map(itm =>
      `<option value="${itm.id}" ${selectedId === itm.id ? 'selected' : ''}>${escapeHtml((itm.symbol || '') + ' ' + itm.name)}</option>`
    ).join('');
  }

  // ── Multi-device (2× PC / 3× PC) ──────────────────────────────────────
  if (comp.multiDevice) {
    const count = comp.multiDevice;
    const devs  = comp.linkedDevices || Array(count).fill(null);
    let rows = '';
    for (let i = 0; i < count; i++) {
      rows += `
        <div class="rack-link-row">
          <span class="rack-link-row-label">PC ${i + 1}:</span>
          <select class="rack-link-multi" data-idx="${i}">
            <option value="">— none —</option>${buildHwOpts(devs[i])}
          </select>
        </div>`;
    }
    panel.innerHTML = `
      <div class="rack-link-multi-wrap">
        ${rows}
        <div class="rack-link-actions">
          <button class="button" id="rack-link-ok" type="button">✓ OK</button>
          <button class="button secondary" id="rack-link-skip" type="button">Skip</button>
        </div>
      </div>`;
    document.body.appendChild(panel);
    rackLinkPanelTarget = { slotKey, side };

    panel.querySelector('#rack-link-ok').addEventListener('click', () => {
      const selects = panel.querySelectorAll('.rack-link-multi');
      comp.linkedDevices  = Array.from(selects).map(s => s.value || null);
      comp.linkedDeviceId = comp.linkedDevices[0];
      saveRackData(); closeLinkPanel(); renderRackDiagram(side);
    });
    panel.querySelector('#rack-link-skip').addEventListener('click', () => closeLinkPanel());
    return;
  }

  // ── PDU ───────────────────────────────────────────────────────────────
  if (comp.isPDU) {
    const currentPorts = comp.pduPorts || 8;
    const portCounts   = [4, 6, 8, 10, 12, 16, 20, 24];
    const pduLinks     = comp.pduLinks || {};

    function buildPortRows(n) {
      return Array.from({ length: n }, (_, i) => `
        <div class="rack-link-row">
          <span class="rack-link-row-label">Port ${i + 1}:</span>
          <select class="rack-pdu-port" data-port="${i}">
            <option value="">— empty —</option>${buildHwOpts(pduLinks[i] || null)}
          </select>
        </div>`).join('');
    }

    panel.innerHTML = `
      <div class="rack-link-multi-wrap">
        <div class="rack-link-row">
          <span class="rack-link-row-label">Ports:</span>
          <select id="rack-pdu-count">
            ${portCounts.map(n => `<option value="${n}" ${currentPorts === n ? 'selected' : ''}>${n} ports</option>`).join('')}
          </select>
        </div>
        <div id="rack-pdu-port-rows">${buildPortRows(currentPorts)}</div>
        <div class="rack-link-actions">
          <button class="button" id="rack-link-ok" type="button">✓ OK</button>
          <button class="button secondary" id="rack-link-skip" type="button">Skip</button>
        </div>
      </div>`;
    document.body.appendChild(panel);
    rackLinkPanelTarget = { slotKey, side };

    panel.querySelector('#rack-pdu-count').addEventListener('change', function() {
      panel.querySelector('#rack-pdu-port-rows').innerHTML = buildPortRows(parseInt(this.value, 10));
    });
    panel.querySelector('#rack-link-ok').addEventListener('click', () => {
      comp.pduPorts = parseInt(panel.querySelector('#rack-pdu-count').value, 10);
      comp.pduLinks = {};
      panel.querySelectorAll('.rack-pdu-port').forEach(s => {
        comp.pduLinks[parseInt(s.dataset.port)] = s.value || null;
      });
      saveRackData(); closeLinkPanel(); renderRackDiagram(side);
    });
    panel.querySelector('#rack-link-skip').addEventListener('click', () => closeLinkPanel());
    return;
  }

  // ── Standard single-device link ───────────────────────────────────────
  panel.innerHTML = `
    <div class="rack-link-multi-wrap">
      <div class="rack-link-row">
        <span class="rack-link-row-label">Gerät:</span>
        <select id="rack-link-select">
          <option value="">— none —</option>${buildHwOpts(comp.linkedDeviceId)}
        </select>
      </div>
      <div class="rack-link-actions">
        <button class="button" id="rack-link-ok" type="button">✓ OK</button>
        <button class="button secondary" id="rack-link-skip" type="button">Skip</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);
  rackLinkPanelTarget = { slotKey, side };

  panel.querySelector('#rack-link-ok').addEventListener('click', () => {
    comp.linkedDeviceId = panel.querySelector('#rack-link-select').value || null;
    saveRackData(); closeLinkPanel(); renderRackDiagram(side);
  });
  panel.querySelector('#rack-link-skip').addEventListener('click', () => closeLinkPanel());
}

function closeLinkPanel() {
  const existing = document.getElementById('rack-link-panel-active');
  if (existing) existing.remove();
  rackLinkPanelTarget = null;
}

// Close panel with Escape key only — no outside-click, no mousedown tricks
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && rackLinkPanelTarget) closeLinkPanel();
});

// ---- Utility ----

// Make front and rear rack frames the same height.
// Strategy: set minHeight on the shorter frame so it matches the taller one,
// and distribute the extra space evenly among its empty slots.
function equaliseRackHeights() {
  if (!rackFront || !rackRear) return;

  // 1. Reset any previous overrides so we measure natural height
  [rackFront, rackRear].forEach(f => {
    f.style.minHeight = '';
    f.querySelectorAll('.rack-slot.empty').forEach(s => s.style.minHeight = '');
  });

  const hFront = rackFront.scrollHeight;
  const hRear  = rackRear.scrollHeight;
  if (hFront === hRear) return;

  const [shorter, taller, targetH] = hFront < hRear
    ? [rackFront, rackRear, hRear]
    : [rackRear, rackFront, hFront];

  const diff = targetH - shorter.scrollHeight;
  const emptySlots = shorter.querySelectorAll('.rack-slot.empty');
  if (emptySlots.length === 0) {
    // No empty slots to expand — just set minHeight on the frame
    shorter.style.minHeight = targetH + 'px';
    return;
  }

  // Distribute extra pixels evenly across empty slots (integer math, last slot absorbs remainder)
  const extra = Math.floor(diff / emptySlots.length);
  const baseU = Math.max(28, Math.min(42, window.innerHeight * 0.018));
  emptySlots.forEach((slot, i) => {
    const add = i === emptySlots.length - 1 ? diff - extra * i : extra;
    const h = (baseU + add) + 'px';
    slot.style.height    = h;
    slot.style.minHeight = h;
    slot.style.maxHeight = h;
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


// Theme initialization moved after definitions
try { initTheme(); } catch(e){ console.error(e); }


