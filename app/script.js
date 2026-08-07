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
const networkPortsWrap = document.getElementById('network-ports-wrap');
const networkPorts = document.getElementById('network-ports');
const addNetworkPortBtn = document.getElementById('add-network-port');
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
const cliPaste = document.getElementById('cli-paste');
const cliSudoPassword = document.getElementById('cli-sudo-password');
const cliCtrlC = document.getElementById('cli-ctrl-c');
const cliClearKey = document.getElementById('cli-clear-key');
const cliClose = document.getElementById('cli-close');
const mobileCliView = document.getElementById('mobile-cli');
const mobileCliTitle = document.getElementById('mobile-cli-title');
const mobileCliSubtitle = document.getElementById('mobile-cli-subtitle');
const mobileCliTerminal = document.getElementById('mobile-cli-terminal');
const mobileCliInput = document.getElementById('mobile-cli-input');
const mobileCliSend = document.getElementById('mobile-cli-send');
const mobileCliCopy = document.getElementById('mobile-cli-copy');
const mobileCliPaste = document.getElementById('mobile-cli-paste');
const mobileCliSudoPassword = document.getElementById('mobile-cli-sudo-password');
const mobileCliCtrlC = document.getElementById('mobile-cli-ctrl-c');
const mobileCliClearKey = document.getElementById('mobile-cli-clear-key');
const mobileCliClose = document.getElementById('mobile-cli-close');
const cliCommandSearch = document.getElementById('cli-command-search');
const cliCommandList = document.getElementById('cli-command-list');
const cliCommandAdd = document.getElementById('cli-command-add');
const cliCommandEdit = document.getElementById('cli-command-edit');
const cliCommandDialog = document.getElementById('cli-command-dialog');
const cliCommandDialogTitle = document.getElementById('cli-command-dialog-title');
const cliCommandName = document.getElementById('cli-command-name');
const cliCommandBody = document.getElementById('cli-command-body');
const cliCommandDescription = document.getElementById('cli-command-description');
const cliCommandCopy = document.getElementById('cli-command-copy');
const cliCommandSave = document.getElementById('cli-command-save');
const cliCommandCancel = document.getElementById('cli-command-cancel');

let cliSession = null;
let cliPollTimer = null;
let cliActiveItem = null;
const cliHistoryStore = new Map();
let cliHistoryScope = 'default';
let cliHistoryCursor = 0;
let cliHistoryDraft = '';
let cliRemoteHistoryLoadedFor = '';
let cliTerminalState = createCliTerminalState();
let cliXtermInstances = new Map();
let cliXtermOutputBuffer = '';
let cliXtermPreferred = false;
let cliPlainOutputBuffer = '';
let cliRemoteHistoryPromise = null;

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
let commandSnippets = [];
let selectedCommandSnippetId = null;
let editingCommandSnippetId = null;
let toastTimer = null;
let treeViewMode = 'tree';
let lastTypeSelection = typeSelect.value;
let lastHardwareKindSelection = hardwareKindSelect.value;
let pollingInterval = null;
let liveStatusData = {}; // Store live status data { itemId: { ipStatus: 'online'|'offline', urlStatus: 'online'|'offline' } }
let importedAgentKeysForSave = null;
let importedBackupConfigForSave = null;
let importedBackupLogsForSave = null;
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

const publicDemoMode = typeof DEMO_INTERACTIVE_SECURITY_DISABLED !== 'undefined' && DEMO_INTERACTIVE_SECURITY_DISABLED;
const publicDemoSeedVersion = 6;

function createPublicDemoSeed() {
  const base = (id, type, name, extra = {}) => ({
    id,
    type,
    hardwareKind: '',
    manufacturer: '',
    os: '',
    symbol: '',
    name,
    status: 'online',
    description: '',
    notes: '',
    credentials: null,
    connections: [],
    ip: '',
    networkPorts: [],
    cpu: '',
    ram: '',
    disks: '',
    cpuCount: '',
    ramModules: [],
    diskRows: [],
    ipPort: '',
    webUrl: '',
    subnet: '',
    gateway: '',
    networkColor: '',
    hostedOn: '',
    virtualHostedOn: '',
    appHostedOn: '',
    switchPorts: '',
    nasShares: [],
    nasRaids: [],
    ipStatus: 'online',
    urlStatus: '',
    ...extra,
  });

  const items = [
    base('demo-router', 'hardware', 'Edge Gateway', {
      hardwareKind: 'router-gateway', manufacturer: 'Ubiquiti', os: 'UniFi OS', symbol: '🛡️', ip: '192.168.10.1',
      description: 'Main firewall and inter-VLAN gateway', switchPorts: '8', connections: ['demo-core-switch'], webUrl: 'https://192.168.10.1', urlStatus: 'online',
    }),
    base('demo-core-switch', 'hardware', 'Core Switch', {
      hardwareKind: 'switch', manufacturer: 'Ubiquiti', symbol: '🔀', ip: '192.168.10.2', description: '24-port managed core switch', switchPorts: '24',
      connections: ['demo-proxmox-1', 'demo-proxmox-2', 'demo-nas', 'demo-backup', 'demo-admin-pc'],
    }),
    base('demo-proxmox-1', 'hardware', 'Proxmox Node 1', {
      hardwareKind: 'hypervisor', manufacturer: 'Dell', os: 'Proxmox VE', symbol: '🧱', ip: '192.168.20.10', networkPorts: [{ ip: '192.168.20.10', speed: '1g' }, { ip: '192.168.10.10', speed: '10g' }], cpu: '16 CPUs', ram: '64 GB DDR4', disks: '2 TB NVMe', cpuCount: '16',
      ramModules: [{ size: '32', type: 'DDR4' }, { size: '32', type: 'DDR4' }], diskRows: [{ size: '2 TB', type: 'NVMe' }], description: 'Primary virtualization host',
    }),
    base('demo-proxmox-2', 'hardware', 'Proxmox Node 2', {
      hardwareKind: 'hypervisor', manufacturer: 'HP', os: 'Proxmox VE', symbol: '🧱', ip: '192.168.20.11', networkPorts: [{ ip: '192.168.20.11', speed: '1g' }, { ip: '192.168.10.11', speed: '10g' }], cpu: '12 CPUs', ram: '48 GB DDR4', disks: '2 TB SSD', cpuCount: '12',
      ramModules: [{ size: '16', type: 'DDR4' }, { size: '16', type: 'DDR4' }, { size: '16', type: 'DDR4' }], diskRows: [{ size: '2 TB', type: 'SSD' }], description: 'Secondary virtualization host',
    }),
    base('demo-nas', 'hardware', 'Storage NAS', {
      hardwareKind: 'nas', manufacturer: 'Synology', os: 'DSM', symbol: '🗄️', ip: '192.168.20.20', networkPorts: [{ ip: '192.168.20.20', speed: '2.5g' }, { ip: '192.168.10.20', speed: '10g' }], description: 'Shared storage and media library',
      nasShares: [{ name: 'Backups', link: 'smb://192.168.20.20/Backups' }, { name: 'Media', link: 'smb://192.168.20.20/Media' }],
      nasRaids: [{ name: 'Main Pool', level: 'RAID5', size: '24 TB' }],
    }),
    base('demo-backup', 'hardware', 'Backup Server', {
      hardwareKind: 'backup', manufacturer: 'Supermicro', os: 'Proxmox Backup Server', symbol: '📦', ip: '192.168.20.14', description: 'Encrypted VM and container backups',
    }),
    base('demo-admin-pc', 'hardware', 'Admin Workstation', {
      hardwareKind: 'pc', manufacturer: 'Lenovo', os: 'Windows 11', symbol: '🖥️', ip: '192.168.30.50', description: 'Homelab administration workstation',
    }),

    base('demo-vm-dc', 'vm', 'Domain Controller', { os: 'Windows Server 2025', symbol: '🏢', ip: '192.168.20.100', hostedOn: 'demo-proxmox-1', cpu: '4 CPUs', ram: '8 GB DDR4', disks: '120 GB SSD', cpuCount: '4', description: 'DNS and directory services' }),
    base('demo-vm-monitoring', 'vm', 'Monitoring VM', { os: 'Debian 13', symbol: '📊', ip: '192.168.20.101', hostedOn: 'demo-proxmox-1', cpu: '4 CPUs', ram: '8 GB DDR4', disks: '100 GB SSD', cpuCount: '4', description: 'Metrics and dashboards' }),
    base('demo-vm-docker', 'vm', 'Docker Host', { os: 'Ubuntu Server', symbol: '🐳', ip: '192.168.20.102', hostedOn: 'demo-proxmox-2', cpu: '8 CPUs', ram: '16 GB DDR4', disks: '250 GB SSD', cpuCount: '8', description: 'General container workloads' }),
    base('demo-vm-nested-proxmox', 'vm', 'Nested Proxmox', { os: 'Proxmox VE', symbol: '🧱', ip: '192.168.20.103', hostedOn: 'demo-proxmox-2', cpu: '4 CPUs', ram: '12 GB DDR4', disks: '160 GB SSD', cpuCount: '4', description: 'Nested virtualization host for lab workloads' }),
    base('demo-lxc-nested-lab', 'lxc', 'Nested Lab LXC', { os: 'Debian 13', symbol: '📦', ip: '192.168.20.114', virtualHostedOn: 'demo-vm-nested-proxmox', cpu: '2 CPUs', ram: '2 GB DDR4', disks: '20 GB SSD', cpuCount: '2', description: 'LXC hosted by the nested Proxmox VM' }),
    base('demo-lxc-adguard', 'lxc', 'AdGuard', { os: 'Debian 13', symbol: '🛡️', ip: '192.168.20.110', hostedOn: 'demo-proxmox-1', cpu: '2 CPUs', ram: '2 GB DDR4', disks: '16 GB SSD', cpuCount: '2', description: 'Network-wide DNS filtering' }),
    base('demo-lxc-nginx', 'lxc', 'Nginx Proxy Manager', { os: 'Debian 13', symbol: '🌐', ip: '192.168.20.111', hostedOn: 'demo-proxmox-2', cpu: '2 CPUs', ram: '2 GB DDR4', disks: '20 GB SSD', cpuCount: '2', description: 'Reverse proxy and certificates' }),
    base('demo-lxc-cloudflared', 'lxc', 'Cloudflare Tunnel', { os: 'Debian 13', symbol: '☁️', ip: '192.168.20.112', hostedOn: 'demo-proxmox-2', cpu: '1 CPUs', ram: '1 GB DDR4', disks: '8 GB SSD', cpuCount: '1', description: 'Secure external tunnel' }),
    base('demo-lxc-labby', 'lxc', 'Labby', { os: 'Debian 13', symbol: '🗺️', ip: '192.168.20.113', hostedOn: 'demo-proxmox-2', cpu: '2 CPUs', ram: '2 GB DDR4', disks: '20 GB SSD', cpuCount: '2', description: 'Homelab documentation platform' }),

    base('demo-app-grafana', 'app', 'Grafana', { symbol: '📈', ipPort: '192.168.20.101:3000', webUrl: 'https://grafana.lab.example', appHostedOn: 'demo-vm-monitoring', description: 'Infrastructure dashboards', urlStatus: 'online' }),
    base('demo-app-prometheus', 'app', 'Prometheus', { symbol: '🔥', ipPort: '192.168.20.101:9090', webUrl: 'http://192.168.20.101:9090', appHostedOn: 'demo-vm-monitoring', description: 'Metrics collection', urlStatus: 'online' }),
    base('demo-app-portainer', 'app', 'Portainer', { symbol: '🐳', ipPort: '192.168.20.102:9443', webUrl: 'https://portainer.lab.example', appHostedOn: 'demo-vm-docker', description: 'Container management', urlStatus: 'online' }),
    base('demo-app-homepage', 'app', 'Homepage', { symbol: '🏠', ipPort: '192.168.20.102:3001', webUrl: 'https://home.lab.example', appHostedOn: 'demo-vm-docker', description: 'Service dashboard', urlStatus: 'online' }),
    base('demo-app-uptime', 'app', 'Uptime Kuma', { symbol: '💓', ipPort: '192.168.20.102:3002', webUrl: 'https://status.lab.example', appHostedOn: 'demo-vm-docker', description: 'Availability monitoring', urlStatus: 'online' }),
    base('demo-app-jellyfin', 'app', 'Jellyfin', { symbol: '🎬', ipPort: '192.168.20.102:8096', webUrl: 'https://media.lab.example', appHostedOn: 'demo-vm-docker', description: 'Media streaming', urlStatus: 'online' }),
    base('demo-app-adguard', 'app', 'AdGuard Home', { symbol: '🧹', ipPort: '192.168.20.110:3000', webUrl: 'https://dns.lab.example', appHostedOn: 'demo-lxc-adguard', description: 'DNS filtering interface', urlStatus: 'online' }),
    base('demo-app-nginx', 'app', 'Proxy Manager', { symbol: '🔐', ipPort: '192.168.20.111:81', webUrl: 'https://proxy.lab.example', appHostedOn: 'demo-lxc-nginx', description: 'Proxy host management', urlStatus: 'online' }),
    base('demo-app-tunnel', 'app', 'Cloudflare Connector', { symbol: '☁️', ipPort: '192.168.20.112:2000', webUrl: 'https://dash.cloudflare.com', appHostedOn: 'demo-lxc-cloudflared', description: 'Tunnel connector', urlStatus: 'online' }),
    base('demo-app-labby', 'app', 'Labby Web App', { symbol: '🗺️', ipPort: '192.168.20.113:8080', webUrl: 'https://my-labby.com/demo/', appHostedOn: 'demo-lxc-labby', description: 'Interactive Labby demo', urlStatus: 'online' }),

    base('demo-network-management', 'network', 'Management', { symbol: '🔵', subnet: '192.168.10.0/24', gateway: '192.168.10.1', networkColor: networkPalette[0], description: 'Network infrastructure management' }),
    base('demo-network-servers', 'network', 'Servers', { symbol: '🟢', subnet: '192.168.20.0/24', gateway: '192.168.20.1', networkColor: networkPalette[1], description: 'Servers, VMs and containers' }),
    base('demo-network-clients', 'network', 'Clients', { symbol: '🟣', subnet: '192.168.30.0/24', gateway: '192.168.30.1', networkColor: networkPalette[7], description: 'Trusted client devices' }),
    base('demo-network-guest', 'network', 'Guest Wi-Fi', { symbol: '🟠', subnet: '192.168.40.0/24', gateway: '192.168.40.1', networkColor: networkPalette[3], description: 'Isolated guest access' }),
  ];

  const locations = [{
    id: 'demo-location-lab',
    name: 'Demo Lab',
    address: 'Basement server room',
    notes: 'Example location included with the public demo.',
  }];

  const racks = [{
    id: 'demo-rack-main',
    name: 'Main Rack',
    notes: 'Example populated 12U rack.',
    heightUnits: 12,
    formFactor: '19inch',
    locationId: 'demo-location-lab',
    slots: {
      'front-1': { componentType: '1u-router', heightU: 1, label: '1U Router', category: 'network', linkedDeviceId: 'demo-router' },
      'front-2': { componentType: '1u-cable-mgmt', heightU: 1, label: '1U Cable Mgmt', category: 'network', isPassive: true },
      'front-3': { componentType: '1u-switch', heightU: 1, label: '1U Switch', category: 'network', linkedDeviceId: 'demo-core-switch' },
      'front-4': { componentType: '2pc-2u', heightU: 2, label: '2x PC (2U)', category: 'compute', multiDevice: 2, linkedDevices: ['demo-proxmox-1', 'demo-proxmox-2'] },
      'front-6': { componentType: '2u-server', heightU: 2, label: '2U Server', category: 'compute', linkedDeviceId: 'demo-nas' },
      'front-8': { componentType: '1u-server', heightU: 1, label: '1U Server', category: 'compute', linkedDeviceId: 'demo-backup' },
      'front-9': { componentType: '2u-ups', heightU: 2, label: '2U UPS', category: 'power' },
      'front-11': { componentType: '1u-kvm', heightU: 1, label: '1U KVM', category: 'mgmt' },
      'front-12': { componentType: '1u-blank', heightU: 1, label: '1U Blank', category: 'filler', isBlank: true },
      'rear-1': { componentType: '1u-pdu', heightU: 1, label: '1U PDU', category: 'power', isPDU: true, pduPorts: 8, pduLinks: [] },
      'rear-2': {
        componentType: '1u-patch-panel', heightU: 1, label: '1U Patch Panel', category: 'network',
        patchPanelPorts: 24,
        patchPanelLinks: { 0: 'demo-proxmox-1', 1: 'demo-proxmox-2', 2: 'demo-nas', 3: 'demo-backup', 4: 'demo-admin-pc' },
      },
    },
  }];

  return { items, locations, racks, agentStatus: {}, agentKeys: [], commandSnippets: [], backupConfig: null, backupLogs: [] };
}

function mergePublicDemoSeed(existing) {
  const seed = createPublicDemoSeed();
  const current = existing && typeof existing === 'object' && !Array.isArray(existing)
    ? existing
    : { items: Array.isArray(existing) ? existing : [], locations: [], racks: [] };

  const mergeById = (currentList, seedList) => {
    const result = Array.isArray(currentList) ? [...currentList] : [];
    const known = new Set(result.map((entry) => entry?.id).filter(Boolean));
    seedList.forEach((entry) => {
      if (!known.has(entry.id)) result.push(entry);
    });
    return result;
  };

  const mergedItems = mergeById(current.items, seed.items);
  const demoNetworkPortIds = new Set(['demo-proxmox-1', 'demo-proxmox-2', 'demo-nas']);
  mergedItems.forEach((item) => {
    if (!demoNetworkPortIds.has(item.id) || Array.isArray(item.networkPorts) && item.networkPorts.length) return;
    const seeded = seed.items.find((entry) => entry.id === item.id);
    if (seeded?.networkPorts?.length) item.networkPorts = seeded.networkPorts.map((port) => ({ ...port }));
  });

  const mergedRacks = mergeById(current.racks, seed.racks);
  const demoRack = mergedRacks.find((rack) => rack.id === 'demo-rack-main');
  if (demoRack && (!demoRack.slots || Object.keys(demoRack.slots).length === 0)) {
    demoRack.slots = seed.racks[0].slots;
  }
  const demoPatchPanel = demoRack?.slots?.['rear-2'];
  if (demoPatchPanel?.componentType === '1u-patch-panel' && demoPatchPanel.isPassive === true && !demoPatchPanel.patchPanelPorts) {
    demoRack.slots['rear-2'] = { ...seed.racks[0].slots['rear-2'] };
  }

  return {
    items: mergedItems,
    locations: mergeById(current.locations, seed.locations),
    racks: mergedRacks,
    agentStatus: current.agentStatus && typeof current.agentStatus === 'object' ? current.agentStatus : {},
    agentKeys: Array.isArray(current.agentKeys) ? current.agentKeys : [],
    commandSnippets: Array.isArray(current.commandSnippets) ? current.commandSnippets : [],
    backupConfig: current.backupConfig && typeof current.backupConfig === 'object' ? current.backupConfig : null,
    backupLogs: Array.isArray(current.backupLogs) ? current.backupLogs : [],
    demoSeedVersion: publicDemoSeedVersion,
  };
}

async function loadItemsFromAPI() {
  if (publicDemoMode) {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      const merged = mergePublicDemoSeed(parsed);
      localStorage.setItem(storageKey, JSON.stringify(merged));
      return merged;
    } catch {
      const seed = createPublicDemoSeed();
      try { localStorage.setItem(storageKey, JSON.stringify({ ...seed, demoSeedVersion: publicDemoSeedVersion })); } catch {}
      return seed;
    }
  }

  try {
    const res = await fetch(`${API_BASE}/api/data`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      // Legacy: bare array
      return { items: data, locations: [], racks: [], agentStatus: {}, agentKeys: [], commandSnippets: [], backupConfig: null, backupLogs: [] };
    }
    return {
      items: Array.isArray(data.items) ? data.items : [],
      locations: Array.isArray(data.locations) ? data.locations : [],
      racks: Array.isArray(data.racks) ? data.racks : [],
      agentStatus: data.agentStatus && typeof data.agentStatus === 'object' ? data.agentStatus : {},
      agentKeys: Array.isArray(data.agentKeys) ? data.agentKeys : [],
      commandSnippets: Array.isArray(data.commandSnippets) ? data.commandSnippets : [],
      backupConfig: data.backupConfig && typeof data.backupConfig === 'object' ? data.backupConfig : null,
      backupLogs: Array.isArray(data.backupLogs) ? data.backupLogs : [],
    };
  } catch (err) {
    console.warn('Labby: API not reachable, falling back to localStorage.', err);
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const lsItems = Array.isArray(parsed) ? parsed : (parsed.items || []);
      const lsLocations = Array.isArray(parsed) ? [] : (parsed.locations || []);
      const lsRacks = Array.isArray(parsed) ? [] : (parsed.racks || []);
      return { items: lsItems, locations: lsLocations, racks: lsRacks, agentStatus: parsed.agentStatus || {}, commandSnippets: Array.isArray(parsed.commandSnippets) ? parsed.commandSnippets : [], backupConfig: parsed.backupConfig && typeof parsed.backupConfig === 'object' ? parsed.backupConfig : null, backupLogs: Array.isArray(parsed.backupLogs) ? parsed.backupLogs : [] };
    } catch {
      return { items: [], locations: [], racks: [], agentStatus: {}, agentKeys: [], commandSnippets: [], backupConfig: null, backupLogs: [] };
    }
  }
}

