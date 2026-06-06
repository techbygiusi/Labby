/*
 * Labby Frontend Controller
 * -----------------------------------------------------------------------------
 * Contributor map:
 *  1. DOM references and shared state live at the top of this file.
 *  2. Data helpers normalize imported / legacy data before rendering.
 *  3. Render functions update one UI surface only: boards, tree, rack, config, etc.
 *  4. Event handlers stay close to the feature they control.
 *  5. Mobile-only behavior is guarded by isMobile() or matching CSS media rules.
 *
 * Style guide for future changes:
 *  - Keep vanilla JavaScript; no build step and no framework assumptions.
 *  - Prefer small pure helper functions before touching large render functions.
 *  - Add comments above non-obvious decisions, not above every line.
 *  - Preserve existing fields when writing imported or agent-provided inventory data.
 */

const storageKey = 'labby-data-v8';
const themeKey = 'labby-theme';
const demoStorageVersionKey = 'labby-demo-storage-version';
const demoStorageVersion = '2026-v61-demo-sync';
const types = ['hardware', 'vm', 'lxc', 'app', 'network'];
const networkPalette = ['#3b82f6', '#10b981', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#14b8a6', '#84cc16', '#06b6d4', '#8b5cf6'];

const boards = document.getElementById('boards');
const stats = document.getElementById('stats');
const form = document.getElementById('resource-form');
const typeSelect = document.getElementById('type');
const symbolInput = document.getElementById('symbol');
const clearAll = document.getElementById('clear-all');
const seedDemo = document.getElementById('seed-demo');
const seedDemoMobile = document.getElementById('seed-demo-mobile');
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
const advancedSettingsBtn = document.getElementById('advanced-settings-btn');
const advancedResourceDialog = document.getElementById('advanced-resource-dialog');
const advancedResourceBody = document.getElementById('advanced-resource-body');
const advancedResourceTitle = document.getElementById('advanced-resource-title');
const advancedResourceClose = document.getElementById('advanced-resource-close');
const advancedResourceCloseTop = document.getElementById('advanced-resource-close-top');
const advancedResourceSave = document.getElementById('advanced-resource-save');
const cliDialog = document.getElementById('cli-dialog');
const cliTitle = document.getElementById('cli-title');
const cliSubtitle = document.getElementById('cli-subtitle');
const cliTerminal = document.getElementById('cli-terminal');
const cliInput = document.getElementById('cli-input');
const cliSend = document.getElementById('cli-send');
const cliCopy = document.getElementById('cli-copy');
const cliClearKey = document.getElementById('cli-clear-key');
const cliClose = document.getElementById('cli-close');
const mobileCliView = document.getElementById('mobile-cli');
const mobileCliTitle = document.getElementById('mobile-cli-title');
const mobileCliSubtitle = document.getElementById('mobile-cli-subtitle');
const mobileCliTerminal = document.getElementById('mobile-cli-terminal');
const mobileCliInput = document.getElementById('mobile-cli-input');
const mobileCliSend = document.getElementById('mobile-cli-send');
const mobileCliCopy = document.getElementById('mobile-cli-copy');
const mobileCliClearKey = document.getElementById('mobile-cli-clear-key');
const mobileCliClose = document.getElementById('mobile-cli-close');
let cliSession = null;
let cliPollTimer = null;
let cliActiveItem = null;
let credentialFields = null;
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
const agentApiDialog = document.getElementById('agent-api-dialog');
const toast = document.getElementById('toast');

const mobileProgress = document.getElementById('mobile-progress');
let mobileProgressCount = 0;
const nativeFetch = window.fetch.bind(window);
window.fetch = async (...args) => {
  mobileProgressCount += 1;
  mobileProgress?.classList.add('active');
  try {
    return await nativeFetch(...args);
  } finally {
    mobileProgressCount = Math.max(0, mobileProgressCount - 1);
    if (!mobileProgressCount) setTimeout(() => mobileProgress?.classList.remove('active'), 180);
  }
};

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
let importedAgentKeysForSave = null;
const agentKeyStorage = 'labby-agent-keys';
const agentScopes = [
  ['inventory:read', 'Read inventory'],
  ['inventory:write', 'Write inventory'],
  ['rack:read', 'Read racks'],
  ['rack:write', 'Write racks'],
  ['status:read', 'Read status'],
  ['status:write', 'Write status'],
  ['ping:run', 'Run ping'],
  ['config:read', 'Read config'],
  ['credentials:read', 'Read credentials'],
  ['credentials:write', 'Write credentials'],
];
const agentExpiryOptions = {
  '1d': { label: '1 day', ms: 24 * 60 * 60 * 1000 },
  '1w': { label: '1 week', ms: 7 * 24 * 60 * 60 * 1000 },
  '1m': { label: '1 month', ms: 30 * 24 * 60 * 60 * 1000 },
  '1y': { label: '1 year', ms: 365 * 24 * 60 * 60 * 1000 },
};
function getAgentExpiryIso(value) {
  const opt = agentExpiryOptions[value] || agentExpiryOptions['1m'];
  return new Date(Date.now() + opt.ms).toISOString();
}

const API_BASE = (() => {
  const loc = window.location;
  return window.LABBY_API || (loc.hostname === 'localhost' && loc.port === '8080' ? 'http://localhost:3001' : '');
})();

async function loadItemsFromAPI() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { items: [], locations: [], racks: [], agentStatus: {}, agentKeys: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { items: parsed, locations: [], racks: [], agentStatus: {}, agentKeys: [] };
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      locations: Array.isArray(parsed.locations) ? parsed.locations : [],
      racks: Array.isArray(parsed.racks) ? parsed.racks : [],
      agentStatus: parsed.agentStatus && typeof parsed.agentStatus === 'object' ? parsed.agentStatus : {},
      agentKeys: Array.isArray(parsed.agentKeys) ? parsed.agentKeys : [],
    };
  } catch {
    return { items: [], locations: [], racks: [], agentStatus: {}, agentKeys: [] };
  }
}

async function saveItemsToAPI(itemList) {
  const payload = {
    items: itemList,
    locations,
    racks,
    agentStatus: liveStatusData,
  };
  if (Array.isArray(importedAgentKeysForSave)) payload.agentKeys = importedAgentKeysForSave;
  try { localStorage.setItem(storageKey, JSON.stringify(payload)); } catch {}
  if (Array.isArray(importedAgentKeysForSave)) {
    setLocalAgentKeys(importedAgentKeysForSave);
    importedAgentKeysForSave = null;
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
initAdvancedResourceSettings();
// initTheme moved to end

applyTypeVisibility();

(async () => {
  await seedFullDemoData();
  initAgentApiPanel();
  render();
  startPolling();
  openDemoTutorialAfterLayout();
})();

function migrateDemoDataTo192Subnets() {
  const replaceValue = (value) => {
    if (typeof value !== 'string') return value;
    return value
      .replaceAll('10.10.0.', '192.168.10.')
      .replaceAll('10.20.0.', '192.168.20.')
      .replaceAll('10.40.0.', '192.168.40.');
  };
  const walk = (value) => {
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') {
      Object.keys(value).forEach((key) => { value[key] = walk(value[key]); });
      return value;
    }
    return replaceValue(value);
  };
  items = walk(items);
  locations = walk(locations);
  racks = walk(racks);
}

function ensureDemoRackData() {
  if (!Array.isArray(locations) || !locations.length) locations = getDemoLocations();
  if (!Array.isArray(racks) || !racks.length) racks = getDemoRacks();
}

function isDemoDataMissingOrStale(loaded) {
  const version = localStorage.getItem(demoStorageVersionKey);
  const loadedItems = Array.isArray(loaded?.items) ? loaded.items : [];
  const loadedLocations = Array.isArray(loaded?.locations) ? loaded.locations : [];
  const loadedRacks = Array.isArray(loaded?.racks) ? loaded.racks : [];
  if (version !== demoStorageVersion) return true;
  if (!loadedItems.length) return true;
  if (!loadedItems.some((item) => item.id === 'hw-router' || item.id === 'hw-proxmox')) return true;
  if (!loadedLocations.length) return true;
  if (!loadedRacks.length) return true;
  return false;
}

async function seedFullDemoData({ force = false } = {}) {
  const loaded = await loadItemsFromAPI();
  if (force || isDemoDataMissingOrStale(loaded)) {
    items = sanitizeItems(getDemoItems());
    locations = getDemoLocations();
    racks = getDemoRacks();
    migrateDemoDataTo192Subnets();
    ensureDemoRackData();
    localStorage.setItem(demoStorageVersionKey, demoStorageVersion);
    await saveItems();
    return;
  }
  items = sanitizeItems(loaded.items);
  locations = loaded.locations || [];
  racks = loaded.racks || [];
  liveStatusData = loaded.agentStatus || {};
  migrateDemoDataTo192Subnets();
  ensureDemoRackData();
  localStorage.setItem(demoStorageVersionKey, demoStorageVersion);
  await saveItems();
}

function openDemoTutorialAfterLayout() {
  const open = () => {
    try { if (typeof openTutorial === 'function') openTutorial(); } catch {}
  };
  requestAnimationFrame(() => requestAnimationFrame(open));
}

async function loadDemoData() {
  if (!confirm('Replace current browser demo data with the default demo entries?')) return;
  await seedFullDemoData({ force: true });
  stopEditing();
  showToast('Demo data loaded with sample rack layouts.');
  initAgentApiPanel();
  render();
  if (typeof renderRackOverview === 'function') renderRackOverview();
  openDemoTutorialAfterLayout();
}

seedDemo?.addEventListener('click', loadDemoData);
seedDemoMobile?.addEventListener('click', loadDemoData);


async function startPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(async () => {
    await pollLiveStatus();
  }, 5000);
}

function extractHostForLiveCheck(item) {
  const raw = item?.type === 'app'
    ? (item.ipPort || item.ip || item.webUrl || '')
    : (item.ip || item.webUrl || '');

  if (!raw || typeof raw !== 'string') return '';

  const value = raw.trim();
  if (!value) return '';

  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `http://${value}`;
    const parsed = new URL(withProtocol);
    return parsed.hostname.replace(/^\[|\]$/g, '');
  } catch {
    return value
      .replace(/^https?:\/\//i, '')
      .replace(/^\[/, '')
      .split(']')[0]
      .split('/')[0]
      .split(':')[0]
      .trim();
  }
}

function normalizeUrlForLiveCheck(value) {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

async function pollLiveStatus() {
  const toMonitor = items.filter((item) => item.ipStatus === 'live' || item.urlStatus === 'live');

  for (const item of toMonitor) {
    if (!liveStatusData[item.id]) liveStatusData[item.id] = {};

    const pingHost = extractHostForLiveCheck(item);

    if (item.ipStatus === 'live' && pingHost && ['hardware', 'vm', 'lxc', 'app'].includes(item.type)) {
      try {
        const res = await fetch(`${API_BASE}/api/ping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip: pingHost }),
        });
        const data = await res.json();
        liveStatusData[item.id].ipStatus = data.status;
      } catch (err) {
        liveStatusData[item.id].ipStatus = 'offline';
      }
    }

    const urlToCheck = normalizeUrlForLiveCheck(item.webUrl || (item.type === 'app' ? item.ipPort : ''));

    if (item.urlStatus === 'live' && urlToCheck && (item.type === 'app' || item.type === 'hardware')) {
      try {
        const res = await fetch(`${API_BASE}/api/check-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlToCheck }),
        });
        const data = await res.json();
        liveStatusData[item.id].urlStatus = data.status;
      } catch (err) {
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
if (advancedSettingsBtn) advancedSettingsBtn.addEventListener('click', openAdvancedResourceSettings);
[advancedResourceClose, advancedResourceCloseTop].filter(Boolean).forEach((btn) => {
  btn.addEventListener('click', closeAdvancedResourceSettings);
});
if (advancedResourceDialog) {
  advancedResourceDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeAdvancedResourceSettings();
  });
}

document.addEventListener('click', async (event) => {
  const copyBtn = event.target.closest?.('[data-credential-copy]');
  if (copyBtn) {
    const field = document.getElementById(copyBtn.dataset.credentialCopy);
    if (!field) return;
    try { await navigator.clipboard.writeText(field.value || ''); showToast('Copied.'); }
    catch { field.select(); document.execCommand?.('copy'); showToast('Selected for copy.'); }
    return;
  }
  const toggleBtn = event.target.closest?.('[data-credential-toggle]');
  if (toggleBtn) {
    const field = document.getElementById(toggleBtn.dataset.credentialToggle);
    if (!field) return;
    field.type = field.type === 'password' ? 'text' : 'password';
    toggleBtn.innerHTML = credentialEyeSvg(field.type !== 'password');
    toggleBtn.setAttribute('aria-label', field.type === 'password' ? 'Show password' : 'Hide password');
  }
});


document.addEventListener('click', (event) => {
  const cliBtn = event.target.closest?.('[data-cli-open]');
  if (!cliBtn) return;
  event.preventDefault();
  event.stopPropagation();
  const item = findById(cliBtn.dataset.cliOpen);
  if (item) openCliSession(item);
});

[cliSend, mobileCliSend].filter(Boolean).forEach((btn) => btn.addEventListener('click', () => sendCliInput()));
[cliInput, mobileCliInput].filter(Boolean).forEach((input) => {
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      sendCliInput();
    }
  });
});
[cliClearKey, mobileCliClearKey].filter(Boolean).forEach((btn) => btn.addEventListener('click', clearCliKnownHostAndReconnect));
[cliCopy, mobileCliCopy].filter(Boolean).forEach((btn) => btn.addEventListener('click', copyCliOutput));
[cliClose, mobileCliClose].filter(Boolean).forEach((btn) => btn.addEventListener('click', closeCliSession));
if (cliDialog) {
  cliDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeCliSession();
  });
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
    credentials: supportsCredentials(type) ? getCredentialFields() : null,
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
  closeAdvancedResourceSettings();
  form.reset();
  statusSelect.value = '';
  hardwareWebUrlInput.value = '';
  statusSelect.value = '';
  symbolInput.value = defaultSymbol('hardware', 'server');
  hardwareKindSelect.value = 'server';
  ipStatusSelect.value = '';
  urlStatusSelect.value = '';
  resetDynamicHardwareFields();
  setCredentialFields(null);
  setMultiValues(routerSwitches, []);
  setMultiValues(switchLinks, []);
  setMultiValues(switchDeviceLinks, []);
  setSelectedColor(networkPalette[0]);
  applyTypeVisibility();
  render();
});