async function saveItemsToAPI(itemList) {
  const payload = {
    items: itemList,
    locations: locations,
    racks: racks,
    agentStatus: liveStatusData,
    commandSnippets: commandSnippets,
  };
  if (Array.isArray(importedAgentKeysForSave)) payload.agentKeys = importedAgentKeysForSave;
  if (importedBackupConfigForSave && typeof importedBackupConfigForSave === 'object') payload.backupConfig = importedBackupConfigForSave;
  if (Array.isArray(importedBackupLogsForSave)) payload.backupLogs = importedBackupLogsForSave;

  if (publicDemoMode) {
    try { localStorage.setItem(storageKey, JSON.stringify({ ...payload, demoSeedVersion: publicDemoSeedVersion })); } catch {}
    importedAgentKeysForSave = null;
    importedBackupConfigForSave = null;
    importedBackupLogsForSave = null;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (Array.isArray(importedAgentKeysForSave)) importedAgentKeysForSave = null;
    importedBackupConfigForSave = null;
    importedBackupLogsForSave = null;
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
initAdvancedResourceSettings();
// initTheme moved to end

applyTypeVisibility();

(async () => {
  const loaded = await loadItemsFromAPI();
  items = sanitizeItems(loaded.items);
  locations = loaded.locations || [];
  racks = loaded.racks || [];
  liveStatusData = loaded.agentStatus || {};
  commandSnippets = normalizeCommandSnippets(loaded.commandSnippets || []);
  renderCommandSnippets();
  initAgentApiPanel();
  render();
  startPolling();

  if (publicDemoMode) {
    ['seed-demo', 'seed-demo-mobile'].forEach((id) => {
      document.getElementById(id)?.addEventListener('click', async () => {
        const seed = createPublicDemoSeed();
        items = sanitizeItems(seed.items);
        locations = seed.locations;
        racks = seed.racks;
        liveStatusData = {};
        commandSnippets = [];
        await saveItemsToAPI(items);
        renderCommandSnippets();
        render();
        showToast('Demo data restored.');
      });
    });
  }
})();

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
hostedOnSelect.addEventListener('change', () => syncHostingSelectors('hardware'));
appHostedOnSelect.addEventListener('change', () => syncHostingSelectors('virtual'));
ipInput.addEventListener('input', () => {
  syncPrimaryNetworkPortFromIp();
  applyTypeVisibility();
});
webUrlInput.addEventListener('input', applyTypeVisibility);
hardwareWebUrlInput.addEventListener('input', applyTypeVisibility);
ipPortInput.addEventListener('input', applyTypeVisibility);
addShareBtn.addEventListener('click', () => appendShareRow());
addRamModuleBtn.addEventListener('click', () => appendRamModuleRow());
addDiskBtn.addEventListener('click', () => appendDiskRow());
addRaidBtn.addEventListener('click', () => appendRaidRow());
if (addNetworkPortBtn) addNetworkPortBtn.addEventListener('click', () => appendNetworkPortRow());
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



document.addEventListener('change', (event) => {
  if (event.target?.id === 'credential-auth-method') updateCredentialAuthVisibility();
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
  input.addEventListener('input', () => {
    cliHistoryCursor = cliHistory().length;
    cliHistoryDraft = input.value || '';
    autosizeCliInput(input);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      loadCliHistoryIntoInput(-1);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      loadCliHistoryIntoInput(1);
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      completeCliInputFromRemote(input);
      return;
    }
    if (event.key !== 'Enter') return;
    if (event.shiftKey) {
      window.setTimeout(() => autosizeCliInput(input), 0);
      return;
    }
    event.preventDefault();
    sendCliInput();
  });
});



document.addEventListener('keydown', (event) => {
  if (!isCliVisible()) return;
  const terminal = activeCliEls()?.terminal;
  if (!terminal || document.activeElement !== terminal) return;
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    event.stopPropagation();
    const input = activeCliInput();
    input?.focus();
    loadCliHistoryIntoInput(event.key === 'ArrowUp' ? -1 : 1);
  }
}, true);

[cliClearKey, mobileCliClearKey].filter(Boolean).forEach((btn) => btn.addEventListener('click', clearCliKnownHostAndReconnect));
[cliCopy, mobileCliCopy].filter(Boolean).forEach((btn) => btn.addEventListener('click', copyCliOutput));
[cliPaste, mobileCliPaste].filter(Boolean).forEach((btn) => btn.addEventListener('click', pasteClipboardToCliInput));
[cliSudoPassword, mobileCliSudoPassword].filter(Boolean).forEach((btn) => btn.addEventListener('click', pasteSudoPasswordToCli));
[cliCtrlC, mobileCliCtrlC].filter(Boolean).forEach((btn) => btn.addEventListener('click', () => sendCliShortcut('ctrl-c')));
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
  const networkPortList = getNetworkPorts(ip);
  const cpuCount = cpuCountSelect.value.trim();
  const ramModuleList = getRamModules();
  const diskRows = getDiskRows();
  const ipPort = ipPortInput.value.trim();
  const webUrl = webUrlInput.value.trim();
  const hardwareWebUrl = (document.getElementById('hardware-web-url') ? document.getElementById('hardware-web-url').value.trim() : '') || hardwareWebUrlInput.value.trim();
  const hostedOn = hostedOnSelect.value || '';
  const virtualHostedOn = appHostedOnSelect.value || '';
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
    networkPorts: ['hardware', 'vm', 'lxc'].includes(type) ? networkPortList : [],
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
    hostedOn: ['vm', 'lxc'].includes(type) && !virtualHostedOn ? hostedOn : '',
    virtualHostedOn: ['vm', 'lxc'].includes(type) ? virtualHostedOn : '',
    appHostedOn: type === 'app' ? virtualHostedOn : '',
    switchPorts: type === 'hardware' && ['router-gateway', 'switch'].includes(hardwareKind) ? switchPorts : '',
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
  if (['hardware', 'vm', 'lxc'].includes(item.type)) {
    resourceNetworkPorts(item).forEach((networkPort, index) => {
      const addr = String(networkPort.ip || '').split('/')[0].trim();
      if (addr) ips.push({ addr, port: null, item, networkPortIndex: index, speed: networkPort.speed || '' });
    });
  } else if (item.ip) {
    ips.push({ addr: item.ip.split('/')[0].trim(), port: null, item });
  }
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
  const resourceType = entry.item.type === 'hardware'
    ? hardwareTypeLabel(entry.item.hardwareKind)
    : labelSingle(entry.item.type);
  const portMeta = Number.isInteger(entry.networkPortIndex)
    ? ` · Port ${entry.networkPortIndex + 1}${entry.speed ? ` · ${networkPortSpeedLabel(entry.speed)}` : ''}`
    : '';
  typeEl.textContent = `${resourceType}${portMeta}`;
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
    renderCommandSnippets();
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

// ── Backup Config UI ───────────────────────────────────────────────────────
const backupConfigDialog = document.getElementById('backup-config-dialog');
const backupConfigBtn = document.getElementById('backup-config-btn');
const backupConfigBtnMobile = document.getElementById('backup-config-btn-mobile');
const backupConfigClose = document.getElementById('backup-config-close');
const backupConfigCloseMobile = document.getElementById('mobile-backup-config-close');
const publicDemoBackupsDisabled = publicDemoMode;
let backupConfigReturnToConfig = false;
let lastBackupStatus = null;

function weekdayLabel(value) {
  return ({ '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday' })[String(value)] || 'Monday';
}

function formatBackupDate(value) {
  if (!value) return 'Never';
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function describeBackupSchedule(cfg) {
  if (!cfg?.enabled) return 'Scheduled backups are disabled.';
  if (cfg.frequency === 'hourly') return `Runs hourly at minute ${String(cfg.time || '00:00').slice(3, 5)}.`;
  if (cfg.frequency === 'weekly') return `Runs weekly on ${weekdayLabel(cfg.weekday)} at ${cfg.time || '02:00'}.`;
  return `Runs daily at ${cfg.time || '02:00'}.`;
}

function demoBackupStatus() {
  return {
    demoMode: true,
    config: {
      enabled: false,
      frequency: 'daily',
      time: '02:00',
      weekday: '1',
      target: 'smb',
      maxBackups: 10,
      smbServer: 'nas.example.local',
      smbShare: 'Backups',
      smbFolder: 'Labby',
      smbUsername: 'labby-backup',
      smbDomain: '',
      smbPort: 445,
      smbEncrypt: true,
      smbGuest: false,
      smbPasswordConfigured: false,
      lastRunAt: null,
    },
    targets: {
      local: { label: 'Local demo storage (disabled)', path: '/data/backups', available: false, configured: true },
      smb: { label: 'Direct SMB (self-host only)', path: 'smb://nas.example.local:445/Backups/Labby', available: false, configured: false, passwordConfigured: false, error: 'Demo preview only.' },
    },
    backups: [],
    logs: [{ level: 'info', at: new Date().toISOString(), message: 'Demo mode: direct SMB backup configuration is shown as a read-only preview. Self-host Labby to test, run, restore or delete backups.' }],
  };
}

async function fetchBackupStatus() {
  if (publicDemoBackupsDisabled) {
    lastBackupStatus = demoBackupStatus();
    return lastBackupStatus;
  }
  const res = await fetch(`${API_BASE}/api/backups/status`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  lastBackupStatus = await res.json();
  return lastBackupStatus;
}

function backupPanelHtml(status) {
  const cfg = status?.config || {};
  const isDemoBackup = !!status?.demoMode;
  const disabledAttr = isDemoBackup ? ' disabled' : '';
  const demoNotice = isDemoBackup ? '<p class="note backup-demo-notice">Demo mode: Backup Config is visible here, but direct SMB tests, backup runs, restore and delete are available only in the self-hosted version.</p>' : '';
  const targets = status?.targets || {};
  const currentTarget = cfg.target === 'smb' ? 'smb' : 'local';
  const smb = targets.smb || {};
  const smbState = smb.available ? 'Connected' : (smb.configured ? 'Configured, but not reachable' : 'Not configured');
  const passwordHint = cfg.smbPasswordConfigured || smb.passwordConfigured
    ? 'Password is saved encrypted. Leave this empty to keep it.'
    : 'Enter the password for the SMB account.';
  const frequency = cfg.frequency || 'daily';
  const configuredTime = String(cfg.time || '02:00');
  const scheduledTime = /^\d{2}:\d{2}$/.test(configuredTime) ? configuredTime : '02:00';
  const hourlyMinute = Number.parseInt(scheduledTime.split(':')[1] || '0', 10);
  const logs = Array.isArray(status?.logs) && status.logs.length
    ? status.logs.map(log => `<li class="backup-log-${escapeAttr(log.level)}"><strong>${escapeHtml(formatBackupDate(log.at))}</strong><span>${escapeHtml(log.message)}</span></li>`).join('')
    : '<li class="empty-state empty-state-list"><span>No backup logs yet.</span></li>';
  const backups = Array.isArray(status?.backups) && status.backups.length
    ? status.backups.map(backup => `<li><div><strong>${escapeHtml(backup.name)}</strong><span>${escapeHtml(formatBackupDate(backup.createdAt))} · ${Math.ceil((backup.size || 0) / 1024)} KB · ${escapeHtml(backup.target)}</span></div><div class="backup-list-actions"><button class="button secondary" type="button" data-restore-backup="${escapeAttr(backup.id)}" data-restore-target="${escapeAttr(backup.target)}"${disabledAttr}>Restore</button><button class="button danger" type="button" data-delete-backup="${escapeAttr(backup.id)}" data-delete-target="${escapeAttr(backup.target)}"${disabledAttr}>Delete</button></div></li>`).join('')
    : '<li class="empty-state empty-state-list"><span>No encrypted backups found for this target.</span></li>';

  return `
    <section class="backup-config-panel">
      <div class="backup-card backup-hero-card">
        <div class="backup-card-header">
          <div>
            <div class="backup-card-title">Backup plan</div>
            <div class="backup-card-subtitle">Create encrypted backups manually or on a schedule.</div>
          </div>
        </div>
        <div class="backup-chip-row">
          <span class="backup-chip">Local: ${escapeHtml(targets.local?.path || '/data/backups')}</span>
          <span class="backup-chip">SMB: direct share access</span>
          <span class="backup-chip">Last run: ${escapeHtml(formatBackupDate(cfg.lastRunAt))}</span>
        </div>
      </div>
      ${demoNotice}

      <div class="backup-card backup-schedule-card">
        <div class="backup-card-header">
          <div>
            <div class="backup-card-title">Schedule</div>
            <div class="backup-card-subtitle">Choose when automatic backups should run.</div>
          </div>
        </div>
        <div class="backup-form-grid backup-schedule-grid">
          <label class="backup-checkbox-card backup-grid-span-2">
            <input data-backup-field="enabled" type="checkbox" ${cfg.enabled ? 'checked' : ''}${disabledAttr} />
            <span>
              <strong>Enable scheduled backups</strong>
              <small>Run backups automatically.</small>
            </span>
          </label>
          <label>Schedule type
            <select data-backup-field="frequency"${disabledAttr}>
              <option value="hourly" ${frequency === 'hourly' ? 'selected' : ''}>Hourly</option>
              <option value="daily" ${frequency === 'daily' ? 'selected' : ''}>Daily</option>
              <option value="weekly" ${frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
            </select>
          </label>
          <label>Storage target
            <select data-backup-field="target" data-current-target="${escapeAttr(currentTarget)}"${disabledAttr}>
              <option value="local" ${currentTarget === 'local' ? 'selected' : ''}>${escapeHtml(targets.local?.label || 'Local (/data/backups)')}</option>
              <option value="smb" ${currentTarget === 'smb' ? 'selected' : ''}>Direct SMB share</option>
            </select>
          </label>
          <label class="backup-schedule-field" data-backup-schedule-field="hourlyMinute"${frequency === 'hourly' ? '' : ' hidden'}>Minute of the hour
            <input data-backup-field="hourlyMinute" type="number" min="0" max="59" value="${escapeAttr(Number.isFinite(hourlyMinute) ? hourlyMinute : 0)}"${disabledAttr} />
          </label>
          <label class="backup-schedule-field" data-backup-schedule-field="scheduledTime"${frequency === 'hourly' ? ' hidden' : ''}>Time
            <input data-backup-field="scheduledTime" type="time" value="${escapeAttr(scheduledTime)}"${disabledAttr} />
          </label>
          <label class="backup-schedule-field" data-backup-schedule-field="weekday"${frequency === 'weekly' ? '' : ' hidden'}>Day of the week
            <select data-backup-field="weekday"${disabledAttr}>
              ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day, idx) => `<option value="${idx}" ${String(cfg.weekday || '1') === String(idx) ? 'selected' : ''}>${day}</option>`).join('')}
            </select>
          </label>
          <label>Max backups to keep
            <input data-backup-field="maxBackups" type="number" min="1" max="100" value="${escapeAttr(cfg.maxBackups || 10)}"${disabledAttr} />
          </label>
        </div>
      </div>

      <div class="backup-card backup-smb-settings" data-smb-settings ${currentTarget === 'smb' ? '' : 'hidden'}>
        <div class="backup-card-header">
          <div>
            <div class="backup-card-title">Direct SMB destination</div>
            <div class="backup-card-subtitle">Choose where remote backups should be stored.</div>
          </div>
        </div>
        <div class="backup-form-grid backup-smb-grid">
          <label>Server / IP
            <input data-backup-field="smbServer" type="text" autocomplete="off" placeholder="nas.example.local" value="${escapeAttr(cfg.smbServer || '')}"${disabledAttr} />
          </label>
          <label>Share name
            <input data-backup-field="smbShare" type="text" autocomplete="off" placeholder="Backups" value="${escapeAttr(cfg.smbShare || '')}"${disabledAttr} />
          </label>
          <label>Folder inside share
            <input data-backup-field="smbFolder" type="text" autocomplete="off" placeholder="Labby" value="${escapeAttr(cfg.smbFolder || '')}"${disabledAttr} />
          </label>
          <label>SMB port
            <input data-backup-field="smbPort" type="number" min="1" max="65535" value="${escapeAttr(cfg.smbPort || 445)}"${disabledAttr} />
          </label>
          <label>Username
            <input data-backup-field="smbUsername" type="text" autocomplete="username" placeholder="labby-backup" value="${escapeAttr(cfg.smbUsername || '')}"${disabledAttr} />
          </label>
          <label>Domain / workgroup
            <input data-backup-field="smbDomain" type="text" autocomplete="off" placeholder="Optional" value="${escapeAttr(cfg.smbDomain || '')}"${disabledAttr} />
          </label>
          <label class="backup-grid-span-2">SMB password
            <input data-backup-field="smbPassword" type="password" autocomplete="new-password" placeholder="${escapeAttr(passwordHint)}"${disabledAttr} />
          </label>
          <label class="backup-checkbox-card">
            <input data-backup-field="clearSmbPassword" type="checkbox"${disabledAttr} />
            <span>
              <strong>Clear saved password</strong>
              <small>Remove the stored password when saving.</small>
            </span>
          </label>
          <label class="backup-checkbox-card">
            <input data-backup-field="smbEncrypt" type="checkbox" ${cfg.smbEncrypt ? 'checked' : ''}${disabledAttr} />
            <span>
              <strong>Require SMB encryption</strong>
              <small>Require encrypted SMB transport.</small>
            </span>
          </label>
          <label class="backup-checkbox-card backup-grid-span-2">
            <input data-backup-field="smbGuest" type="checkbox" ${cfg.smbGuest ? 'checked' : ''}${disabledAttr} />
            <span>
              <strong>Use guest access</strong>
              <small>Connect without an SMB account.</small>
            </span>
          </label>
        </div>
      </div>

      <div class="backup-card backup-status-card">
        <div class="backup-card-header">
          <div>
            <div class="backup-card-title">Current status</div>
            <div class="backup-card-subtitle">Review the selected schedule and destination.</div>
          </div>
        </div>
        <div class="backup-status-grid">
          <div><strong>Schedule</strong><span>${escapeHtml(describeBackupSchedule(cfg))}</span></div>
          <div><strong>Target</strong><span>${escapeHtml(currentTarget === 'smb' ? 'Direct SMB share' : (targets.local?.label || 'Local storage'))}</span></div>
          <div><strong>Local path</strong><span>${escapeHtml(targets.local?.path || '/data/backups')}</span></div>
          <div><strong>SMB state</strong><span>${escapeHtml(smb.path || 'Not configured')} · ${escapeHtml(smbState)}</span></div>
          ${smb.error && !smb.available ? `<div class="backup-grid-span-2"><strong>SMB message</strong><span>${escapeHtml(smb.error)}</span></div>` : ''}
        </div>
      </div>

      <div class="backup-actions-row">
        <button class="button" type="button" data-backup-save${disabledAttr}>Save settings</button>
        <button class="button secondary" type="button" data-backup-test-smb${disabledAttr}>Test SMB connection</button>
        <button class="button secondary" type="button" data-backup-run${disabledAttr}>Run backup now</button>
        <button class="button secondary" type="button" data-backup-refresh>Refresh</button>
      </div>

      <div class="backup-section-title">Restore encrypted backups</div>
      <ul class="backup-list">${backups}</ul>
      <div class="backup-section-title">Latest backup logs</div>
      <ul class="backup-log-list">${logs}</ul>
    </section>
  `;
}

function readBackupForm(container) {
  const get = (name) => container.querySelector(`[data-backup-field="${name}"]`);
  const frequency = get('frequency')?.value || 'daily';
  const scheduledTime = get('scheduledTime')?.value || '02:00';
  const rawMinute = Number.parseInt(get('hourlyMinute')?.value || '0', 10);
  const minute = Number.isFinite(rawMinute) ? Math.max(0, Math.min(59, rawMinute)) : 0;
  const time = frequency === 'hourly'
    ? `00:${String(minute).padStart(2, '0')}`
    : scheduledTime;
  return {
    enabled: !!get('enabled')?.checked,
    frequency,
    time,
    weekday: get('weekday')?.value || '1',
    target: get('target')?.value || 'local',
    maxBackups: Number.parseInt(get('maxBackups')?.value || '10', 10),
    smbServer: get('smbServer')?.value || '',
    smbShare: get('smbShare')?.value || '',
    smbFolder: get('smbFolder')?.value || '',
    smbPort: Number.parseInt(get('smbPort')?.value || '445', 10),
    smbUsername: get('smbUsername')?.value || '',
    smbDomain: get('smbDomain')?.value || '',
    smbPassword: get('smbPassword')?.value || '',
    clearSmbPassword: !!get('clearSmbPassword')?.checked,
    smbEncrypt: !!get('smbEncrypt')?.checked,
    smbGuest: !!get('smbGuest')?.checked,
  };
}

async function backupApiError(res, fallback) {
  try {
    const body = await res.json();
    return body?.error || fallback;
  } catch {
    try { return (await res.text()) || fallback; } catch { return fallback; }
  }
}

function updateBackupPanelState(container) {
  const target = container.querySelector('[data-backup-field="target"]')?.value || 'local';
  const frequency = container.querySelector('[data-backup-field="frequency"]')?.value || 'daily';
  const smbBox = container.querySelector('[data-smb-settings]');
  if (smbBox) smbBox.hidden = target !== 'smb';
  const testButton = container.querySelector('[data-backup-test-smb]');
  if (testButton) testButton.hidden = target !== 'smb';

  const hourlyField = container.querySelector('[data-backup-schedule-field="hourlyMinute"]');
  const timeField = container.querySelector('[data-backup-schedule-field="scheduledTime"]');
  const weekdayField = container.querySelector('[data-backup-schedule-field="weekday"]');
  const setScheduleFieldVisible = (field, visible) => {
    if (!field) return;
    field.hidden = !visible;
    field.classList.toggle('hidden', !visible);
  };
  setScheduleFieldVisible(hourlyField, frequency === 'hourly');
  setScheduleFieldVisible(timeField, frequency !== 'hourly');
  setScheduleFieldVisible(weekdayField, frequency === 'weekly');

  const guest = !!container.querySelector('[data-backup-field="smbGuest"]')?.checked;
  ['smbUsername', 'smbDomain', 'smbPassword', 'clearSmbPassword'].forEach((name) => {
    const field = container.querySelector(`[data-backup-field="${name}"]`);
    if (field && !publicDemoBackupsDisabled) field.disabled = guest;
  });
}

function bindBackupPanel(container) {
  container.querySelector('[data-backup-field="target"]')?.addEventListener('change', () => updateBackupPanelState(container));
  container.querySelector('[data-backup-field="frequency"]')?.addEventListener('change', () => updateBackupPanelState(container));
  container.querySelector('[data-backup-field="smbGuest"]')?.addEventListener('change', () => updateBackupPanelState(container));

  container.querySelector('[data-backup-save]')?.addEventListener('click', async () => {
    try {
      const res = await fetch(`${API_BASE}/api/backups/settings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(readBackupForm(container)),
      });
      if (!res.ok) throw new Error(await backupApiError(res, 'Could not save backup settings.'));
      showToast('Backup settings saved.');
      await renderBackupConfigPanels();
    } catch (err) { showToast(err.message || 'Could not save backup settings.', 'error'); console.warn(err); }
  });

  container.querySelector('[data-backup-test-smb]')?.addEventListener('click', async () => {
    try {
      const res = await fetch(`${API_BASE}/api/backups/test-smb`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(readBackupForm(container)),
      });
      if (!res.ok) throw new Error(await backupApiError(res, 'SMB connection test failed.'));
      const result = await res.json();
      showToast(`SMB connection successful: ${result.path || 'share is writable'}. Save the settings to use this destination.`);
    } catch (err) { showToast(err.message || 'SMB connection test failed.', 'error'); console.warn(err); }
  });

  container.querySelector('[data-backup-run]')?.addEventListener('click', async () => {
    try {
      const res = await fetch(`${API_BASE}/api/backups/run`, { method: 'POST' });
      if (!res.ok) throw new Error(await backupApiError(res, 'Backup failed.'));
      showToast('Encrypted backup created.');
      await renderBackupConfigPanels();
    } catch (err) { showToast(err.message || 'Backup failed.', 'error'); console.warn(err); }
  });

  container.querySelector('[data-backup-refresh]')?.addEventListener('click', () => renderBackupConfigPanels());
  container.querySelectorAll('[data-restore-backup]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.getAttribute('data-restore-backup');
      const target = button.getAttribute('data-restore-target') || 'local';
      if (!confirm(`Restore Labby config from ${id}? Current config will be overwritten.`)) return;
      try {
        const res = await fetch(`${API_BASE}/api/backups/restore`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, target }),
        });
        if (!res.ok) throw new Error(await backupApiError(res, 'Restore failed.'));
        showToast('Backup restored. Reloading…');
        setTimeout(() => window.location.reload(), 700);
      } catch (err) { showToast(err.message || 'Restore failed.', 'error'); console.warn(err); }
    });
  });
  container.querySelectorAll('[data-delete-backup]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.getAttribute('data-delete-backup');
      const target = button.getAttribute('data-delete-target') || 'local';
      if (!confirm(`Delete encrypted backup ${id}? This cannot be undone.`)) return;
      try {
        const encodedTarget = encodeURIComponent(target);
        const encodedId = encodeURIComponent(id);
        const res = await fetch(`${API_BASE}/api/backups/${encodedTarget}/${encodedId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(await backupApiError(res, 'Could not delete backup.'));
        showToast('Backup deleted.');
        await renderBackupConfigPanels();
      } catch (err) { showToast(err.message || 'Could not delete backup.', 'error'); console.warn(err); }
    });
  });
  updateBackupPanelState(container);
}

async function renderBackupConfigPanels() {
  let status;
  try { status = await fetchBackupStatus(); }
  catch (err) {
    status = {
      config: { enabled: false, frequency: 'daily', time: '02:00', weekday: '1', target: 'local', maxBackups: 10, smbPort: 445 },
      targets: {},
      logs: [{ level: 'error', at: new Date().toISOString(), message: 'Backend backup API is not reachable.' }],
      backups: [],
    };
  }
  ['backup-config-body', 'mobile-backup-config-body'].forEach((id) => {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = backupPanelHtml(status);
    bindBackupPanel(container);
  });
}

function closeBackupConfigView() {
  if (isMobile()) {
    showMobileView('mobile-config');
    setActiveMobileNav('nav-more');
    return;
  }
  if (backupConfigDialog?.open) backupConfigDialog.close();
}

async function openBackupConfig(options = {}) {
  backupConfigReturnToConfig = !!options.returnToConfig;
  await renderBackupConfigPanels();
  if (isMobile()) {
    showMobileView('mobile-backup-config');
    setActiveMobileNav('nav-more');
    return;
  }
  if (configDialog?.open) configDialog.close();
  backupConfigDialog.onclose = () => {
    if (backupConfigReturnToConfig && configDialog && !configDialog.open) configDialog.showModal();
    backupConfigReturnToConfig = false;
  };
  if (typeof backupConfigDialog?.showModal === 'function' && !backupConfigDialog.open) backupConfigDialog.showModal();
}

backupConfigBtn?.addEventListener('click', () => openBackupConfig({ returnToConfig: true }));
backupConfigBtnMobile?.addEventListener('click', () => openBackupConfig({ returnToConfig: true }));
backupConfigClose?.addEventListener('click', () => backupConfigDialog?.close());
backupConfigCloseMobile?.addEventListener('click', closeBackupConfigView);

function ensureBackupConfigMenuButtons() {
  const desktopGrid = document.querySelector('#config-dialog .config-menu-grid');
  const mobileGrid = document.querySelector('#mobile-config .config-menu-grid');
  const insertBeforeClear = (grid, buttonId, clearId) => {
    if (!grid || document.getElementById(buttonId)) return;
    const button = document.createElement('button');
    button.id = buttonId;
    button.className = 'button secondary config-wide-action';
    button.type = 'button';
    button.textContent = 'Backup Config';
    button.addEventListener('click', () => openBackupConfig({ returnToConfig: true }));
    const clearButton = document.getElementById(clearId);
    if (clearButton && clearButton.parentNode === grid) grid.insertBefore(button, clearButton);
    else grid.appendChild(button);
  };
  insertBeforeClear(desktopGrid, 'backup-config-btn', 'clear-all');
  insertBeforeClear(mobileGrid, 'backup-config-btn-mobile', 'clear-all-mobile');
}
ensureBackupConfigMenuButtons();


clearAll.addEventListener('click', async () => {
  if (!confirm('Delete all resources? This also clears all rack, location, custom theme and API key data.')) return;
  items = []; locations = []; racks = []; commandSnippets = []; selectedCommandSnippetId = null;
  localStorage.removeItem('labby-custom-themes');
  await clearAllAgentKeys();
  stopEditing();
  await saveItems();
  showToast('All resources, custom themes and API keys cleared.');
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

function credentialHasSecretOrMetadata(credentials) {
  const c = normalizeCredentials(credentials);
  return Boolean(c && (c.username || c.password || c.privateKey || c.keyPassphrase || c.note || c.cli || c.web));
}

function hasAnyCredentials(list = items) {
  return list.some((item) => item?.credentials && credentialHasSecretOrMetadata(item.credentials));
}

function credentialsByItemId(list = items) {
  return Object.fromEntries(list
    .filter((item) => item?.id && item.credentials && credentialHasSecretOrMetadata(item.credentials))
    .map((item) => [item.id, normalizeCredentials(item.credentials)]));
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
  try {
    const res = await fetch(`${API_BASE}/api/data`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.agentKeys) ? data.agentKeys : [];
  } catch {
    return [];
  }
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

async function loadBackupConfigForExport() {
  try {
    const status = await fetchBackupStatus();
    return {
      backupConfig: status?.config && typeof status.config === 'object' ? status.config : null,
      backupLogs: Array.isArray(status?.logs) ? status.logs.slice().reverse() : [],
    };
  } catch {
    return { backupConfig: null, backupLogs: [] };
  }
}

async function buildConfigExport() {
  const activeTheme = getActiveThemeId();
  const rawAgentKeys = await loadRawAgentKeysForExport();
  const backupExport = await loadBackupConfigForExport();
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
    commandSnippets: commandSnippets,
    backupConfig: backupExport.backupConfig,
    backupLogs: backupExport.backupLogs,
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
    importedBackupConfigForSave = null;
    importedBackupLogsForSave = null;
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
  commandSnippets = normalizeCommandSnippets(parsed.commandSnippets || []);
  importedBackupConfigForSave = parsed.backupConfig && typeof parsed.backupConfig === 'object' ? parsed.backupConfig : null;
  importedBackupLogsForSave = Array.isArray(parsed.backupLogs) ? parsed.backupLogs : null;
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
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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

async function clearAllAgentKeys() {
  // Clear All must reset automation access as well as inventory data.
  // Delete backend records one by one, then clear the local/demo fallback store.
  const keys = await loadAgentKeys();
  await Promise.allSettled(keys.map((key) => deleteAgentKey(key.id)));
  try { localStorage.removeItem(agentKeyStorage); } catch {}
  clearAgentTokenBox();
  if (typeof renderAgentKeyLists === 'function') await renderAgentKeyLists();
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
    `).join('') : '<p class="empty-state">No agent API keys yet.</p>';
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


function normalizeCommandSnippets(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => ({
      id: String(entry?.id || `cmd-${crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)}`),
      name: String(entry?.name || '').trim(),
      command: String(entry?.command || '').replace(/\r\n/g, '\n'),
      description: String(entry?.description || '').trim(),
      createdAt: entry?.createdAt || new Date().toISOString(),
      updatedAt: entry?.updatedAt || entry?.createdAt || new Date().toISOString(),
    }))
    .filter((entry) => entry.name || entry.command || entry.description);
}

function commandSnippetById(id) {
  return commandSnippets.find((entry) => entry.id === id) || null;
}

function renderCommandSnippets() {
  if (!cliCommandList) return;
  const query = (cliCommandSearch?.value || '').trim().toLowerCase();
  const filtered = commandSnippets.filter((entry) => {
    const haystack = `${entry.name} ${entry.command} ${entry.description}`.toLowerCase();
    return !query || haystack.includes(query);
  });
  cliCommandList.innerHTML = '';
  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state empty-state-compact cli-command-empty';
    empty.textContent = query ? 'No matching commands.' : 'No commands saved yet.';
    cliCommandList.appendChild(empty);
  } else {
    filtered.forEach((entry) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cli-command-item';
      btn.dataset.commandId = entry.id;
      btn.classList.toggle('active', entry.id === selectedCommandSnippetId);
      btn.innerHTML = `
        <span class="cli-command-item-name">${escapeHtml(entry.name || 'Untitled command')}</span>
        <span class="cli-command-item-command">${escapeHtml(entry.command || '')}</span>
        ${entry.description ? `<span class="cli-command-item-description">${escapeHtml(entry.description)}</span>` : ''}
      `;
      btn.addEventListener('click', () => {
        selectedCommandSnippetId = entry.id;
        const input = activeCliEls()?.input || cliInput || mobileCliInput;
        if (input) {
          input.value = entry.command || '';
          input.selectionStart = input.value.length;
          input.selectionEnd = input.value.length;
          autosizeCliInput(input);
          input.focus();
        }
        renderCommandSnippets();
      });
      cliCommandList.appendChild(btn);
    });
  }
  if (cliCommandEdit) cliCommandEdit.disabled = !selectedCommandSnippetId;
}

function openCommandSnippetDialog(mode = 'new') {
  const existing = mode === 'edit' ? commandSnippetById(selectedCommandSnippetId) : null;
  editingCommandSnippetId = existing?.id || null;
  if (cliCommandDialogTitle) cliCommandDialogTitle.textContent = existing ? 'Edit command' : 'New command';
  if (cliCommandName) cliCommandName.value = existing?.name || '';
  if (cliCommandBody) cliCommandBody.value = existing?.command || '';
  if (cliCommandDescription) cliCommandDescription.value = existing?.description || '';
  if (cliCommandDialog && !cliCommandDialog.open) cliCommandDialog.showModal();
  window.setTimeout(() => (cliCommandName || cliCommandBody)?.focus(), 40);
}

async function saveCommandSnippetFromDialog() {
  const name = (cliCommandName?.value || '').trim();
  const command = (cliCommandBody?.value || '').replace(/\r\n/g, '\n');
  const description = (cliCommandDescription?.value || '').trim();
  if (!name && !command) {
    showToast('Command name or command is required.', 'error');
    return;
  }
  const now = new Date().toISOString();
  if (editingCommandSnippetId) {
    commandSnippets = commandSnippets.map((entry) => entry.id === editingCommandSnippetId
      ? { ...entry, name, command, description, updatedAt: now }
      : entry);
    selectedCommandSnippetId = editingCommandSnippetId;
  } else {
    const id = crypto?.randomUUID?.() || `cmd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    commandSnippets.push({ id, name, command, description, createdAt: now, updatedAt: now });
    selectedCommandSnippetId = id;
  }
  await saveItems();
  renderCommandSnippets();
  cliCommandDialog?.close();
  showToast('Command saved.');
}

async function copyCommandSnippetFromDialog() {
  const text = cliCommandBody?.value || '';
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Command copied.');
  } catch {
    showToast('Could not copy command.', 'error');
  }
}

function initCommandSnippetPanel() {
  renderCommandSnippets();
  cliCommandSearch?.addEventListener('input', renderCommandSnippets);
  cliCommandAdd?.addEventListener('click', () => openCommandSnippetDialog('new'));
  cliCommandEdit?.addEventListener('click', () => {
    if (!selectedCommandSnippetId) return;
    openCommandSnippetDialog('edit');
  });
  cliCommandSave?.addEventListener('click', saveCommandSnippetFromDialog);
  cliCommandCopy?.addEventListener('click', copyCommandSnippetFromDialog);
  cliCommandCancel?.addEventListener('click', () => cliCommandDialog?.close());
  cliCommandDialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    cliCommandDialog.close();
  });
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
    renderCommandSnippets();
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


const NETWORK_PORT_SPEEDS = ['', '1g', '2.5g', '5g', '10g'];

function normalizeNetworkPortSpeed(value) {
  const speed = String(value || '').toLowerCase();
  return NETWORK_PORT_SPEEDS.includes(speed) ? speed : '';
}

function networkPortSpeedLabel(value) {
  return ({ '1g': '1 Gbit', '2.5g': '2.5 Gbit', '5g': '5 Gbit', '10g': '10 Gbit' })[String(value || '').toLowerCase()] || '';
}

function normalizeNetworkPorts(rows, primaryIp = '') {
  const list = Array.isArray(rows)
    ? rows.slice(0, 64).map((port) => ({
        ip: String(port?.ip || '').trim(),
        speed: normalizeNetworkPortSpeed(port?.speed),
      }))
    : [];

  const cleanPrimaryIp = String(primaryIp || '').trim();
  if (!list.length) return cleanPrimaryIp ? [{ ip: cleanPrimaryIp, speed: '' }] : [];
  list[0].ip = cleanPrimaryIp || list[0].ip;
  if (list.length === 1 && !list[0].ip && !list[0].speed) return [];
  return list;
}

function resourceNetworkPorts(item) {
  if (!item || !['hardware', 'vm', 'lxc'].includes(item.type)) return [];
  const ports = normalizeNetworkPorts(item.networkPorts, item.ip);
  return ports.length ? ports : [{ ip: String(item.ip || '').trim(), speed: '' }];
}

function appendNetworkPortRow(port = { ip: '', speed: '' }) {
  if (!networkPorts) return;
  const index = networkPorts.querySelectorAll('[data-network-port-row]').length;
  if (index >= 64) {
    showToast('A resource can have up to 64 network ports.', 'error');
    return;
  }
  const row = document.createElement('div');
  row.className = `network-port-row${index === 0 ? ' is-primary' : ''}`;
  row.dataset.networkPortRow = '';
  row.innerHTML = `
    <div class="network-port-number">Port ${index + 1}${index === 0 ? ' (Primary)' : ''}</div>
    <label>
      IP address
      <input type="text" placeholder="e.g. 192.168.10.20" value="${escapeAttr(port.ip)}" data-network-port-ip />
    </label>
    <label>
      Maximum speed
      <select data-network-port-speed>
        <option value="">Not set</option>
        <option value="1g">1 Gbit</option>
        <option value="2.5g">2.5 Gbit</option>
        <option value="5g">5 Gbit</option>
        <option value="10g">10 Gbit</option>
      </select>
    </label>
    <button class="icon-btn network-port-remove" type="button">Remove</button>
  `;
  row.querySelector('[data-network-port-speed]').value = normalizeNetworkPortSpeed(port.speed);
  const ipField = row.querySelector('[data-network-port-ip]');
  if (index === 0) {
    ipField.addEventListener('input', () => {
      if (ipInput.value !== ipField.value) ipInput.value = ipField.value;
    });
  }
  row.querySelector('.network-port-remove').addEventListener('click', () => {
    if (row.classList.contains('is-primary')) return;
    row.remove();
    renumberNetworkPortRows();
  });
  networkPorts.appendChild(row);
}

function renumberNetworkPortRows() {
  if (!networkPorts) return;
  [...networkPorts.querySelectorAll('[data-network-port-row]')].forEach((row, index) => {
    row.classList.toggle('is-primary', index === 0);
    const number = row.querySelector('.network-port-number');
    if (number) number.textContent = `Port ${index + 1}${index === 0 ? ' (Primary)' : ''}`;
  });
  syncPrimaryNetworkPortFromIp();
}

function renderNetworkPortRows(rows = [], primaryIp = '') {
  if (!networkPorts) return;
  const normalized = normalizeNetworkPorts(rows, primaryIp);
  const visibleRows = normalized.length ? normalized : [{ ip: String(primaryIp || '').trim(), speed: '' }];
  networkPorts.innerHTML = '';
  visibleRows.forEach((port) => appendNetworkPortRow(port));
  syncPrimaryNetworkPortFromIp();
}

function syncPrimaryNetworkPortFromIp() {
  const first = networkPorts?.querySelector('[data-network-port-row] [data-network-port-ip]');
  if (first && first.value !== ipInput.value) first.value = ipInput.value;
}

function getNetworkPorts(primaryIp = '') {
  if (!networkPorts) return normalizeNetworkPorts([], primaryIp);
  const rows = [...networkPorts.querySelectorAll('[data-network-port-row]')].map((row) => ({
    ip: row.querySelector('[data-network-port-ip]')?.value.trim() || '',
    speed: normalizeNetworkPortSpeed(row.querySelector('[data-network-port-speed]')?.value),
  }));
  if (!rows.length) rows.push({ ip: String(primaryIp || '').trim(), speed: '' });
  rows[0].ip = String(primaryIp || '').trim();
  if (rows.length === 1 && !rows[0].ip && !rows[0].speed) return [];
  return rows;
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
  renderNetworkPortRows([], '');
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
  const privateKey = String(value.privateKey || value.sshPrivateKey || '');
  const keyPassphrase = String(value.keyPassphrase || value.sshKeyPassphrase || '');
  const note = String(value.note || '').trim();
  const cli = Boolean(value.cli || value.accessCli);
  const web = Boolean(value.web || value.accessWeb);
  const requestedAuth = String(value.authMethod || value.sshAuthMethod || '').trim();
  const authMethod = requestedAuth === 'key' || requestedAuth === 'password'
    ? requestedAuth
    : (privateKey ? 'key' : 'password');
  if (!username && !password && !privateKey && !keyPassphrase && !note && !cli && !web) return null;
  return { username, password, privateKey, keyPassphrase, authMethod, note, cli, web };
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
    privateKey: credentialInput('credential-private-key')?.value || '',
    keyPassphrase: credentialInput('credential-key-passphrase')?.value || '',
    authMethod: credentialInput('credential-auth-method')?.value || 'password',
    note: credentialInput('credential-note')?.value || '',
    cli: credentialInput('credential-cli')?.checked || false,
    web: credentialInput('credential-web')?.checked || false,
  });
}

function setCredentialFields(credentials) {
  const normalized = normalizeCredentials(credentials);
  const username = credentialInput('credential-username');
  const password = credentialInput('credential-password');
  const privateKey = credentialInput('credential-private-key');
  const keyPassphrase = credentialInput('credential-key-passphrase');
  const authMethod = credentialInput('credential-auth-method');
  const note = credentialInput('credential-note');
  const cli = credentialInput('credential-cli');
  const web = credentialInput('credential-web');
  if (username) username.value = normalized?.username || '';
  if (password) password.value = normalized?.password || '';
  if (privateKey) privateKey.value = normalized?.privateKey || '';
  if (keyPassphrase) keyPassphrase.value = normalized?.keyPassphrase || '';
  if (authMethod) authMethod.value = normalized?.authMethod || (normalized?.privateKey ? 'key' : 'password');
  if (note) note.value = normalized?.note || '';
  if (cli) cli.checked = Boolean(normalized?.cli);
  if (web) web.checked = Boolean(normalized?.web);
  updateCredentialAuthVisibility();
}