cancelEditBtn.addEventListener('click', () => {
  closeAdvancedResourceSettings();
  stopEditing();
  form.reset();
  symbolInput.value = defaultSymbol('hardware', 'server');
  hardwareKindSelect.value = 'server';
  ipStatusSelect.value = '';
  urlStatusSelect.value = '';
  resetDynamicHardwareFields();
  setCredentialFields(null);
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

const mobileAgentApiBody = document.getElementById('mobile-agent-api-body');
const agentApiDialogPlaceholder = document.createComment('agent-api-dialog-placeholder');
let agentApiContentInMobile = false;
let agentApiReturnToConfig = false;

function getAgentApiDialogBody() {
  return agentApiDialog?.querySelector('.agent-dialog-body') || document.querySelector('#agent-api-dialog .agent-dialog-body');
}

function moveAgentApiToMobile() {
  const dialogBody = getAgentApiDialogBody();
  const body = mobileAgentApiBody || document.getElementById('mobile-agent-api-body');
  if (!dialogBody || !body || agentApiContentInMobile) return;

  // Mobile already has its own page header. Move only the content area,
  // not the desktop dialog title/footer, so the heading is not duplicated.
  if (!agentApiDialogPlaceholder.parentNode) dialogBody.insertBefore(agentApiDialogPlaceholder, dialogBody.firstChild);
  let node = agentApiDialogPlaceholder.nextSibling;
  while (node) {
    const next = node.nextSibling;
    body.appendChild(node);
    node = next;
  }
  agentApiContentInMobile = true;
}

function restoreAgentApiToDialog() {
  const dialogBody = getAgentApiDialogBody();
  const body = mobileAgentApiBody || document.getElementById('mobile-agent-api-body');
  if (!dialogBody || !body || !agentApiContentInMobile) return;
  while (body.firstChild) dialogBody.insertBefore(body.firstChild, agentApiDialogPlaceholder.nextSibling);
  if (agentApiDialogPlaceholder.parentNode) agentApiDialogPlaceholder.remove();
  agentApiContentInMobile = false;
}

function closeMobileAgentApiView() {
  if (!agentApiContentInMobile) return;
  restoreAgentApiToDialog();
}

function returnFromAgentApi() {
  clearAgentTokenBox();
  const shouldReturn = agentApiReturnToConfig;
  agentApiReturnToConfig = false;

  if (isMobile() && agentApiContentInMobile) {
    if (shouldReturn) {
      showMobileView('mobile-config');
      setActiveMobileNav('nav-more');
    } else {
      hideMobileViews();
    }
    return;
  }

  if (shouldReturn && configDialog && !configDialog.open) {
    configDialog.showModal();
  }
}

function openAgentApiDialog(options) {
  if (!agentApiDialog) return;
  const opts = options || {};
  agentApiReturnToConfig = !!opts.returnToConfig;
  if (configDialog?.open) configDialog.close();
  if (typeof closeMobileMoreSheet === 'function') closeMobileMoreSheet();
  if (typeof renderAgentKeyLists === 'function') renderAgentKeyLists();
  clearAgentTokenBox();
  if (isMobile()) {
    if (agentApiDialog.open) agentApiDialog.close();
    moveAgentApiToMobile();
    showMobileView('mobile-agent-api');
    setActiveMobileNav('nav-more');
    return;
  }
  restoreAgentApiToDialog();
  agentApiDialog.onclose = returnFromAgentApi;
  if (typeof agentApiDialog.showModal === 'function' && !agentApiDialog.open) agentApiDialog.showModal();
}

document.getElementById('agent-api-btn')?.addEventListener('click', () => openAgentApiDialog({ returnToConfig: true }));
document.getElementById('agent-api-btn-mobile')?.addEventListener('click', () => openAgentApiDialog({ returnToConfig: true }));
document.getElementById('agent-api-close')?.addEventListener('click', () => {
  if (isMobile() && agentApiContentInMobile) { returnFromAgentApi(); return; }
  clearAgentTokenBox();
  agentApiDialog?.close();
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
const themePickerDialog = document.getElementById('theme-picker-dialog');
const mobileThemeBody = document.getElementById('mobile-theme-body');
const themeDialogPlaceholder = document.createComment('theme-dialog-placeholder');
let themeContentInMobile = false;

document.getElementById('theme-btn').addEventListener('click', () => {
  themePickerReturnToConfig = true;
  configDialog.close();
  openThemePicker({ returnToConfig: true });
});
document.getElementById('theme-btn-mobile').addEventListener('click', () => openThemePicker({ returnToConfig: false }));
document.querySelectorAll('.theme-tab').forEach(b => b.addEventListener('click', () => switchThemeTab(b.dataset.tab)));
const themePickerClose = document.getElementById('theme-picker-close');
if (themePickerClose) themePickerClose.addEventListener('click', () => {
  if (isMobile() && themeContentInMobile) { hideMobileViews(); return; }
  document.getElementById('theme-picker-dialog').close();
});

function getActiveThemeId() {
  return document.documentElement.dataset.theme || localStorage.getItem(themeKey) || 'light';
}

function hasAnyCredentials(list = items) {
  return list.some((item) => item?.credentials && (item.credentials.username || item.credentials.password));
}

function credentialsByItemId(list = items) {
  return Object.fromEntries(list
    .filter((item) => item?.id && item.credentials && (item.credentials.username || item.credentials.password))
    .map((item) => [item.id, item.credentials]));
}

function itemsWithoutCredentials(list = items) {
  return list.map((item) => {
    const clone = { ...item };
    delete clone.credentials;
    return clone;
  });
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function hexToBytes(value) {
  const clean = String(value || '').trim().replace(/\s+/g, '');
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) throw new Error('Invalid credential export key.');
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function importAesKeyFromHex(hex) {
  return crypto.subtle.importKey('raw', hexToBytes(hex), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function generateCredentialExportKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function encryptCredentialBundle(bundle, keyHex) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const key = await importAesKeyFromHex(keyHex);
  const plaintext = new TextEncoder().encode(JSON.stringify(bundle));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    version: 1,
    algorithm: 'AES-GCM-256',
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

async function decryptCredentialBundle(payload, keyHex) {
  if (!payload || payload.algorithm !== 'AES-GCM-256') throw new Error('Unsupported credential payload.');
  const key = await importAesKeyFromHex(keyHex);
  const iv = base64ToBytes(payload.iv || '');
  const ciphertext = base64ToBytes(payload.ciphertext || '');
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

async function loadRawAgentKeysForExport() {
  return getLocalAgentKeys();
}

function openKeyPopup({ title, message, key = '', mode = 'copy' } = {}) {
  return new Promise((resolve) => {
    const supportsDialog = typeof HTMLDialogElement !== 'undefined';
    const overlay = supportsDialog ? document.createElement('dialog') : document.createElement('div');
    overlay.className = 'secret-key-modal';
    const inputType = mode === 'input' ? 'password' : 'text';
    const actionLabel = mode === 'input' ? 'Import' : 'Copy key';
    overlay.innerHTML = `
      <div class="secret-key-card" role="dialog" aria-modal="true" aria-label="${escapeAttr(title || 'Secret key')}">
        <div class="secret-key-head">
          <h3>${escapeHtml(title || 'Secret key')}</h3>
          <p>${escapeHtml(message || '')}</p>
        </div>
        <div class="secret-key-row">
          <input id="secret-key-field" type="${inputType}" value="${escapeAttr(key)}" placeholder="Paste export key" autocomplete="off" readonly="${mode === 'input' ? '' : 'readonly'}" />
        </div>
        <div class="secret-key-actions">
          <button class="button" type="button" data-secret-action>${actionLabel}</button>
          <button class="button secondary" type="button" data-secret-close>Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    if (supportsDialog && typeof overlay.showModal === 'function') overlay.showModal();
    const field = overlay.querySelector('#secret-key-field');
    if (mode === 'input') field.removeAttribute('readonly');
    window.setTimeout(() => { field.focus(); field.select(); }, 30);

    const done = (value) => {
      if (supportsDialog && overlay.open) overlay.close();
      overlay.remove();
      resolve(value);
    };

    overlay.addEventListener('cancel', (event) => {
      event.preventDefault();
      done(mode === 'input' ? '' : key);
    });

    overlay.addEventListener('click', async (event) => {
      if (event.target === overlay || event.target.closest('[data-secret-close]')) {
        done(mode === 'input' ? '' : key);
        return;
      }
      if (event.target.closest('[data-secret-action]')) {
        if (mode === 'input') {
          done(field.value.trim());
          return;
        }
        field.select();
        try { await navigator.clipboard.writeText(field.value); showToast('Export key copied.'); }
        catch { document.execCommand?.('copy'); showToast('Export key selected.'); }
      }
    });
  });
}

async function buildConfigExport() {
  const activeTheme = getActiveThemeId();
  const rawAgentKeys = await loadRawAgentKeysForExport();
  const exportHasCredentials = hasAnyCredentials(items);
  const exportHasAgentKeys = rawAgentKeys.length > 0;
  let exportedItems = items;
  let encryptedCredentials = null;
  let encryptedAgentKeys = null;
  let exportKey = null;

  if (exportHasCredentials || exportHasAgentKeys) {
    exportKey = generateCredentialExportKey();
    if (exportHasCredentials) {
      encryptedCredentials = await encryptCredentialBundle(credentialsByItemId(items), exportKey);
      exportedItems = itemsWithoutCredentials(items);
    }
    if (exportHasAgentKeys) {
      encryptedAgentKeys = await encryptCredentialBundle(rawAgentKeys, exportKey);
    }
    await openKeyPopup({
      title: 'Copy Export Key',
      message: 'This key decrypts encrypted credentials and API key records during import. Store it safely; Labby cannot recover it later.',
      key: exportKey,
      mode: 'copy',
    });
  }

  return {
    schemaVersion: 4,
    app: 'Labby',
    exportedAt: new Date().toISOString(),
    items: exportedItems,
    locations,
    racks,
    agentStatus: liveStatusData,
    encryptedSecrets: {
      credentials: encryptedCredentials,
      agentKeys: encryptedAgentKeys,
    },
    credentialsEncrypted: encryptedCredentials,
    agentKeysEncrypted: encryptedAgentKeys,
    customThemes: getCustomThemes(),
    activeTheme,
    // Kept for older imports that only looked for `theme`.
    theme: activeTheme,
    tutorialSeen: localStorage.getItem('labby-tutorial-seen') === '1',
  };
}

function applyImportedThemeFromConfig(parsed) {
  const importedTheme = parsed && (parsed.activeTheme || parsed.theme);
  if (!importedTheme) return;
  const validThemes = [
    ...presetThemes.map(t => t.id),
    ...getCustomThemes().map(t => t.id),
  ];
  if (validThemes.includes(importedTheme)) {
    setTheme(importedTheme);
  }
}

async function applyImportedConfig(parsed) {
  // Legacy export support: old Labby exports were a bare items array.
  if (Array.isArray(parsed)) {
    items = sanitizeItems(parsed);
    locations = [];
    racks = [];
    importedAgentKeysForSave = null;
    return;
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid Labby config');
  }

  let importedItems = sanitizeItems(parsed.items || []);
  const encryptedSecrets = parsed.encryptedSecrets && typeof parsed.encryptedSecrets === 'object' ? parsed.encryptedSecrets : {};
  const encryptedCredentials = encryptedSecrets.credentials || parsed.credentialsEncrypted;
  const encryptedAgentKeys = encryptedSecrets.agentKeys || parsed.agentKeysEncrypted;

  if (encryptedCredentials || encryptedAgentKeys) {
    const key = await openKeyPopup({
      title: 'Import encrypted secrets',
      message: 'Paste the export key to import encrypted credentials and API key records. Without it, only non-secret config data can be imported.',
      mode: 'input',
    });
    if (!key) throw new Error('Export key required.');
    if (encryptedCredentials) {
      const credentialMap = await decryptCredentialBundle(encryptedCredentials, key.trim());
      importedItems = importedItems.map((item) => ({
        ...item,
        credentials: normalizeCredentials(credentialMap[item.id]),
      }));
    }
    if (encryptedAgentKeys) {
      const decryptedAgentKeys = await decryptCredentialBundle(encryptedAgentKeys, key.trim());
      importedAgentKeysForSave = Array.isArray(decryptedAgentKeys) ? decryptedAgentKeys : [];
    } else {
      importedAgentKeysForSave = null;
    }
  } else {
    importedAgentKeysForSave = null;
  }

  items     = importedItems;
  locations = Array.isArray(parsed.locations) ? parsed.locations : [];
  racks     = Array.isArray(parsed.racks) ? parsed.racks : [];
  liveStatusData = parsed.agentStatus && typeof parsed.agentStatus === 'object' ? parsed.agentStatus : {};

  if (Array.isArray(parsed.customThemes)) importCustomThemes(parsed.customThemes);
  applyImportedThemeFromConfig(parsed);

  if (parsed.tutorialSeen === true) {
    localStorage.setItem('labby-tutorial-seen', '1');
  } else if (parsed.tutorialSeen === false) {
    localStorage.removeItem('labby-tutorial-seen');
  }
}


function getLocalAgentKeys() {
  try {
    const now = Date.now();
    return JSON.parse(localStorage.getItem(agentKeyStorage) || '[]').filter(k => !k.expiresAt || Date.parse(k.expiresAt) > now);
  } catch { return []; }
}

function setLocalAgentKeys(keys) {
  try { localStorage.setItem(agentKeyStorage, JSON.stringify(keys)); } catch {}
}

function createLocalAgentToken() {
  const bytes = new Uint8Array(24);
  if (crypto?.getRandomValues) crypto.getRandomValues(bytes);
  else bytes.forEach((_, i) => bytes[i] = Math.floor(Math.random() * 256));
  return 'labby_demo_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function agentApiRequest(path, options = {}) {
  throw new Error('Demo mode keeps API key records in browser storage only.');
}

async function loadAgentKeys() {
  try {
    const data = await agentApiRequest('/api/agent-keys');
    return Array.isArray(data.keys) ? data.keys : [];
  } catch {
    return getLocalAgentKeys();
  }
}

async function createAgentKey(name, scopes, expiresAt) {
  try {
    const data = await agentApiRequest('/api/agent-keys', {
      method: 'POST',
      body: JSON.stringify({ name, scopes, expiresAt }),
    });
    return data;
  } catch {
    const token = createLocalAgentToken();
    const key = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      prefix: token.slice(0, 16),
      scopes,
      enabled: true,
      createdAt: new Date().toISOString(),
      expiresAt,
      lastUsed: '',
    };
    const keys = getLocalAgentKeys();
    keys.push(key);
    setLocalAgentKeys(keys);
    return { key, token };
  }
}

async function updateAgentKey(id, patch) {
  try {
    await agentApiRequest(`/api/agent-keys/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  } catch {
    const keys = getLocalAgentKeys().map(k => k.id === id ? { ...k, ...patch } : k);
    setLocalAgentKeys(keys);
  }
}

async function deleteAgentKey(id) {
  try {
    await agentApiRequest(`/api/agent-keys/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch {
    setLocalAgentKeys(getLocalAgentKeys().filter(k => k.id !== id));
  }
}

function renderAgentScopeGrid(target) {
  if (!target || target.dataset.ready === '1') return;
  target.innerHTML = agentScopes.map(([scope, label]) => `
    <label class="agent-scope-option">
      <input type="checkbox" value="${escapeAttr(scope)}" ${['inventory:read','status:write','ping:run'].includes(scope) ? 'checked' : ''} />
      <span>${label}</span>
    </label>
  `).join('');
  target.dataset.ready = '1';
}

function selectedAgentScopes(form) {
  return Array.from(form.querySelectorAll('.agent-scope-option input:checked')).map(input => input.value);
}

function clearAgentTokenBox() {
  document.querySelectorAll('.agent-token-box').forEach((box) => {
    box.hidden = true;
    box.innerHTML = '';
  });
}

function showAgentToken(box, token) {
  if (!box || !token) return;
  box.hidden = false;
  const inputId = `agent-token-copy-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  box.innerHTML = `
    <strong>Copy this key now. It is shown once and cannot be recovered later:</strong>
    <div class="agent-token-copy-row">
      <input id="${inputId}" type="text" readonly value="${escapeAttr(token)}" aria-label="New API key" />
      <button class="button secondary" type="button" data-copy-agent-token="${inputId}">Copy</button>
      <button class="button secondary" type="button" data-clear-agent-token>Done</button>
    </div>`;
  requestAnimationFrame(() => {
    const field = document.getElementById(inputId);
    field?.focus();
    field?.select();
  });
}

async function renderAgentKeyLists() {
  const keys = await loadAgentKeys();
  document.querySelectorAll('.agent-key-list').forEach((list) => {
    list.innerHTML = keys.length ? keys.map((key) => `
      <article class="agent-key-card" data-agent-key="${escapeAttr(key.id)}">
        <div>
          <strong>${escapeAttr(key.name)}</strong>
          <div class="agent-key-meta">${key.enabled === false ? 'Disabled' : 'Enabled'} · ${escapeAttr(key.prefix || 'labby_…')} · ${escapeAttr((key.scopes || []).join(', '))}</div>
          <div class="agent-key-meta">Created: ${escapeAttr(key.createdAt || '-')} · Expires: ${escapeAttr(key.expiresAt || '-')} · Last used: ${escapeAttr(key.lastUsed || 'never')}</div>
        </div>
        <div class="agent-key-actions">
          <button class="button secondary" type="button" data-agent-toggle>${key.enabled === false ? 'Enable' : 'Disable'}</button>
          <button class="button danger" type="button" data-agent-delete>Revoke</button>
        </div>
      </article>
    `).join('') : '<p class="note">No agent API keys yet.</p>';
  });
}

function bindAgentKeyForm(formId, nameId, tokenId, expiryId) {
  const formNode = document.getElementById(formId);
  const nameNode = document.getElementById(nameId);
  const tokenNode = document.getElementById(tokenId);
  const expiryNode = document.getElementById(expiryId);
  if (!formNode || formNode.dataset.ready === '1') return;
  formNode.dataset.ready = '1';
  formNode.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = nameNode.value.trim();
    if (!name) return showToast('Agent name is required.', 'error');
    const scopes = selectedAgentScopes(formNode);
    if (!scopes.length) return showToast('Select at least one scope.', 'error');
    const expiresAt = getAgentExpiryIso(expiryNode?.value || '1m');
    const result = await createAgentKey(name, scopes, expiresAt);
    nameNode.value = '';
    showAgentToken(tokenNode, result.token);
    await renderAgentKeyLists();
    showToast('Agent API key created.');
  });
}

function initAgentApiPanel() {
  document.querySelectorAll('[data-agent-scopes]').forEach(renderAgentScopeGrid);
  bindAgentKeyForm('agent-key-form', 'agent-key-name', 'agent-token', 'agent-key-expiry');
  bindAgentKeyForm('agent-key-form-mobile', 'agent-key-name-mobile', 'agent-token-mobile', 'agent-key-expiry-mobile');
  if (document.documentElement.dataset.agentApiReady !== '1') {
    document.documentElement.dataset.agentApiReady = '1';
    document.addEventListener('click', async (event) => {
      const copyButton = event.target.closest?.('[data-copy-agent-token]');
      if (copyButton) {
        const field = document.getElementById(copyButton.dataset.copyAgentToken);
        if (field) {
          field.select();
          try { await navigator.clipboard.writeText(field.value); showToast('API key copied.'); }
          catch { document.execCommand?.('copy'); showToast('API key selected.'); }
        }
        return;
      }
      if (event.target.closest?.('[data-clear-agent-token]')) {
        clearAgentTokenBox();
        return;
      }
      const card = event.target.closest?.('.agent-key-card');
      if (!card) return;
      const id = card.dataset.agentKey;
      const keys = await loadAgentKeys();
      const key = keys.find(k => k.id === id);
      if (event.target.matches('[data-agent-toggle]')) {
        await updateAgentKey(id, { enabled: key?.enabled === false });
        await renderAgentKeyLists();
        showToast('Agent API key updated.');
      }
      if (event.target.matches('[data-agent-delete]')) {
        if (!confirm('Revoke this API key?')) return;
        await deleteAgentKey(id);
        await renderAgentKeyLists();
        showToast('Agent API key revoked.');
      }
    });
  }
  renderAgentKeyLists();
}


exportBtn.addEventListener('click', async () => {
  const config = await buildConfigExport();
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
    await applyImportedConfig(parsed);
    stopEditing();
    await saveItems();
    showToast('Config imported successfully.');
    render();
    if (typeof renderAgentKeyLists === 'function') renderAgentKeyLists();
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

function supportsCredentials(type) {
  return ['hardware', 'vm', 'lxc', 'app'].includes(type);
}

function normalizeCredentials(value) {
  if (!value || typeof value !== 'object') return null;
  const username = String(value.username || '').trim();
  const password = String(value.password || '');
  const note = String(value.note || '').trim();
  const cli = Boolean(value.cli || value.accessCli);
  const web = Boolean(value.web || value.accessWeb);
  if (!username && !password && !note && !cli && !web) return null;
  return { username, password, note, cli, web };
}

function credentialEyeSvg(isOpen = false) {
  return isOpen
    ? '<svg class="credential-eye-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>'
    : '<svg class="credential-eye-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M8.5 5.6A10.4 10.4 0 0 1 12 5c6 0 9.5 7 9.5 7a16.4 16.4 0 0 1-3.1 4.2"/><path d="M6.4 6.9C3.9 8.6 2.5 12 2.5 12s3.5 7 9.5 7a10 10 0 0 0 4.4-1"/></svg>';
}

function credentialInput(id) {
  return document.getElementById(id);
}

function getCredentialFields() {
  return normalizeCredentials({
    username: credentialInput('credential-username')?.value || '',
    password: credentialInput('credential-password')?.value || '',
    note: credentialInput('credential-note')?.value || '',
    cli: credentialInput('credential-cli')?.checked || false,
    web: credentialInput('credential-web')?.checked || false,
  });
}

function setCredentialFields(credentials) {
  const normalized = normalizeCredentials(credentials);
  const username = credentialInput('credential-username');
  const password = credentialInput('credential-password');
  const note = credentialInput('credential-note');
  const cli = credentialInput('credential-cli');
  const web = credentialInput('credential-web');
  if (username) username.value = normalized?.username || '';
  if (password) password.value = normalized?.password || '';
  if (note) note.value = normalized?.note || '';
  if (cli) cli.checked = Boolean(normalized?.cli);
  if (web) web.checked = Boolean(normalized?.web);
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
      credentials: normalizeCredentials(item.credentials),
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
    if (!supportsCredentials(next.type)) next.credentials = null;
    else next.credentials = normalizeCredentials(next.credentials);
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

  updateAdvancedResourceControls(type, hardwareKind);
  refreshHardwareConnectionOptions();
}

function initAdvancedResourceSettings() {
  if (!advancedResourceBody) return;
  const advancedIds = [
    'manufacturer-wrap',
    'os-wrap',
    'ip-status-wrap',
    'url-status-wrap',
    'compute-fields',
    'switch-ports-wrap',
    'router-switches-wrap',
    'switch-links-wrap',
    'switch-device-links-wrap',
    'nas-shares-wrap',
    'nas-raids-wrap',
    'hosted-on-wrap',
    'app-hosted-on-wrap',
  ];

  advancedIds
    .map((id) => document.getElementById(id))
    .filter(Boolean)
    .forEach((node) => {
      node.classList.add('advanced-resource-field');
      advancedResourceBody.appendChild(node);
    });

  if (!document.getElementById('credentials-wrap')) {
    credentialFields = document.createElement('fieldset');
    credentialFields.id = 'credentials-wrap';
    credentialFields.className = 'network-fields advanced-resource-field credentials-fieldset hidden';
    credentialFields.innerHTML = `
      <legend>Credentials</legend>
      <p class="advanced-section-note">Store username and password for this resource. Passwords are hidden by default and included in encrypted config exports.</p>
      <div class="credential-grid">
        <label>
          Username
          <div class="credential-input-row">
            <input id="credential-username" type="text" autocomplete="off" placeholder="e.g. admin" />
            <button class="button secondary" type="button" data-credential-copy="credential-username">Copy</button>
          </div>
        </label>
        <label>
          Password
          <div class="credential-input-row">
            <input id="credential-password" type="password" autocomplete="new-password" placeholder="••••••••" />
            <button class="button secondary credential-eye" type="button" data-credential-toggle="credential-password" aria-label="Show password">${credentialEyeSvg(false)}</button>
            <button class="button secondary" type="button" data-credential-copy="credential-password">Copy</button>
          </div>
        </label>
      </div>
      <div class="credential-access-grid">
        <label class="credential-access-option">
          <input id="credential-cli" type="checkbox" />
          <span>
            <strong>CLI / SSH</strong>
            <small>Show a CLI button next to the IP address.</small>
          </span>
        </label>
        <label class="credential-access-option">
          <input id="credential-web" type="checkbox" />
          <span>
            <strong>Web</strong>
            <small>Marks these credentials as usable for the web interface.</small>
          </span>
        </label>
      </div>
      <label>
        Credential note
        <input id="credential-note" type="text" placeholder="e.g. stored in vault, local admin, recovery user" />
      </label>
    `;
    advancedResourceBody.prepend(credentialFields);
  } else {
    credentialFields = document.getElementById('credentials-wrap');
  }
}

function updateAdvancedResourceControls(type, hardwareKind) {
  const hasAdvanced = ['hardware', 'vm', 'lxc', 'app'].includes(type);
  advancedSettingsBtn?.classList.toggle('hidden', !hasAdvanced);
  document.getElementById('credentials-wrap')?.classList.toggle('hidden', !supportsCredentials(type));
  if (advancedResourceSave) advancedResourceSave.textContent = editingId ? 'Save changes' : 'Add item';
  if (advancedResourceTitle) {
    const typeTitle = type === 'hardware' ? hardwareTypeLabel(hardwareKind) : label(type);
    advancedResourceTitle.textContent = `${typeTitle} Settings`;
  }
}

function openAdvancedResourceSettings() {
  const type = typeSelect.value;
  if (type === 'network') return;
  applyTypeVisibility();
  refreshHostOptions();
  refreshAppHostOptions();
  refreshHardwareConnectionOptions();
  if (advancedResourceDialog && !advancedResourceDialog.open) {
    if (window.innerWidth <= 1100) {
      advancedResourceDialog.setAttribute('open', '');
      advancedResourceDialog.classList.add('mobile-page-open');
    } else {
      advancedResourceDialog.showModal();
    }
  }
}

function closeAdvancedResourceSettings() {
  if (!advancedResourceDialog?.open) return;
  advancedResourceDialog.classList.remove('mobile-page-open');
  if (advancedResourceDialog.matches(':modal')) advancedResourceDialog.close();
  else advancedResourceDialog.removeAttribute('open');
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

  // Live status display: only render the live/status row when the object
  // actually has IP/URL monitoring configured. Empty placeholder boxes must
  // not remain visible in Topology cards.
  const liveStatusEl = node.querySelector('.card-live-status');
  if (liveStatusEl) {
    const liveStatusHtml = buildLiveStatusHtml(item).trim();
    if (liveStatusHtml) {
      liveStatusEl.innerHTML = liveStatusHtml;
      liveStatusEl.classList.remove('hidden');
    } else {
      liveStatusEl.innerHTML = '';
      liveStatusEl.classList.add('hidden');
    }
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
    actionsEl.innerHTML = '';
    actions.forEach(el => actionsEl.appendChild(el));
    actionsEl.classList.toggle('hidden', actions.length === 0);
  }

  const editButton = node.querySelector('.edit-btn');
  if (editButton) editButton.addEventListener('click', () => isMobile() ? window.startEditingMobile(item.id) : startEditing(item.id));

  const deleteButton = node.querySelector('.delete-btn');
  if (deleteButton) deleteButton.addEventListener('click', () => removeItem(item.id));
  enhanceMobileCard(node, item);
  return node;
}

function buildCardActions(item) {
  const els = [];
  const baseIp = item.ip ? item.ip.split('/')[0] : '';

  if (baseIp) {
    els.push(makeCopyBtn(baseIp, 'Copy IP'));
    if (item.credentials?.cli) els.push(makeCliBtn(item));
  }

  if (item.type === 'app' && item.ipPort) {
    els.push(makeCopyBtn(item.ipPort, 'Copy IP:Port'));
  }

  if ((item.type === 'app' || item.type === 'hardware') && item.webUrl) {
    els.push(makeCopyBtn(item.webUrl, 'Copy URL'));
    const link = document.createElement('a');
    link.href = item.webUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'card-action-link';
    link.textContent = '🔗 Open';
    link.title = item.webUrl;
    els.push(link);
  }

  return els;
}


function cliIconSvg() {
  return '<svg class="cli-action-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z"/><path d="m7 10 3 2-3 2"/><path d="M12 15h5"/></svg>';
}

function makeCliBtn(item) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'card-action-cli';
  btn.dataset.cliOpen = item.id;
  btn.innerHTML = cliIconSvg() + '<span>CLI</span>';
  btn.title = `Open SSH CLI for ${item.name}`;
  return btn;
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


function cliTargetForItem(item) {
  const ip = item?.ip ? String(item.ip).split('/')[0].trim() : '';
  const username = item?.credentials?.username ? String(item.credentials.username).trim() : '';
  const password = item?.credentials?.password ? String(item.credentials.password) : '';
  return { ip, username, password, target: username ? `${username}@${ip}` : ip };
}

function activeCliEls() {
  const mobile = isMobile();
  return {
    view: mobile ? mobileCliView : cliDialog,
    title: mobile ? mobileCliTitle : cliTitle,
    subtitle: mobile ? mobileCliSubtitle : cliSubtitle,
    terminal: mobile ? mobileCliTerminal : cliTerminal,
    input: mobile ? mobileCliInput : cliInput,
  };
}

function setCliOutput(text, append = false) {
  const desktopTerm = cliTerminal;
  const mobileTerm = mobileCliTerminal;
  [desktopTerm, mobileTerm].filter(Boolean).forEach((terminal) => {
    terminal.textContent = append ? `${terminal.textContent}${text}` : text;
    terminal.scrollTop = terminal.scrollHeight;
  });
}

async function openCliSession(item, options = {}) {
  const { ip, username, password, target } = cliTargetForItem(item);
  if (!ip) {
    showToast('No IP address available for CLI.', 'error');
    return;
  }
  cliActiveItem = item;
  const els = activeCliEls();
  if (els.title) els.title.textContent = `CLI · ${item.name}`;
  if (els.subtitle) els.subtitle.textContent = `ssh ${target}`;
  setCliOutput(`Connecting to ${target}...\n`);

  if (isMobile()) {
    hideMobileViews?.();
    mobileCliView?.classList.add('active');
    document.getElementById('nav-topology')?.classList.remove('active');
  } else if (cliDialog && !cliDialog.open) {
    cliDialog.showModal();
  }

  try {
    const res = await fetch(`${API_BASE}/api/ssh/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: ip, username, password, clearKnownHost: Boolean(options.clearKnownHost) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not start SSH session.');
    cliSession = data.sessionId;
    setCliOutput(data.output || `Connected to ${target}.\n`);
    startCliPolling();
    els.input?.focus();
  } catch (err) {
    const sshUrl = username ? `ssh://${encodeURIComponent(username)}@${ip}` : `ssh://${ip}`;
    setCliOutput(
      `Labby could not start the backend SSH session.\n\n` +
      `You can still launch your system SSH client manually:\nssh ${target}\n\n` +
      `Reason: ${err.message || err}\n`
    );
    const elsNow = activeCliEls();
    if (elsNow.terminal) {
      const a = document.createElement('a');
      a.href = sshUrl;
      a.textContent = `Open system SSH: ${sshUrl}`;
      a.className = 'cli-system-link';
      elsNow.terminal.appendChild(a);
    }
  }
}

function startCliPolling() {
  stopCliPolling();
  cliPollTimer = window.setInterval(async () => {
    if (!cliSession) return;
    try {
      const res = await fetch(`${API_BASE}/api/ssh/${encodeURIComponent(cliSession)}/output`);
      const data = await res.json();
      if (data.output) setCliOutput(data.output, true);
      if (data.closed) {
        setCliOutput('\n[SSH session closed]\n', true);
        cliSession = null;
        stopCliPolling();
      }
    } catch {
      stopCliPolling();
    }
  }, 800);
}

function stopCliPolling() {
  if (cliPollTimer) window.clearInterval(cliPollTimer);
  cliPollTimer = null;
}

async function sendCliInput() {
  if (!cliSession) return;
  const els = activeCliEls();
  const value = els.input?.value || '';
  if (!value) return;
  els.input.value = '';
  setCliOutput(`$ ${value}\n`, true);
  try {
    await fetch(`${API_BASE}/api/ssh/${encodeURIComponent(cliSession)}/input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: `${value}\n` }),
    });
  } catch {
    showToast('Could not send command.', 'error');
  }
}

async function copySelectedCliText() {
  const selection = window.getSelection?.();
  const text = selection?.toString?.() || '';
  if (!text.trim()) return;
  const els = activeCliEls();
  const terminal = els.terminal;
  if (!terminal || !selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  const inTerminal = terminal.contains(range.commonAncestorContainer)
    || terminal === range.commonAncestorContainer;
  if (!inTerminal) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Selected CLI text copied.');
  } catch {
    // Clipboard permission can be unavailable on some browsers; selection still remains usable.
  }
}

function attachCliSelectionCopy() {
  [cliTerminal, mobileCliTerminal].filter(Boolean).forEach((terminal) => {
    terminal.addEventListener('mouseup', copySelectedCliText);
    terminal.addEventListener('touchend', () => window.setTimeout(copySelectedCliText, 80), { passive: true });
    terminal.addEventListener('keyup', (event) => {
      if (event.key === 'Shift' || event.key.startsWith('Arrow')) copySelectedCliText();
    });
  });
}

attachCliSelectionCopy();

async function stopCliProcessOnly() {
  const sessionToClose = cliSession;
  cliSession = null;
  stopCliPolling();
  if (sessionToClose) {
    try { await fetch(`${API_BASE}/api/ssh/${encodeURIComponent(sessionToClose)}/close`, { method: 'POST' }); }
    catch {}
  }
}

async function clearCliKnownHostAndReconnect() {
  const item = cliActiveItem;
  const { ip } = cliTargetForItem(item);
  if (!item || !ip) {
    showToast('No active SSH target.', 'error');
    return;
  }
  setCliOutput(`
[clearing SSH host key for ${ip}]
`, true);
  await stopCliProcessOnly();
  try {
    const res = await fetch(`${API_BASE}/api/ssh/known-host/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: ip }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not clear SSH key.');
    showToast('SSH key cleared. Reconnecting...');
    await openCliSession(item, { clearKnownHost: true });
  } catch (err) {
    setCliOutput(`
[Could not clear SSH key: ${err.message || err}]
`, true);
    showToast('Could not clear SSH key.', 'error');
  }
}

async function copyCliOutput() {
  const els = activeCliEls();
  const text = els.terminal?.innerText || els.terminal?.textContent || '';
  try { await navigator.clipboard.writeText(text); showToast('CLI output copied.'); }
  catch { showToast('Could not copy CLI output.', 'error'); }
}

async function closeCliSession() {
  await stopCliProcessOnly();
  if (cliDialog?.open) cliDialog.close();
  mobileCliView?.classList.remove('active');
  cliActiveItem = null;
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
  setCredentialFields(item.credentials);
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
  setCredentialFields(null);
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

  // Native dialogs live in the browser top layer and ignore normal z-index stacking.
  // Use the Popover API for toasts too, so messages appear above the currently active window.
  const canUseTopLayer = typeof toast.showPopover === 'function' && typeof toast.hidePopover === 'function';
  if (canUseTopLayer) {
    if (!toast.hasAttribute('popover')) toast.setAttribute('popover', 'manual');
    try {
      if (!toast.matches(':popover-open')) toast.showPopover();
    } catch {}
  }

  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    if (canUseTopLayer) {
      try { if (toast.matches(':popover-open')) toast.hidePopover(); } catch {}
    }
  }, 2200);
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

  const graphHost = isMobile() ? (document.getElementById('mobile-tree-content') || treeContent) : treeContent;
  const viewportWidth = Math.max(isMobile() ? 320 : 760, (graphHost?.clientWidth || treeContent.clientWidth || window.innerWidth) - 30);
  const viewportHeight = Math.max(isMobile() ? 560 : 460, (graphHost?.clientHeight || treeContent.clientHeight || window.innerHeight * 0.65) - 34);
  const minWidthForItems = isMobile()
    ? Math.max(viewportWidth, graphItems.length * 230, 1100)
    : Math.max(1100, graphItems.length * 190);
  const minHeightForItems = isMobile()
    ? Math.max(720, Math.ceil(graphItems.length / 5) * 150)
    : Math.max(560, Math.ceil(graphItems.length / 7) * 172);
  let width = Math.max(viewportWidth, minWidthForItems);
  let height = Math.max(viewportHeight, minHeightForItems);
  canvas.style.setProperty('--graph-width', `${width}px`);
  canvas.style.setProperty('--graph-height', `${height}px`);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const positions = new Map();
  const byId = Object.fromEntries(items.map((item) => [item.id, item]));

  const hardware = graphItems.filter((item) => item.type === 'hardware');
  const graphById = Object.fromEntries(graphItems.map((item) => [item.id, item]));
  const graphEdges = [];
  const graphEdgeSeen = new Set();

  function addGraphEdge(sourceId, targetId) {
    const source = graphById[sourceId];
    const target = graphById[targetId];
    if (!source || !target || sourceId === targetId) return;
    const key = [sourceId, targetId].sort().join('::');
    if (graphEdgeSeen.has(key)) return;
    graphEdgeSeen.add(key);
    graphEdges.push({ sourceId, targetId });
  }

  graphItems.forEach((item) => {
    if ((item.type === 'vm' || item.type === 'lxc') && item.hostedOn) addGraphEdge(item.hostedOn, item.id);
    if (item.type === 'app' && item.appHostedOn) addGraphEdge(item.appHostedOn, item.id);
    if (Array.isArray(item.connections)) {
      item.connections.forEach((targetId) => {
        if (graphById[targetId]) addGraphEdge(item.id, targetId);
      });
    }
  });

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
  const graphNodeRadius = isMobile() ? 31 : 23;
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
  const horizontalStep = isMobile() ? 188 : 156;

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

  if (isMobile() && canUseHierarchy) {
    // Mobile needs readability more than a wide desktop tree. Use a vertical,
    // scroll/pan friendly hierarchy: one node per row, depth as the horizontal lane.
    // This avoids the old failure mode where dozens of siblings were squeezed into
    // one horizontal line and all links crossed over each other.
    canvas.dataset.mobileGraphLayout = 'vertical';
    const ordered = [];
    const seen = new Set();
    let maxDepthUsed = 0;

    function walk(nodeId, depth = 0) {
      if (!nodeId || seen.has(nodeId)) return;
      const item = graphById[nodeId];
      if (!item) return;
      seen.add(nodeId);
      maxDepthUsed = Math.max(maxDepthUsed, depth);
      ordered.push({ item, depth });
      const children = (childrenById.get(nodeId) || [])
        .filter(childId => graphById[childId] && !seen.has(childId))
        .sort((aId, bId) => nodeOrder(graphById[aId], graphById[bId]));
      children.forEach(childId => walk(childId, depth + 1));
    }

    const rootList = roots.length ? roots : graphItems.sort(nodeOrder).map(item => item.id);
    rootList.forEach(rootId => walk(rootId, 0));
    graphItems.sort(nodeOrder).forEach(item => {
      if (!seen.has(item.id)) walk(item.id, 0);
    });

    const laneGap = 126;
    const rowGap = 104;
    const topPad = 88;
    const leftPad = 88;
    const rightLabelSpace = 230;
    const layoutWidth = Math.max(viewportWidth + 180, leftPad + maxDepthUsed * laneGap + rightLabelSpace);
    const layoutHeight = Math.max(viewportHeight + 140, topPad + ordered.length * rowGap + 170);

    width = layoutWidth;
    height = layoutHeight;
    canvas.style.setProperty('--graph-width', `${layoutWidth}px`);
    canvas.style.setProperty('--graph-height', `${layoutHeight}px`);
    canvas.style.width = `${layoutWidth}px`;
    canvas.style.height = `${layoutHeight}px`;

    ordered.forEach(({ item, depth }, idx) => {
      positions.set(item.id, {
        x: Math.round(leftPad + depth * laneGap),
        y: Math.round(topPad + idx * rowGap),
      });
    });
  }

  if (!isMobile() && canUseHierarchy) {
    const minRawX = Math.min(...allRawX);
    const maxRawX = Math.max(...allRawX);
    const rawSpan = Math.max(1, maxRawX - minRawX);
    const horizontalPadding = isMobile() ? 120 : 80;
    const usableWidth = Math.max(240, width - horizontalPadding * 2);
    const compress = 1;
    const finalSpan = rawSpan * compress;
    const startX = (width - finalSpan) / 2;

    const topPadding = isMobile() ? 76 : 44;
    const maxDepth = Math.max(1, Math.max(...depthValues));
    const layerGap = isMobile() ? Math.max(165, Math.round((height - topPadding - 120) / maxDepth)) : Math.max(116, Math.round((height - topPadding - 60) / maxDepth));

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
  links.setAttribute('width', String(width));
  links.setAttribute('height', String(height));
  links.style.width = `${width}px`;
  links.style.height = `${height}px`;

  graphEdges.forEach(({ sourceId, targetId }) => {
    const from = positions.get(sourceId);
    const to = positions.get(targetId);
    if (!from || !to) return;

    const drawDownward = from.y <= to.y;
    const source = drawDownward ? from : to;
    const target = drawDownward ? to : from;
    const startX = source.x;
    const startY = source.y + graphNodeRadius;
    const endX = target.x;
    const endY = target.y - graphNodeRadius;

    const curve = document.createElementNS(svgNS, 'path');
    if (Math.abs(endY - startY) < 28) {
      const midY = startY + (isMobile() ? 48 : 34);
      curve.setAttribute('d', `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`);
    } else {
      const yGap = Math.max(26, Math.abs(endY - startY));
      const bend = Math.min(isMobile() ? 86 : 96, Math.round(yGap * 0.44));
      const c1x = startX;
      const c1y = startY + bend;
      const c2x = endX;
      const c2y = endY - bend;
      curve.setAttribute('d', `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`);
    }
    curve.setAttribute('class', 'graph-link');
    curve.setAttribute('stroke', '#6ca4ff');
    curve.setAttribute('stroke-width', isMobile() ? '3' : '2');
    curve.setAttribute('stroke-opacity', isMobile() ? '0.92' : '0.78');
    curve.setAttribute('fill', 'none');
    curve.setAttribute('stroke-linecap', 'round');
    links.appendChild(curve);
  });

  canvas.appendChild(links);

  graphItems.forEach((item) => {
    const pos = positions.get(item.id);
    if (!pos) return;
    const node = document.createElement('button');
    node.type = 'button';
    node.className = `graph-node ${item.type}`;
    node.textContent = item.symbol || defaultSymbol(item.type, item.hardwareKind);
    node.title = `Edit ${item.name}`;
    node.setAttribute('aria-label', `Edit ${item.name}`);
    node.style.left = `${pos.x}px`;
    node.style.top = `${pos.y}px`;
    node.style.borderColor = networkBorderColor(item) || 'var(--line)';

    const label = document.createElement('span');
    label.className = 'graph-node-label';
    label.textContent = item.name;
    label.style.left = `${pos.x}px`;
    label.style.top = `${pos.y}px`;

    node.addEventListener('mouseenter', (event) => {
      hoverTip.textContent = 'Edit';
      hoverTip.classList.remove('hidden');
      positionGraphTooltip(event, hoverTip, wrap);
    });
    node.addEventListener('mousemove', (event) => positionGraphTooltip(event, hoverTip, wrap));
    node.addEventListener('mouseleave', () => {
      hoverTip.classList.add('hidden');
      hoverTip.textContent = '';
    });
    node.addEventListener('click', () => {
      if (isMobile()) {
        tip.innerHTML = graphInfoHtml(item);
        const editBtn = tip.querySelector('[data-graph-edit-id]');
        if (editBtn) editBtn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          window.startEditingMobile(item.id);
        });
        tip.classList.add('active');
        wrap.classList.add('node-selected');
        return;
      }
      startEditing(item.id);
      treeDialog.close();
      showToast(`Editing ${item.name}`);
    });

    canvas.appendChild(node);
    canvas.appendChild(label);
  });

  const graphBounds = getGraphBounds(positions, graphItems);
  requestAnimationFrame(() => {
    enableGraphPanZoom(wrap, canvas, width, height, graphBounds);
  });

  return wrap;
}




function graphInfoHtml(item) {
  const bits = [
    item.description,
    item.ip ? `IP: ${item.ip}` : '',
    item.type === 'app' ? appDetails(item) : '',
    hardwareDetailsLabel(item) || specsLabel(item),
    hostingLabel(item),
    connectionLabel(item),
  ].filter(Boolean);
  return `
    <div class="graph-info-grabber"></div>
    <strong>${escapeHtml((item.symbol || '') + ' ' + item.name)}</strong>
    <span class="tree-meta">${escapeHtml(label(item.type))}</span>
    ${bits.map(bit => `<p>${escapeHtml(bit)}</p>`).join('')}
    <button class="button secondary graph-info-edit" type="button" data-graph-edit-id="${escapeHtml(item.id)}">Edit</button>
  `;
}

function getGraphBounds(positions, graphItems) {
  const points = graphItems
    .map((item) => {
      const pos = positions.get(item.id);
      if (!pos) return null;
      return { id: item.id, x: pos.x, y: pos.y };
    })
    .filter(Boolean);

  if (!points.length) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });

  const sortedX = points.map((point) => point.x).sort((a, b) => a - b);
  const sortedY = points.map((point) => point.y).sort((a, b) => a - b);
  const quantile = (values, q) => {
    if (!values.length) return 0;
    const idx = Math.min(values.length - 1, Math.max(0, Math.round((values.length - 1) * q)));
    return values[idx];
  };

  const medianY = quantile(sortedY, 0.5);

  // Focus on the area where most components are, not on long outlier branches.
  // The graph still stays pannable, but the initial viewport starts on the useful cluster.
  const lowerOrEqualNodes = points.filter((point) => point.y >= medianY - 4);
  const clusterCandidates = lowerOrEqualNodes.length >= Math.max(4, Math.floor(points.length * 0.35))
    ? lowerOrEqualNodes
    : points;

  function densestWindow(nodes, ratio = 0.72) {
    const sorted = [...nodes].sort((a, b) => a.x - b.x);
    if (sorted.length <= 2) return sorted;
    const count = Math.max(2, Math.ceil(sorted.length * ratio));
    let bestStart = 0;
    let bestSpan = Infinity;
    for (let i = 0; i <= sorted.length - count; i++) {
      const span = sorted[i + count - 1].x - sorted[i].x;
      if (span < bestSpan) {
        bestSpan = span;
        bestStart = i;
      }
    }
    return sorted.slice(bestStart, bestStart + count);
  }

  const denseCluster = densestWindow(clusterCandidates, 0.72);
  const focusXs = denseCluster.map((point) => point.x).sort((a, b) => a - b);
  const focusYs = denseCluster.map((point) => point.y).sort((a, b) => a - b);

  const focusMinX = Math.min(...focusXs);
  const focusMaxX = Math.max(...focusXs);
  const focusMinY = Math.min(...focusYs);
  const focusMaxY = Math.max(...focusYs);

  const focusCenterX = (focusMinX + focusMaxX) / 2;
  const focusCenterY = (focusMinY + focusMaxY) / 2;

  const nodePadX = isMobile() ? 190 : 150;
  const nodePadTop = isMobile() ? 120 : 92;
  const nodePadBottom = isMobile() ? 170 : 130;

  return {
    minX: minX - nodePadX,
    minY: minY - nodePadTop,
    maxX: maxX + nodePadX,
    maxY: maxY + nodePadBottom,
    focusMinX: focusMinX - nodePadX,
    focusMinY: focusMinY - nodePadTop,
    focusMaxX: focusMaxX + nodePadX,
    focusMaxY: focusMaxY + nodePadBottom,
    focusCenterX,
    focusCenterY,
  };
}

function enableGraphPanZoom(wrap, canvas, width, height, bounds) {
  const mobileGraph = isMobile();
  const minGraphScale = mobileGraph ? 0.14 : 0.18;
  const maxGraphScale = mobileGraph ? 3.4 : 2.4;
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
    const viewportW = Math.max(1, wrap.clientWidth);
    const viewportH = Math.max(1, wrap.clientHeight);
    const defaultPanX = (viewportW - width * scale) / 2;
    const defaultPanY = (viewportH - height * scale) / 2;

    if (!bounds) {
      panX = defaultPanX;
      panY = defaultPanY;
      applyTransform();
      return;
    }

    const isVerticalMobileGraph = mobileGraph && canvas.dataset.mobileGraphLayout === 'vertical';
    const focusW = mobileGraph
      ? Math.max(1, bounds.maxX - bounds.minX)
      : Math.max(1, (bounds.focusMaxX || bounds.maxX) - (bounds.focusMinX || bounds.minX));
    const focusH = mobileGraph
      ? Math.max(1, bounds.maxY - bounds.minY)
      : Math.max(1, (bounds.focusMaxY || bounds.maxY) - (bounds.focusMinY || bounds.minY));
    const fitPadding = mobileGraph ? 34 : 64;

    const fitScaleX = (viewportW - fitPadding * 2) / focusW;
    const fitScaleY = (viewportH - fitPadding * 2) / focusH;

    if (isVerticalMobileGraph) {
      // Fit width only. Do not fit the full tall graph height, otherwise large
      // inventories become unreadably tiny. Users can pan down through the graph.
      scale = Math.max(0.58, Math.min(0.96, fitScaleX));
      panX = Math.max(8, (viewportW - width * scale) / 2);
      panY = 18 - bounds.minY * scale;
      applyTransform();
      return;
    }

    scale = Math.max(minGraphScale, Math.min(mobileGraph ? 0.72 : 1, fitScaleX, fitScaleY));

    const focusCenterX = mobileGraph
      ? (bounds.minX + bounds.maxX) / 2
      : (Number.isFinite(bounds.focusCenterX) ? bounds.focusCenterX : (bounds.minX + bounds.maxX) / 2);
    const focusCenterY = mobileGraph
      ? (bounds.minY + bounds.maxY) / 2
      : (Number.isFinite(bounds.focusCenterY) ? bounds.focusCenterY : (bounds.minY + bounds.maxY) / 2);

    panX = viewportW / 2 - focusCenterX * scale;
    panY = viewportH / 2 - focusCenterY * scale;

    if (!Number.isFinite(panX)) panX = defaultPanX;
    if (!Number.isFinite(panY)) panY = defaultPanY;
    applyTransform();
  }

  centerView();
  requestAnimationFrame(centerView);
  if (window.ResizeObserver) {
    const graphResizeObserver = new ResizeObserver(() => centerView());
    graphResizeObserver.observe(wrap);
  } else {
    window.addEventListener('resize', centerView, { passive: true });
  }

  wrap.addEventListener('wheel', (event) => {
    event.preventDefault();
    const rect = wrap.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const nextScale = Math.max(minGraphScale, Math.min(maxGraphScale, scale * zoomFactor));
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
    if (target.closest('.graph-node, .graph-info-panel, button, a, input, select, textarea')) return;
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

  let pinchStartDistance = 0;
  let pinchStartScale = 1;
  let pinchCenterGraph = null;

  function touchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  function touchCenter(touches, rect) {
    return {
      x: ((touches[0].clientX + touches[1].clientX) / 2) - rect.left,
      y: ((touches[0].clientY + touches[1].clientY) / 2) - rect.top,
    };
  }

  wrap.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    const rect = wrap.getBoundingClientRect();
    const center = touchCenter(event.touches, rect);
    pinchStartDistance = touchDistance(event.touches);
    pinchStartScale = scale;
    pinchCenterGraph = { x: (center.x - panX) / scale, y: (center.y - panY) / scale };
  }, { passive: false });

  wrap.addEventListener('touchmove', (event) => {
    if (event.touches.length !== 2 || !pinchCenterGraph || !pinchStartDistance) return;
    event.preventDefault();
    const rect = wrap.getBoundingClientRect();
    const center = touchCenter(event.touches, rect);
    const ratio = touchDistance(event.touches) / pinchStartDistance;
    scale = Math.max(minGraphScale, Math.min(maxGraphScale, pinchStartScale * ratio));
    panX = center.x - pinchCenterGraph.x * scale;
    panY = center.y - pinchCenterGraph.y * scale;
    applyTransform();
  }, { passive: false });

  wrap.addEventListener('touchend', (event) => {
    if (event.touches.length !== 2) {
      pinchStartDistance = 0;
      pinchCenterGraph = null;
    }
  }, { passive: true });

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
  { id: 'grape',    name: 'Matrix',   dark: true,  sw: ['#000000', '#00ff66', '#07120a', '#0f4d24', '#39ff14'] },
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

  const interfaceVars = [
    '--bg', '--bg-bottom', '--phone', '--panel', '--text', '--muted', '--line', '--yellow', '--blue', '--mint', '--danger'
  ];
  const resourceVars = ['--type-hardware', '--type-vm', '--type-lxc', '--type-app', '--type-network'];
  const byKey = new Map(themeVars.map(v => [v.key, v]));
  const descriptions = {
    '--bg': 'Main page background behind the whole interface.',
    '--bg-bottom': 'Lower background tone used in the page gradient.',
    '--phone': 'Shell and dialog background surface.',
    '--panel': 'Cards, forms and input field surface color.',
    '--text': 'Primary text color for headings and content.',
    '--muted': 'Secondary text for labels, notes and meta info.',
    '--line': 'Borders, outlines and divider lines.',
    '--yellow': 'Primary accent color for important buttons.',
    '--blue': 'Informational boxes and neutral callout areas.',
    '--mint': 'Highlights, success hints and active states.',
    '--danger': 'Danger color for revoke, delete and destructive actions.',
    '--type-hardware': 'Used for hardware cards, chips and markers.',
    '--type-vm': 'Used for virtual machine cards, chips and markers.',
    '--type-lxc': 'Used for LXC cards, chips and markers.',
    '--type-app': 'Used for app cards, chips and markers.',
    '--type-network': 'Used for network cards, chips and markers.',
  };

  const root = document.createElement('div');
  root.className = 'tb-layout';
  body.appendChild(root);

  const nameRow = document.createElement('label');
  nameRow.className = 'tb-base-row tb-name-row';
  nameRow.innerHTML = '<span>Name</span><input id="tb-name" type="text" maxlength="24" placeholder="My Theme" value="My Theme" />';
  root.appendChild(nameRow);

  const sections = document.createElement('div');
  sections.className = 'tb-section-grid';
  root.appendChild(sections);

  function buildSection(title, keys, extraClass, introText) {
    const section = document.createElement('section');
    section.className = 'tb-section' + (extraClass ? ' ' + extraClass : '');

    const heading = document.createElement('div');
    heading.className = 'tb-section-title';
    heading.textContent = title;
    section.appendChild(heading);

    if (introText) {
      const intro = document.createElement('p');
      intro.className = 'tb-section-intro';
      intro.textContent = introText;
      section.appendChild(intro);
    }

    const grid = document.createElement('div');
    grid.className = 'tb-grid';
    keys.forEach(key => {
      const item = byKey.get(key);
      if (!item) return;
      const row = document.createElement('label');
      row.className = 'tb-color-row';
      row.innerHTML = [
        '<input type="color" data-var="' + item.key + '" value="' + start[item.key] + '" />',
        '<span class="tb-color-copy">',
          '<span class="tb-color-label">' + item.label + '</span>',
          '<span class="tb-color-desc">' + (descriptions[item.key] || '') + '</span>',
        '</span>'
      ].join('');
      grid.appendChild(row);
    });
    section.appendChild(grid);
    sections.appendChild(section);
  }

  buildSection('Colors', interfaceVars, 'tb-section-core', 'Set the main interface colors used across the page, dialogs and buttons.');
  buildSection('Resource Colors', resourceVars, 'tb-section-types', 'Set the accent colors Labby uses for each resource type.');

  const actions = document.createElement('div');
  actions.className = 'tb-actions';
  actions.innerHTML = '<button id="tb-save" class="button" type="button">Save Theme</button>';
  root.appendChild(actions);

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

  if (editingThemeId) {
    const editNameInput = document.getElementById('tb-name');
    const existingTheme = customThemeById(editingThemeId);
    if (editNameInput && existingTheme) editNameInput.value = existingTheme.name || '';
  }

  preview();
}

function moveThemePickerToMobile() {
  const dlg = themePickerDialog || document.getElementById('theme-picker-dialog');
  const body = mobileThemeBody || document.getElementById('mobile-theme-body');
  if (!dlg || !body || themeContentInMobile) return;

  // Keep a marker inside the dialog and move only the real dialog content.
  // v8 used the dialog parent with a dialog child as reference, which throws
  // and prevented Theme from opening on mobile.
  if (!themeDialogPlaceholder.parentNode) dlg.insertBefore(themeDialogPlaceholder, dlg.firstChild);
  let node = themeDialogPlaceholder.nextSibling;
  while (node) {
    const next = node.nextSibling;
    body.appendChild(node);
    node = next;
  }
  themeContentInMobile = true;
}

function restoreThemePickerToDialog() {
  const dlg = themePickerDialog || document.getElementById('theme-picker-dialog');
  const body = mobileThemeBody || document.getElementById('mobile-theme-body');
  if (!dlg || !body || !themeContentInMobile) return;
  while (body.firstChild) dlg.insertBefore(body.firstChild, themeDialogPlaceholder.nextSibling);
  if (themeDialogPlaceholder.parentNode) themeDialogPlaceholder.remove();
  themeContentInMobile = false;
}

function closeMobileThemeView() {
  if (!themeContentInMobile) return;
  clearPreviewTheme();
  editingThemeId = null;
  restoreThemePickerToDialog();
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

  if (isMobile()) {
    if (dlg?.open) dlg.close();
    moveThemePickerToMobile();
    showMobileView('mobile-theme');
    setActiveMobileNav('nav-more');
    return;
  }

  restoreThemePickerToDialog();
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

function setActiveMobileNav(id) {
  document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.toggle('active', b.id === id));
}

function closeMobileMoreSheet() {
  const sheet = document.getElementById('mobile-more-sheet');
  const more = document.getElementById('nav-more');
  if (!sheet) return;
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
  more?.setAttribute('aria-expanded', 'false');
}

function openMobileMoreSheet() {
  const sheet = document.getElementById('mobile-more-sheet');
  const more = document.getElementById('nav-more');
  if (!sheet) return;
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  more?.setAttribute('aria-expanded', 'true');
}

function showMobileView(id) {
  if (id !== 'mobile-theme') closeMobileThemeView();
  if (id !== 'mobile-agent-api') closeMobileAgentApiView();
  closeMobileMoreSheet();
  showRackOverlay(null);
  closeRackPaletteSheet();
  document.querySelectorAll('.mobile-view').forEach(v => v.classList.remove('active'));
  const view = document.getElementById(id);
  if (view) view.classList.add('active');
}

function hideMobileViews() {
  closeMobileThemeView();
  closeMobileAgentApiView();
  closeMobileMoreSheet();
  showRackOverlay(null);
  closeRackPaletteSheet();
  document.querySelectorAll('.mobile-view').forEach(v => v.classList.remove('active'));
  setActiveMobileNav('nav-topology');
}

const navTopology = document.getElementById('nav-topology');
const navAdd = document.getElementById('nav-add');
const navRack = document.getElementById('nav-rack');
const navIp = document.getElementById('nav-ip');
const navMore = document.getElementById('nav-more');
const navTree = document.getElementById('nav-tree');
const navConfig = document.getElementById('nav-config');
const navTheme = document.getElementById('nav-theme');

if (navTopology) {
  navTopology.classList.add('active');
  navTopology.addEventListener('click', () => {
    hideMobileViews();
  });
}

if (navAdd) navAdd.addEventListener('click', () => {
  showMobileView('mobile-add');
  setActiveMobileNav('nav-add');
  document.getElementById('mobile-form-title').textContent = 'Add Resource';
  const body = document.getElementById('mobile-form-body');
  const formEl = document.getElementById('resource-form');
  if (body && formEl && !body.contains(formEl)) body.appendChild(formEl);
  if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
});

if (navIp) navIp.addEventListener('click', () => {
  showMobileView('mobile-ip');
  setActiveMobileNav('nav-ip');
  renderIPViewMobile();
});

if (navRack) navRack.addEventListener('click', () => {
  closeMobileThemeView();
  closeMobileMoreSheet();
  document.querySelectorAll('.mobile-view').forEach(v => v.classList.remove('active'));
  renderRackOverview();
  showRackOverlay('rack-overview');
  setActiveMobileNav('nav-rack');
});

if (navMore) navMore.addEventListener('click', () => {
  const sheet = document.getElementById('mobile-more-sheet');
  sheet?.classList.contains('open') ? closeMobileMoreSheet() : openMobileMoreSheet();
});

document.querySelectorAll('[data-sheet-close]').forEach(btn => {
  btn.addEventListener('click', () => closeMobileMoreSheet());
});

if (navTree) navTree.addEventListener('click', () => {
  showMobileView('mobile-tree');
  setActiveMobileNav('nav-more');
  renderMobileTree();
});

if (navConfig) navConfig.addEventListener('click', () => {
  showMobileView('mobile-config');
  setActiveMobileNav('nav-more');
});

if (navTheme) navTheme.addEventListener('click', () => {
  closeMobileMoreSheet();
  setActiveMobileNav('nav-more');
  openThemePicker({ returnToConfig: false });
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
if (mobileTreeModeGraph) mobileTreeModeGraph.hidden = true;
if (mobileTreeModeTree) mobileTreeModeTree.addEventListener('click', () => {
  treeViewMode = 'tree';
  mobileTreeModeTree.classList.add('active');
  mobileTreeModeGraph.classList.remove('active');
  renderMobileTree();
});
if (mobileTreeModeGraph) mobileTreeModeGraph.addEventListener('click', () => {
  // Graph view is intentionally disabled on mobile. Keep Tree as the only mobile relationship view.
  treeViewMode = 'tree';
  mobileTreeModeTree?.classList.add('active');
  mobileTreeModeGraph.classList.remove('active');
  renderMobileTree();
});

function renderMobileTree() {
  const container = document.getElementById('mobile-tree-content');
  if (!container) return;
  // Mobile Graph is disabled for now; always render the reliable Tree view.
  if (isMobile()) treeViewMode = 'tree';
  mobileTreeModeTree?.classList.add('active');
  mobileTreeModeGraph?.classList.remove('active');
  container.innerHTML = '';
  const shell = document.createElement('div');
  shell.className = 'tree-shell';
  shell.appendChild(buildInfrastructureTree());
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
if (exportBtnMobile) exportBtnMobile.addEventListener('click', async () => {
  const config = await buildConfigExport();
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
    await applyImportedConfig(parsed);
    stopEditing();
    await saveItems();
    showToast('Config imported successfully.');
    render();
    if (typeof renderAgentKeyLists === 'function') renderAgentKeyLists();
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
    setActiveMobileNav('nav-add');
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

document.getElementById('show-tutorial-btn')?.addEventListener('click', openTutorial);
document.getElementById('show-tutorial-btn-mobile')?.addEventListener('click', openTutorial);

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
const rackPalette = document.getElementById('rack-palette');
const rackPaletteBackdrop = document.getElementById('rack-palette-backdrop');
const rackMobilePaletteFab = document.getElementById('rack-mobile-palette-fab');
const rackSelectedComponentPill = document.getElementById('rack-selected-component-pill');
const rackSelectedComponentText = document.getElementById('rack-selected-component-text');
const rackSelectedComponentClear = document.getElementById('rack-selected-component-clear');
// rackFormBack removed — dialog now uses inline close buttons
const phoneGrid         = document.querySelector('.phone-grid');

// ---- Helpers ----
function rackById(id)     { return racks.find(r => r.id === id); }
function locationById(id) { return locations.find(l => l.id === id); }

async function saveRackData() { await saveItemsToAPI(items); }

function showRackOverlay(id) {
  // Only toggle the full-screen overlays — never the form dialog
  [rackOverview, rackEditor].forEach(el => el && el.classList.add('hidden'));
  if (id !== 'rack-editor') closeRackPaletteSheet();
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
    renderRackOverview();
    showRackOverlay('rack-overview');
    if (isMobile()) setActiveMobileNav('nav-rack');
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
  updateRackMobileSide(currentRackMobileSide || 'front');
  closeRackPaletteSheet();
  clearRackComponentSelection();
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

function clearRackComponentSelection() {
  rackDragComponent = null;
  document.querySelectorAll('.rack-palette-item.selected').forEach(el => el.classList.remove('selected'));
  updateRackSelectedComponentUI();
}

function updateRackSelectedComponentUI() {
  if (!rackSelectedComponentPill || !rackSelectedComponentText) return;
  if (!isMobile() || !rackDragComponent || rackDragComponent.fromSlot) {
    rackSelectedComponentPill.classList.add('hidden');
    rackSelectedComponentText.textContent = '';
    return;
  }
  rackSelectedComponentPill.classList.remove('hidden');
  rackSelectedComponentText.textContent = `${rackDragComponent.label} selected · tap an empty rack slot to place it.`;
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
    el.draggable = !isMobile();
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

function placeRackComponentAt(side, u, rack) {
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
  const placed = rackDragComponent;
  saveRackData();
  renderRackDiagram(side);
  if (!placed.isBlank && !placed.isPassive) showLinkPanel(slotKey, side);
  clearRackComponentSelection();
  closeRackPaletteSheet();
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
    placeRackComponentAt(side, u, rack);
  });
  el.addEventListener('click', () => {
    if (!isMobile() || !rackDragComponent) return;
    placeRackComponentAt(side, u, rack);
  });
  return el;
}

function createOccupiedSlot(side, u, comp, slotKey, rack) {
  const el = document.createElement('div');
  const cat = comp.category || (comp.isBlank ? 'filler' : 'compute');
  el.className = `rack-slot occupied cat-${cat}`;
  el.dataset.u    = u;
  el.dataset.side = side;
  el.draggable    = !isMobile();
  // Match the visible rack unit height. On mobile CSS uses taller touch rows,
  // so multi-U components must scale from the same mobile U height as empty rows.
  const uPx = isMobile() ? 44 : Math.max(28, Math.min(42, window.innerHeight * 0.018));
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
  if (isMobile()) {
    panel.style.left = 'max(10px, env(safe-area-inset-left))';
    panel.style.right = 'max(10px, env(safe-area-inset-right))';
    panel.style.width = 'auto';
    panel.style.top = 'auto';
    panel.style.bottom = 'max(12px, env(safe-area-inset-bottom))';
  }

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
  const baseU = isMobile() ? 44 : Math.max(28, Math.min(42, window.innerHeight * 0.018));
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


/* ================================================================
   Mobile UX helpers
   ================================================================ */
let currentRackMobileSide = 'front';

function enhanceMobileCard(node, item) {
  let startX = 0;
  let startY = 0;
  let swiping = false;

  node.addEventListener('click', (event) => {
    if (!isMobile()) return;
    if (event.target.closest('button,a,.card-controls')) return;
    node.classList.toggle('mobile-expanded');
  });

  node.addEventListener('touchstart', (event) => {
    if (!isMobile() || event.touches.length !== 1) return;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    swiping = true;
  }, { passive: true });

  node.addEventListener('touchmove', (event) => {
    if (!swiping || !isMobile() || event.touches.length !== 1) return;
    const dx = event.touches[0].clientX - startX;
    const dy = event.touches[0].clientY - startY;
    if (Math.abs(dx) < 18 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    node.classList.toggle('swipe-edit', dx > 42);
    node.classList.toggle('swipe-delete', dx < -42);
  }, { passive: true });

  node.addEventListener('touchend', (event) => {
    if (!swiping || !isMobile()) return;
    swiping = false;
    const dx = (event.changedTouches?.[0]?.clientX || startX) - startX;
    node.classList.remove('swipe-edit', 'swipe-delete');
    if (Math.abs(dx) < 88) return;
    if (dx > 0) window.startEditingMobile(item.id);
    else removeItem(item.id);
  }, { passive: true });
}

function initMobileFormComfort() {
  // Advanced sections are now always visible inside their dedicated dialog.
  // Keep mobile comfort scrolling only; no collapsible Show details buttons.
  form?.addEventListener('focusin', (event) => {
    if (!isMobile()) return;
    const target = event.target;
    if (!target.matches('input, select, textarea')) return;
    setTimeout(() => target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 160);
  });
}

function updateRackMobileSide(side) {
  currentRackMobileSide = side;
  const frontBtn = document.getElementById('rack-mobile-front');
  const rearBtn = document.getElementById('rack-mobile-rear');
  frontBtn?.classList.toggle('active', side === 'front');
  rearBtn?.classList.toggle('active', side === 'rear');
  document.querySelectorAll('.rack-view-col').forEach((col) => {
    const title = col.querySelector('.rack-view-title')?.textContent?.trim().toLowerCase();
    col.classList.toggle('mobile-active', title === side);
  });
}

function openRackPaletteSheet() {
  if (!isMobile()) return;
  rackPalette?.classList.add('open');
  rackPaletteBackdrop?.classList.add('open');
}

function closeRackPaletteSheet() {
  rackPalette?.classList.remove('open');
  rackPaletteBackdrop?.classList.remove('open');
}

function initMobileRackScrollOverDiagram() {
  const editor = document.getElementById('rack-editor');
  const body = document.querySelector('#rack-editor .rack-editor-body');
  if (!editor || !body || editor.dataset.mobileRackScrollReady === '1') return;
  editor.dataset.mobileRackScrollReady = '1';

  let startX = 0;
  let startY = 0;
  let lastY = 0;
  let manualScroll = false;
  let startedOnRack = false;

  const isInteractive = (target) => !!target.closest('.rack-slot-remove, .rack-mobile-palette-fab, .rack-palette, button, select, input, textarea, a');
  const isRackSurface = (target) => !!target.closest('.rack-frame, .rack-slot, .rack-view-col, .rack-views-wrap');

  editor.addEventListener('touchstart', (event) => {
    if (!isMobile() || event.touches.length !== 1) return;
    if (isInteractive(event.target)) {
      startedOnRack = false;
      return;
    }
    startedOnRack = isRackSurface(event.target);
    if (!startedOnRack) return;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    lastY = startY;
    manualScroll = false;
  }, { passive: true, capture: true });

  editor.addEventListener('touchmove', (event) => {
    if (!isMobile() || event.touches.length !== 1 || !startedOnRack) return;
    if (isInteractive(event.target)) return;
    const touch = event.touches[0];
    const dx = touch.clientX - startX;
    const dyFromStart = touch.clientY - startY;

    if (!manualScroll && Math.abs(dyFromStart) > 6 && Math.abs(dyFromStart) > Math.abs(dx) * 1.05) {
      manualScroll = true;
    }
    if (!manualScroll) return;

    event.preventDefault();
    body.scrollTop += lastY - touch.clientY;
    lastY = touch.clientY;
  }, { passive: false, capture: true });

  editor.addEventListener('touchend', () => {
    startedOnRack = false;
    manualScroll = false;
  }, { passive: true, capture: true });
}

function initMobileRackControls() {
  initMobileRackScrollOverDiagram();
  document.getElementById('rack-mobile-front')?.addEventListener('click', () => updateRackMobileSide('front'));
  document.getElementById('rack-mobile-rear')?.addEventListener('click', () => updateRackMobileSide('rear'));
  document.getElementById('rack-mobile-palette-toggle')?.addEventListener('click', openRackPaletteSheet);
  rackMobilePaletteFab?.addEventListener('click', openRackPaletteSheet);
  document.getElementById('rack-palette-close')?.addEventListener('click', closeRackPaletteSheet);
  rackPaletteBackdrop?.addEventListener('click', closeRackPaletteSheet);
  rackSelectedComponentClear?.addEventListener('click', clearRackComponentSelection);

  rackPalette?.addEventListener('click', (event) => {
    const item = event.target.closest('.rack-palette-item');
    if (!item || !isMobile()) return;
    const def = RACK_COMPONENTS.find(c => c.componentType === item.dataset.componentType) || {};
    rackDragComponent = {
      componentType: item.dataset.componentType,
      heightU: parseInt(item.dataset.heightU || def.heightU || '1', 10),
      label: item.dataset.label || def.label || 'Component',
      category: def.category || 'compute',
      multiDevice: def.multiDevice || null,
      isPDU: !!def.isPDU,
      isBlank: !!def.isBlank,
      isPassive: !!def.isPassive,
      source: 'palette',
    };
    rackPalette.querySelectorAll('.rack-palette-item.selected').forEach(el => el.classList.remove('selected'));
    item.classList.add('selected');
    updateRackSelectedComponentUI();
    showToast('Component selected. Tap an empty rack slot to place it.');
    closeRackPaletteSheet();
  });

  let sideTouchX = 0;
  const rackViews = document.querySelector('.rack-views-wrap');
  rackViews?.addEventListener('touchstart', (event) => {
    if (!isMobile() || event.touches.length !== 1) return;
    sideTouchX = event.touches[0].clientX;
  }, { passive: true });
  rackViews?.addEventListener('touchend', (event) => {
    if (!isMobile()) return;
    const dx = (event.changedTouches?.[0]?.clientX || sideTouchX) - sideTouchX;
    if (Math.abs(dx) < 72) return;
    updateRackMobileSide(dx < 0 ? 'rear' : 'front');
  }, { passive: true });
}

function initMobileDialogSheets() {
  document.querySelectorAll('dialog.tree-dialog:not(.theme-picker-dialog), dialog.rack-form-dialog').forEach((dlg) => {
    if (dlg.querySelector(':scope > .sheet-handle')) return;
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'sheet-handle';
    handle.setAttribute('aria-label', 'Close sheet');
    handle.addEventListener('click', () => dlg.close());
    dlg.prepend(handle);
  });
}

initMobileFormComfort();
initMobileRackControls();
initMobileDialogSheets();
updateRackSelectedComponentUI();

// Theme initialization moved after definitions
try { initTheme(); } catch(e){ console.error(e); }



function getDemoLocations() {
  return [
    {
      id: 'loc-home-lab',
      name: 'Home Lab',
      notes: 'Primary demo location with the main network and compute rack.',
    },
    {
      id: 'loc-backup-room',
      name: 'Backup Room',
      notes: 'Secondary demo location for storage and backup equipment.',
    },
  ];
}

function rackSlot(componentType, heightU, label, category, extra = {}) {
  return {
    componentType,
    heightU,
    label,
    category,
    ...extra,
  };
}

function getDemoRacks() {
  return [
    {
      id: 'rack-main-42u',
      locationId: 'loc-home-lab',
      name: 'Main Rack 42U',
      notes: 'Core networking, virtualization and service hosts.',
      heightUnits: 42,
      formFactor: '19inch',
      slots: {
        'front-1': rackSlot('1u-patch-panel', 1, 'Patch Panel', 'network', { isPassive: true }),
        'front-2': rackSlot('1u-switch', 1, 'Core Switch', 'network', { linkedDeviceId: 'hw-switch' }),
        'front-3': rackSlot('1u-router', 1, 'Gateway Router', 'network', { linkedDeviceId: 'hw-router' }),
        'front-4': rackSlot('1u-cable-mgmt', 1, 'Cable Management', 'network', { isPassive: true }),
        'front-6': rackSlot('2u-server', 2, 'Proxmox Host', 'compute', { linkedDeviceId: 'hw-proxmox' }),
        'front-9': rackSlot('2pc-2u', 2, 'Service VMs', 'compute', { multiDevice: 2, linkedDevices: ['vm-docker', 'vm-monitoring'] }),
        'front-12': rackSlot('2pc-2u', 2, 'Media + DNS', 'compute', { multiDevice: 2, linkedDevices: ['vm-media', 'lxc-dns'] }),
        'front-16': rackSlot('1u-server', 1, 'Reverse Proxy LXC', 'compute', { linkedDeviceId: 'lxc-proxy' }),
        'front-20': rackSlot('2u-ups', 2, 'Rack UPS', 'power'),
        'front-24': rackSlot('1u-blank', 1, 'Blank Panel', 'filler', { isBlank: true }),
        'front-25': rackSlot('2u-blank', 2, 'Blank Panel', 'filler', { isBlank: true }),
        'rear-1': rackSlot('1u-pdu', 1, 'Rear PDU A', 'power', { isPDU: true, pduPorts: 12 }),
        'rear-3': rackSlot('1u-pdu', 1, 'Rear PDU B', 'power', { isPDU: true, pduPorts: 12 }),
        'rear-5': rackSlot('1u-cable-mgmt', 1, 'Rear Cable Management', 'network', { isPassive: true }),
        'rear-8': rackSlot('1u-kvm', 1, 'Rack KVM', 'mgmt'),
      },
    },
    {
      id: 'rack-storage-24u',
      locationId: 'loc-backup-room',
      name: 'Storage Rack 24U',
      notes: 'NAS, backup vault and storage networking.',
      heightUnits: 24,
      formFactor: '19inch',
      slots: {
        'front-1': rackSlot('1u-patch-panel', 1, 'Storage Patch Panel', 'network', { isPassive: true }),
        'front-2': rackSlot('1u-switch', 1, 'Storage Switch', 'network'),
        'front-5': rackSlot('4u-server', 4, 'NAS Main', 'compute', { linkedDeviceId: 'hw-nas' }),
        'front-10': rackSlot('4u-server', 4, 'Backup Vault', 'compute', { linkedDeviceId: 'hw-backup' }),
        'front-16': rackSlot('2u-ups', 2, 'Storage UPS', 'power'),
        'front-20': rackSlot('2u-blank', 2, 'Blank Panel', 'filler', { isBlank: true }),
        'rear-1': rackSlot('1u-pdu', 1, 'Rear PDU', 'power', { isPDU: true, pduPorts: 8 }),
        'rear-4': rackSlot('1u-cable-mgmt', 1, 'Rear Cable Management', 'network', { isPassive: true }),
      },
    },
  ];
}


function getDemoItems() {
  return [
    { id: 'net-core', type: 'network', name: 'Core LAN', description: 'Main management network', notes: 'All infrastructure devices', connections: [], ip: '', ipPort: '', webUrl: '', subnet: '192.168.10.0/24', gateway: '192.168.10.1', networkColor: '#10b981', hostedOn: '', appHostedOn: '', status: '' },
    { id: 'net-services', type: 'network', name: 'Services', description: 'Internal services VLAN', notes: 'Apps and APIs', connections: [], ip: '', ipPort: '', webUrl: '', subnet: '192.168.20.0/24', gateway: '192.168.20.1', networkColor: '#3b82f6', hostedOn: '', appHostedOn: '', status: '' },
    { id: 'net-storage', type: 'network', name: 'Storage', description: 'Storage replication network', notes: 'NAS and backup traffic', connections: [], ip: '', ipPort: '', webUrl: '', subnet: '192.168.40.0/24', gateway: '192.168.40.1', networkColor: '#8b5cf6', hostedOn: '', appHostedOn: '', status: '' },

    { id: 'hw-router', type: 'hardware', hardwareKind: 'router-gateway', manufacturer: 'MikroTik', os: 'RouterOS 7', symbol: '📡', name: 'EdgeRouter-1', description: 'Main internet gateway', notes: 'Fiber uplink, managed by admin', connections: ['hw-switch'], ip: '192.168.10.1/24', webUrl: 'https://192.168.10.1', cpu: '', ram: '', disks: '', cpuCount: '', ramModules: [], diskRows: [], ipPort: '', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: '', switchPorts: '', nasShares: [], nasRaids: [], status: 'online' },
    { id: 'hw-switch', type: 'hardware', hardwareKind: 'switch', manufacturer: 'Ubiquiti', os: 'UniFi 8.4', symbol: '🔀', name: 'Switch-Core-24', description: '24-port managed switch', notes: 'Rack U1, VLAN configured', connections: ['hw-router', 'hw-proxmox', 'hw-nas', 'hw-backup'], ip: '192.168.10.2/24', webUrl: 'https://unifi.ui.com/', cpu: '', ram: '', disks: '', cpuCount: '', ramModules: [], diskRows: [], ipPort: '', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: '', switchPorts: '24', nasShares: [], nasRaids: [], status: 'online' },
    { id: 'hw-proxmox', type: 'hardware', hardwareKind: 'hypervisor', manufacturer: 'Dell', os: 'Proxmox VE 8.2', symbol: '🖥️', name: 'Proxmox-01', description: 'Primary virtualization host', notes: 'Rack U2, 2x NVMe pool', connections: [], ip: '192.168.10.10/24', webUrl: 'https://192.168.10.10:8006', cpu: '16 cores', ram: '2 x 32 DDR5', disks: '2 x 2 TB NVMe', cpuCount: '16', ramModules: [{ size: '32', type: 'DDR5' }, { size: '32', type: 'DDR5' }], diskRows: [{ size: '2 TB', type: 'NVMe' }, { size: '2 TB', type: 'NVMe' }], ipPort: '', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: '', switchPorts: '', nasShares: [], nasRaids: [], status: 'online' },
    { id: 'hw-nas', type: 'hardware', hardwareKind: 'nas', manufacturer: 'Synology', os: 'DSM 7.2', symbol: '🗄️', name: 'NAS-Main', description: 'Primary shared storage', notes: 'Rack U4, SMB + NFS shares', connections: [], ip: '192.168.40.20/24', webUrl: 'https://192.168.40.20:5001', cpu: '8 cores', ram: '2 x 16 DDR4 ECC', disks: '4 x 12 TB HDD', cpuCount: '8', ramModules: [{ size: '16', type: 'DDR4 ECC' }, { size: '16', type: 'DDR4 ECC' }], diskRows: [{ size: '12 TB', type: 'HDD' }, { size: '12 TB', type: 'HDD' }, { size: '12 TB', type: 'HDD' }, { size: '12 TB', type: 'HDD' }], ipPort: '', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: '', switchPorts: '', nasShares: [{ name: 'media', link: '/volume1/media' }, { name: 'backups', link: '/volume1/backups' }], nasRaids: [{ name: 'Array-A', level: 'RAID5', size: '36 TB' }], status: 'online' },
    { id: 'hw-backup', type: 'hardware', hardwareKind: 'backup', manufacturer: 'Supermicro', os: 'TrueNAS SCALE', symbol: '💾', name: 'Backup-Vault', description: 'Offsite backup node', notes: 'Immutable snapshots, Rack U5', connections: [], ip: '192.168.40.30/24', cpu: '8 cores', ram: '4 x 16 DDR4 ECC', disks: '6 x 8 TB HDD', cpuCount: '8', ramModules: [{ size: '16', type: 'DDR4 ECC' }, { size: '16', type: 'DDR4 ECC' }, { size: '16', type: 'DDR4 ECC' }, { size: '16', type: 'DDR4 ECC' }], diskRows: [{ size: '8 TB', type: 'HDD' }, { size: '8 TB', type: 'HDD' }, { size: '8 TB', type: 'HDD' }, { size: '8 TB', type: 'HDD' }, { size: '8 TB', type: 'HDD' }, { size: '8 TB', type: 'HDD' }], ipPort: '', webUrl: '', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: '', switchPorts: '', nasShares: [{ name: 'archive', link: '/mnt/backup/archive' }], nasRaids: [{ name: 'Backup-Pool', level: 'RAIDZ2', size: '32 TB' }], status: 'maintenance' },

    { id: 'vm-docker', type: 'vm', name: 'vm-docker-01', description: 'Docker workloads', notes: 'Compose stacks, main app host', connections: [], ip: '192.168.20.21/24', cpu: '6 vCPU', ram: '2 x 8 DDR5', disks: '2 x 120 GB SSD', cpuCount: '6', ramModules: [{ size: '8', type: 'DDR5' }, { size: '8', type: 'DDR5' }], diskRows: [{ size: '120 GB', type: 'SSD' }, { size: '120 GB', type: 'SSD' }], os: 'Ubuntu 24.04 LTS', ipPort: '', webUrl: '', subnet: '', gateway: '', networkColor: '', hostedOn: 'hw-proxmox', appHostedOn: '', hardwareKind: '', manufacturer: '', switchPorts: '', nasShares: [], nasRaids: [], status: 'online' },
    { id: 'vm-media', type: 'vm', name: 'vm-media-01', description: 'Media processing VM', notes: 'Jellyfin + *arr stack', connections: [], ip: '192.168.20.22/24', cpu: '8 vCPU', ram: '2 x 16 DDR5', disks: '1 x 500 GB SSD', cpuCount: '8', ramModules: [{ size: '16', type: 'DDR5' }, { size: '16', type: 'DDR5' }], diskRows: [{ size: '500 GB', type: 'SSD' }], os: 'Debian 12', ipPort: '', webUrl: '', subnet: '', gateway: '', networkColor: '', hostedOn: 'hw-proxmox', appHostedOn: '', hardwareKind: '', manufacturer: '', switchPorts: '', nasShares: [], nasRaids: [], status: 'online' },
    { id: 'vm-monitoring', type: 'vm', name: 'vm-monitoring', description: 'Metrics and alerting', notes: 'Grafana + Prometheus + Loki', connections: [], ip: '192.168.20.23/24', cpu: '4 vCPU', ram: '2 x 8 DDR5', disks: '1 x 200 GB SSD', cpuCount: '4', ramModules: [{ size: '8', type: 'DDR5' }, { size: '8', type: 'DDR5' }], diskRows: [{ size: '200 GB', type: 'SSD' }], os: 'Ubuntu 22.04 LTS', ipPort: '', webUrl: '', subnet: '', gateway: '', networkColor: '', hostedOn: 'hw-proxmox', appHostedOn: '', hardwareKind: '', manufacturer: '', switchPorts: '', nasShares: [], nasRaids: [], status: 'offline' },

    { id: 'lxc-dns', type: 'lxc', name: 'lxc-dns-01', description: 'DNS resolver', notes: 'AdGuard Home + Unbound', connections: [], ip: '192.168.10.40/24', cpu: '2 vCPU', ram: '2 x 2 DDR5', disks: '1 x 20 GB SSD', cpuCount: '2', ramModules: [{ size: '2', type: 'DDR5' }, { size: '2', type: 'DDR5' }], diskRows: [{ size: '20 GB', type: 'SSD' }], os: 'Debian 12', ipPort: '', webUrl: '', subnet: '', gateway: '', networkColor: '', hostedOn: 'hw-proxmox', appHostedOn: '', hardwareKind: '', manufacturer: '', switchPorts: '', nasShares: [], nasRaids: [], status: 'online' },
    { id: 'lxc-proxy', type: 'lxc', name: 'lxc-proxy-01', description: 'Reverse proxy', notes: 'Nginx Proxy Manager', connections: [], ip: '192.168.20.50/24', cpu: '2 vCPU', ram: '2 x 2 DDR5', disks: '1 x 20 GB SSD', cpuCount: '2', ramModules: [{ size: '2', type: 'DDR5' }, { size: '2', type: 'DDR5' }], diskRows: [{ size: '20 GB', type: 'SSD' }], os: 'Debian 12', ipPort: '', webUrl: '', subnet: '', gateway: '', networkColor: '', hostedOn: 'hw-proxmox', appHostedOn: '', hardwareKind: '', manufacturer: '', switchPorts: '', nasShares: [], nasRaids: [], status: 'online' },

    { id: 'app-jellyfin', type: 'app', name: 'Jellyfin', description: 'Media server', notes: 'Streams from NAS media share', connections: [], ip: '', ipPort: '192.168.20.22:8096', webUrl: 'https://media.home.local', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: 'vm-media', hardwareKind: '', manufacturer: '', os: '', switchPorts: '', nasShares: [], nasRaids: [], status: 'online', symbol: '🎬', cpu: '', ram: '', disks: '', cpuCount: '', ramModules: [], diskRows: '' },
    { id: 'app-grafana', type: 'app', name: 'Grafana', description: 'Metrics dashboard', notes: 'Connected to Prometheus', connections: [], ip: '', ipPort: '192.168.20.23:3000', webUrl: 'https://grafana.home.local', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: 'vm-monitoring', hardwareKind: '', manufacturer: '', os: '', switchPorts: '', nasShares: [], nasRaids: [], status: 'offline', symbol: '📊', cpu: '', ram: '', disks: '', cpuCount: '', ramModules: [], diskRows: '' },
    { id: 'app-portainer', type: 'app', name: 'Portainer', description: 'Docker management UI', notes: 'Manages vm-docker-01 containers', connections: [], ip: '', ipPort: '192.168.20.21:9000', webUrl: 'https://portainer.home.local', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: 'vm-docker', hardwareKind: '', manufacturer: '', os: '', switchPorts: '', nasShares: [], nasRaids: [], status: 'online', symbol: '🐳', cpu: '', ram: '', disks: '', cpuCount: '', ramModules: [], diskRows: '' },
    { id: 'app-adguard', type: 'app', name: 'AdGuard Home', description: 'DNS ad blocker', notes: 'Network-wide ad blocking', connections: [], ip: '', ipPort: '192.168.10.40:3000', webUrl: 'https://adguard.home.local', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: 'lxc-dns', hardwareKind: '', manufacturer: '', os: '', switchPorts: '', nasShares: [], nasRaids: [], status: 'online', symbol: '🛡️', cpu: '', ram: '', disks: '', cpuCount: '', ramModules: [], diskRows: '' },
    { id: 'app-npm', type: 'app', name: 'Nginx Proxy Manager', description: 'Reverse proxy UI', notes: 'SSL termination for all services', connections: [], ip: '', ipPort: '192.168.20.50:81', webUrl: 'https://proxy.home.local', subnet: '', gateway: '', networkColor: '', hostedOn: '', appHostedOn: 'lxc-proxy', hardwareKind: '', manufacturer: '', os: '', switchPorts: '', nasShares: [], nasRaids: [], status: 'online', symbol: '🔒', cpu: '', ram: '', disks: '', cpuCount: '', ramModules: [], diskRows: '' },
  ];
}


function initDemoBannerMarquee() {
  const banner = document.querySelector('.demo-banner');
  const track = document.querySelector('.demo-banner-track');
  const message = document.querySelector('.demo-banner-message:not(.demo-banner-message-clone)');
  if (!banner || !track || !message) return;

  const update = () => {
    banner.classList.remove('is-scrolling');
    track.style.removeProperty('--demo-marquee-duration');
    // Wait one frame so measurements are taken without the animation clone affecting layout.
    requestAnimationFrame(() => {
      const overflow = message.scrollWidth > banner.clientWidth - 8;
      banner.classList.toggle('is-scrolling', overflow);
      if (overflow) {
        const distance = Math.max(message.scrollWidth, banner.clientWidth);
        const seconds = Math.min(28, Math.max(10, distance / 42));
        track.style.setProperty('--demo-marquee-duration', `${seconds}s`);
      }
    });
  };

  update();
  window.addEventListener('resize', update, { passive: true });
  if ('ResizeObserver' in window) {
    new ResizeObserver(update).observe(banner);
  }
}

initDemoBannerMarquee();