function updateCredentialAuthVisibility() {
  const method = credentialInput('credential-auth-method')?.value || 'password';
  document.querySelectorAll('[data-credential-auth-panel]').forEach((panel) => {
    panel.classList.toggle('hidden', panel.dataset.credentialAuthPanel !== method);
  });
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
      networkPorts: normalizeNetworkPorts(item.networkPorts, item.ip ? String(item.ip) : ''),
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
      virtualHostedOn: item.virtualHostedOn ? String(item.virtualHostedOn) : '',
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

function wouldCreateVirtualHostCycle(itemId, parentId, list) {
  if (!itemId || !parentId) return false;
  const byId = Object.fromEntries(list.map((item) => [item.id, item]));
  const seen = new Set([itemId]);
  let currentId = parentId;

  while (currentId) {
    if (seen.has(currentId)) return true;
    seen.add(currentId);
    const current = byId[currentId];
    if (!current || !['vm', 'lxc'].includes(current.type)) return false;
    currentId = current.virtualHostedOn || '';
  }
  return false;
}

function normalizeList(list) {
  const known = new Set(list.map((item) => item.id));
  const hardwareIds = new Set(list.filter((item) => item.type === 'hardware').map((item) => item.id));
  const switchIds = new Set(list.filter((item) => item.type === 'hardware' && item.hardwareKind === 'switch').map((item) => item.id));
  const virtualHostIds = new Set(list.filter((item) => item.type === 'vm' || item.type === 'lxc').map((item) => item.id));

  const normalized = list.map((item) => {
    const next = { ...item };
    next.connections = next.connections.filter((id) => known.has(id) && id !== next.id);
    if (!supportsNotes(next.type)) next.notes = '';
    if (!supportsCredentials(next.type)) next.credentials = null;
    else next.credentials = normalizeCredentials(next.credentials);
    if (!['hardware', 'vm', 'lxc'].includes(next.type)) {
      next.ip = '';
      next.os = '';
      next.networkPorts = [];
    } else {
      next.networkPorts = normalizeNetworkPorts(next.networkPorts, next.ip);
      if (!next.ip && next.networkPorts[0]?.ip) next.ip = next.networkPorts[0].ip;
      if (next.networkPorts.length) next.networkPorts[0].ip = next.ip || '';
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
    if (!(next.type === 'hardware' && ['router-gateway', 'switch'].includes(next.hardwareKind))) next.switchPorts = '';
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
    if (!['vm', 'lxc'].includes(next.type)) next.virtualHostedOn = '';
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
    if (['vm', 'lxc'].includes(next.type)) {
      const validVirtualHost = virtualHostIds.has(next.virtualHostedOn)
        && next.virtualHostedOn !== next.id
        && !wouldCreateVirtualHostCycle(next.id, next.virtualHostedOn, list);
      next.virtualHostedOn = validVirtualHost ? next.virtualHostedOn : '';
      if (next.virtualHostedOn) next.hostedOn = '';
      else if (!hardwareIds.has(next.hostedOn)) next.hostedOn = '';
    } else {
      next.hostedOn = '';
      next.virtualHostedOn = '';
    }
    if (next.type === 'app' && !virtualHostIds.has(next.appHostedOn)) next.appHostedOn = '';
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
  if (['hardware', 'vm', 'lxc'].includes(item.type)) {
    resourceNetworkPorts(item).forEach((port) => { if (port.ip) ips.push(port.ip); });
  } else if (item.ip) {
    ips.push(item.ip);
  }
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
  appHostedOnWrap.classList.toggle('hidden', !(isApp || isVmOrLxc));
  ipInput.closest('label').classList.toggle('hidden', !supportsIp);
  networkPortsWrap?.classList.toggle('hidden', !supportsIp);
  switchPortsWrap.classList.toggle('hidden', !(isSwitch || isRouter));
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
  switchPortsInput.required = isSwitch || isRouter;

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
  syncHostingSelectors();
}

function initAdvancedResourceSettings() {
  if (!advancedResourceBody) return;
  const advancedIds = [
    'manufacturer-wrap',
    'os-wrap',
    'network-ports-wrap',
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
      <div class="credential-grid">
        <label>
          Username
          <div class="credential-input-row">
            <input id="credential-username" type="text" autocomplete="off" placeholder="optional, e.g. admin" />
            <button class="button secondary" type="button" data-credential-copy="credential-username">Copy</button>
          </div>
        </label>
        <label>
          Auth method
          <select id="credential-auth-method">
            <option value="password">Password</option>
            <option value="key">SSH private key</option>
          </select>
        </label>
      </div>
      <div class="credential-auth-panel" data-credential-auth-panel="password">
        <label>
          Password
          <div class="credential-input-row">
            <input id="credential-password" type="password" autocomplete="new-password" placeholder="••••••••" />
            <button class="button secondary credential-eye" type="button" data-credential-toggle="credential-password" aria-label="Show password">${credentialEyeSvg(false)}</button>
            <button class="button secondary" type="button" data-credential-copy="credential-password">Copy</button>
          </div>
        </label>
      </div>
      <div class="credential-auth-panel hidden" data-credential-auth-panel="key">
        <label>
          SSH private key
          <div class="credential-input-row credential-key-row">
            <textarea id="credential-private-key" rows="7" autocomplete="off" spellcheck="false" placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"></textarea>
            <button class="button secondary" type="button" data-credential-copy="credential-private-key">Copy</button>
          </div>
        </label>
        <label>
          Key passphrase optional
          <div class="credential-input-row">
            <input id="credential-key-passphrase" type="password" autocomplete="new-password" placeholder="optional passphrase" />
            <button class="button secondary credential-eye" type="button" data-credential-toggle="credential-key-passphrase" aria-label="Show passphrase">${credentialEyeSvg(false)}</button>
            <button class="button secondary" type="button" data-credential-copy="credential-key-passphrase">Copy</button>
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
  if (['hardware', 'vm', 'lxc'].includes(type)) {
    if (!networkPorts?.querySelector('[data-network-port-row]')) renderNetworkPortRows([], ipInput.value);
    syncPrimaryNetworkPortFromIp();
  }
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
      empty.className = 'empty-state empty-state-compact';
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
    const portText = resourceNetworkPorts(item).filter((port) => port.ip || port.speed).map((port, index) => `Port ${index + 1} ${port.ip || ''} ${networkPortSpeedLabel(port.speed)}`).join(' ');
    const text = `${item.name} ${item.description} ${item.notes} ${item.ip} ${portText} ${specsText} ${appText} ${networkText} ${hardwareText}`.toLowerCase();
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
  const credentials = normalizeCredentials(item?.credentials);
  const username = credentials?.username ? String(credentials.username).trim() : '';
  const password = credentials?.password ? String(credentials.password) : '';
  const privateKey = credentials?.privateKey ? String(credentials.privateKey) : '';
  const keyPassphrase = credentials?.keyPassphrase ? String(credentials.keyPassphrase) : '';
  const authMethod = credentials?.authMethod === 'key' || (privateKey && !password) ? 'key' : 'password';
  return { ip, username, password, privateKey, keyPassphrase, authMethod, target: username ? `${username}@${ip}` : ip };
}

function activeCliEls() {
  const mobile = isMobile();
  return mobile
    ? { title: mobileCliTitle, subtitle: mobileCliSubtitle, terminal: mobileCliTerminal, input: mobileCliInput, send: mobileCliSend, copy: mobileCliCopy, paste: mobileCliPaste, sudoPassword: mobileCliSudoPassword, ctrlC: mobileCliCtrlC, clearKey: mobileCliClearKey, close: mobileCliClose }
    : { title: cliTitle, subtitle: cliSubtitle, terminal: cliTerminal, input: cliInput, send: cliSend, copy: cliCopy, paste: cliPaste, sudoPassword: cliSudoPassword, ctrlC: cliCtrlC, clearKey: cliClearKey, close: cliClose };
}


function cliTerminalFontSize() {
  return isMobile() ? 12 : 13;
}

function cliTerminalRows() {
  return isMobile() ? 28 : 34;
}

function cliXtermAvailable() {
  return Boolean(cliXtermPreferred && window.Terminal);
}

function getCliXterm(terminalEl) {
  if (!terminalEl || !cliXtermAvailable()) return null;
  if (cliXtermInstances.has(terminalEl)) return cliXtermInstances.get(terminalEl);
  try {
    terminalEl.textContent = '';
    terminalEl.classList.add('xterm-enabled');
    const term = new window.Terminal({
      cols: estimateCliTerminalCols(),
      rows: cliTerminalRows(),
      cursorBlink: true,
      convertEol: true,
      scrollback: 2500,
      fontFamily: "'Space Mono', ui-monospace, monospace",
      fontSize: cliTerminalFontSize(),
      fontWeight: 700,
      lineHeight: 1.25,
      theme: {
        background: '#05070a',
        foreground: '#ffffff',
        cursor: '#f4d371',
        selectionBackground: '#f4d37188',
      },
    });
    term.open(terminalEl);
    term.onData((data) => {
      // Full-screen tools such as nano need raw keystrokes. Normal command history
      // stays on the separate Labby input field; click/focus the terminal only when
      // controlling an interactive program.
      if (cliSession && document.activeElement === terminalEl) sendCliRawInput(data);
    });
    terminalEl.addEventListener('focus', () => term.focus());
    cliXtermInstances.set(terminalEl, term);
    return term;
  } catch (err) {
    cliXtermPreferred = false;
    terminalEl.classList.remove('xterm-enabled');
    return null;
  }
}

function activeCliXterm() {
  return getCliXterm(activeCliEls()?.terminal);
}

function initActiveCliTerminal() {
  const term = activeCliXterm();
  if (term) {
    try { term.resize(estimateCliTerminalCols(), cliTerminalRows()); } catch {}
  }
  return term;
}

function clearCliXterms() {
  cliXtermOutputBuffer = '';
  cliXtermInstances.forEach((term) => {
    try { term.clear(); term.reset(); } catch {}
  });
}

function writeCliXterm(text, append = true) {
  const value = String(text || '');
  if (!append) clearCliXterms();
  cliXtermOutputBuffer = (append ? cliXtermOutputBuffer : '') + value;
  if (cliXtermOutputBuffer.length > 200000) cliXtermOutputBuffer = cliXtermOutputBuffer.slice(-100000);
  const term = initActiveCliTerminal();
  if (!term) return false;
  try {
    if (!append) term.clear();
    term.write(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeCliPlainOutput(text) {
  return String(text || '')
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b[()#][0-9A-Za-z]/g, '')
    .replace(/\x1b[78]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\x00/g, '')
    .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}

function cliPlainOutputForCopy() {
  return cliPlainOutputBuffer || normalizeCliPlainOutput(cliXtermOutputBuffer);
}

function renderCliPlainOutput() {
  const text = cliPlainOutputBuffer.replace(/\n+$/g, '');
  [cliTerminal, mobileCliTerminal].filter(Boolean).forEach((terminal) => {
    terminal.textContent = text;
    terminal.scrollTop = terminal.scrollHeight;
  });
}


function createCliTerminalState() {
  const rows = isMobile() ? 28 : 34;
  const cols = estimateCliTerminalCols();
  return {
    rows,
    cols,
    buffer: Array.from({ length: rows }, () => []),
    row: 0,
    col: 0,
    savedRow: 0,
    savedCol: 0,
    parser: '',
    osc: false,
    normal: null,
    alt: false,
  };
}

function estimateCliTerminalCols() {
  const terminal = activeCliEls?.()?.terminal || cliTerminal || mobileCliTerminal;
  const width = terminal?.clientWidth || 1200;
  return Math.max(80, Math.min(220, Math.floor(width / 9)));
}

function resizeCliTerminalState() {
  if (!cliTerminalState) cliTerminalState = createCliTerminalState();
  const cols = estimateCliTerminalCols();
  cliTerminalState.cols = cols;
  cliTerminalState.rows = isMobile() ? 28 : 34;
}

function clearCliTerminalBuffer(state = cliTerminalState) {
  state.buffer = Array.from({ length: state.rows }, () => []);
  state.row = 0;
  state.col = 0;
}

function ensureCliTerminalLine(state, row) {
  while (state.buffer.length <= row) state.buffer.push([]);
  return state.buffer[row];
}

function scrollCliTerminal(state) {
  state.buffer.push([]);
  const maxLines = state.alt ? state.rows : 1200;
  while (state.buffer.length > maxLines) state.buffer.shift();
  state.row = Math.max(0, Math.min(state.buffer.length - 1, state.row));
}

function putCliTerminalChar(state, ch) {
  if (ch === '\r') { state.col = 0; return; }
  if (ch === '\n') {
    state.row += 1;
    if (state.alt && state.row >= state.rows) state.row = state.rows - 1;
    else if (state.row >= state.buffer.length) scrollCliTerminal(state);
    return;
  }
  if (ch === '\b') { state.col = Math.max(0, state.col - 1); return; }
  if (ch === '\t') {
    const spaces = 8 - (state.col % 8);
    for (let i = 0; i < spaces; i += 1) putCliTerminalChar(state, ' ');
    return;
  }
  if (ch < ' ') return;
  const line = ensureCliTerminalLine(state, state.row);
  while (line.length < state.col) line.push(' ');
  line[state.col] = ch;
  state.col += 1;
  if (state.col >= state.cols) {
    state.col = 0;
    state.row += 1;
    if (state.alt && state.row >= state.rows) state.row = state.rows - 1;
    else if (state.row >= state.buffer.length) scrollCliTerminal(state);
  }
}

function parseCliCsiParams(seq) {
  const final = seq.slice(-1);
  const raw = seq.slice(0, -1).replace(/[?>!]/g, '');
  const params = raw.split(';').filter((v) => v !== '').map((v) => Number.parseInt(v, 10) || 0);
  return { final, params, privateMode: seq.includes('?') };
}

function handleCliCsi(seq) {
  const state = cliTerminalState;
  const { final, params, privateMode } = parseCliCsiParams(seq);
  const first = params[0] || 0;
  if ((final === 'h' || final === 'l') && privateMode) {
    if (seq.includes('1049') || seq.includes('47') || seq.includes('1047')) {
      if (final === 'h' && !state.alt) {
        state.normal = { buffer: state.buffer, row: state.row, col: state.col };
        state.alt = true;
        clearCliTerminalBuffer(state);
      } else if (final === 'l' && state.alt) {
        const normal = state.normal;
        state.alt = false;
        state.normal = null;
        if (normal) {
          state.buffer = normal.buffer;
          state.row = normal.row;
          state.col = normal.col;
        }
      }
    }
    return;
  }
  if (final === 'm') return;
  if (final === 'A') { state.row = Math.max(0, state.row - (first || 1)); return; }
  if (final === 'B') { state.row = Math.min(state.buffer.length - 1, state.row + (first || 1)); return; }
  if (final === 'C') { state.col = Math.min(state.cols - 1, state.col + (first || 1)); return; }
  if (final === 'D') { state.col = Math.max(0, state.col - (first || 1)); return; }
  if (final === 'G') { state.col = Math.max(0, Math.min(state.cols - 1, (first || 1) - 1)); return; }
  if (final === 'H' || final === 'f') {
    state.row = Math.max(0, Math.min(state.buffer.length - 1, (params[0] || 1) - 1));
    state.col = Math.max(0, Math.min(state.cols - 1, (params[1] || 1) - 1));
    return;
  }
  if (final === 'J') {
    if (first === 2 || first === 3) clearCliTerminalBuffer(state);
    else if (first === 0) {
      const line = ensureCliTerminalLine(state, state.row);
      line.length = state.col;
      for (let r = state.row + 1; r < state.buffer.length; r += 1) state.buffer[r] = [];
    }
    return;
  }
  if (final === 'K') {
    const line = ensureCliTerminalLine(state, state.row);
    if (first === 2) state.buffer[state.row] = [];
    else if (first === 1) {
      for (let i = 0; i <= state.col; i += 1) line[i] = ' ';
    } else {
      line.length = state.col;
    }
    return;
  }
  if (final === 's') { state.savedRow = state.row; state.savedCol = state.col; return; }
  if (final === 'u') { state.row = state.savedRow; state.col = state.savedCol; }
}

function appendCliTerminalChunk(text) {
  resizeCliTerminalState();
  const state = cliTerminalState;
  const value = String(text || '');
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (state.osc) {
      if (ch === '\x07' || (ch === '\\' && value[i - 1] === '\x1b')) state.osc = false;
      continue;
    }
    if (state.parser) {
      state.parser += ch;
      if (state.parser === '\x1b]') { state.osc = true; state.parser = ''; continue; }
      if (state.parser.length === 2 && !['[', '(', ')', '#', ']', '7', '8'].includes(state.parser[1])) { state.parser = ''; continue; }
      if (state.parser[1] === '[' && /[A-Za-z~]/.test(ch)) { handleCliCsi(state.parser.slice(2)); state.parser = ''; continue; }
      if (['(', ')', '#'].includes(state.parser[1]) && state.parser.length >= 3) { state.parser = ''; continue; }
      if (state.parser === '\x1b7') { state.savedRow = state.row; state.savedCol = state.col; state.parser = ''; continue; }
      if (state.parser === '\x1b8') { state.row = state.savedRow; state.col = state.savedCol; state.parser = ''; continue; }
      if (state.parser.length > 80) state.parser = '';
      continue;
    }
    if (ch === '\x1b') { state.parser = ch; continue; }
    putCliTerminalChar(state, ch);
  }
  renderCliTerminalState();
}

function renderCliTerminalState() {
  const state = cliTerminalState;
  const lines = state.buffer.map((line) => line.join('').replace(/\s+$/g, ''));
  const text = lines.join('\n').replace(/\n+$/g, '');
  // Keep copy output synchronized with the rendered terminal screen instead of
  // the raw stream. Progress renderers reuse lines with carriage returns and
  // cursor movement, so appending normalized text would duplicate every frame.
  cliPlainOutputBuffer = text;
  [cliTerminal, mobileCliTerminal].filter(Boolean).forEach((terminal) => {
    terminal.textContent = text;
    terminal.scrollTop = terminal.scrollHeight;
  });
}

function setCliOutput(text, append = false) {
  const value = String(text || '');
  if (!append) {
    cliTerminalState = createCliTerminalState();
    cliPlainOutputBuffer = '';
  }
  // Feed the raw SSH stream into the terminal-state parser. This preserves
  // carriage returns, erase-line commands and cursor movement used by apt,
  // Docker BuildKit and other installers to update progress in place.
  appendCliTerminalChunk(value);
}

async function openCliSession(item, options = {}) {
  const { ip, username, password, privateKey, keyPassphrase, authMethod, target } = cliTargetForItem(item);
  if (!ip) {
    showToast('No IP address available for CLI.', 'error');
    return;
  }
  cliActiveItem = item;
  resetCliHistoryScope(item);
  cliRemoteHistoryLoadedFor = '';
  renderCommandSnippets();
  const els = activeCliEls();
  if (els.title) els.title.textContent = `CLI - ${item.name || 'Resource'}`;
  if (els.subtitle) els.subtitle.textContent = 'SSH session';
  setCliOutput('');

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
      body: JSON.stringify({ host: ip, username, password, privateKey, keyPassphrase, authMethod, clearKnownHost: Boolean(options.clearKnownHost) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not start SSH session.');
    cliSession = data.sessionId;
    loadCliRemoteHistory();
    setCliOutput(data.output || '');
    window.setTimeout(() => activeCliInput()?.focus(), 60);
  window.setTimeout(() => autosizeAndFocusCliInput(activeCliInput()), 80);
  startCliPolling();
    els.input?.focus();
  } catch (err) {
    const sshUrl = username ? `ssh://${encodeURIComponent(username)}@${ip}` : `ssh://${ip}`;
    const isPublicDemoCli = typeof DEMO_INTERACTIVE_SECURITY_DISABLED !== 'undefined' && DEMO_INTERACTIVE_SECURITY_DISABLED;
    const outputLines = isPublicDemoCli
      ? [
          'SSH is unavailable in the public demo.',
          '',
          'Use the self-hosted version for live SSH sessions.',
          '',
          'Manual command:',
          `ssh ${target}`,
        ]
      : [
          'Labby could not start the backend SSH session.',
          '',
          'You can still launch your system SSH client manually:',
          `ssh ${target}`,
          '',
          `Reason: ${err.message || err}`,
        ];
    setCliOutput(`${outputLines.join('\r\n')}\r\n`);
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


function autosizeCliInput(input) {
  if (!input) return;
  input.style.height = 'auto';
  const maxHeight = isMobile() ? 150 : 120;
  input.style.height = `${Math.min(input.scrollHeight, maxHeight)}px`;
}

function insertTextAtCursor(input, text) {
  if (!input || typeof text !== 'string') return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = `${input.value.slice(0, start)}${text}${input.value.slice(end)}`;
  const next = start + text.length;
  input.selectionStart = next;
  input.selectionEnd = next;
  autosizeCliInput(input);
  input.focus();
}

async function pasteClipboardToCliInput() {
  const els = activeCliEls();
  if (!els.input) return;
  try {
    const text = await navigator.clipboard.readText();
    if (!text) {
      showToast('Clipboard is empty.', 'info');
      return;
    }
    insertTextAtCursor(els.input, text);
    showToast('Clipboard pasted.');
  } catch {
    showToast('Could not read clipboard.', 'error');
  }
}



function autosizeCliInput(input) {
  if (!input) return;
  input.style.height = 'auto';
  const maxHeight = isMobile() ? 150 : 120;
  input.style.height = `${Math.min(input.scrollHeight, maxHeight)}px`;
}

function insertTextAtCursor(input, text) {
  if (!input || typeof text !== 'string') return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = `${input.value.slice(0, start)}${text}${input.value.slice(end)}`;
  const next = start + text.length;
  input.selectionStart = next;
  input.selectionEnd = next;
  autosizeCliInput(input);
  input.focus();
}

async function pasteClipboardToCliInput() {
  const els = activeCliEls();
  if (!els.input) return;
  try {
    const text = await navigator.clipboard.readText();
    if (!text) {
      showToast('Clipboard is empty.', 'info');
      return;
    }
    insertTextAtCursor(els.input, text);
    showToast('Clipboard pasted.');
  } catch {
    showToast('Could not read clipboard.', 'error');
  }
}

function setCliHistoryTarget(item) {
  resetCliHistoryScope(item);
}

function rememberCliCommand(command) {
  const value = String(command || '').replace(/\r\n/g, '\n');
  if (!value.trim()) return;
  if (cliCommandHistory[cliCommandHistory.length - 1] !== value) {
    cliCommandHistory.push(value);
    if (cliCommandHistory.length > 100) cliCommandHistory.shift();
  }
  cliHistoryIndex = cliCommandHistory.length;
  cliHistoryDraft = '';
}

function applyCliHistory(input, direction) {
  if (!input || !cliCommandHistory.length) return;
  if (cliHistoryIndex < 0 || cliHistoryIndex > cliCommandHistory.length) {
    cliHistoryIndex = cliCommandHistory.length;
  }
  if (cliHistoryIndex === cliCommandHistory.length) {
    cliHistoryDraft = input.value || '';
  }
  cliHistoryIndex += direction;
  if (cliHistoryIndex < 0) cliHistoryIndex = 0;
  if (cliHistoryIndex > cliCommandHistory.length) cliHistoryIndex = cliCommandHistory.length;
  input.value = cliHistoryIndex === cliCommandHistory.length ? cliHistoryDraft : cliCommandHistory[cliHistoryIndex];
  input.selectionStart = input.value.length;
  input.selectionEnd = input.value.length;
  autosizeCliInput(input);
}






function getCliHistoryScope(item = cliActiveItem) {
  const id = item?.id || item?.ip || item?.name || 'default';
  const host = item?.ip || item?.name || id;
  return `${id}|${host}`;
}

function cliHistory() {
  if (!cliHistoryStore.has(cliHistoryScope)) cliHistoryStore.set(cliHistoryScope, []);
  return cliHistoryStore.get(cliHistoryScope);
}

function resetCliHistoryScope(item) {
  cliHistoryScope = getCliHistoryScope(item);
  cliHistoryCursor = cliHistory().length;
  cliHistoryDraft = '';
}

function rememberCliCommand(command) {
  const value = String(command || '').replace(/\r\n/g, '\n');
  if (!value.trim()) return;
  const history = cliHistory();
  if (history[history.length - 1] !== value) {
    history.push(value);
    if (history.length > 100) history.shift();
  }
  cliHistoryCursor = history.length;
  cliHistoryDraft = '';
}


function mergeCliHistory(remoteHistory = []) {
  const current = cliHistory();
  const local = current.slice();
  current.length = 0;
  const seen = new Set();
  [...remoteHistory, ...local].forEach((entry) => {
    const value = String(entry || '').trim();
    if (!value) return;
    // Keep the newest occurrence when the same command exists in shell history and
    // the current Labby session. This makes ArrowUp show the last real command first.
    if (seen.has(value)) {
      const oldIndex = current.indexOf(value);
      if (oldIndex >= 0) current.splice(oldIndex, 1);
    }
    seen.add(value);
    current.push(value);
  });
  while (current.length > 300) current.shift();
  cliHistoryCursor = current.length;
}

async function loadCliRemoteHistory() {
  if (!cliSession) return;
  const key = `${cliSession}|${cliHistoryScope}`;
  if (cliRemoteHistoryLoadedFor === key) return cliRemoteHistoryPromise;
  cliRemoteHistoryLoadedFor = key;
  cliRemoteHistoryPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ssh/${encodeURIComponent(cliSession)}/history`);
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      const history = Array.isArray(data.history) ? data.history : [];
      if (history.length) mergeCliHistory(history);
    } catch {}
  })();
  return cliRemoteHistoryPromise;
}

function activeCliInput() {
  return activeCliEls()?.input || (mobileCliView?.classList.contains('active') ? mobileCliInput : cliInput);
}

function autosizeAndFocusCliInput(input) {
  autosizeCliInput(input);
  input?.focus();
}

function loadCliHistoryIntoInput(direction) {
  const input = activeCliInput();
  if (!input) return false;
  const history = cliHistory();
  if (!history.length) {
    loadCliRemoteHistory().then(() => {
      if (cliHistory().length) loadCliHistoryIntoInput(direction);
    });
    return false;
  }
  if (cliHistoryCursor < 0 || cliHistoryCursor > history.length) cliHistoryCursor = history.length;
  if (cliHistoryCursor === history.length) cliHistoryDraft = input.value || '';
  cliHistoryCursor = Math.max(0, Math.min(history.length, cliHistoryCursor + direction));
  input.value = cliHistoryCursor === history.length ? cliHistoryDraft : history[cliHistoryCursor];
  input.selectionStart = input.value.length;
  input.selectionEnd = input.value.length;
  autosizeAndFocusCliInput(input);
  return true;
}

function isCliVisible() {
  return Boolean(cliSession && ((cliDialog && cliDialog.open) || mobileCliView?.classList.contains('active')));
}


async function sendCliRawInput(raw) {
  if (!cliSession) return false;
  const input = String(raw || '');
  if (!input) return false;
  try {
    const res = await fetch(`${API_BASE}/api/ssh/${encodeURIComponent(cliSession)}/input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function cliCurrentTokenBounds(value) {
  const text = String(value || '');
  let end = text.length;
  let start = end;
  while (start > 0 && !/\s/.test(text[start - 1])) start -= 1;
  return { start, end, token: text.slice(start, end) };
}

function commonPrefix(values) {
  const list = (values || []).map((v) => String(v || '')).filter(Boolean);
  if (!list.length) return '';
  let prefix = list[0];
  for (const item of list.slice(1)) {
    while (prefix && !item.startsWith(prefix)) prefix = prefix.slice(0, -1);
    if (!prefix) break;
  }
  return prefix;
}

async function completeCliInputFromRemote(input) {
  if (!cliSession) return;
  const field = input || activeCliInput();
  if (!field) return;
  const value = field.value || '';
  const bounds = cliCurrentTokenBounds(value);
  try {
    const res = await fetch(`${API_BASE}/api/ssh/${encodeURIComponent(cliSession)}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line: value, token: bounds.token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Completion failed.');
    const matches = Array.isArray(data.matches) ? data.matches.map(String).filter(Boolean) : [];
    if (!matches.length) return;
    let replacement = matches.length === 1 ? matches[0] : commonPrefix(matches);
    if (!replacement || replacement === bounds.token) {
      const preview = matches.slice(0, 8).join('   ');
      if (preview) showToast(`${matches.length} matches: ${preview}${matches.length > 8 ? ' …' : ''}`);
      return;
    }
    field.value = `${value.slice(0, bounds.start)}${replacement}${value.slice(bounds.end)}`;
    field.selectionStart = field.selectionEnd = bounds.start + replacement.length;
    autosizeAndFocusCliInput(field);
  } catch (err) {
    showToast(err.message || 'Could not complete input.', 'error');
  }
}

function cliKeyEventToRawInput(event) {
  if (event.ctrlKey && !event.altKey && event.key && event.key.length === 1) {
    const code = event.key.toUpperCase().charCodeAt(0);
    if (code >= 64 && code <= 95) return String.fromCharCode(code - 64);
  }
  if (event.key === 'Enter') return '\r';
  if (event.key === 'Backspace') return '\x7f';
  if (event.key === 'Tab') return '\t';
  if (event.key === 'Escape') return '\x1b';
  if (event.key === 'ArrowUp') return '\x1b[A';
  if (event.key === 'ArrowDown') return '\x1b[B';
  if (event.key === 'ArrowRight') return '\x1b[C';
  if (event.key === 'ArrowLeft') return '\x1b[D';
  if (event.key === 'Home') return '\x1b[H';
  if (event.key === 'End') return '\x1b[F';
  if (event.key === 'Delete') return '\x1b[3~';
  if (!event.ctrlKey && !event.metaKey && event.key && event.key.length === 1) return event.key;
  return '';
}


function cliConfiguredSudoPassword() {
  const credentials = normalizeCredentials(cliActiveItem?.credentials);
  const password = credentials?.password ? String(credentials.password) : '';
  return password.replace(/[\r\n]+/g, '');
}


function cliSelectionText() {
  try {
    const selection = window.getSelection?.();
    return selection?.toString?.() || '';
  } catch {
    return '';
  }
}

function cliShortcutRaw(shortcut) {
  switch (shortcut) {
    case 'ctrl-c': return '\x03';
    case 'ctrl-d': return '\x04';
    case 'ctrl-z': return '\x1a';
    case 'ctrl-l': return '\x0c';
    default: return '';
  }
}

async function sendCliShortcut(shortcut) {
  if (!cliSession) {
    showToast('No active SSH session.', 'error');
    return false;
  }
  const raw = cliShortcutRaw(shortcut);
  if (!raw) return false;
  const ok = await sendCliRawInput(raw);
  if (!ok) showToast('Could not send shortcut.', 'error');
  activeCliInput()?.focus();
  return ok;
}

function handleCliGlobalShortcut(event) {
  if (!isCliVisible() || !cliSession) return;
  if (!event.ctrlKey || event.altKey || event.metaKey) return;
  const key = String(event.key || '').toLowerCase();
  const supported = ['c', 'd', 'z', 'l'];
  if (!supported.includes(key)) return;

  // Keep the browser copy shortcut when the user selected text.
  if (key === 'c' && cliSelectionText()) return;

  event.preventDefault();
  event.stopPropagation();
  const map = { c: 'ctrl-c', d: 'ctrl-d', z: 'ctrl-z', l: 'ctrl-l' };
  sendCliShortcut(map[key]);
}

document.addEventListener('keydown', handleCliGlobalShortcut, true);

async function pasteSudoPasswordToCli() {
  if (!cliSession) {
    showToast('No active SSH session.', 'error');
    return;
  }
  const password = cliConfiguredSudoPassword();
  if (!password) {
    showToast('No password is saved for this CLI target.', 'error');
    return;
  }
  const ok = await sendCliRawInput(`${password}\n`);
  if (ok) {
    showToast('Sudo password sent.');
    activeCliInput()?.focus();
  } else {
    showToast('Could not send sudo password.', 'error');
  }
}

async function sendCliInput() {
  if (!cliSession) return;
  const els = activeCliEls();
  const value = els.input?.value || '';
  if (!value) return;
  rememberCliCommand(value);
  els.input.value = '';
  autosizeCliInput(els.input);
  const ok = await sendCliRawInput(`${value.replace(/\r\n/g, '\n')}\n`);
  if (!ok) showToast('Could not send command.', 'error');
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
  const text = cliPlainOutputForCopy() || (els.terminal?.innerText || els.terminal?.textContent || '');
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
  if (['router-gateway', 'switch'].includes(item.hardwareKind) && item.switchPorts) bits.push(`Ports: ${item.switchPorts}`);
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
  if (item.type === 'vm' || item.type === 'lxc') {
    const seen = new Set([item.id]);
    let host = byId[item.virtualHostedOn || item.hostedOn];
    while (host && !seen.has(host.id)) {
      seen.add(host.id);
      const hostNet = (host.connections || []).map((id) => byId[id]).find((entry) => entry?.type === 'network');
      if (hostNet) return hostNet.networkColor || '';
      if (!['vm', 'lxc'].includes(host.type)) break;
      host = byId[host.virtualHostedOn || host.hostedOn];
    }
  }
  return '';
}

function hostingLabel(item) {
  if (item.type === 'hardware') {
    const guests = items.filter((candidate) => (candidate.type === 'vm' || candidate.type === 'lxc') && candidate.hostedOn === item.id);
    return guests.length ? `Host VMs/LXCs: ${guests.map((guest) => guest.name).join(', ')}` : 'Host VMs/LXCs: none';
  }
  if (item.type === 'vm' || item.type === 'lxc') {
    const parentId = item.virtualHostedOn || item.hostedOn;
    const host = parentId ? findById(parentId) : null;
    const nestedGuests = items.filter((candidate) => ['vm', 'lxc'].includes(candidate.type) && candidate.virtualHostedOn === item.id);
    const parts = [`Hosted on: ${parentId ? (host ? host.name : parentId) : 'not set'}`];
    if (nestedGuests.length) parts.push(`Hosts VMs/LXCs: ${nestedGuests.map((guest) => guest.name).join(', ')}`);
    return parts.join(' | ');
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
  hostedOnSelect.value = [...hostedOnSelect.options].some((option) => option.value === selected) ? selected : '';
  syncHostingSelectors();
}

function virtualHostWouldBeDescendant(candidateId, ancestorId) {
  if (!candidateId || !ancestorId) return false;
  const seen = new Set();
  let current = findById(candidateId);
  while (current && ['vm', 'lxc'].includes(current.type) && !seen.has(current.id)) {
    if (current.id === ancestorId) return true;
    seen.add(current.id);
    current = current.virtualHostedOn ? findById(current.virtualHostedOn) : null;
  }
  return false;
}

function refreshAppHostOptions() {
  const selected = appHostedOnSelect.value;
  appHostedOnSelect.innerHTML = '<option value="">Not set</option>';
  items.filter((item) => item.type === 'vm' || item.type === 'lxc').forEach((host) => {
    if (editingId && (host.id === editingId || virtualHostWouldBeDescendant(host.id, editingId))) return;
    const option = document.createElement('option');
    option.value = host.id;
    option.textContent = `${host.name} (${label(host.type)})`;
    appHostedOnSelect.appendChild(option);
  });
  appHostedOnSelect.value = [...appHostedOnSelect.options].some((option) => option.value === selected) ? selected : '';
  syncHostingSelectors();
}

function syncHostingSelectors(changed = '') {
  const isVmOrLxc = ['vm', 'lxc'].includes(typeSelect.value);
  if (!isVmOrLxc) {
    hostedOnSelect.disabled = false;
    appHostedOnSelect.disabled = false;
    hostedOnWrap.classList.remove('hosting-option-disabled');
    appHostedOnWrap.classList.remove('hosting-option-disabled');
    return;
  }

  if (changed === 'hardware' && hostedOnSelect.value) appHostedOnSelect.value = '';
  if (changed === 'virtual' && appHostedOnSelect.value) hostedOnSelect.value = '';

  const hasHardwareHost = Boolean(hostedOnSelect.value);
  const hasVirtualHost = Boolean(appHostedOnSelect.value);
  hostedOnSelect.disabled = hasVirtualHost;
  appHostedOnSelect.disabled = hasHardwareHost;
  hostedOnWrap.classList.toggle('hosting-option-disabled', hasVirtualHost);
  appHostedOnWrap.classList.toggle('hosting-option-disabled', hasHardwareHost);
}

function hardwareInfraOptions() {
  return items.filter((item) => item.type === 'hardware' && ['router-gateway', 'switch'].includes(item.hardwareKind) && item.id !== editingId);
}

function formatInfraOption(item, selectedIds = []) {
  const ports = item.switchPorts ? ` (${item.switchPorts} ports)` : '';
  return `${selectedIds.includes(item.id) ? '✓ ' : ''}${item.name} (${hardwareTypeLabel(item.hardwareKind)})${ports}`;
}

function formatConnectionDeviceOption(item, selectedIds = []) {
  return `${selectedIds.includes(item.id) ? '✓ ' : ''}${item.name} (${hardwareTypeLabel(item.hardwareKind)})`;
}

function updateConnectionSelectLabels(select) {
  if (!select) return;
  const selected = getMultiValues(select);
  [...select.options].forEach((option) => {
    const item = findById(option.value);
    if (!item) return;
    option.textContent = select === switchDeviceLinks
      ? formatConnectionDeviceOption(item, selected)
      : formatInfraOption(item, selected);
  });
}

function refreshHardwareConnectionOptions() {
  const selectedRouter = getMultiValues(routerSwitches);
  const selectedInfra = getMultiValues(switchLinks);
  const selectedDevices = getMultiValues(switchDeviceLinks);

  const infra = hardwareInfraOptions();
  routerSwitches.innerHTML = '';
  switchLinks.innerHTML = '';
  infra.forEach((entry) => {
    const option = document.createElement('option');
    option.value = entry.id;
    option.textContent = formatInfraOption(entry, selectedRouter);
    const switchOption = document.createElement('option');
    switchOption.value = entry.id;
    switchOption.textContent = formatInfraOption(entry, selectedInfra);
    routerSwitches.appendChild(option);
    switchLinks.appendChild(switchOption);
  });

  switchDeviceLinks.innerHTML = '';
  items
    .filter((item) => item.type === 'hardware' && !['router-gateway', 'switch'].includes(item.hardwareKind) && item.id !== editingId)
    .forEach((device) => {
      const option = document.createElement('option');
      option.value = device.id;
      option.textContent = formatConnectionDeviceOption(device, selectedDevices);
      switchDeviceLinks.appendChild(option);
    });

  setMultiValues(routerSwitches, selectedRouter);
  setMultiValues(switchLinks, selectedInfra);
  setMultiValues(switchDeviceLinks, selectedDevices);
  updateConnectionSelectLabels(routerSwitches);
  updateConnectionSelectLabels(switchLinks);
  updateConnectionSelectLabels(switchDeviceLinks);
}

function enableToggleMultiSelect(select) {
  if (!select) return;
  select.addEventListener('mousedown', (event) => {
    if (event.target?.tagName !== 'OPTION') return;
    event.preventDefault();
    const option = event.target;
    option.selected = !option.selected;
    updateConnectionSelectLabels(select);
    select.dispatchEvent(new Event('change', { bubbles: true }));
    requestAnimationFrame(() => updateConnectionSelectLabels(select));
  });
  select.addEventListener('change', () => updateConnectionSelectLabels(select));
}

[routerSwitches, switchLinks, switchDeviceLinks].forEach(enableToggleMultiSelect);

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
  renderNetworkPortRows(item.networkPorts || [], item.ip || '');
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
  appHostedOnSelect.value = item.type === 'app' ? (item.appHostedOn || '') : (item.virtualHostedOn || '');
  syncHostingSelectors();
  if (item.type === 'hardware' && item.hardwareKind === 'router-gateway') {
    setMultiValues(routerSwitches, item.connections || []);
  }
  if (item.type === 'hardware' && item.hardwareKind === 'switch') {
    const infraIds = items
      .filter((entry) => entry.type === 'hardware' && ['router-gateway', 'switch'].includes(entry.hardwareKind))
      .map((entry) => entry.id);
    setMultiValues(switchLinks, (item.connections || []).filter((id) => infraIds.includes(id)));
    setMultiValues(switchDeviceLinks, (item.connections || []).filter((id) => !infraIds.includes(id)));
  }
  updateConnectionSelectLabels(routerSwitches);
  updateConnectionSelectLabels(switchLinks);
  updateConnectionSelectLabels(switchDeviceLinks);
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
    empty.className = 'tree-empty empty-state empty-state-compact';
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
    if (item.type === 'vm' || item.type === 'lxc') {
      const parentId = item.virtualHostedOn || item.hostedOn;
      if (parentId) addGraphEdge(parentId, item.id);
    }
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
    if (item.type === 'vm' || item.type === 'lxc') return graphById[item.virtualHostedOn || item.hostedOn]?.id || '';
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
  section.className = 'tree-section tree-section-redesign';

  const hardware = items.filter((item) => item.type === 'hardware');
  const vms = items.filter((item) => item.type === 'vm');
  const lxcs = items.filter((item) => item.type === 'lxc');
  const apps = items.filter((item) => item.type === 'app');
  const guests = [...vms, ...lxcs];
  const hardwareById = new Map(hardware.map((item) => [item.id, item]));
  const guestById = new Map(guests.map((item) => [item.id, item]));

  const byName = (a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true });
  const guestSort = (a, b) => {
    const rank = { vm: 0, lxc: 1 };
    return (rank[a.type] ?? 9) - (rank[b.type] ?? 9) || byName(a, b);
  };

  const header = document.createElement('div');
  header.className = 'tree-overview-head';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'tree-overview-title';
  titleWrap.innerHTML = '<h4>Infrastructure</h4><p>Resources are grouped by hardware type, host, guest and application.</p>';
  header.appendChild(titleWrap);

  const controls = document.createElement('div');
  controls.className = 'tree-overview-controls';
  const expandButton = document.createElement('button');
  expandButton.type = 'button';
  expandButton.className = 'button secondary tree-control-button';
  expandButton.textContent = 'Expand all';
  const collapseButton = document.createElement('button');
  collapseButton.type = 'button';
  collapseButton.className = 'button secondary tree-control-button';
  collapseButton.textContent = 'Collapse all';
  controls.append(expandButton, collapseButton);
  header.appendChild(controls);
  section.appendChild(header);

  const stats = document.createElement('div');
  stats.className = 'tree-overview-stats';
  [
    ['Hardware', hardware.length, 'hardware'],
    ['VMs', vms.length, 'vm'],
    ['LXCs', lxcs.length, 'lxc'],
    ['Apps', apps.length, 'app'],
  ].forEach(([name, value, type]) => {
    const stat = document.createElement('div');
    stat.className = `tree-overview-stat ${type}`;
    stat.innerHTML = `<strong>${value}</strong><span>${name}</span>`;
    stats.appendChild(stat);
  });
  section.appendChild(stats);

  const body = document.createElement('div');
  body.className = 'tree-body tree-redesign-body';

  function resourceIcon(item) {
    const icon = document.createElement('span');
    icon.className = `tree-node-icon ${item.type}`;
    icon.textContent = item.symbol || defaultSymbol(item.type, item.hardwareKind);
    return icon;
  }

  function resourceText(item, subtitle) {
    const textWrap = document.createElement('span');
    textWrap.className = 'tree-node-text';
    const name = document.createElement('strong');
    name.textContent = item.name || 'Unnamed resource';
    const meta = document.createElement('small');
    meta.textContent = subtitle;
    textWrap.append(name, meta);
    return textWrap;
  }

  function countBadge(text, kind = '') {
    const badge = document.createElement('span');
    badge.className = `tree-node-badge ${kind}`.trim();
    badge.textContent = text;
    return badge;
  }

  function resourceSubtitle(item) {
    const parts = [];
    if (item.type === 'hardware') parts.push(hardwareTypeLabel(item.hardwareKind || 'server'));
    else parts.push(label(item.type));
    const ipValue = item.type === 'app' ? (item.ipPort || item.ip || '') : (item.ip || '');
    if (ipValue) parts.push(ipValue);
    return parts.join(' · ');
  }

  function createAppRow(app) {
    const row = document.createElement('div');
    row.className = 'tree-app-row';
    const main = document.createElement('div');
    main.className = 'tree-node-main';
    main.append(resourceIcon(app), resourceText(app, resourceSubtitle(app)));
    row.appendChild(main);
    const link = appTreeLink(app);
    if (link) {
      link.classList.add('tree-app-link');
      link.textContent = 'Open';
      row.appendChild(link);
    }
    return row;
  }

  function createGuestCard(guest, trail = new Set()) {
    const nextTrail = new Set(trail);
    nextTrail.add(guest.id);
    const nestedGuests = guests
      .filter((candidate) => candidate.virtualHostedOn === guest.id && !nextTrail.has(candidate.id))
      .sort(guestSort);
    const guestApps = apps.filter((app) => app.appHostedOn === guest.id).sort(byName);
    const hasChildren = nestedGuests.length > 0 || guestApps.length > 0;
    const card = document.createElement(hasChildren ? 'details' : 'article');
    card.className = `tree-resource-card tree-guest-card ${guest.type}${hasChildren ? ' tree-resource-details' : ' tree-resource-leaf'}`;

    const summary = document.createElement(hasChildren ? 'summary' : 'div');
    summary.className = 'tree-resource-summary';
    const main = document.createElement('div');
    main.className = 'tree-node-main';
    main.append(resourceIcon(guest), resourceText(guest, resourceSubtitle(guest)));
    summary.appendChild(main);
    const badges = document.createElement('div');
    badges.className = 'tree-node-badges';
    badges.appendChild(countBadge(guest.type === 'vm' ? 'VM' : 'LXC', guest.type));
    if (nestedGuests.length) badges.appendChild(countBadge(`${nestedGuests.length} guest${nestedGuests.length === 1 ? '' : 's'}`, 'guest'));
    if (guestApps.length) badges.appendChild(countBadge(`${guestApps.length} app${guestApps.length === 1 ? '' : 's'}`, 'app'));
    summary.appendChild(badges);
    card.appendChild(summary);

    if (hasChildren) {
      const children = document.createElement('div');
      children.className = 'tree-resource-children tree-guest-children';
      if (nestedGuests.length) {
        const guestSection = document.createElement('section');
        guestSection.className = 'tree-child-section';
        guestSection.innerHTML = `<div class="tree-child-title">Nested guests <span>${nestedGuests.length}</span></div>`;
        const guestGrid = document.createElement('div');
        guestGrid.className = 'tree-guest-grid';
        nestedGuests.forEach((nestedGuest) => guestGrid.appendChild(createGuestCard(nestedGuest, nextTrail)));
        guestSection.appendChild(guestGrid);
        children.appendChild(guestSection);
      }
      if (guestApps.length) {
        const appSection = document.createElement('section');
        appSection.className = 'tree-child-section';
        appSection.innerHTML = `<div class="tree-child-title">Applications <span>${guestApps.length}</span></div>`;
        const appGrid = document.createElement('div');
        appGrid.className = 'tree-app-grid';
        guestApps.forEach((app) => appGrid.appendChild(createAppRow(app)));
        appSection.appendChild(appGrid);
        children.appendChild(appSection);
      }
      card.appendChild(children);
    }
    return card;
  }

  function createHostCard(host) {
    const hostGuests = guests.filter((guest) => guest.hostedOn === host.id).sort(guestSort);
    const directApps = apps.filter((app) => app.appHostedOn === host.id).sort(byName);
    const hasChildren = hostGuests.length > 0 || directApps.length > 0;
    const card = document.createElement(hasChildren ? 'details' : 'article');
    card.className = `tree-resource-card tree-host-card${hasChildren ? ' tree-resource-details' : ' tree-resource-leaf'}`;
    card.dataset.hostId = host.id;
    card._treeHost = host;

    const summary = document.createElement(hasChildren ? 'summary' : 'div');
    summary.className = 'tree-resource-summary tree-host-summary';
    const main = document.createElement('div');
    main.className = 'tree-node-main';
    main.append(resourceIcon(host), resourceText(host, resourceSubtitle(host)));
    summary.appendChild(main);

    const badges = document.createElement('div');
    badges.className = 'tree-node-badges';
    if (hostGuests.length) badges.appendChild(countBadge(`${hostGuests.length} guest${hostGuests.length === 1 ? '' : 's'}`, 'guest'));
    if (directApps.length) badges.appendChild(countBadge(`${directApps.length} direct app${directApps.length === 1 ? '' : 's'}`, 'app'));
    if (!hasChildren) badges.appendChild(countBadge('No children', 'empty'));
    summary.appendChild(badges);
    card.appendChild(summary);

    if (hasChildren) {
      const children = document.createElement('div');
      children.className = 'tree-resource-children tree-host-children';

      if (hostGuests.length) {
        const guestSection = document.createElement('section');
        guestSection.className = 'tree-child-section';
        guestSection.innerHTML = `<div class="tree-child-title">Guests <span>${hostGuests.length}</span></div>`;
        const guestGrid = document.createElement('div');
        guestGrid.className = 'tree-guest-grid';
        hostGuests.forEach((guest) => guestGrid.appendChild(createGuestCard(guest)));
        guestSection.appendChild(guestGrid);
        children.appendChild(guestSection);
      }

      if (directApps.length) {
        const appSection = document.createElement('section');
        appSection.className = 'tree-child-section';
        appSection.innerHTML = `<div class="tree-child-title">Direct applications <span>${directApps.length}</span></div>`;
        const appGrid = document.createElement('div');
        appGrid.className = 'tree-app-grid';
        directApps.forEach((app) => appGrid.appendChild(createAppRow(app)));
        appSection.appendChild(appGrid);
        children.appendChild(appSection);
      }
      card.appendChild(children);
    }
    return card;
  }

  const desktopTreeMedia = window.matchMedia('(min-width: 901px)');

  function createHostDetailPanel() {
    const panel = document.createElement('aside');
    panel.className = 'tree-desktop-host-detail';
    panel.innerHTML = `
      <div class="tree-detail-placeholder">
        <span class="tree-detail-placeholder-icon">↳</span>
        <strong>Select a host</strong>
        <span>Choose a host on the left to view its guests and direct applications.</span>
      </div>
    `;
    return panel;
  }

  function clearHostDetailPanel(grid, panel) {
    grid.querySelectorAll('.tree-host-card').forEach((card) => card.classList.remove('tree-host-selected'));
    panel.removeAttribute('data-active-host-id');
    panel.innerHTML = `
      <div class="tree-detail-placeholder">
        <span class="tree-detail-placeholder-icon">↳</span>
        <strong>Select a host</strong>
        <span>Choose a host on the left to view its guests and direct applications.</span>
      </div>
    `;
  }

  function renderHostDetailPanel(grid, panel, card) {
    const host = card._treeHost;
    if (!host) return;

    grid.querySelectorAll('.tree-host-card').forEach((entry) => entry.classList.toggle('tree-host-selected', entry === card));
    panel.dataset.activeHostId = host.id;
    panel.replaceChildren();

    const header = document.createElement('div');
    header.className = 'tree-detail-header';
    const main = document.createElement('div');
    main.className = 'tree-node-main';
    main.append(resourceIcon(host), resourceText(host, resourceSubtitle(host)));
    header.appendChild(main);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'tree-detail-close';
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', () => {
      if (card.tagName === 'DETAILS') card.open = false;
      clearHostDetailPanel(grid, panel);
    });
    header.appendChild(closeButton);
    panel.appendChild(header);

    const sourceChildren = card.querySelector(':scope > .tree-host-children');
    if (sourceChildren) {
      const content = sourceChildren.cloneNode(true);
      content.classList.add('tree-detail-content');
      panel.appendChild(content);
    } else {
      const empty = document.createElement('div');
      empty.className = 'tree-detail-empty empty-state';
      empty.innerHTML = '<strong>No linked resources</strong><span>This host has no guests or direct applications.</span>';
      panel.appendChild(empty);
    }
  }

  function bindDesktopHostDetails(grid, panel) {
    let syncing = false;
    const cards = Array.from(grid.querySelectorAll('.tree-host-card'));

    function selectCard(card) {
      if (!desktopTreeMedia.matches) return;
      syncing = true;
      cards.forEach((entry) => {
        if (entry !== card && entry.tagName === 'DETAILS') entry.open = false;
      });
      syncing = false;
      renderHostDetailPanel(grid, panel, card);
    }

    cards.forEach((card) => {
      if (card.tagName === 'DETAILS') {
        card.addEventListener('toggle', () => {
          if (syncing || !desktopTreeMedia.matches) return;
          if (card.open) selectCard(card);
          else if (panel.dataset.activeHostId === card.dataset.hostId) clearHostDetailPanel(grid, panel);
        });
      } else {
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.addEventListener('click', () => selectCard(card));
        card.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          selectCard(card);
        });
      }
    });
  }

  const preferredKindOrder = ['router-gateway', 'switch', 'hypervisor', 'server', 'nas', 'backup', 'pc'];
  const actualKinds = [...new Set(hardware.map((host) => host.hardwareKind || 'server'))];
  const orderedKinds = [
    ...preferredKindOrder.filter((kind) => actualKinds.includes(kind)),
    ...actualKinds.filter((kind) => !preferredKindOrder.includes(kind)).sort(),
  ];

  orderedKinds.forEach((kind) => {
    const hosts = hardware.filter((host) => (host.hardwareKind || 'server') === kind).sort(byName);
    const group = document.createElement('details');
    group.className = 'tree-kind-group';
    group.open = true;

    const summary = document.createElement('summary');
    summary.className = 'tree-kind-summary';
    const title = document.createElement('span');
    title.className = 'tree-kind-title';
    title.innerHTML = `<strong>${escapeHtml(hardwareTypeLabel(kind))}</strong><small>${hosts.length} resource${hosts.length === 1 ? '' : 's'}</small>`;
    summary.appendChild(title);
    summary.appendChild(countBadge(String(hosts.length), 'group'));
    group.appendChild(summary);

    const layout = document.createElement('div');
    layout.className = 'tree-kind-layout';

    const grid = document.createElement('div');
    grid.className = 'tree-host-grid';
    hosts.forEach((host) => grid.appendChild(createHostCard(host)));

    const detailPanel = createHostDetailPanel();
    layout.append(grid, detailPanel);
    group.appendChild(layout);
    bindDesktopHostDetails(grid, detailPanel);
    body.appendChild(group);
  });

  const orphanGuests = guests.filter((guest) => {
    if (guest.virtualHostedOn) return !guestById.has(guest.virtualHostedOn);
    return !guest.hostedOn || !hardwareById.has(guest.hostedOn);
  }).sort(guestSort);
  const orphanApps = apps.filter((app) => {
    if (!app.appHostedOn) return true;
    return !hardwareById.has(app.appHostedOn) && !guestById.has(app.appHostedOn);
  }).sort(byName);

  if (orphanGuests.length || orphanApps.length) {
    const group = document.createElement('details');
    group.className = 'tree-kind-group tree-unassigned-group';
    group.open = true;

    const summary = document.createElement('summary');
    summary.className = 'tree-kind-summary';
    const title = document.createElement('span');
    title.className = 'tree-kind-title';
    title.innerHTML = `<strong>Unassigned resources</strong><small>Missing or invalid parent relationship</small>`;
    summary.appendChild(title);
    summary.appendChild(countBadge(String(orphanGuests.length + orphanApps.length), 'warning'));
    group.appendChild(summary);

    const content = document.createElement('div');
    content.className = 'tree-unassigned-grid';
    orphanGuests.forEach((guest) => content.appendChild(createGuestCard(guest)));
    orphanApps.forEach((app) => content.appendChild(createAppRow(app)));
    group.appendChild(content);
    body.appendChild(group);
  }

  if (!hardware.length && !guests.length && !apps.length) {
    const empty = document.createElement('div');
    empty.className = 'tree-empty-state empty-state';
    empty.innerHTML = '<strong>No infrastructure resources yet.</strong><span>Add hardware, VMs, LXCs or apps to build the relationship tree.</span>';
    body.appendChild(empty);
  }

  expandButton.addEventListener('click', () => {
    body.querySelectorAll('details').forEach((details) => { details.open = true; });
  });
  collapseButton.addEventListener('click', () => {
    body.querySelectorAll('details').forEach((details) => { details.open = false; });
  });

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
      empty.className = 'tree-empty empty-state empty-state-compact';
      empty.textContent = 'No matched resources.';
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
    empty.className = 'tree-empty empty-state empty-state-compact';
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
if (mobileTreeModeTree) mobileTreeModeTree.addEventListener('click', () => {
  treeViewMode = 'tree';
  mobileTreeModeTree.classList.add('active');
  mobileTreeModeGraph.classList.remove('active');
  renderMobileTree();
});
// Mobile Graph view is intentionally disabled; desktop Graph view remains available.
if (mobileTreeModeGraph) mobileTreeModeGraph.addEventListener('click', () => {
  treeViewMode = 'tree';
  mobileTreeModeTree?.classList.add('active');
  mobileTreeModeGraph.classList.remove('active');
  renderMobileTree();
});

function renderMobileTree() {
  const container = document.getElementById('mobile-tree-content');
  if (!container) return;
  treeViewMode = 'tree';
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
  const matched = query ? allIPs.filter((e) => {
    const portLabel = Number.isInteger(e.networkPortIndex) ? `port ${e.networkPortIndex + 1}` : '';
    const speedLabel = networkPortSpeedLabel(e.speed).toLowerCase();
    return e.addr.includes(query) || (e.port && e.port.includes(query)) || e.item.name.toLowerCase().includes(query) || portLabel.includes(query) || speedLabel.includes(query);
  }) : allIPs;

  if (!matched.length) {
    const empty = document.createElement('p');
    empty.className = 'tree-empty empty-state empty-state-compact';
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
    renderCommandSnippets();
    if (typeof renderAgentKeyLists === 'function') renderAgentKeyLists();
  } catch {
    showToast('Invalid config file.', 'error');
  } finally {
    importFileMobile.value = '';
  }
});

const clearAllMobile = document.getElementById('clear-all-mobile');
if (clearAllMobile) clearAllMobile.addEventListener('click', async () => {
  if (!confirm('Delete all resources? This also clears all rack, location, custom theme and API key data.')) return;
  items = []; locations = []; racks = []; commandSnippets = []; selectedCommandSnippetId = null;
  localStorage.removeItem('labby-custom-themes');
  await clearAllAgentKeys();
  stopEditing();
  await saveItems();
  showToast('All resources, custom themes and API keys cleared.');
  render();
  if (typeof renderThemeLists === 'function') renderThemeLists();
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
  { componentType: '3u-server',      heightU: 3, label: '3U Server',      category: 'compute' },
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
  { componentType: '3u-ups',         heightU: 3, label: '3U UPS',         category: 'power' },
  { componentType: '4u-ups',         heightU: 4, label: '4U UPS',         category: 'power' },
  { componentType: '1u-pdu',         heightU: 1, label: '1U PDU',         category: 'power', isPDU: true },
  { componentType: '2u-pdu',         heightU: 2, label: '2U PDU',         category: 'power', isPDU: true },
  { componentType: '3u-pdu',         heightU: 3, label: '3U PDU',         category: 'power', isPDU: true },
  // ── Management ───────────────────────────────────────────────
  { componentType: '1u-kvm',         heightU: 1, label: '1U KVM',         category: 'mgmt' },
  { componentType: '2u-kvm',         heightU: 2, label: '2U KVM',         category: 'mgmt' },
  // ── Filler ───────────────────────────────────────────────────
  { componentType: '1u-blank',       heightU: 1, label: '1U Blank',       category: 'filler', isBlank: true },
  { componentType: '2u-blank',       heightU: 2, label: '2U Blank',       category: 'filler', isBlank: true },
  { componentType: '3u-blank',       heightU: 3, label: '3U Blank',       category: 'filler', isBlank: true },
  { componentType: '4u-blank',       heightU: 4, label: '4U Blank',       category: 'filler', isBlank: true },
];

// ---- State ----
let rackEditorRackId = null;
let rackDragComponent = null;
let rackTouchDragState = null;
let rackTouchDragSuppressClickUntil = 0;
let rackContextSuppressClickUntil = 0;
let rackLinkPanelTarget = null;
let rackFormMode = null;
let rackFormPendingLocationId = null;

// ---- DOM refs ----
const rackOverview     = document.getElementById('rack-overview');
const rackEditor       = document.getElementById('rack-editor');
const rackEditorBody   = document.getElementById('rack-editor-body');
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
// rackFormBack removed - dialog now uses inline close buttons
const phoneGrid         = document.querySelector('.phone-grid');

// ---- Helpers ----
function rackById(id)     { return racks.find(r => r.id === id); }
function locationById(id) { return locations.find(l => l.id === id); }

async function saveRackData() { await saveItemsToAPI(items); }

function openDefaultRackWorkspace() {
  if (racks.length === 0) {
    renderRackOverview();
    showRackOverlay('rack-overview');
    return;
  }
  const current = rackEditorRackId && rackById(rackEditorRackId) ? rackEditorRackId : racks[0].id;
  openRackEditor(current);
}

function showRackOverlay(id) {
  // Only toggle the full-screen overlays - never the form dialog
  if (id !== 'rack-editor') closeLinkPanel();
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
    if (isMobile()) {
      renderRackOverview();
      showRackOverlay('rack-overview');
      setActiveMobileNav('nav-rack');
      return;
    }
    openDefaultRackWorkspace();
  });
}
// Header buttons are now rendered dynamically inside renderRackOverview()

// ---- Rack Overview ----
function renderRackOverview() {
  if (!rackOverviewBody) return;
  rackOverviewBody.innerHTML = '';

  // Inner wrapper - same max-width as dashboard
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
    es.className = 'rack-empty-state empty-state empty-state-action';
    es.innerHTML = `
      <div style="font-size:3rem">🗄️</div>
      <h3>No racks yet</h3>
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
      empty.className = 'empty-state empty-state-compact rack-location-empty';
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
        card.addEventListener('click', () => {
          if (isRackContextClickSuppressed()) return;
          openRackEditor(rack.id);
        });
        // Desktop right-click and tablet long press context menu.
        card.addEventListener('contextmenu', e => {
          e.preventDefault();
          showRackContextMenu(e.clientX, e.clientY, rack);
        });
        bindRackLongPressContext(card, (x, y, options) => showRackContextMenu(x, y, rack, options));
        grid.appendChild(card);
      });
    }
  }

  locSel.addEventListener('change', renderCards);
  renderCards();
}

// ── Context menu ─────────────────────────────────────────────
function isRackContextClickSuppressed() {
  return Date.now() < rackContextSuppressClickUntil;
}

function bindRackLongPressContext(element, openMenu) {
  if (!element || typeof openMenu !== 'function' || element.dataset.rackLongPressBound === 'true') return;
  element.dataset.rackLongPressBound = 'true';
  let pressState = null;

  const clearPress = ({ releaseCapture = true } = {}) => {
    if (!pressState) return;
    const pointerId = pressState.pointerId;
    window.clearTimeout(pressState.timer);
    element.classList.remove('rack-context-pressing');
    pressState = null;
    if (releaseCapture && element.hasPointerCapture?.(pointerId)) {
      try { element.releasePointerCapture(pointerId); } catch {}
    }
  };

  element.addEventListener('pointerdown', (event) => {
    if (!['touch', 'pen'].includes(event.pointerType) || event.button !== 0) return;
    clearPress();
    const startX = event.clientX;
    const startY = event.clientY;

    // Keep the release event on the original rack or location entry. Without
    // pointer capture, the menu can appear below the finger and immediately
    // consume the release that opened it on some tablet browsers.
    try { element.setPointerCapture(event.pointerId); } catch {}

    pressState = {
      pointerId: event.pointerId,
      startX,
      startY,
      triggered: false,
      timer: window.setTimeout(() => {
        if (!pressState || pressState.pointerId !== event.pointerId) return;
        pressState.triggered = true;
        rackContextSuppressClickUntil = Date.now() + 1000;
        element.classList.remove('rack-context-pressing');
        navigator.vibrate?.(18);
        openMenu(startX + 14, startY + 14, { openedByTouch: true });
      }, 560),
    };
    element.classList.add('rack-context-pressing');
  }, { passive: true });

  element.addEventListener('pointermove', (event) => {
    if (!pressState || pressState.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - pressState.startX, event.clientY - pressState.startY) > 12) clearPress();
  }, { passive: true });

  const finishPress = (event) => {
    if (!pressState || pressState.pointerId !== event.pointerId) return;
    const triggered = pressState.triggered;
    clearPress();
    if (triggered) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  element.addEventListener('pointerup', finishPress, { passive: false });
  element.addEventListener('pointercancel', () => clearPress(), { passive: true });
  element.addEventListener('lostpointercapture', () => clearPress({ releaseCapture: false }), { passive: true });
}

function closeContextMenu() {
  const existing = document.getElementById('rack-ctx-menu');
  if (!existing) return;
  existing._dismissCleanup?.();
  existing.remove();
}

function positionRackContextMenu(menu, x, y) {
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  const gap = 10;
  const left = Math.max(gap, Math.min(x, window.innerWidth - rect.width - gap));
  const top = Math.max(gap, Math.min(y, window.innerHeight - rect.height - gap));
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function bindRackContextMenuDismiss(menu, { openedByTouch = false } = {}) {
  let armed = !openedByTouch;
  let armTimer = null;

  const outsideHandler = (event) => {
    if (!armed || menu.contains(event.target)) return;
    closeContextMenu();
  };

  const cleanup = () => {
    window.clearTimeout(armTimer);
    document.removeEventListener('pointerdown', outsideHandler, true);
  };

  menu._dismissCleanup = cleanup;
  document.addEventListener('pointerdown', outsideHandler, true);

  // Ignore the pointer sequence that opened the menu. The next intentional
  // tap can still select an action because menu clicks are handled directly.
  if (openedByTouch) armTimer = window.setTimeout(() => { armed = true; }, 180);
}

function refreshRackWorkspaceAfterDelete(deletedRackIds = []) {
  const activeRackWasDeleted = deletedRackIds.includes(rackEditorRackId);
  renderRackOverview();

  if (activeRackWasDeleted) {
    const nextRack = racks[0];
    if (nextRack) openRackEditor(nextRack.id);
    else showRackOverlay('rack-overview');
    return;
  }

  if (rackEditor && !rackEditor.classList.contains('hidden')) {
    renderRackEditorSidebar();
  }
}

function deleteRackFromContext(rack) {
  if (!rack || !confirm(`Delete rack "${rack.name}"? This cannot be undone.`)) return false;
  racks = racks.filter((entry) => entry.id !== rack.id);
  saveRackData();
  refreshRackWorkspaceAfterDelete([rack.id]);
  showToast('Rack deleted.');
  return true;
}

function deleteLocationFromContext(location) {
  if (!location || !confirm(`Delete location "${location.name}"? All racks there will also be deleted.`)) return false;
  const deletedRackIds = racks.filter((rack) => rack.locationId === location.id).map((rack) => rack.id);
  racks = racks.filter((rack) => rack.locationId !== location.id);
  locations = locations.filter((entry) => entry.id !== location.id);
  saveRackData();
  refreshRackWorkspaceAfterDelete(deletedRackIds);
  showToast('Location deleted.');
  return true;
}

function showRackContextMenu(x, y, rack, options = {}) {
  closeContextMenu();
  const menu = document.createElement('div');
  menu.className = 'rack-ctx-menu';
  menu.id = 'rack-ctx-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = `
    <button class="rack-ctx-item" type="button" data-rack-context-action="open">📂 Open Editor</button>
    <button class="rack-ctx-item" type="button" data-rack-context-action="edit">✏️ Edit Rack</button>
    <div class="rack-ctx-sep" role="separator"></div>
    <button class="rack-ctx-item danger" type="button" data-rack-context-action="delete">🗑 Delete Rack</button>
  `;

  menu.addEventListener('click', (event) => {
    const action = event.target.closest('[data-rack-context-action]')?.dataset.rackContextAction;
    if (!action) return;
    event.stopPropagation();
    closeContextMenu();
    if (action === 'open') openRackEditor(rack.id);
    if (action === 'edit') openRackForm(rack.id, null);
    if (action === 'delete') deleteRackFromContext(rack);
  });

  positionRackContextMenu(menu, x, y);
  bindRackContextMenuDismiss(menu, options);
  if (!options.openedByTouch) menu.querySelector('[data-rack-context-action="open"]')?.focus({ preventScroll: true });
}

function showLocationContextMenu(x, y, location, options = {}) {
  closeContextMenu();
  const rackCount = racks.filter((rack) => rack.locationId === location.id).length;
  const menu = document.createElement('div');
  menu.className = 'rack-ctx-menu';
  menu.id = 'rack-ctx-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = `
    <button class="rack-ctx-item" type="button" data-location-context-action="edit">✏️ Edit Location</button>
    <button class="rack-ctx-item" type="button" data-location-context-action="add-rack">➕ Add Rack Here</button>
    <div class="rack-ctx-sep" role="separator"></div>
    <button class="rack-ctx-item danger" type="button" data-location-context-action="delete">🗑 Delete Location${rackCount ? ` (${rackCount} rack${rackCount === 1 ? '' : 's'})` : ''}</button>
  `;

  menu.addEventListener('click', (event) => {
    const action = event.target.closest('[data-location-context-action]')?.dataset.locationContextAction;
    if (!action) return;
    event.stopPropagation();
    closeContextMenu();
    if (action === 'edit') openLocationForm(null, location.id);
    if (action === 'add-rack') openRackForm(null, location.id);
    if (action === 'delete') deleteLocationFromContext(location);
  });

  positionRackContextMenu(menu, x, y);
  bindRackContextMenuDismiss(menu, options);
  if (!options.openedByTouch) menu.querySelector('[data-location-context-action="edit"]')?.focus({ preventScroll: true });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeContextMenu();
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
      rackFormDialog.close();
      renderRackOverview();
      if (isMobile()) {
        showRackOverlay('rack-overview');
      } else if (rackEditor && !rackEditor.classList.contains('hidden')) {
        renderRackEditorSidebar();
        const activeRack = rackById(rackEditorRackId);
        const activeLocation = activeRack ? locationById(activeRack.locationId) : null;
        if (rackEditorLocBadge) rackEditorLocBadge.textContent = activeLocation ? `📍 ${activeLocation.name}` : '';
      }
      showToast(existing ? 'Location updated.' : 'Location added.');
    }
  });

  if (existing) {
    document.getElementById('rf-loc-delete').addEventListener('click', () => {
      if (deleteLocationFromContext(existing)) rackFormDialog.close();
    });
  }

  if (!rackFormDialog.open) rackFormDialog.showModal();
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
      rackFormDialog.close();
      showToast('Rack updated.');
      renderRackOverview();
      openRackEditor(existing.id);
    } else {
      const rack = { id: 'rack-' + Date.now(), name, notes: document.getElementById('rf-rack-notes').value.trim(), heightUnits: hu, formFactor: ff, locationId: locId, slots: {} };
      racks.push(rack);
      saveRackData();
      rackFormDialog.close();
      openRackEditor(rack.id);
    }
  });

  if (!rackFormDialog.open) rackFormDialog.showModal();
  const rfRackClose = document.getElementById('rf-rack-close');
  if (rfRackClose) rfRackClose.addEventListener('click', () => rackFormDialog.close());
}

// ---- Rack Editor ----

function renderRackEditorSidebar() {
  if (!rackEditorBody) return;
  let sidebar = document.getElementById('rack-editor-sidebar');
  if (!sidebar) {
    sidebar = document.createElement('aside');
    sidebar.id = 'rack-editor-sidebar';
    sidebar.className = 'rack-editor-sidebar';
    const views = rackEditorBody.querySelector('.rack-views-wrap');
    rackEditorBody.insertBefore(sidebar, views || rackEditorBody.firstChild);
  }

  const activeRack = rackById(rackEditorRackId);
  const activeLocationId = activeRack?.locationId || locations[0]?.id || '';
  const locationMarkup = locations.map(loc => {
    const locRacks = racks.filter(r => r.locationId === loc.id);
    const rackRows = locRacks.length ? locRacks.map(r => `
      <button class="rack-editor-rack-row ${r.id === rackEditorRackId ? 'active' : ''}" type="button" data-rack-id="${r.id}">
        <span class="rack-editor-rack-name">${escapeHtml(r.name)}</span>
        <span class="rack-editor-rack-meta">${r.heightUnits || 42}U · ${r.formFactor === '10inch' ? '10″' : '19″'}</span>
      </button>`).join('') : '<p class="empty-state empty-state-compact rack-editor-empty-list">No racks here.</p>';
    return `
      <section class="rack-editor-location-group ${loc.id === activeLocationId ? 'active' : ''}" data-location-id="${escapeAttr(loc.id)}">
        <div class="rack-editor-location-name" data-location-context="${escapeAttr(loc.id)}">📍 ${escapeHtml(loc.name)}</div>
        <div class="rack-editor-rack-list">${rackRows}</div>
      </section>`;
  }).join('');

  sidebar.innerHTML = `
    <div class="rack-editor-sidebar-head">
      <span class="rack-editor-sidebar-title">Locations & Racks</span>
      <div class="rack-editor-sidebar-actions">
        <button class="button secondary" id="rack-sidebar-add-location" type="button">+ Location</button>
        <button class="button" id="rack-sidebar-add-rack" type="button">+ Rack</button>
      </div>
    </div>
    <div class="rack-editor-sidebar-content">
      ${locationMarkup || '<p class="empty-state empty-state-compact rack-editor-empty-list">No locations yet.</p>'}
    </div>
  `;

  sidebar.querySelector('#rack-sidebar-add-location')?.addEventListener('click', () => openLocationForm(null, null));
  sidebar.querySelector('#rack-sidebar-add-rack')?.addEventListener('click', () => openRackForm(null, activeLocationId || null));
  sidebar.querySelectorAll('[data-rack-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (isRackContextClickSuppressed()) return;
      autoSaveRack();
      openRackEditor(btn.dataset.rackId);
    });
    btn.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const rack = rackById(btn.dataset.rackId);
      if (rack) showRackContextMenu(event.clientX, event.clientY, rack);
    });
    bindRackLongPressContext(btn, (x, y, options) => {
      const rack = rackById(btn.dataset.rackId);
      if (rack) showRackContextMenu(x, y, rack, options);
    });
  });

  sidebar.querySelectorAll('[data-location-context]').forEach(header => {
    header.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const location = locationById(header.dataset.locationContext);
      if (location) showLocationContextMenu(event.clientX, event.clientY, location);
    });
    bindRackLongPressContext(header, (x, y, options) => {
      const location = locationById(header.dataset.locationContext);
      if (location) showLocationContextMenu(x, y, location, options);
    });
  });
}

function openRackEditor(rackId) {
  closeLinkPanel();
  rackEditorRackId = rackId;
  const rack = rackById(rackId);
  if (!rack) return;
  const loc = locationById(rack.locationId);
  rackEditorName.textContent = rack.name;
  rackEditorLocBadge.textContent = loc ? `📍 ${loc.name}` : '';
  if (rackEditorBack) rackEditorBack.textContent = isMobile() ? '← Rack Overview' : '← Boards';
  renderPalette();
  renderRackEditorSidebar();
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
    if (isMobile()) {
      renderRackOverview();
      showRackOverlay('rack-overview');
      return;
    }
    showRackOverlay(null);
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

// ---- Touch and pen drag support ----
function isRackTouchPointer(event) {
  return event.pointerType === 'touch' || event.pointerType === 'pen';
}

function rackTouchComponentFromDefinition(comp) {
  return {
    componentType: comp.componentType,
    heightU: comp.heightU,
    label: comp.label,
    category: comp.category || 'compute',
    multiDevice: comp.multiDevice || null,
    isPDU: !!comp.isPDU,
    isBlank: !!comp.isBlank,
    isPassive: !!comp.isPassive,
    source: 'palette',
  };
}

function clearRackTouchDropHighlight() {
  document.querySelectorAll('.rack-slot.drag-over, .rack-slot.drag-invalid').forEach((slot) => {
    slot.classList.remove('drag-over', 'drag-invalid');
  });
}

function createRackTouchDragGhost(component) {
  const ghost = document.createElement('div');
  ghost.className = `rack-touch-drag-ghost cat-${component.category || 'compute'}`;
  ghost.innerHTML = `<span>${escapeHtml(component.label || 'Component')}</span><small>${Number(component.heightU) || 1}U</small>`;
  document.body.appendChild(ghost);
  return ghost;
}

function positionRackTouchDragGhost(state, clientX, clientY) {
  if (!state?.ghost) return;
  const offsetX = 18;
  const offsetY = 18;
  state.ghost.style.transform = `translate3d(${Math.round(clientX + offsetX)}px, ${Math.round(clientY + offsetY)}px, 0)`;
}

function rackTouchScrollContainer() {
  const views = document.querySelector('#rack-editor .rack-views-wrap');
  if (views && views.scrollHeight > views.clientHeight + 2) return views;
  return rackEditorBody;
}

function stopRackTouchAutoScroll(state) {
  if (!state) return;
  state.autoScrollDirection = 0;
  if (state.autoScrollFrame) cancelAnimationFrame(state.autoScrollFrame);
  state.autoScrollFrame = 0;
}

function runRackTouchAutoScroll(state) {
  if (!state || rackTouchDragState !== state || !state.started || !state.autoScrollDirection) {
    stopRackTouchAutoScroll(state);
    return;
  }
  const scroller = rackTouchScrollContainer();
  if (scroller) scroller.scrollTop += state.autoScrollDirection * 12;
  updateRackTouchDropTarget(state, state.lastX, state.lastY);
  state.autoScrollFrame = requestAnimationFrame(() => runRackTouchAutoScroll(state));
}

function updateRackTouchAutoScroll(state, clientY) {
  const scroller = rackTouchScrollContainer();
  if (!scroller) return;
  const rect = scroller.getBoundingClientRect();
  const edge = Math.min(90, Math.max(52, rect.height * 0.13));
  let direction = 0;
  if (clientY < rect.top + edge) direction = -1;
  else if (clientY > rect.bottom - edge) direction = 1;
  if (direction === state.autoScrollDirection) return;
  stopRackTouchAutoScroll(state);
  state.autoScrollDirection = direction;
  if (direction) state.autoScrollFrame = requestAnimationFrame(() => runRackTouchAutoScroll(state));
}

function updateRackTouchDropTarget(state, clientX, clientY) {
  if (!state?.started) return;
  clearRackTouchDropHighlight();
  state.dropTarget = null;

  const element = document.elementFromPoint(clientX, clientY);
  const slot = element?.closest?.('.rack-slot');
  if (!slot) return;

  const side = slot.dataset.side;
  const u = Number.parseInt(slot.dataset.u || '', 10);
  const rack = rackById(rackEditorRackId);
  if (!rack || !side || !Number.isFinite(u)) return;

  const sourceSlot = state.component.fromSlot || null;
  const isOwnSlot = sourceSlot === `${side}-${u}`;
  const isEmpty = slot.classList.contains('empty');
  const fits = isEmpty && canFit(side, u, state.component.heightU, rack, sourceSlot);

  if (fits) {
    slot.classList.add('drag-over');
    state.dropTarget = { side, u };
  } else if (!isOwnSlot) {
    slot.classList.add('drag-invalid');
  }
}

function startRackTouchDrag(state) {
  if (!state || rackTouchDragState !== state || state.started) return;
  state.started = true;
  state.sourceEl.classList.add('rack-touch-source');
  rackDragComponent = { ...state.component };
  state.ghost = createRackTouchDragGhost(state.component);
  document.body.classList.add('rack-touch-dragging');

  if (state.component.source === 'palette' && isMobile()) closeRackPaletteSheet();
  positionRackTouchDragGhost(state, state.lastX, state.lastY);
}

function cleanupRackTouchDrag(state, preserveComponent = false) {
  if (!state) return;
  clearTimeout(state.startTimer);
  stopRackTouchAutoScroll(state);
  clearRackTouchDropHighlight();
  state.sourceEl?.classList.remove('rack-touch-source');
  state.ghost?.remove();
  document.body.classList.remove('rack-touch-dragging');
  try {
    if (state.sourceEl?.hasPointerCapture?.(state.pointerId)) state.sourceEl.releasePointerCapture(state.pointerId);
  } catch {}
  if (!preserveComponent) rackDragComponent = null;
  if (rackTouchDragState === state) rackTouchDragState = null;
}

function finishRackTouchDrag(event) {
  const state = rackTouchDragState;
  if (!state || state.pointerId !== event.pointerId) return;
  clearTimeout(state.startTimer);

  if (!state.started) {
    cleanupRackTouchDrag(state);
    return;
  }

  event.preventDefault();
  rackTouchDragSuppressClickUntil = Date.now() + 650;
  const target = state.hasMovedAfterStart ? state.dropTarget : null;
  const component = { ...state.component };
  cleanupRackTouchDrag(state, true);

  if (!target) {
    rackDragComponent = null;
    return;
  }

  rackDragComponent = component;
  const rack = rackById(rackEditorRackId);
  if (rack) placeRackComponentAt(target.side, target.u, rack);
  else rackDragComponent = null;
}

function bindRackTouchDragSource(element, componentFactory) {
  if (!element || element.dataset.rackTouchDragBound === '1') return;
  element.dataset.rackTouchDragBound = '1';
  element.classList.add('rack-touch-draggable');

  element.addEventListener('pointerdown', (event) => {
    if (!isRackTouchPointer(event) || event.isPrimary === false || event.button !== 0) return;
    if (event.target.closest('button, input, select, textarea, a')) return;
    const component = componentFactory();
    if (!component) return;

    cleanupRackTouchDrag(rackTouchDragState);
    const state = {
      pointerId: event.pointerId,
      sourceEl: element,
      component,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      started: false,
      hasMovedAfterStart: false,
      dropTarget: null,
      ghost: null,
      autoScrollDirection: 0,
      autoScrollFrame: 0,
      startTimer: 0,
    };
    rackTouchDragState = state;
    try { element.setPointerCapture(event.pointerId); } catch {}
    state.startTimer = window.setTimeout(() => startRackTouchDrag(state), 180);
  });
}

document.addEventListener('pointermove', (event) => {
  const state = rackTouchDragState;
  if (!state || state.pointerId !== event.pointerId) return;
  state.lastX = event.clientX;
  state.lastY = event.clientY;

  if (!state.started) {
    const distance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);
    if (distance > 10) cleanupRackTouchDrag(state);
    return;
  }

  event.preventDefault();
  const dragDistance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);
  if (dragDistance > 8) state.hasMovedAfterStart = true;
  positionRackTouchDragGhost(state, event.clientX, event.clientY);
  if (state.hasMovedAfterStart) {
    updateRackTouchDropTarget(state, event.clientX, event.clientY);
    updateRackTouchAutoScroll(state, event.clientY);
  }
}, { passive: false });

document.addEventListener('pointerup', finishRackTouchDrag, { passive: false });
document.addEventListener('pointercancel', (event) => {
  const state = rackTouchDragState;
  if (state?.pointerId === event.pointerId) cleanupRackTouchDrag(state);
});

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
    bindRackTouchDragSource(el, () => rackTouchComponentFromDefinition(comp));
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
    switchPortLinks: rackDragComponent.switchPortLinks || null,
    patchPanelPorts: rackDragComponent.patchPanelPorts || null,
    patchPanelLinks: rackDragComponent.patchPanelLinks || null,
    isBlank: rackDragComponent.isBlank || false,
    isPassive: (rackDragComponent.isPassive || false) && !isRackPatchPanelComponent(rackDragComponent),
  };
  const placed = rackDragComponent;
  const sourceSide = placed.fromSlot ? String(placed.fromSlot).split('-')[0] : null;
  saveRackData();
  renderRackDiagram(side);
  if (sourceSide && sourceSide !== side) renderRackDiagram(sourceSide);
  if (!placed.isBlank && (!placed.isPassive || isRackPatchPanelComponent(placed))) showLinkPanel(slotKey, side);
  clearRackComponentSelection();
  closeRackPaletteSheet();
}

function createEmptySlot(side, u, rack) {
  const el = document.createElement('div');
  el.className = 'rack-slot empty';
  el.dataset.u    = u;
  el.dataset.side = side;
  el.innerHTML = `<span class="rack-slot-num">${u}</span><div class="rack-slot-content"><span class="rack-slot-label">- empty -</span></div>`;

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
  el.addEventListener('click', (event) => {
    if (Date.now() < rackTouchDragSuppressClickUntil) {
      event.preventDefault();
      return;
    }
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
  const uPx = getRackUnitPx();
  const totalH = comp.heightU * uPx;
  el.style.setProperty('--rack-slot-u', String(comp.heightU || 1));
  // Inline !important is required because mobile rack rows have protective
  // height rules for touch ergonomics. Multi-U components must still occupy
  // their real rack height so front and rear stay equal.
  el.style.setProperty('height', totalH + 'px', 'important');
  el.style.setProperty('min-height', totalH + 'px', 'important');
  el.style.setProperty('max-height', totalH + 'px', 'important');

  // Build device label(s) - consistent plain-text style for all types
  let deviceHtml = '';
  if (comp.multiDevice && comp.linkedDevices) {
    // Same plain style as single-device, each PC on its own .rack-slot-device line
    const lines = comp.linkedDevices.map((id, i) => {
      const dev = id ? findById(id) : null;
      const name = dev ? escapeHtml((dev.symbol || '') + ' ' + dev.name) : '-';
      return `<span class="rack-slot-device"><span class="rack-slot-device-idx">${i + 1}.</span> ${name}</span>`;
    }).join('');
    deviceHtml = `<div class="rack-multi-lines">${lines}</div>`;
  } else if (isRackPatchPanelComponent(comp)) {
    const portCount = getRackPatchPanelPortCount(comp);
    if (portCount) deviceHtml = `<span class="rack-slot-device">${portCount} ports</span>`;
  } else if (comp.linkedDeviceId) {
    const dev = findById(comp.linkedDeviceId);
    if (dev) deviceHtml = `<span class="rack-slot-device">${escapeHtml((dev.symbol || '') + ' ' + dev.name)}</span>`;
  } else if (comp.isPDU && comp.pduPorts) {
    deviceHtml = `<span class="rack-slot-device">${comp.pduPorts} ports</span>`;
  } else if (isRackSwitchComponent(comp)) {
    const portCount = getRackSwitchPortCount(comp);
    if (portCount) deviceHtml = `<span class="rack-slot-device">${portCount} ports</span>`;
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
    if (Date.now() < rackTouchDragSuppressClickUntil) {
      e.preventDefault();
      return;
    }
    if (e.target.classList.contains('rack-slot-remove')) return;
    if (comp.isBlank || (comp.isPassive && !isRackPatchPanelComponent(comp))) return;
    showLinkPanel(slotKey, side);
  });
  el.querySelector('.rack-slot-remove').addEventListener('click', e => {
    e.stopPropagation();
    delete rack.slots[slotKey];
    saveRackData();
    renderRackDiagram(side);
  });
  el.addEventListener('dragstart', e => {
    rackDragComponent = { componentType: comp.componentType, heightU: comp.heightU, label: comp.label, category: comp.category || 'compute', linkedDeviceId: comp.linkedDeviceId || null, multiDevice: comp.multiDevice || null, linkedDevices: comp.linkedDevices || null, isPDU: comp.isPDU || false, pduPorts: comp.pduPorts || null, pduLinks: comp.pduLinks || null, switchPortLinks: comp.switchPortLinks || null, patchPanelPorts: comp.patchPanelPorts || null, patchPanelLinks: comp.patchPanelLinks || null, isBlank: comp.isBlank || false, isPassive: comp.isPassive || false, fromSlot: slotKey, source: 'rack' };
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => el.style.opacity = '0.4', 0);
  });
  el.addEventListener('dragend', () => { el.style.opacity = ''; rackDragComponent = null; });
  bindRackTouchDragSource(el, () => ({
    componentType: comp.componentType,
    heightU: comp.heightU,
    label: comp.label,
    category: comp.category || 'compute',
    linkedDeviceId: comp.linkedDeviceId || null,
    multiDevice: comp.multiDevice || null,
    linkedDevices: comp.linkedDevices || null,
    isPDU: !!comp.isPDU,
    pduPorts: comp.pduPorts || null,
    pduLinks: comp.pduLinks || null,
    switchPortLinks: comp.switchPortLinks || null,
    patchPanelPorts: comp.patchPanelPorts || null,
    patchPanelLinks: comp.patchPanelLinks || null,
    isBlank: !!comp.isBlank,
    isPassive: !!comp.isPassive,
    fromSlot: slotKey,
    source: 'rack',
  }));
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
// Closing: only via OK / Skip / Escape - NO outside-click-to-close, because
// that interferes with native <select> dropdowns on every platform.


function isRackSwitchComponent(comp) {
  return !!comp && String(comp.componentType || '').includes('switch');
}

function isRackRouterComponent(comp) {
  return !!comp && String(comp.componentType || '').includes('router');
}

function isRackPatchPanelComponent(comp) {
  return !!comp && String(comp.componentType || '').includes('patch-panel');
}

function isRackNetworkPortComponent(comp) {
  return isRackSwitchComponent(comp) || isRackRouterComponent(comp);
}

function getRackPatchPanelPortCount(comp) {
  const count = parseInt(comp?.patchPanelPorts, 10);
  return Number.isFinite(count) && count > 0 ? Math.min(count, 96) : 0;
}

function getRackPatchPanelLink(comp, portIndex) {
  const links = comp?.patchPanelLinks && typeof comp.patchPanelLinks === 'object' ? comp.patchPanelLinks : {};
  return links[portIndex] || (portIndex === 0 ? comp?.linkedDeviceId || null : null);
}

function rackPortHardwareKind(comp) {
  return isRackRouterComponent(comp) ? 'router-gateway' : 'switch';
}

function getRackLinkedPortDevice(comp) {
  if (!comp?.linkedDeviceId) return null;
  const dev = findById(comp.linkedDeviceId);
  const expectedKind = rackPortHardwareKind(comp);
  return dev && dev.type === 'hardware' && dev.hardwareKind === expectedKind ? dev : null;
}

function getRackSwitchPortCount(comp) {
  const device = getRackLinkedPortDevice(comp);
  if (!device) return 0;
  const match = String(device.switchPorts || '').match(/\d+/);
  const count = match ? parseInt(match[0], 10) : 0;
  return Number.isFinite(count) && count > 0 ? Math.min(count, 96) : 0;
}

function showLinkPanel(slotKey, side) {
  closeLinkPanel();
  const rack = rackById(rackEditorRackId);
  if (!rack || !rack.slots[slotKey]) return;
  const comp = rack.slots[slotKey];

  if (!isMobile()) {
    showRackLinkModal(slotKey, side, comp);
    return;
  }

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
            <option value="">- none -</option>${buildHwOpts(devs[i])}
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

  // ── Patch panel: configurable port count with one device assignment per port ─────
  if (isRackPatchPanelComponent(comp)) {
    let currentPorts = getRackPatchPanelPortCount(comp) || 24;
    const patchLinks = {};
    for (let i = 0; i < currentPorts; i++) {
      const linkedId = getRackPatchPanelLink(comp, i);
      if (linkedId) patchLinks[i] = linkedId;
    }

    function buildPatchPortRows(n) {
      return Array.from({ length: n }, (_, i) => `
        <div class="rack-link-row">
          <span class="rack-link-row-label">Port ${i + 1}:</span>
          <select class="rack-patch-port" data-port="${i}">
            <option value="">- empty -</option>${buildHwOpts(patchLinks[i] || null)}
          </select>
        </div>`).join('');
    }

    function capturePatchLinks() {
      panel.querySelectorAll('.rack-patch-port').forEach((select) => {
        const port = parseInt(select.dataset.port, 10);
        if (select.value) patchLinks[port] = select.value;
        else delete patchLinks[port];
      });
    }

    panel.innerHTML = `
      <div class="rack-link-multi-wrap">
        <div class="rack-link-row">
          <span class="rack-link-row-label">Ports:</span>
          <input id="rack-patch-count" type="number" min="1" max="96" value="${currentPorts}" inputmode="numeric" />
        </div>
        <div id="rack-patch-port-rows">${buildPatchPortRows(currentPorts)}</div>
        <div class="rack-link-actions">
          <button class="button" id="rack-link-ok" type="button">✓ OK</button>
          <button class="button secondary" id="rack-link-skip" type="button">Skip</button>
        </div>
      </div>`;
    document.body.appendChild(panel);
    rackLinkPanelTarget = { slotKey, side };

    panel.querySelector('#rack-patch-count').addEventListener('change', function() {
      capturePatchLinks();
      currentPorts = Math.max(1, Math.min(96, parseInt(this.value, 10) || 1));
      this.value = currentPorts;
      Object.keys(patchLinks).forEach((key) => {
        if (parseInt(key, 10) >= currentPorts) delete patchLinks[key];
      });
      panel.querySelector('#rack-patch-port-rows').innerHTML = buildPatchPortRows(currentPorts);
    });
    panel.querySelector('#rack-link-ok').addEventListener('click', () => {
      capturePatchLinks();
      comp.patchPanelPorts = currentPorts;
      comp.patchPanelLinks = patchLinks;
      comp.linkedDeviceId = null;
      comp.isPassive = false;
      saveRackData(); closeLinkPanel(); renderRackDiagram(side);
    });
    panel.querySelector('#rack-link-skip').addEventListener('click', () => closeLinkPanel());
    return;
  }

  // ── Network ports: port count is inherited from linked router/switch hardware ─────
  if (isRackNetworkPortComponent(comp)) {
    const expectedKind = rackPortHardwareKind(comp);
    const switchItems = hardwareItems.filter(itm => itm.type === 'hardware' && itm.hardwareKind === expectedKind);
    function buildSwitchOpts(selectedId) {
      return switchItems.map(itm =>
        `<option value="${itm.id}" ${selectedId === itm.id ? 'selected' : ''}>${escapeHtml((itm.symbol || '') + ' ' + itm.name)}${itm.switchPorts ? ` · ${escapeHtml(String(itm.switchPorts))} ports` : ''}</option>`
      ).join('');
    }
    function buildSwitchPortRows() {
      const count = getRackSwitchPortCount(comp);
      if (!comp.linkedDeviceId) return `<p class="note rack-link-note">Choose a ${expectedKind === 'router-gateway' ? 'router / gateway' : 'switch'} first. The port count is read from its hardware settings.</p>`;
      if (!count) return `<p class="note rack-link-note">This ${expectedKind === 'router-gateway' ? 'router / gateway' : 'switch'} has no port count configured.</p>`;
      comp.switchPortLinks = comp.switchPortLinks || {};
      return Array.from({ length: count }, (_, i) => `
        <div class="rack-link-row">
          <span class="rack-link-row-label">Port ${i + 1}:</span>
          <select class="rack-switch-port" data-port="${i}">
            <option value="">- empty -</option>${buildHwOpts(comp.switchPortLinks[i] || null)}
          </select>
        </div>`).join('');
    }
    panel.innerHTML = `
      <div class="rack-link-multi-wrap">
        <div class="rack-link-row">
          <span class="rack-link-row-label">${expectedKind === 'router-gateway' ? 'Router / Gateway:' : 'Switch:'}</span>
          <select id="rack-switch-device">
            <option value="">- none -</option>${buildSwitchOpts(comp.linkedDeviceId)}
          </select>
        </div>
        <div id="rack-switch-port-rows">${buildSwitchPortRows()}</div>
        <div class="rack-link-actions">
          <button class="button" id="rack-link-ok" type="button">✓ OK</button>
          <button class="button secondary" id="rack-link-skip" type="button">Skip</button>
        </div>
      </div>`;
    document.body.appendChild(panel);
    rackLinkPanelTarget = { slotKey, side };
    panel.querySelector('#rack-switch-device').addEventListener('change', function() {
      comp.linkedDeviceId = this.value || null;
      comp.switchPortLinks = {};
      panel.querySelector('#rack-switch-port-rows').innerHTML = buildSwitchPortRows();
    });
    panel.querySelector('#rack-link-ok').addEventListener('click', () => {
      comp.linkedDeviceId = panel.querySelector('#rack-switch-device').value || null;
      comp.switchPortLinks = {};
      panel.querySelectorAll('.rack-switch-port').forEach(s => {
        comp.switchPortLinks[parseInt(s.dataset.port, 10)] = s.value || null;
      });
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
            <option value="">- empty -</option>${buildHwOpts(pduLinks[i] || null)}
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
          <option value="">- none -</option>${buildHwOpts(comp.linkedDeviceId)}
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

function showRackLinkModal(slotKey, side, comp) {
  const rack = rackById(rackEditorRackId);
  if (!rack || !comp) return;
  closeLinkPanel();

  const hardwareItems = items.filter(i => i.type === 'hardware');
  const deviceName = id => {
    const itm = hardwareItems.find(h => h.id === id);
    return itm ? `${itm.symbol || ''} ${itm.name}`.trim() : '- empty -';
  };
  const escapeAttr = v => escapeHtml(String(v || ''));

  const panel = document.createElement('div');
  panel.className = 'rack-link-panel rack-link-modal';
  panel.id = 'rack-link-panel-active';
  document.body.appendChild(panel);
  rackLinkPanelTarget = { slotKey, side };

  function openDevicePicker(title, selectedId, onPick, choiceItems = hardwareItems) {
    const oldPicker = document.getElementById('rack-device-picker-active');
    if (oldPicker) oldPicker.remove();

    const picker = document.createElement('div');
    picker.className = 'rack-device-picker';
    picker.id = 'rack-device-picker-active';
    const choices = [
      `<button class="rack-device-choice ${!selectedId ? 'selected' : ''}" data-id="" type="button">- empty -</button>`,
      ...choiceItems.map(itm => `<button class="rack-device-choice ${selectedId === itm.id ? 'selected' : ''}" data-id="${escapeAttr(itm.id)}" type="button">${escapeHtml(`${itm.symbol || ''} ${itm.name}`.trim())}${['router-gateway', 'switch'].includes(itm.hardwareKind) && itm.switchPorts ? ` · ${escapeHtml(String(itm.switchPorts))} ports` : ''}</button>`)
    ].join('');
    picker.innerHTML = `
      <div class="rack-device-picker-card">
        <div class="rack-device-picker-head">
          <strong>${escapeHtml(title)}</strong>
          <button class="button secondary rack-device-picker-close" type="button">× Close</button>
        </div>
        <div class="rack-device-choice-list">${choices}</div>
      </div>
    `;
    document.body.appendChild(picker);
    picker.querySelector('.rack-device-picker-close')?.addEventListener('click', () => picker.remove());
    picker.querySelectorAll('.rack-device-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        onPick(btn.dataset.id || null);
        picker.remove();
        renderModal();
      });
    });
  }

  function pickerButton(label, title, selectedId, field, idx = null, filter = '') {
    const idAttr = idx === null ? '' : ` data-idx="${idx}"`;
    const filterAttr = filter ? ` data-filter="${filter}"` : '';
    return `
      <div class="rack-link-row rack-link-picker-row">
        <span class="rack-link-row-label">${escapeHtml(label)}</span>
        <button class="rack-link-picker-button" data-field="${field}"${idAttr}${filterAttr} type="button">${escapeHtml(deviceName(selectedId))}</button>
      </div>`;
  }

  function bindPickerButtons() {
    panel.querySelectorAll('.rack-link-picker-button').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.dataset.field;
        const idx = btn.dataset.idx !== undefined ? parseInt(btn.dataset.idx, 10) : null;
        const isPortField = field === 'pdu' || field === 'switch-port' || field === 'patch-port';
        const title = idx === null ? 'Choose linked device' : `Choose device for ${isPortField ? `Port ${idx + 1}` : `PC ${idx + 1}`}`;
        const selected = field === 'single' || field === 'switch-link'
          ? comp.linkedDeviceId
          : field === 'multi'
            ? (comp.linkedDevices || [])[idx]
            : field === 'switch-port'
              ? (comp.switchPortLinks || {})[idx]
              : field === 'patch-port'
                ? getRackPatchPanelLink(comp, idx)
                : (comp.pduLinks || {})[idx];
        const choiceItems = btn.dataset.filter
          ? hardwareItems.filter(itm => itm.type === 'hardware' && itm.hardwareKind === btn.dataset.filter)
          : hardwareItems;
        openDevicePicker(title, selected || null, id => {
          if (field === 'single') {
            comp.linkedDeviceId = id;
          } else if (field === 'switch-link') {
            comp.linkedDeviceId = id;
            comp.switchPortLinks = {};
          } else if (field === 'multi') {
            const count = comp.multiDevice || 2;
            const arr = comp.linkedDevices || Array(count).fill(null);
            arr[idx] = id;
            comp.linkedDevices = arr;
            comp.linkedDeviceId = arr[0] || null;
          } else if (field === 'switch-port') {
            comp.switchPortLinks = comp.switchPortLinks || {};
            comp.switchPortLinks[idx] = id;
          } else if (field === 'patch-port') {
            comp.patchPanelLinks = comp.patchPanelLinks || {};
            if (comp.linkedDeviceId && !comp.patchPanelLinks[0]) comp.patchPanelLinks[0] = comp.linkedDeviceId;
            if (id) comp.patchPanelLinks[idx] = id;
            else delete comp.patchPanelLinks[idx];
            comp.linkedDeviceId = null;
          } else if (field === 'pdu') {
            comp.pduLinks = comp.pduLinks || {};
            comp.pduLinks[idx] = id;
          }
        }, choiceItems);
      });
    });
  }

  function renderModal() {
    const title = comp.isPDU
      ? 'Assign PDU Ports'
      : isRackPatchPanelComponent(comp)
        ? 'Assign Patch Panel Ports'
        : isRackNetworkPortComponent(comp)
          ? `Assign ${isRackRouterComponent(comp) ? 'Router / Gateway' : 'Switch'} Ports`
          : comp.multiDevice
            ? 'Assign Multi-Device Slot'
            : 'Assign Rack Device';
    let body = '';

    if (comp.multiDevice) {
      const count = comp.multiDevice;
      const devs = comp.linkedDevices || Array(count).fill(null);
      body = Array.from({ length: count }, (_, i) => pickerButton(`PC ${i + 1}:`, title, devs[i], 'multi', i)).join('');
    } else if (isRackPatchPanelComponent(comp)) {
      const currentPorts = getRackPatchPanelPortCount(comp) || 24;
      const rows = Array.from({ length: currentPorts }, (_, i) => pickerButton(`Port ${i + 1}:`, title, getRackPatchPanelLink(comp, i), 'patch-port', i)).join('');
      body = `
        <div class="rack-port-count-row">
          <span class="rack-link-row-label">Ports:</span>
          <input id="rack-patch-count" type="number" min="1" max="96" value="${currentPorts}" inputmode="numeric" />
        </div>
        ${rows}`;
    } else if (isRackNetworkPortComponent(comp)) {
      const expectedKind = rackPortHardwareKind(comp);
      const switchDevice = getRackLinkedPortDevice(comp);
      const portCount = getRackSwitchPortCount(comp);
      const rows = portCount
        ? Array.from({ length: portCount }, (_, i) => pickerButton(`Port ${i + 1}:`, title, (comp.switchPortLinks || {})[i], 'switch-port', i)).join('')
        : `<p class="note rack-link-note">Choose a switch hardware resource with a configured port count first.</p>`;
      body = `
        ${pickerButton(expectedKind === 'router-gateway' ? 'Router / Gateway:' : 'Switch:', expectedKind === 'router-gateway' ? 'Choose router / gateway hardware' : 'Choose switch hardware', comp.linkedDeviceId, 'switch-link', null, expectedKind)}
        <div class="rack-link-note">${switchDevice ? `${escapeHtml(String(switchDevice.switchPorts || portCount))} ports from hardware config` : `Port count is inherited from the ${expectedKind === 'router-gateway' ? 'router / gateway' : 'switch'} hardware settings.`}</div>
        ${rows}`;
    } else if (comp.isPDU) {
      const currentPorts = comp.pduPorts || 8;
      const portCounts = [4, 6, 8, 10, 12, 16, 20, 24];
      const countButtons = portCounts.map(n => `<button class="rack-port-count-button ${currentPorts === n ? 'selected' : ''}" data-count="${n}" type="button">${n} ports</button>`).join('');
      const rows = Array.from({ length: currentPorts }, (_, i) => pickerButton(`Port ${i + 1}:`, title, (comp.pduLinks || {})[i], 'pdu', i)).join('');
      body = `
        <div class="rack-port-count-row"><span class="rack-link-row-label">Ports:</span><div class="rack-port-count-options">${countButtons}</div></div>
        ${rows}`;
    } else {
      body = pickerButton('Device:', title, comp.linkedDeviceId, 'single');
    }

    panel.innerHTML = `
      <div class="rack-link-multi-wrap">
        <div class="rack-link-modal-head">
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(comp.label || '')}</span>
        </div>
        ${body}
        <div class="rack-link-actions">
          <button class="button" id="rack-link-ok" type="button">✓ OK</button>
          <button class="button secondary" id="rack-link-skip" type="button">Skip</button>
        </div>
      </div>`;

    panel.querySelector('#rack-patch-count')?.addEventListener('change', function() {
      const currentLinks = {};
      const nextCount = Math.max(1, Math.min(96, parseInt(this.value, 10) || 1));
      for (let i = 0; i < nextCount; i++) {
        const linkedId = getRackPatchPanelLink(comp, i);
        if (linkedId) currentLinks[i] = linkedId;
      }
      comp.patchPanelPorts = nextCount;
      comp.patchPanelLinks = currentLinks;
      comp.linkedDeviceId = null;
      comp.isPassive = false;
      renderModal();
    });

    panel.querySelectorAll('.rack-port-count-button').forEach(btn => {
      btn.addEventListener('click', () => {
        comp.pduPorts = parseInt(btn.dataset.count, 10);
        comp.pduLinks = comp.pduLinks || {};
        Object.keys(comp.pduLinks).forEach(k => {
          if (parseInt(k, 10) >= comp.pduPorts) delete comp.pduLinks[k];
        });
        renderModal();
      });
    });
    bindPickerButtons();
    panel.querySelector('#rack-link-ok').addEventListener('click', () => {
      if (isRackPatchPanelComponent(comp)) {
        comp.patchPanelPorts = getRackPatchPanelPortCount(comp) || 24;
        comp.patchPanelLinks = comp.patchPanelLinks || {};
        if (comp.linkedDeviceId && !comp.patchPanelLinks[0]) comp.patchPanelLinks[0] = comp.linkedDeviceId;
        comp.linkedDeviceId = null;
        comp.isPassive = false;
      }
      saveRackData();
      closeLinkPanel();
      renderRackDiagram(side);
    });
    panel.querySelector('#rack-link-skip').addEventListener('click', () => closeLinkPanel());
  }

  renderModal();
}

function closeLinkPanel() {
  const picker = document.getElementById('rack-device-picker-active');
  if (picker) picker.remove();
  const existing = document.getElementById('rack-link-panel-active');
  if (existing) existing.remove();
  rackLinkPanelTarget = null;
}

// Close panel with Escape key only - no outside-click, no mousedown tricks
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && rackLinkPanelTarget) closeLinkPanel();
});

// ---- Utility ----


function getRackUnitPx() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--rack-u-height').trim();
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.height = raw || '44px';
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().height || (isMobile() ? 44 : 32);
  probe.remove();
  return Math.max(24, Math.round(px));
}

// Make front and rear rack frames the same height.
// Strategy: set minHeight on the shorter frame so it matches the taller one,
// and distribute the extra space evenly among its empty slots.
function equaliseRackHeights() {
  if (!rackFront || !rackRear || isMobile()) return;

  // 1. Reset any previous overrides so we measure natural height
  [rackFront, rackRear].forEach(f => {
    f.style.minHeight = '';
    f.querySelectorAll('.rack-slot.empty').forEach(s => {
      s.style.height = '';
      s.style.minHeight = '';
      s.style.maxHeight = '';
    });
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
    // No empty slots to expand - just set minHeight on the frame
    shorter.style.minHeight = targetH + 'px';
    return;
  }

  // Distribute extra pixels evenly across empty slots (integer math, last slot absorbs remainder)
  const extra = Math.floor(diff / emptySlots.length);
  const baseU = getRackUnitPx();
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
    if (Date.now() < rackTouchDragSuppressClickUntil) {
      event.preventDefault();
      return;
    }
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
try { initTheme();
initCommandSnippetPanel(); } catch(e){ console.error(e); }


