import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi, adminApi, getErrorMessage, translateMessage } from '../services/api';
import '../styles/globals.css';
import ThemeButton from '../components/ThemeButton';
import WikiAdminPanel from '../components/WikiAdminPanel';
import Modal from '../components/Modal';
import MaintenanceBanner from '../components/MaintenanceBanner';
import ClusterMapSection from '../components/ClusterMapSection';
import PangolinSettingsPanel from '../components/PangolinSettingsPanel';
import { readStoredLanguage, storeLanguage } from '../components/LanguageSwitch';
import { translatePortalText } from '../i18n';

function LogoutIcon() {
  return (
    <svg className="logout-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M10 6H5v12h5" />
      <path d="M14 8l4 4-4 4" />
      <path d="M8 12h10" />
    </svg>
  );
}


function MenuIcon() {
  return (
    <svg className="menu-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

const ADMIN_TAB_KEYS = new Set([
  'overview',
  'users',
  'groups',
  'clusters',
  'templates',
  'resources',
  'maintenance',
  'audit',
  'wiki',
  'settings'
]);

function getAdminTab(searchParams) {
  const requestedTab = searchParams.get('tab');
  return ADMIN_TAB_KEYS.has(requestedTab) ? requestedTab : 'overview';
}

const emptyUser = { email: '', name: '', password: '', role: 'user', sendWelcome: false };

function toLocalDatetimeInput(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(value) {
  try {
    let input = value;
    // SQLite CURRENT_TIMESTAMP liefert "YYYY-MM-DD HH:MM:SS" in UTC ohne Zeitzone
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(input)) {
      input = input.replace(' ', 'T') + 'Z';
    }
    const language = readStoredLanguage();
    const formatted = new Date(input).toLocaleString(language === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return language === 'de' ? `${formatted} Uhr` : formatted;
  } catch (_) { return String(value); }
}

function maintenanceState(item) {
  const now = Date.now();
  const starts = new Date(item.starts_at).getTime();
  const ends = new Date(item.ends_at).getTime();
  if (now > ends) return 'beendet';
  if (now >= starts) return 'aktiv';
  return 'geplant';
}

const emptyMaintenance = () => ({
  title: '',
  message: '',
  severity: 'info',
  startsAt: toLocalDatetimeInput(new Date(Date.now() + 60 * 60 * 1000)),
  endsAt: toLocalDatetimeInput(new Date(Date.now() + 3 * 60 * 60 * 1000)),
  notifyUsers: false
});
const emptyCluster = { name: '', url: '', apiToken: '', allowProvisioning: false, allowPublishing: true, locationLabel: '', locationLat: '', locationLon: '' };
const emptyResource = { name: '', containerId: '', clusterId: '', userId: '', groupId: '', adminUrl: '', manualIp: '', sshPort: '22', resourceType: '' };
const emptyGroup = { name: '', memberIds: [] };
const emptyAdminCred = { label: '', username: '', secret: '', url: '', notes: '', clusterId: '', userId: '' };
const emptySmtp = { smtpHost: '', smtpPort: '587', smtpUser: '', smtpPassword: '' };

const OVERLAY_LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' }
];

const CLUSTER_UI_TEXT = {
  en: {
    addCluster: 'Add cluster',
    noCluster: 'No clusters configured',
    mapSaved: 'Map location configured.',
    mapMissing: 'No map location configured.',
    permissionsUnavailable: 'Permissions could not be loaded. Check the API token and connection.',
    permissionsLoading: 'Loading permissions…',
    checkPermissions: 'Check permissions',
    checkingPermissions: 'Checking…',
    edit: 'Edit',
    delete: 'Delete',
    editTitle: 'Edit Proxmox',
    addTitle: 'Add Proxmox',
    name: 'Name',
    url: 'URL',
    mapLocation: 'Dashboard map location',
    addressPlaceholder: 'Enter an address or place',
    mapHint: 'Enter an address and select a suggestion to place the cluster on the dashboard map.',
    searchingLocations: 'Searching locations…',
    selected: 'Selected',
    apiToken: 'API token',
    existingTokenPlaceholder: 'Leave blank to keep the existing token',
    testConnection: 'Test Proxmox connection',
    selfService: 'Self-service: users may create machines',
    allowPublishing: 'Allow Pangolin publishing for this cluster',
    publishingHelp: 'When disabled, existing publications remain reachable. Users can only remove them; new or changed publications are blocked by the backend.',
    cancel: 'Cancel',
    save: 'Save',
    capabilities: {
      read: 'Read',
      power: 'Power',
      console: 'Console',
      create: 'Create'
    }
  },
  de: {
    addCluster: 'Cluster hinzufügen',
    noCluster: 'Keine Cluster konfiguriert',
    mapSaved: 'Kartenstandort hinterlegt.',
    mapMissing: 'Kein Kartenstandort hinterlegt.',
    permissionsUnavailable: 'Berechtigungen konnten nicht geladen werden. API-Token und Verbindung prüfen.',
    permissionsLoading: 'Berechtigungen werden geladen…',
    checkPermissions: 'Berechtigungen prüfen',
    checkingPermissions: 'Prüft…',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    editTitle: 'Proxmox bearbeiten',
    addTitle: 'Proxmox hinzufügen',
    name: 'Name',
    url: 'URL',
    mapLocation: 'Dashboard-Kartenstandort',
    addressPlaceholder: 'Adresse oder Ort eingeben',
    mapHint: 'Gib eine Adresse ein und wähle einen Vorschlag aus, damit der Cluster auf der Dashboard-Karte platziert wird.',
    searchingLocations: 'Standorte werden gesucht…',
    selected: 'Ausgewählt',
    apiToken: 'API-Token',
    existingTokenPlaceholder: 'Leer lassen, um den vorhandenen Token beizubehalten',
    testConnection: 'Proxmox-Verbindung testen',
    selfService: 'Self-Service: Benutzer dürfen Maschinen erstellen',
    allowPublishing: 'Pangolin-Veröffentlichungen für diesen Cluster erlauben',
    publishingHelp: 'Beim Deaktivieren bleiben bestehende Veröffentlichungen erreichbar. Benutzer können sie nur entfernen; neue oder geänderte Freigaben werden vom Backend blockiert.',
    cancel: 'Abbrechen',
    save: 'Speichern',
    capabilities: {
      read: 'Lesen',
      power: 'Start/Stopp',
      console: 'Konsole',
      create: 'Erstellen'
    }
  }
};

const MOBILE_MENU_TRANSLATIONS = {
  en: {
    menu: 'Menu',
    openMenu: 'Open menu',
    close: 'Close',
    closeMenu: 'Close menu',
    language: 'Language',
    languageText: 'Choose the language used by the portal, menus, placeholders and maintenance banners.',
    logout: 'Log out',
    adminConsole: 'Admin Console',
    loading: 'Loading data...',
    counts: { clusters: 'clusters', services: 'services', users: 'users' },
    tabs: {
      overview: 'Dashboard',
      users: 'Users',
      groups: 'Groups',
      clusters: 'Proxmox',
      templates: 'Templates',
      resources: 'Services',
      maintenance: 'Maintenance',
      audit: 'Log',
      wiki: 'Wiki',
      settings: 'Settings'
    },
    dashboard: {
      manageClusters: 'Manage clusters',
      manageServices: 'Manage services',
      metrics: {
        users: 'Users',
        admins: 'Administrators',
        groups: 'Groups',
        clusters: 'Clusters',
        services: 'Services',
        online: 'Online'
      }
    },
    clusterMap: {
      title: 'Cluster locations',
      count: (mapped, total) => `${mapped} of ${total} clusters with map location`,
      manage: 'Manage clusters',
      emptyTitle: 'No map locations configured',
      emptyText: 'Open a Proxmox cluster, search for its address and select a location from the dropdown.',
      nodes: 'Nodes',
      problem: 'Problem',
      nodesOnline: 'Online-Nodes'
    },
    clusterStatus: {
      title: 'Cluster status',
      unavailable: 'Unavailable',
      nodes: 'Nodes',
      storage: 'Storage',
      online: 'Online',
      offline: 'Offline',
      average: 'average',
      uptime: 'Uptime'
    }
  },
  de: {
    menu: 'Menü',
    openMenu: 'Menü öffnen',
    close: 'Schließen',
    closeMenu: 'Menü schließen',
    language: 'Sprache',
    languageText: 'Wähle die Sprache für Portal, Menüs, Platzhalter und Wartungsbanner.',
    logout: 'Abmelden',
    adminConsole: 'Admin-Konsole',
    loading: 'Daten werden geladen...',
    counts: { clusters: 'Cluster', services: 'Dienste', users: 'Benutzer' },
    tabs: {
      overview: 'Dashboard',
      users: 'Benutzer',
      groups: 'Gruppen',
      clusters: 'Proxmox',
      templates: 'Templates',
      resources: 'Dienste',
      maintenance: 'Wartung',
      audit: 'Protokoll',
      wiki: 'Wiki',
      settings: 'Einstellungen'
    },
    dashboard: {
      manageClusters: 'Cluster verwalten',
      manageServices: 'Dienste verwalten',
      metrics: {
        users: 'Benutzer',
        admins: 'Administratoren',
        groups: 'Gruppen',
        clusters: 'Cluster',
        services: 'Dienste',
        online: 'Online'
      }
    },
    clusterMap: {
      title: 'Cluster-Standorte',
      count: (mapped, total) => `${mapped} von ${total} Cluster mit Karten-Standort`,
      manage: 'Cluster verwalten',
      emptyTitle: 'Keine Karten-Standorte hinterlegt',
      emptyText: 'Öffne einen Proxmox-Cluster, suche nach der Adresse und wähle einen Standort aus dem Dropdown aus.',
      nodes: 'Nodes',
      problem: 'Problem',
      nodesOnline: 'Online-Nodes'
    },
    clusterStatus: {
      title: 'Cluster-Status',
      unavailable: 'Nicht erreichbar',
      nodes: 'Nodes',
      storage: 'Storage',
      online: 'Online',
      offline: 'Offline',
      average: 'Durchschnitt',
      uptime: 'Uptime'
    }
  }
};


export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = getAdminTab(searchParams);
  const [users, setUsers] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [clusterStats, setClusterStats] = useState([]);
  const [resources, setResources] = useState([]);
  const [clusterContainers, setClusterContainers] = useState([]);
  const [settings, setSettings] = useState(emptySmtp);
  const [newUser, setNewUser] = useState(emptyUser);
  const [newCluster, setNewCluster] = useState(emptyCluster);
  const [newResource, setNewResource] = useState(emptyResource);
  const [editUserId, setEditUserId] = useState(null);
  const [editClusterId, setEditClusterId] = useState(null);
  const [editResourceId, setEditResourceId] = useState(null);
  const [smtpTestResult, setSmtpTestResult] = useState(null);
  const [clusterTestResult, setClusterTestResult] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showClusterModal, setShowClusterModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [setupCheck, setSetupCheck] = useState(null);
  const [setupCheckLoading, setSetupCheckLoading] = useState(false);
  const [selectedSetupClusterId, setSelectedSetupClusterId] = useState('');
  const [setupClusterTestResult, setSetupClusterTestResult] = useState(null);
  const [setupSmtpTestResult, setSetupSmtpTestResult] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [groups, setGroups] = useState([]);
  const [newGroup, setNewGroup] = useState(emptyGroup);
  const [editGroupId, setEditGroupId] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [auditEntries, setAuditEntries] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditSearchDraft, setAuditSearchDraft] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditMeta, setAuditMeta] = useState({ total: 0, page: 1, limit: 50, pages: 1 });
  const [clusterCaps, setClusterCaps] = useState({}); // clusterId -> capabilities
  const [capsLoading, setCapsLoading] = useState(false);
  const [checkingCapsId, setCheckingCapsId] = useState(null);
  const [adminCredentials, setAdminCredentials] = useState([]);
  const [showCredModal, setShowCredModal] = useState(false);
  const [editCredId, setEditCredId] = useState(null);
  const [newCred, setNewCred] = useState(emptyAdminCred);
  const [revealedCreds, setRevealedCreds] = useState({});
  const [resourceCredsFor, setResourceCredsFor] = useState(null); // resource object
  const [maintenanceWindows, setMaintenanceWindows] = useState([]);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [editMaintenanceId, setEditMaintenanceId] = useState(null);
  const [newMaintenance, setNewMaintenance] = useState(emptyMaintenance());
  const [statusEvents, setStatusEvents] = useState([]);
  const [testMailResult, setTestMailResult] = useState(null);
  const [locationResults, setLocationResults] = useState([]);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuLanguage, setMobileMenuLanguage] = useState(readStoredLanguage);

  const tabs = [
    ['overview', 'Dashboard'],
    ['users', 'Benutzer'],
    ['groups', 'Gruppen'],
    ['clusters', 'Proxmox'],
    ['templates', 'Templates'],
    ['resources', 'Dienste'],
    ['maintenance', 'Wartung'],
    ['audit', 'Protokoll'],
    ['wiki', 'Wiki'],
    ['settings', 'Einstellungen']
  ];

  const mobileMenuText = MOBILE_MENU_TRANSLATIONS[mobileMenuLanguage] || MOBILE_MENU_TRANSLATIONS.en;
  const mobileMenuTabs = tabs.map(([key]) => [key, mobileMenuText.tabs[key] || key]);
  const dashboardText = mobileMenuText.dashboard;
  const clusterText = CLUSTER_UI_TEXT[mobileMenuLanguage] || CLUSTER_UI_TEXT.en;

  const adminCount = users.filter(item => item.role === 'admin').length;
  const userCount = users.filter(item => item.role === 'user').length;
  const onlineCount = resources.filter(item => item.status === 'running').length;
  const mappedClusterCount = clusterStats.filter(item => Number.isFinite(Number(item.location_lat)) && Number.isFinite(Number(item.location_lon))).length;
  const currentClusterName = useMemo(() => {
    const cluster = clusters.find(item => String(item.id) === String(newResource.clusterId));
    return cluster?.name || '';
  }, [clusters, newResource.clusterId]);
  const setupAdminCount = (setupCheck?.users || []).filter(item => item.role === 'admin').length;
  const setupClusterCount = (setupCheck?.clusters || []).length;
  const setupAdminDetail = setupCheck?.adminUser?.email || (
    mobileMenuLanguage === 'de'
      ? `${setupAdminCount} ${setupAdminCount === 1 ? 'Administrator' : 'Administratoren'}`
      : `${setupAdminCount} ${setupAdminCount === 1 ? 'administrator' : 'administrators'}`
  );
  const setupClusterDetail = mobileMenuLanguage === 'de'
    ? `${setupClusterCount} Cluster`
    : `${setupClusterCount} ${setupClusterCount === 1 ? 'cluster' : 'clusters'}`;

  useEffect(() => {
    if (activeTab !== 'audit') loadData(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'audit') loadAudit();
  }, [activeTab, auditPage, auditSearch]);

  useEffect(() => {
    if (activeTab !== 'audit') return undefined;
    const timer = setTimeout(() => {
      setAuditPage(1);
      setAuditSearch(auditSearchDraft.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [activeTab, auditSearchDraft]);


  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeTab]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 960) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectTab = (tab) => {
    setSearchParams(tab === 'overview' ? {} : { tab }, { replace: true });
    setMobileMenuOpen(false);
  };

  const handleOverlayLanguageChange = (language) => {
    setMobileMenuLanguage(language);
    storeLanguage(language);
  };

  const loadData = async (tab = activeTab) => {
    try {
      setLoading(true);
      setError('');

      const requests = [];
      const needsUsers = ['overview', 'users', 'groups', 'resources'].includes(tab);
      const needsClusters = ['overview', 'clusters', 'templates', 'resources', 'settings'].includes(tab);
      const needsResources = ['overview', 'resources'].includes(tab);
      const needsGroups = ['groups', 'resources', 'overview'].includes(tab);
      const needsSettings = tab === 'settings';
      const needsClusterStats = tab === 'overview';
      const needsMaintenance = tab === 'maintenance';
      const needsEvents = tab === 'overview';

      if (needsUsers) requests.push(adminApi.getUsers().then(res => setUsers(res.data.users || [])));
      if (needsClusters) requests.push(
        adminApi.getClusters().then(res => {
          const list = res.data.clusters || [];
          setClusters(list);
          // On the clusters tab, always show token permissions - fetch them
          // in the background so the badges appear without "Token prüfen".
          if (tab === 'clusters') loadAllCapabilities(list);
        })
      );
      if (needsResources) requests.push(adminApi.getResources().then(res => setResources(res.data.resources || [])));
      if (needsGroups) requests.push(adminApi.getGroups().then(res => setGroups(res.data.groups || [])));
      if (needsClusterStats) requests.push(adminApi.getClusterStats().then(res => setClusterStats(res.data.clusters || [])).catch(() => setClusterStats([])));
      if (needsSettings) {
        requests.push(loadSettings());
        requests.push(loadSetupCheck());
      }
      if (needsMaintenance) requests.push(adminApi.getMaintenanceWindows().then(res => setMaintenanceWindows(res.data.windows || [])));
      if (needsEvents) requests.push(adminApi.getStatusEvents(15).then(res => setStatusEvents(res.data.events || [])).catch(() => setStatusEvents([])));

      await Promise.all(requests);
    } catch (err) {
      setError(getErrorMessage(err, 'Daten konnten nicht geladen werden.'));
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (!showClusterModal) {
      setLocationResults([]);
      setLocationSearchLoading(false);
      return;
    }

    const search = String(newCluster.locationLabel || '').trim();
    if (search.length < 3) {
      setLocationResults([]);
      setLocationSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLocationSearchLoading(true);
        const res = await adminApi.searchLocations(search);
        setLocationResults(res.data.results || []);
      } catch (_) {
        setLocationResults([]);
      } finally {
        setLocationSearchLoading(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [newCluster.locationLabel, showClusterModal]);

  const loadAudit = async () => {
    try {
      setAuditLoading(true);
      setError('');
      const res = await adminApi.getAudit({ page: auditPage, search: auditSearch });
      setAuditEntries(res.data.entries || []);
      setAuditMeta(res.data.pagination || { total: 0, page: auditPage, limit: 50, pages: 1 });
    } catch (err) {
      setError(getErrorMessage(err, 'Protokoll konnte nicht geladen werden.'));
    } finally {
      setAuditLoading(false);
    }
  };

  const loadSettings = async () => {
    const res = await adminApi.getSettings();
    const smtp = res.data.settings || {};
    setSettings({
      smtpHost: smtp.smtp_host || '',
      smtpPort: smtp.smtp_port || '587',
      smtpUser: smtp.smtp_user || '',
      smtpPassword: ''
    });
    setSmtpTestResult(null);
  };

  const showSuccess = (message) => {
    setSuccessMsg(message);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const openCreateUser = () => {
    setEditUserId(null);
    setNewUser(emptyUser);
    setShowUserModal(true);
  };

  const openEditUser = (item) => {
    setEditUserId(item.id);
    setNewUser({ email: item.email || '', name: item.name || '', password: '', role: item.role || 'user' });
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setEditUserId(null);
    setNewUser(emptyUser);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!newUser.email || !newUser.name) {
      setError('Bitte Name und E-Mail-Adresse eingeben.');
      return;
    }
    if (!editUserId && !newUser.password) {
      setError('Bitte ein Startpasswort eingeben.');
      return;
    }
    if (newUser.password && newUser.password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      if (editUserId) {
        const payload = { email: newUser.email, name: newUser.name, role: newUser.role };
        if (newUser.password) payload.password = newUser.password;
        await adminApi.updateUser(editUserId, payload);
        showSuccess('Benutzer wurde gespeichert.');
      } else {
        await adminApi.createUser(newUser);
        showSuccess('Benutzer wurde angelegt.');
      }
      closeUserModal();
      await loadData(activeTab);
    } catch (err) {
      setError(getErrorMessage(err, 'Benutzer konnte nicht gespeichert werden.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(translatePortalText('Diesen Benutzer löschen?', readStoredLanguage()))) return;

    try {
      setActionLoading(true);
      setError('');
      await adminApi.deleteUser(userId);
      showSuccess('Benutzer wurde gelöscht.');
      await loadData(activeTab);
    } catch (err) {
      setError(getErrorMessage(err, 'Benutzer konnte nicht gelöscht werden.'));
    } finally {
      setActionLoading(false);
    }
  };

  const openCreateCluster = () => {
    setEditClusterId(null);
    setNewCluster(emptyCluster);
    setClusterTestResult(null);
    setShowClusterModal(true);
  };

  const openEditCluster = (item) => {
    setEditClusterId(item.id);
    setNewCluster({
      name: item.name || '',
      url: item.url || '',
      apiToken: '',
      allowProvisioning: !!item.allow_provisioning,
      allowPublishing: item.allow_publishing === undefined || item.allow_publishing === null ? true : !!item.allow_publishing,
      locationLabel: item.location_label || '',
      locationLat: item.location_lat ?? '',
      locationLon: item.location_lon ?? ''
    });
    setClusterTestResult(null);
    setShowClusterModal(true);
  };

  const closeClusterModal = () => {
    setShowClusterModal(false);
    setEditClusterId(null);
    setNewCluster(emptyCluster);
    setClusterTestResult(null);
    setLocationResults([]);
  };

  const handleClusterChange = (field, value) => {
    setNewCluster(prev => {
      if (field === 'locationLabel') {
        return { ...prev, locationLabel: value, locationLat: '', locationLon: '' };
      }
      return { ...prev, [field]: value };
    });
    setClusterTestResult(null);
    setError('');
  };

  const handleSelectLocation = (result) => {
    setNewCluster(prev => ({
      ...prev,
      locationLabel: result.label,
      locationLat: result.lat,
      locationLon: result.lon
    }));
    setLocationResults([]);
    setError('');
  };

  const handleTestCluster = async () => {
    if (!newCluster.url || (!newCluster.apiToken && !editClusterId)) {
      setClusterTestResult({ success: false, message: 'Bitte URL und API-Token eingeben.' });
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      const res = await adminApi.testProxmox({ ...newCluster, clusterId: editClusterId || undefined });
      setClusterTestResult(res.data);
    } catch (err) {
      setClusterTestResult({ success: false, message: getErrorMessage(err, 'Proxmox-Test fehlgeschlagen.') });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveCluster = async (e) => {
    e.preventDefault();
    if (!newCluster.name || !newCluster.url || (!newCluster.apiToken && !editClusterId)) {
      setError('Bitte Cluster-Name, URL und API-Token eingeben.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      if (editClusterId) {
        await adminApi.updateCluster(editClusterId, newCluster);
        showSuccess('Proxmox-Cluster wurde gespeichert.');
      } else {
        await adminApi.createCluster(newCluster);
        showSuccess('Proxmox-Cluster wurde angelegt.');
      }
      closeClusterModal();
      await loadData(activeTab);
    } catch (err) {
      setError(getErrorMessage(err, 'Cluster konnte nicht gespeichert werden.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCluster = async (clusterId) => {
    if (!window.confirm(translatePortalText('Diesen Cluster löschen?', readStoredLanguage()))) return;

    try {
      setActionLoading(true);
      setError('');
      await adminApi.deleteCluster(clusterId);
      showSuccess('Cluster wurde gelöscht.');
      await loadData(activeTab);
    } catch (err) {
      setError(getErrorMessage(err, 'Cluster konnte nicht gelöscht werden.'));
    } finally {
      setActionLoading(false);
    }
  };

  const loadAllCapabilities = async (clusterList) => {
    // Fetch token permissions for every cluster in parallel (best-effort).
    setCapsLoading(true);
    await Promise.all((clusterList || []).map(async (cluster) => {
      try {
        const res = await adminApi.getClusterCapabilities(cluster.id);
        setClusterCaps(prev => ({ ...prev, [cluster.id]: res.data.capabilities }));
      } catch (_) {
        setClusterCaps(prev => ({ ...prev, [cluster.id]: { error: true } }));
      }
    }));
    setCapsLoading(false);
  };

  const handleCheckCapabilities = async (clusterId) => {
    // "Token prüfen" re-fetches just this cluster and updates the badges live,
    // no tab switch or page reload needed.
    try {
      setCheckingCapsId(clusterId);
      setError('');
      const res = await adminApi.getClusterCapabilities(clusterId);
      setClusterCaps(prev => ({ ...prev, [clusterId]: res.data.capabilities }));
    } catch (err) {
      setError(getErrorMessage(err, 'Berechtigungen konnten nicht geprüft werden.'));
      setClusterCaps(prev => ({ ...prev, [clusterId]: { error: true } }));
    } finally {
      setCheckingCapsId(null);
    }
  };

  const openResourceCreds = (resource) => setResourceCredsFor(resource);

  const openCreateCred = () => { setEditCredId(null); setNewCred(emptyAdminCred); setShowCredModal(true); };
  const openEditCred = (item) => {
    setEditCredId(item.id);
    setNewCred({
      label: item.label || '', username: item.username || '', secret: '',
      url: item.url || '', notes: item.notes || '',
      clusterId: item.cluster_id || '', userId: item.user_id || ''
    });
    setShowCredModal(true);
  };
  const closeCredModal = () => { setShowCredModal(false); setEditCredId(null); setNewCred(emptyAdminCred); };

  const handleSaveCred = async (e) => {
    e.preventDefault();
    if (!newCred.label.trim()) { setError('Bitte eine Bezeichnung eingeben.'); return; }
    try {
      setActionLoading(true);
      setError('');
      const payload = {
        ...newCred,
        clusterId: newCred.clusterId || null,
        userId: newCred.userId || null
      };
      if (editCredId) {
        await adminApi.updateAdminCredential(editCredId, payload);
        showSuccess('Zugangsdaten gespeichert.');
      } else {
        await adminApi.createAdminCredential(payload);
        showSuccess('Zugangsdaten angelegt.');
      }
      closeCredModal();
      await loadData('settings');
    } catch (err) {
      setError(getErrorMessage(err, 'Zugangsdaten konnten nicht gespeichert werden.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCred = async (credId) => {
    if (!window.confirm(translatePortalText('Diese Zugangsdaten löschen?', readStoredLanguage()))) return;
    try {
      setActionLoading(true);
      await adminApi.deleteAdminCredential(credId);
      showSuccess('Zugangsdaten gelöscht.');
      await loadData('settings');
    } catch (err) {
      setError(getErrorMessage(err, 'Zugangsdaten konnten nicht gelöscht werden.'));
    } finally {
      setActionLoading(false);
    }
  };

  const toggleRevealCred = async (credId) => {
    if (revealedCreds[credId] !== undefined) {
      setRevealedCreds(prev => { const next = { ...prev }; delete next[credId]; return next; });
      return;
    }
    try {
      const res = await adminApi.revealAdminCredential(credId);
      setRevealedCreds(prev => ({ ...prev, [credId]: res.data.secret || '' }));
    } catch (err) {
      setError(getErrorMessage(err, 'Passwort konnte nicht angezeigt werden.'));
    }
  };

  const openCreateGroup = () => {
    setEditGroupId(null);
    setNewGroup(emptyGroup);
    setShowGroupModal(true);
  };

  const openEditGroup = (item) => {
    setEditGroupId(item.id);
    setNewGroup({ name: item.name || '', memberIds: (item.members || []).map(member => member.id) });
    setShowGroupModal(true);
  };

  const closeGroupModal = () => {
    setShowGroupModal(false);
    setEditGroupId(null);
    setNewGroup(emptyGroup);
  };

  const toggleGroupMember = (userId) => {
    setNewGroup(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(userId)
        ? prev.memberIds.filter(id => id !== userId)
        : [...prev.memberIds, userId]
    }));
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    if (!newGroup.name.trim()) {
      setError('Bitte einen Gruppennamen eingeben.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      if (editGroupId) {
        await adminApi.updateGroup(editGroupId, newGroup);
        showSuccess('Gruppe wurde gespeichert.');
      } else {
        const res = await adminApi.createGroup({ name: newGroup.name });
        if (newGroup.memberIds.length > 0) {
          await adminApi.updateGroup(res.data.group.id, newGroup);
        }
        showSuccess('Gruppe wurde angelegt.');
      }
      closeGroupModal();
      await loadData(activeTab);
    } catch (err) {
      setError(getErrorMessage(err, 'Gruppe konnte nicht gespeichert werden.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm(translatePortalText('Diese Gruppe löschen? Zugeordnete Dienste verlieren die Gruppen-Freigabe.', readStoredLanguage()))) return;

    try {
      setActionLoading(true);
      setError('');
      await adminApi.deleteGroup(groupId);
      showSuccess('Gruppe wurde gelöscht.');
      await loadData(activeTab);
    } catch (err) {
      setError(getErrorMessage(err, 'Gruppe konnte nicht gelöscht werden.'));
    } finally {
      setActionLoading(false);
    }
  };

  const openCreateResource = () => {
    setEditResourceId(null);
    setNewResource(emptyResource);
    setClusterContainers([]);
    setShowResourceModal(true);
  };

  const openEditResource = (item) => {
    setEditResourceId(item.id);
    setNewResource({
      name: item.name || '',
      containerId: item.containerId || '',
      clusterId: item.clusterId || '',
      userId: item.userId || '',
      groupId: item.groupId || '',
      adminUrl: item.adminUrl || '',
      manualIp: item.manualIp || '',
      sshPort: String(item.sshPort || 22),
      resourceType: String(item.type || '').toLowerCase()
    });
    setClusterContainers([]);
    setShowResourceModal(true);
  };

  const closeResourceModal = () => {
    setShowResourceModal(false);
    setEditResourceId(null);
    setNewResource(emptyResource);
    setClusterContainers([]);
  };

  const handleLoadClusterContainers = async () => {
    if (!newResource.clusterId) {
      setError('Bitte zuerst einen Cluster auswählen.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      const res = await adminApi.getClusterContainers(newResource.clusterId);
      setClusterContainers(res.data.containers || []);
      if (!res.data.containers?.length) {
        showSuccess('Keine Container oder VMs gefunden.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Dienste konnten nicht geladen werden.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResourceContainerChange = (containerId) => {
    const selected = clusterContainers.find(item => String(item.vmid) === String(containerId));
    const resourceType = String(selected?.type || '').toLowerCase();
    setNewResource(prev => ({
      ...prev,
      containerId,
      name: prev.name || selected?.name || '',
      resourceType,
      manualIp: resourceType === 'qemu' ? prev.manualIp : '',
      sshPort: resourceType === 'qemu' ? prev.sshPort : '22'
    }));
  };

  const handleSaveResource = async (e) => {
    e.preventDefault();
    if (!newResource.clusterId || !newResource.containerId || !newResource.userId) {
      setError('Bitte Cluster, Dienst und Benutzer auswählen.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      if (editResourceId) {
        await adminApi.updateResource(editResourceId, newResource);
        showSuccess('Dienst wurde gespeichert.');
      } else {
        await adminApi.createResource(newResource);
        showSuccess('Dienst wurde angelegt.');
      }
      closeResourceModal();
      await loadData(activeTab);
    } catch (err) {
      setError(getErrorMessage(err, 'Dienst konnte nicht gespeichert werden.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm(translatePortalText('Diesen Dienst entfernen?', readStoredLanguage()))) return;

    try {
      setActionLoading(true);
      setError('');
      await adminApi.deleteResource(resourceId);
      showSuccess('Dienst wurde entfernt.');
      await loadData(activeTab);
    } catch (err) {
      setError(getErrorMessage(err, 'Dienst konnte nicht entfernt werden.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
    setSmtpTestResult(null);
    setError('');
  };

  const handleTestSmtp = async () => {
    try {
      setActionLoading(true);
      setError('');
      const res = await adminApi.testSmtp(settings);
      setSmtpTestResult(res.data);
    } catch (err) {
      setSmtpTestResult({ success: false, message: getErrorMessage(err, 'SMTP-Test fehlgeschlagen.') });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError('');
      await adminApi.updateSettings(settings);
      await loadSetupCheck({ resetTestResults: false });
      setSettings(prev => ({ ...prev, smtpPassword: '' }));
      showSuccess('SMTP wurde gespeichert.');
    } catch (err) {
      setError(getErrorMessage(err, 'SMTP konnte nicht gespeichert werden.'));
    } finally {
      setActionLoading(false);
    }
  };

  const loadSetupCheck = async ({ resetTestResults = true } = {}) => {
    setSetupCheckLoading(true);
    if (resetTestResults) {
      setSetupClusterTestResult(null);
      setSetupSmtpTestResult(null);
    }
    setError('');

    try {
      const [stateRes, usersRes, clustersRes, settingsRes] = await Promise.all([
        authApi.setupRequired(),
        adminApi.getUsers(),
        adminApi.getClusters(),
        adminApi.getSettings()
      ]);

      const loadedUsers = usersRes.data.users || [];
      const loadedClusters = clustersRes.data.clusters || [];
      const loadedSettings = settingsRes.data.settings || {};

      setUsers(loadedUsers);
      setClusters(loadedClusters);
      setSettings(prev => ({
        smtpHost: loadedSettings.smtp_host || '',
        smtpPort: loadedSettings.smtp_port || '587',
        smtpUser: loadedSettings.smtp_user || '',
        smtpPassword: prev.smtpPassword || ''
      }));
      setSetupCheck({
        ...(stateRes.data || {}),
        users: loadedUsers,
        clusters: loadedClusters,
        settings: loadedSettings
      });
      setSelectedSetupClusterId(current => {
        if (loadedClusters.some(item => String(item.id) === String(current))) return current;
        return loadedClusters[0]?.id ? String(loadedClusters[0].id) : '';
      });
    } catch (err) {
      setSetupCheck({ error: getErrorMessage(err, 'Einrichtung konnte nicht geprüft werden.') });
    } finally {
      setSetupCheckLoading(false);
    }
  };

  const handleTestSetupCluster = async () => {
    if (!selectedSetupClusterId) {
      setSetupClusterTestResult({ success: false, message: 'Bitte Cluster auswählen.' });
      return;
    }

    try {
      setActionLoading(true);
      setSetupClusterTestResult(null);
      const res = await adminApi.testProxmox({ clusterId: selectedSetupClusterId });
      setSetupClusterTestResult(res.data);
    } catch (err) {
      setSetupClusterTestResult({ success: false, message: getErrorMessage(err, 'Proxmox-Test fehlgeschlagen.') });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestSetupSmtp = async () => {
    try {
      setActionLoading(true);
      setSetupSmtpTestResult(null);
      const res = await adminApi.testSmtp({});
      setSetupSmtpTestResult(res.data);
    } catch (err) {
      setSetupSmtpTestResult({ success: false, message: getErrorMessage(err, 'SMTP-Test fehlgeschlagen.') });
    } finally {
      setActionLoading(false);
    }
  };

  const openCreateMaintenance = () => {
    setEditMaintenanceId(null);
    setNewMaintenance(emptyMaintenance());
    setShowMaintenanceModal(true);
  };

  const openEditMaintenance = (item) => {
    setEditMaintenanceId(item.id);
    setNewMaintenance({
      title: item.title,
      message: item.message || '',
      severity: item.severity || 'info',
      startsAt: toLocalDatetimeInput(item.starts_at),
      endsAt: toLocalDatetimeInput(item.ends_at),
      notifyUsers: false
    });
    setShowMaintenanceModal(true);
  };

  const closeMaintenanceModal = () => {
    setShowMaintenanceModal(false);
    setEditMaintenanceId(null);
    setNewMaintenance(emptyMaintenance());
  };

  const handleSaveMaintenance = async (e) => {
    e.preventDefault();
    if (!newMaintenance.title.trim()) {
      setError('Bitte einen Titel für die Wartung eingeben.');
      return;
    }
    if (!newMaintenance.startsAt || !newMaintenance.endsAt || new Date(newMaintenance.endsAt) <= new Date(newMaintenance.startsAt)) {
      setError('Der Wartungszeitraum ist ungültig (Ende muss nach dem Beginn liegen).');
      return;
    }
    try {
      setActionLoading(true);
      setError('');
      const payload = {
        title: newMaintenance.title.trim(),
        message: newMaintenance.message.trim(),
        severity: newMaintenance.severity,
        startsAt: new Date(newMaintenance.startsAt).toISOString(),
        endsAt: new Date(newMaintenance.endsAt).toISOString(),
        notifyUsers: newMaintenance.notifyUsers
      };
      let res;
      if (editMaintenanceId) {
        res = await adminApi.updateMaintenanceWindow(editMaintenanceId, payload);
        showSuccess(res.data.notified ? `Wartung gespeichert - ${res.data.notified} Benutzer benachrichtigt.` : 'Wartung wurde gespeichert.');
      } else {
        res = await adminApi.createMaintenanceWindow(payload);
        showSuccess(res.data.notified ? `Wartung angekündigt - ${res.data.notified} Benutzer benachrichtigt.` : 'Wartung wurde angelegt.');
      }
      closeMaintenanceModal();
      await loadData('maintenance');
    } catch (err) {
      setError(getErrorMessage(err, 'Wartung konnte nicht gespeichert werden.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMaintenance = async (item) => {
    if (!window.confirm(translatePortalText(`Wartungsfenster "${item.title}" wirklich löschen?`, readStoredLanguage()))) return;
    try {
      setActionLoading(true);
      setError('');
      await adminApi.deleteMaintenanceWindow(item.id);
      showSuccess('Wartungsfenster wurde gelöscht.');
      await loadData('maintenance');
    } catch (err) {
      setError(getErrorMessage(err, 'Wartungsfenster konnte nicht gelöscht werden.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTestMail = async () => {
    try {
      setActionLoading(true);
      setTestMailResult(null);
      const res = await adminApi.sendTestMail();
      setTestMailResult({ success: true, message: `Test-E-Mail an ${res.data.to} versendet.` });
    } catch (err) {
      setTestMailResult({ success: false, message: getErrorMessage(err, 'Test-E-Mail konnte nicht versendet werden.') });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="app-page admin-page">
      <MaintenanceBanner />
      <header className="site-header">
        <div className="site-header-inner">
          <button type="button" className="site-brand site-brand-button" onClick={() => handleSelectTab('overview')} aria-label="Zum Dashboard"><h1>Hosting by TechByGiusi</h1></button>
          <div className="site-actions">
            <ThemeButton />
            <button type="button" className="btn-secondary admin-mobile-menu-toggle" onClick={() => setMobileMenuOpen(true)} aria-label={mobileMenuText.openMenu}><MenuIcon /><span>{mobileMenuText.menu}</span></button>
            <button type="button" className="btn-secondary logout-button" onClick={logout} aria-label={mobileMenuText.logout}><LogoutIcon /><span className="logout-label">{mobileMenuText.logout}</span></button>
          </div>
        </div>
      </header>

      <div className={`mobile-admin-menu-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)} aria-hidden={!mobileMenuOpen}>
        <div className="mobile-admin-menu-panel" onClick={(e) => e.stopPropagation()}>
          <div className="mobile-admin-menu-header">
            <div>
              <span className="resource-id">{mobileMenuText.adminConsole}</span>
              <h2>{user?.name || 'Administrator'}</h2>
              <p>{clusters.length} {mobileMenuText.counts.clusters} · {resources.length} {mobileMenuText.counts.services} · {users.length} {mobileMenuText.counts.users}</p>
            </div>
            <button type="button" className="btn-secondary mobile-admin-menu-close" onClick={() => setMobileMenuOpen(false)} aria-label={mobileMenuText.closeMenu}>{mobileMenuText.close}</button>
          </div>
          <div className="mobile-admin-language-switch" role="group" aria-label="Language">
            {OVERLAY_LANGUAGE_OPTIONS.map(option => (
              <button
                key={option.code}
                type="button"
                className={mobileMenuLanguage === option.code ? 'active' : ''}
                onClick={() => handleOverlayLanguageChange(option.code)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <nav className="console-nav-tabs mobile-admin-menu-nav" aria-label={mobileMenuText.menu}>
            {mobileMenuTabs.map(([key, label]) => (
              <button key={key} type="button" className={activeTab === key ? 'active' : ''} onClick={() => handleSelectTab(key)}>{label}</button>
            ))}
          </nav>
          <div className="mobile-admin-menu-footer">
            <button type="button" className="btn-secondary mobile-admin-menu-logout" onClick={logout}>{mobileMenuText.logout}</button>
          </div>
        </div>
      </div>

      <main className="app-container compact-container admin-shell">
        <aside className="admin-sidebar-shell desktop-admin-sidebar">
          <div className="panel-card console-sidebar-card">
            <span className="resource-id">{mobileMenuText.adminConsole}</span>
            <h2>{user?.name || 'Administrator'}</h2>
            <p>{clusters.length} {mobileMenuText.counts.clusters} · {resources.length} {mobileMenuText.counts.services} · {users.length} {mobileMenuText.counts.users}</p>
          </div>
          <nav className="app-tabs console-nav-tabs" aria-label={mobileMenuText.menu}>
            {mobileMenuTabs.map(([key, label]) => (
              <button key={key} type="button" className={activeTab === key ? 'active' : ''} onClick={() => handleSelectTab(key)}>{label}</button>
            ))}
          </nav>
        </aside>

        <section className="admin-main-shell">
          {error && <div className="alert alert-danger">{error}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}

          {loading && <div className="loading"><span className="spinner"></span><span>{mobileMenuText.loading}</span></div>}

          {!loading && activeTab === 'overview' && (
            <>
              <section className="panel-card dashboard-hero-card">
                <div>
                  <span className="resource-id">Hosting by TechByGiusi</span>
                  <h2>Dashboard</h2>
                  
                </div>
                <div className="dashboard-hero-actions">
                  <button type="button" className="btn-secondary" onClick={() => handleSelectTab('clusters')}>{dashboardText.manageClusters}</button>
                  <button type="button" className="btn-primary" onClick={() => handleSelectTab('resources')}>{dashboardText.manageServices}</button>
                </div>
              </section>

              <section className="dashboard-grid console-metric-grid">
                <MetricCard label={dashboardText.metrics.users} value={userCount} onClick={() => handleSelectTab('users')} />
                <MetricCard label={dashboardText.metrics.admins} value={adminCount} onClick={() => handleSelectTab('users')} />
                <MetricCard label={dashboardText.metrics.groups} value={groups.length} onClick={() => handleSelectTab('groups')} />
                <MetricCard label={dashboardText.metrics.clusters} value={clusters.length} onClick={() => handleSelectTab('clusters')} />
                <MetricCard label={dashboardText.metrics.services} value={resources.length} onClick={() => handleSelectTab('resources')} />
                <MetricCard label={dashboardText.metrics.online} value={onlineCount} onClick={() => handleSelectTab('resources')} />
              </section>

              <div className="admin-overview-stack">
                <ClusterMapSection clusters={clusterStats} mappedCount={mappedClusterCount} onOpenClusters={() => handleSelectTab('clusters')} labels={mobileMenuText.clusterMap} />
                <StatusEventsSection events={statusEvents} />
                <ClusterStatsSection clusters={clusterStats} labels={mobileMenuText.clusterStatus} />
              </div>
            </>
          )}

        {!loading && activeTab === 'users' && (
          <section className="panel-card">
            <PanelHeader title="Benutzer" action="Benutzer anlegen" onAction={openCreateUser} />
            {users.length === 0 ? (
              <div className="empty-state soft-box"><h2>Keine Benutzer</h2></div>
            ) : (
              <div className="list-grid">
                {users.map(item => (
                  <article key={item.id} className="list-card">
                    <div><span className="resource-id">{item.role === 'admin' ? 'Administrator' : 'Benutzer'}</span><h2>{item.name}</h2><p>{item.email}</p></div>
                    <div className="card-actions"><button type="button" className="btn-secondary btn-small" onClick={() => openEditUser(item)}>Bearbeiten</button><button type="button" className="btn-danger btn-small" onClick={() => handleDeleteUser(item.id)} disabled={actionLoading || item.id === user?.id}>Löschen</button></div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {!loading && activeTab === 'groups' && (
          <section className="panel-card">
            <PanelHeader title="Gruppen" action="Gruppe anlegen" onAction={openCreateGroup} />
            {groups.length === 0 ? (
              <div className="empty-state soft-box"><h2>Keine Gruppen</h2></div>
            ) : (
              <div className="list-grid">
                {groups.map(item => (
                  <article key={item.id} className="list-card">
                    <div>
                      <span className="resource-id">{item.member_count} {item.member_count === 1 ? 'Mitglied' : 'Mitglieder'} · {item.resource_count} {item.resource_count === 1 ? 'Dienst' : 'Dienste'}</span>
                      <h2>{item.name}</h2>
                      <p>{(item.members || []).map(member => member.name).join(', ') || 'Noch keine Mitglieder'}</p>
                    </div>
                    <div className="card-actions">
                      <button type="button" className="btn-secondary btn-small" onClick={() => openEditGroup(item)}>Bearbeiten</button>
                      <button type="button" className="btn-danger btn-small" onClick={() => handleDeleteGroup(item.id)} disabled={actionLoading}>Löschen</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {!loading && activeTab === 'clusters' && (
          <section className="panel-card">
            <PanelHeader title="Proxmox" action={clusterText.addCluster} onAction={openCreateCluster} />
            {clusters.length === 0 ? (
              <div className="empty-state soft-box"><h2>{clusterText.noCluster}</h2></div>
            ) : (
              <div className="list-grid">
                {clusters.map(item => (
                  <article key={item.id} className="list-card cluster-list-card">
                    <div>
                      <h2>{item.name}</h2>
                      {item.location_label ? <p className="cluster-location-status">{clusterText.mapSaved}</p> : <p className="hint-text">{clusterText.mapMissing}</p>}
                      {clusterCaps[item.id]
                        ? (clusterCaps[item.id].error
                            ? <p className="hint-text caps-error">{clusterText.permissionsUnavailable}</p>
                            : <CapabilityBadges caps={clusterCaps[item.id]} labels={clusterText.capabilities} />)
                        : <p className="hint-text caps-loading">{capsLoading ? clusterText.permissionsLoading : '-'}</p>}
                    </div>
                    <div className="card-actions">
                      <button type="button" className="btn-secondary btn-small" onClick={() => handleCheckCapabilities(item.id)} disabled={checkingCapsId === item.id}>{checkingCapsId === item.id ? clusterText.checkingPermissions : clusterText.checkPermissions}</button>
                      <button type="button" className="btn-secondary btn-small" onClick={() => openEditCluster(item)}>{clusterText.edit}</button>
                      <button type="button" className="btn-danger btn-small" onClick={() => handleDeleteCluster(item.id)} disabled={actionLoading}>{clusterText.delete}</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}


        {!loading && activeTab === 'templates' && (
          <TemplateAdminPanel clusters={clusters} language={mobileMenuLanguage} onError={setError} onSuccess={setSuccessMsg} />
        )}

        {!loading && activeTab === 'resources' && (
          <section className="panel-card">
            <PanelHeader title="Dienste" action="Dienst anlegen" onAction={openCreateResource} />
            {resources.length === 0 ? (
              <div className="empty-state soft-box"><h2>Keine Dienste</h2></div>
            ) : (
              <div className="resource-grid admin-resource-grid">
                {resources.map(item => <ResourceCard key={item.id} resource={item} onEdit={openEditResource} onDelete={handleDeleteResource} onManageCredentials={openResourceCreds} actionLoading={actionLoading} />)}
              </div>
            )}
          </section>
        )}

        {!loading && activeTab === 'maintenance' && (
          <section className="panel-card">
            <PanelHeader title="Wartungsfenster" action="Wartung planen" onAction={openCreateMaintenance} />
            {maintenanceWindows.length === 0 ? (
              <div className="empty-state soft-box"><h2>Keine Wartungen geplant</h2><p>Lege ein Wartungsfenster an, um Benutzer rechtzeitig zu informieren.</p></div>
            ) : (
              <div className="list-grid">
                {maintenanceWindows.map(item => {
                  const state = maintenanceState(item);
                  return (
                    <article key={item.id} className={`list-card maintenance-card state-${state}`}>
                      <div>
                        <span className="resource-id">
                          <span className={`maintenance-chip severity-${item.severity}`}>{item.severity === 'critical' ? 'Kritisch' : item.severity === 'warning' ? 'Einschränkungen' : 'Info'}</span>
                          <span className={`maintenance-chip state-chip state-${state}`}>{state === 'aktiv' ? 'Läuft gerade' : state === 'geplant' ? 'Geplant' : 'Beendet'}</span>
                        </span>
                        <h2>{item.title}</h2>
                        <p>{formatDateTime(item.starts_at)} - {formatDateTime(item.ends_at)}</p>
                        {item.message ? <p className="maintenance-message">{item.message}</p> : null}
                        {item.notified_at ? <p className="maintenance-notified">✓ Benutzer benachrichtigt am {formatDateTime(item.notified_at)}</p> : null}
                      </div>
                      <div className="card-actions">
                        <button type="button" className="btn-secondary btn-small" onClick={() => openEditMaintenance(item)}>Bearbeiten</button>
                        <button type="button" className="btn-danger btn-small" onClick={() => handleDeleteMaintenance(item)} disabled={actionLoading}>Löschen</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {!loading && activeTab === 'audit' && (
          <section className="panel-card audit-panel">
            <PanelHeader title="Protokoll" action={auditLoading ? 'Lädt…' : 'Aktualisieren'} onAction={loadAudit} />
            <div className="audit-filter-card">
              <label className="form-group audit-search-field">
                <span>Suche</span>
                <input
                  type="search"
                  value={auditSearchDraft}
                  onChange={e => setAuditSearchDraft(e.target.value)}
                  placeholder="Aktion, Benutzer, Ziel, Details oder IP filtern"
                />
              </label>
              <div className="audit-filter-footer">
                <span className="audit-count">{auditMeta.total || 0} Einträge · 50 pro Seite{auditLoading ? ' · wird geladen…' : ''}</span>
                {auditSearchDraft && <button type="button" className="btn-secondary btn-small" onClick={() => { setAuditSearchDraft(''); setAuditSearch(''); setAuditPage(1); }}>Suche leeren</button>}
              </div>
            </div>
            {auditEntries.length === 0 ? (
              <div className="empty-state soft-box"><h2>Keine Einträge</h2></div>
            ) : (
              <>
                <div className="audit-list">
                  {auditEntries.map(entry => (
                    <div key={entry.id} className="audit-row">
                      <div className="audit-main">
                        <strong>{renderAuditAction(entry.action)}</strong>
                        <span>{entry.details || entry.target || ''}</span>
                      </div>
                      <div className="audit-meta">
                        <span>{entry.user_email || 'System'}</span>
                        <span>{formatAuditTime(entry.created_at)}</span>
                        {entry.ip && <span>{entry.ip}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pagination-row">
                  <button type="button" className="btn-secondary" onClick={() => setAuditPage(page => Math.max(1, page - 1))} disabled={auditMeta.page <= 1}>Zurück</button>
                  <span>Seite {auditMeta.page || 1} von {auditMeta.pages || 1}</span>
                  <button type="button" className="btn-secondary" onClick={() => setAuditPage(page => Math.min(auditMeta.pages || 1, page + 1))} disabled={(auditMeta.page || 1) >= (auditMeta.pages || 1)}>Weiter</button>
                </div>
              </>
            )}
          </section>
        )}

        {!loading && activeTab === 'wiki' && <WikiAdminPanel language={mobileMenuLanguage} />}

        {!loading && activeTab === 'settings' && (
          <section className="panel-card settings-card">
            <PanelHeader title="Einstellungen" />

            <section className="settings-section-card settings-language-section" aria-labelledby="settings-language-title">
              <div className="settings-section-heading">
                <h3 id="settings-language-title">{mobileMenuText.language}</h3>
                <p>{mobileMenuText.languageText}</p>
              </div>
              <div className="mobile-admin-language-switch settings-language-buttons" role="group" aria-label={mobileMenuText.language}>
                {OVERLAY_LANGUAGE_OPTIONS.map(option => (
                  <button
                    key={option.code}
                    type="button"
                    className={mobileMenuLanguage === option.code ? 'active' : ''}
                    onClick={() => handleOverlayLanguageChange(option.code)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="settings-section-card settings-smtp-section" aria-labelledby="settings-smtp-title">
              <div className="settings-section-heading">
                <h3 id="settings-smtp-title">SMTP-Einstellungen</h3>
                <p>Konfiguriere den Mailversand für Tests, Benachrichtigungen und Passwort-Zurücksetzungen.</p>
              </div>
              <form className="form-grid" onSubmit={handleSaveSettings}>
                <label className="form-group"><span>SMTP-Host</span><input type="text" name="smtpHost" value={settings.smtpHost} onChange={handleSettingsChange} placeholder="smtp.example.com" /></label>
                <label className="form-group"><span>SMTP-Port</span><input type="text" name="smtpPort" value={settings.smtpPort} onChange={handleSettingsChange} placeholder="587" /></label>
                <label className="form-group"><span>SMTP-Benutzer</span><input type="email" name="smtpUser" value={settings.smtpUser} onChange={handleSettingsChange} placeholder="noreply@example.com" /></label>
                <label className="form-group"><span>SMTP-Passwort</span><input type="password" name="smtpPassword" value={settings.smtpPassword} onChange={handleSettingsChange} placeholder="Leer lassen, vorhandenes Passwort verwenden" /></label>
                <div className="form-actions full-width"><button type="button" className="btn-secondary" onClick={handleTestSmtp} disabled={actionLoading}>SMTP testen</button><button type="submit" className="btn-primary" disabled={actionLoading}>Speichern</button></div>
              </form>
              {smtpTestResult && <div className={`test-result ${smtpTestResult.success ? 'success' : 'error'}`}>{translateMessage(smtpTestResult.message)}</div>}
              <div className="settings-testmail-row">
                <button type="button" className="btn-secondary" onClick={handleSendTestMail} disabled={actionLoading}>Test-E-Mail an mich senden</button>
                {testMailResult && <div className={`test-result ${testMailResult.success ? 'success' : 'error'}`}>{translateMessage(testMailResult.message)}</div>}
              </div>
            </section>

            <section className="settings-section-card settings-setup-section" aria-labelledby="settings-setup-title">
              <div className="settings-section-header">
                <div className="settings-section-heading">
                  <h3 id="settings-setup-title">Einrichtung prüfen</h3>
                  <p>Prüfe Administrator, Proxmox und SMTP direkt in den Einstellungen.</p>
                </div>
                <button type="button" className="btn-secondary" onClick={() => loadSetupCheck()} disabled={setupCheckLoading || actionLoading}>
                  {setupCheckLoading ? 'Prüfe…' : 'Aktualisieren'}
                </button>
              </div>

              {setupCheckLoading ? (
                <div className="loading inline-loading"><span className="spinner"></span><span>Prüfung läuft...</span></div>
              ) : setupCheck?.error ? (
                <div className="alert alert-danger">{setupCheck.error}</div>
              ) : (
                <div className="setup-check-grid settings-inline-check-grid">
                  <SetupCheckRow label="Administrator" ok={setupCheck?.adminConfigured} detail={setupAdminDetail} />
                  <SetupCheckRow label="Proxmox" ok={setupCheck?.proxmoxConfigured} detail={setupClusterDetail} />
                  <SetupCheckRow label="SMTP" ok={setupCheck?.smtpConfigured} detail={setupCheck?.settings?.smtp_user || 'Nicht hinterlegt'} />

                  <div className="settings-setup-tests">
                    <div className="setup-check-test">
                      <h3>Proxmox-Verbindung</h3>
                      <div className="setup-check-actions">
                        <select value={selectedSetupClusterId} onChange={e => { setSelectedSetupClusterId(e.target.value); setSetupClusterTestResult(null); }}>
                          <option value="">Cluster auswählen</option>
                          {(setupCheck?.clusters || []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                        <button type="button" className="btn-secondary" onClick={handleTestSetupCluster} disabled={actionLoading || !selectedSetupClusterId}>Testen</button>
                      </div>
                      {setupClusterTestResult && <div className={`test-result ${setupClusterTestResult.success ? 'success' : 'error'}`}>{translateMessage(setupClusterTestResult.message)}</div>}
                    </div>

                    <div className="setup-check-test">
                      <h3>SMTP-Verbindung</h3>
                      <p className="settings-section-note">Prüft die aktuell gespeicherte SMTP-Konfiguration.</p>
                      <button type="button" className="btn-secondary" onClick={handleTestSetupSmtp} disabled={actionLoading}>SMTP testen</button>
                      {setupSmtpTestResult && <div className={`test-result ${setupSmtpTestResult.success ? 'success' : 'error'}`}>{translateMessage(setupSmtpTestResult.message)}</div>}
                    </div>
                  </div>

                  {setupCheck?.setupRequired && (
                    <button type="button" className="btn-primary full-button" onClick={() => { window.location.href = '/setup'; }}>Setup öffnen</button>
                  )}
                </div>
              )}
            </section>
          </section>
        )}

        {!loading && activeTab === 'settings' && (
          <PangolinSettingsPanel
            language={mobileMenuLanguage}
            onSuccess={showSuccess}
            onError={(msg) => setError(msg)}
          />
        )}

        {!loading && activeTab === 'settings' && (
          <ProvisioningSettings
            clusters={clusters}
            onSaved={() => loadData('settings')}
            onError={(msg) => setError(msg)}
            onSuccess={showSuccess}
          />
        )}

        </section>
      </main>


      {resourceCredsFor && (
        <AdminResourceCredentials
          resource={resourceCredsFor}
          onClose={() => setResourceCredsFor(null)}
          onError={(msg) => setError(msg)}
        />
      )}

      {showMaintenanceModal && (
        <Modal title={editMaintenanceId ? 'Wartung bearbeiten' : 'Wartung planen'} onClose={closeMaintenanceModal}>
          <form className="form-stack" onSubmit={handleSaveMaintenance}>
            <label className="form-group"><span>Titel</span><input type="text" value={newMaintenance.title} onChange={e => setNewMaintenance(prev => ({ ...prev, title: e.target.value }))} placeholder="z. B. Proxmox Cluster Update" /></label>
            <label className="form-group"><span>Beschreibung (optional)</span><textarea rows="3" value={newMaintenance.message} onChange={e => setNewMaintenance(prev => ({ ...prev, message: e.target.value }))} placeholder="Was wird gewartet? Welche Dienste sind betroffen?" /></label>
            <label className="form-group"><span>Stufe</span>
              <select value={newMaintenance.severity} onChange={e => setNewMaintenance(prev => ({ ...prev, severity: e.target.value }))}>
                <option value="info">Info - keine spürbaren Auswirkungen</option>
                <option value="warning">Einschränkungen möglich</option>
                <option value="critical">Kritisch - Dienste nicht verfügbar</option>
              </select>
            </label>
            <div className="form-grid-2">
              <label className="form-group"><span>Beginn</span><input type="datetime-local" value={newMaintenance.startsAt} onChange={e => setNewMaintenance(prev => ({ ...prev, startsAt: e.target.value }))} /></label>
              <label className="form-group"><span>Ende</span><input type="datetime-local" value={newMaintenance.endsAt} onChange={e => setNewMaintenance(prev => ({ ...prev, endsAt: e.target.value }))} /></label>
            </div>
            <label className="checkbox-row">
              <input type="checkbox" checked={newMaintenance.notifyUsers} onChange={e => setNewMaintenance(prev => ({ ...prev, notifyUsers: e.target.checked }))} />
              <span>Benutzer jetzt per E-Mail informieren (nur mit aktivierter Wartungs-Benachrichtigung)</span>
            </label>
            <div className="form-actions"><button type="button" className="btn-secondary" onClick={closeMaintenanceModal}>Abbrechen</button><button type="submit" className="btn-primary" disabled={actionLoading}>{editMaintenanceId ? 'Speichern' : 'Planen'}</button></div>
          </form>
        </Modal>
      )}

      {showUserModal && (
        <Modal title={editUserId ? 'Benutzer bearbeiten' : 'Benutzer anlegen'} onClose={closeUserModal}>
          <form className="form-stack" onSubmit={handleSaveUser}>
            <label className="form-group"><span>Name</span><input type="text" value={newUser.name} onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))} placeholder="Max Mustermann" /></label>
            <label className="form-group"><span>E-Mail-Adresse</span><input type="email" value={newUser.email} onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))} placeholder="max@example.com" /></label>
            <label className="form-group"><span>{editUserId ? 'Neues Passwort' : 'Startpasswort'}</span><input type="text" value={newUser.password} onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))} placeholder={editUserId ? 'Leer lassen, wenn unverändert' : 'Passwort für den Benutzer'} /></label>
            <label className="form-group"><span>Rolle</span><select value={newUser.role} onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value }))}><option value="user">Benutzer</option><option value="admin">Administrator</option></select></label>
            {!editUserId && (
              <label className="checkbox-row">
                <input type="checkbox" checked={newUser.sendWelcome} onChange={e => setNewUser(prev => ({ ...prev, sendWelcome: e.target.checked }))} />
                <span>Willkommens-E-Mail mit Portal-Link senden (ohne Passwort)</span>
              </label>
            )}
            <div className="form-actions"><button type="button" className="btn-secondary" onClick={closeUserModal}>Abbrechen</button><button type="submit" className="btn-primary" disabled={actionLoading}>{editUserId ? 'Speichern' : 'Anlegen'}</button></div>
          </form>
        </Modal>
      )}

      {showClusterModal && (
        <Modal title={editClusterId ? clusterText.editTitle : clusterText.addTitle} onClose={closeClusterModal}>
          <form className="form-stack" onSubmit={handleSaveCluster}>
            <label className="form-group"><span>{clusterText.name}</span><input type="text" value={newCluster.name} onChange={e => handleClusterChange('name', e.target.value)} placeholder="Home Lab" /></label>
            <label className="form-group"><span>{clusterText.url}</span><input type="text" value={newCluster.url} onChange={e => handleClusterChange('url', e.target.value)} placeholder="https://10.10.0.10:8006" /></label>
            <div className="form-group location-field-group">
              <span>{clusterText.mapLocation}</span>
              <input type="text" value={newCluster.locationLabel} onChange={e => handleClusterChange('locationLabel', e.target.value)} placeholder={clusterText.addressPlaceholder} autoComplete="off" />
              <small>{clusterText.mapHint}</small>
              {(locationSearchLoading || locationResults.length > 0) && (
                <div className="location-search-dropdown">
                  {locationSearchLoading && <div className="location-search-item muted">{clusterText.searchingLocations}</div>}
                  {!locationSearchLoading && locationResults.map((result, index) => (
                    <button key={`${result.label}-${index}`} type="button" className="location-search-item" onClick={() => handleSelectLocation(result)}>
                      <strong>{result.label}</strong>
                      <span>{Number(result.lat).toFixed(4)}, {Number(result.lon).toFixed(4)}</span>
                    </button>
                  ))}
                </div>
              )}
              {newCluster.locationLat !== '' && newCluster.locationLon !== '' && (
                <small className="location-selected-hint">{clusterText.selected}: {Number(newCluster.locationLat).toFixed(4)}, {Number(newCluster.locationLon).toFixed(4)}</small>
              )}
            </div>
            <label className="form-group"><span>{clusterText.apiToken}</span><input type="password" value={newCluster.apiToken} onChange={e => handleClusterChange('apiToken', e.target.value)} placeholder={editClusterId ? clusterText.existingTokenPlaceholder : 'api@pam!hosting=secret'} /></label>
            <button type="button" className="btn-secondary full-button" onClick={handleTestCluster} disabled={actionLoading}>{clusterText.testConnection}</button>
            {clusterTestResult && <div className={`test-result ${clusterTestResult.success ? 'success' : 'error'}`}>{translateMessage(clusterTestResult.message)}</div>}

            <div className="form-section-divider cluster-feature-toggles">
              <label className="toggle-row">
                <span className="toggle-label">{clusterText.selfService}</span>
                <span className="toggle-switch">
                  <input type="checkbox" checked={newCluster.allowProvisioning} onChange={e => handleClusterChange('allowProvisioning', e.target.checked)} />
                  <span className="toggle-track"><span className="toggle-thumb"></span></span>
                </span>
              </label>
              <label className="toggle-row">
                <span className="toggle-label">{clusterText.allowPublishing}</span>
                <span className="toggle-switch">
                  <input type="checkbox" checked={newCluster.allowPublishing} onChange={e => handleClusterChange('allowPublishing', e.target.checked)} />
                  <span className="toggle-track"><span className="toggle-thumb"></span></span>
                </span>
              </label>
              <small className="cluster-publishing-help">{clusterText.publishingHelp}</small>
            </div>

            <div className="form-actions"><button type="button" className="btn-secondary" onClick={closeClusterModal}>{clusterText.cancel}</button><button type="submit" className="btn-primary" disabled={actionLoading}>{clusterText.save}</button></div>
          </form>
        </Modal>
      )}

      {showResourceModal && (
        <Modal title={editResourceId ? 'Dienst bearbeiten' : 'Dienst anlegen'} onClose={closeResourceModal}>
          <form className="form-stack" onSubmit={handleSaveResource}>
            <label className="form-group"><span>Cluster</span><select value={newResource.clusterId} onChange={e => { setNewResource(prev => ({ ...prev, clusterId: e.target.value, containerId: '', name: editResourceId ? prev.name : '', resourceType: '', manualIp: '', sshPort: '22' })); setClusterContainers([]); }}><option value="">Bitte auswählen</option>{clusters.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <button type="button" className="btn-secondary" onClick={handleLoadClusterContainers} disabled={actionLoading || !newResource.clusterId}>{currentClusterName ? `Dienste von ${currentClusterName} laden` : 'Dienste laden'}</button>
            <label className="form-group"><span>Container oder VM</span>{clusterContainers.length > 0 ? <select value={newResource.containerId} onChange={e => handleResourceContainerChange(e.target.value)}><option value="">Bitte auswählen</option>{clusterContainers.map(item => <option key={`${item.type}-${item.vmid}`} value={item.vmid}>{item.vmid} · {item.name || item.type} · {renderType(item.type)} · {renderStatus(item.status)}</option>)}</select> : <input type="text" value={newResource.containerId} onChange={e => setNewResource(prev => ({ ...prev, containerId: e.target.value }))} placeholder="VMID oder CTID" />}</label>
            <label className="form-group"><span>Anzeigename</span><input type="text" value={newResource.name} onChange={e => setNewResource(prev => ({ ...prev, name: e.target.value }))} placeholder="Optional" /></label>
            {editResourceId && newResource.resourceType === 'qemu' && (
              <div className="service-ip-fields admin-service-ip-fields">
                <label className="form-group"><span>Manuelle IPv4-Adresse</span><input type="text" inputMode="decimal" value={newResource.manualIp} onChange={e => setNewResource(prev => ({ ...prev, manualIp: e.target.value }))} placeholder="10.10.20.16" /></label>
                <label className="form-group service-ip-port"><span>SSH-Port</span><input type="number" min="1" max="65535" value={newResource.sshPort} onChange={e => setNewResource(prev => ({ ...prev, sshPort: e.target.value }))} /></label>
              </div>
            )}
            <label className="form-group"><span>Benutzer</span><select value={newResource.userId} onChange={e => setNewResource(prev => ({ ...prev, userId: e.target.value }))}><option value="">Bitte auswählen</option>{users.map(item => <option key={item.id} value={item.id}>{item.name} · {item.email}</option>)}</select></label>
            <label className="form-group"><span>Gruppe (geteilter Zugriff)</span><select value={newResource.groupId} onChange={e => setNewResource(prev => ({ ...prev, groupId: e.target.value }))}><option value="">Keine Gruppe</option>{groups.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="form-group"><span>Verwaltungsseite</span><input type="url" value={newResource.adminUrl} onChange={e => setNewResource(prev => ({ ...prev, adminUrl: e.target.value }))} placeholder="https://admin.example.com" /></label>
            <div className="form-actions"><button type="button" className="btn-secondary" onClick={closeResourceModal}>Abbrechen</button><button type="submit" className="btn-primary" disabled={actionLoading}>{editResourceId ? 'Speichern' : 'Anlegen'}</button></div>
          </form>
        </Modal>
      )}
      {showGroupModal && (
        <Modal title={editGroupId ? 'Gruppe bearbeiten' : 'Gruppe anlegen'} onClose={closeGroupModal}>
          <form className="form-stack" onSubmit={handleSaveGroup}>
            <label className="form-group"><span>Name</span><input type="text" value={newGroup.name} onChange={e => setNewGroup(prev => ({ ...prev, name: e.target.value }))} placeholder="z. B. Minecraft-Team" /></label>
            <div className="form-group">
              <span>Mitglieder</span>
              <div className="member-checklist">
                {users.length === 0 && <p className="hint-text">Noch keine Benutzer vorhanden.</p>}
                {users.map(item => (
                  <label key={item.id} className="checkbox-row">
                    <input type="checkbox" checked={newGroup.memberIds.includes(item.id)} onChange={() => toggleGroupMember(item.id)} />
                    <span>{item.name} · {item.email}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-actions"><button type="button" className="btn-secondary" onClick={closeGroupModal}>Abbrechen</button><button type="submit" className="btn-primary" disabled={actionLoading}>{editGroupId ? 'Speichern' : 'Anlegen'}</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/**
 * Admin management of general credentials attached to a specific resource.
 * Management-page access is maintained in the Dashboard access editor.
 */
function AdminResourceCredentials({ resource, onClose, onError }) {
  const emptyForm = { label: '', username: '', secret: '', url: '', notes: '', purpose: 'general' };
  const adminReadOnly = !!resource.adminReadOnly || !!resource.isSelfService;
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState({});

  const load = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getResourceCredentials(resource.id);
      setCredentials(res.data.credentials || []);
    } catch (err) {
      onError(getErrorMessage(err, 'Zugangsdaten konnten nicht geladen werden.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [resource.id]);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (item) => {
    setEditId(item.id);
    setForm({ label: item.label || '', username: item.username || '', secret: '', url: item.url || '', notes: item.notes || '', purpose: item.purpose || 'general' });
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) { onError('Bitte eine Bezeichnung eingeben.'); return; }
    try {
      setBusy(true);
      if (editId) await adminApi.updateResourceCredential(resource.id, editId, form);
      else await adminApi.createResourceCredential(resource.id, form);
      setShowForm(false); setEditId(null); setForm(emptyForm);
      await load();
    } catch (err) {
      onError(getErrorMessage(err, 'Zugangsdaten konnten nicht gespeichert werden.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(translatePortalText(`"${item.label}" wirklich löschen?`, readStoredLanguage()))) return;
    try {
      setBusy(true);
      await adminApi.deleteResourceCredential(resource.id, item.id);
      await load();
    } catch (err) {
      onError(getErrorMessage(err, 'Zugangsdaten konnten nicht gelöscht werden.'));
    } finally {
      setBusy(false);
    }
  };

  const toggleReveal = async (item) => {
    if (revealed[item.id] !== undefined) {
      setRevealed(prev => { const next = { ...prev }; delete next[item.id]; return next; });
      return;
    }
    try {
      const res = await adminApi.revealResourceCredential(resource.id, item.id);
      setRevealed(prev => ({ ...prev, [item.id]: res.data.secret || '' }));
    } catch (err) {
      onError(getErrorMessage(err, 'Passwort konnte nicht angezeigt werden.'));
    }
  };

  const adminCreds = credentials.filter(item => item.canManage && item.purpose !== 'management');
  const userCreds = credentials.filter(item => !item.canManage && item.purpose !== 'management');

  if (adminReadOnly) {
    return (
      <Modal title={`Zugangsdaten · ${resource.name}`} onClose={onClose}>
        <p className="hint-text tab-empty">Benutzerverwaltete Dienste: Zugangsdaten sind für den Admin nicht sichtbar.</p>
      </Modal>
    );
  }

  return (
    <Modal title={`Zugangsdaten · ${resource.name}`} onClose={onClose}>
      <div className="tasks-toolbar">
        <span className="hint-text">{adminCreds.length} verwaltbar · {userCreds.length} privat</span>
        <div className="inline-actions">
          <button type="button" className="btn-primary btn-small" onClick={openCreate}>Hinzufügen</button>
        </div>
      </div>

      {loading && <div className="loading inline-loading"><span className="spinner"></span><span>Laden...</span></div>}

      {!loading && adminCreds.map(item => (
        <div key={item.id} className="credential-row">
          <div className="credential-main">
            <strong>{item.label}<span className={`cred-tag ${item.fromAdmin ? 'cred-tag-admin' : 'cred-tag-user'}`}>{item.fromAdmin ? 'von Admin' : 'vom Benutzer'}</span></strong>
            {item.username && <span className="credential-user">{item.username}</span>}
            {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="credential-url">{item.url}</a>}
            {item.notes && <small className="credential-notes">{item.notes}</small>}
            <code className="credential-secret">{revealed[item.id] !== undefined ? (revealed[item.id] || '(leer)') : '••••••••'}</code>
          </div>
          <div className="credential-actions">
            <button type="button" className="btn-secondary btn-small" onClick={() => toggleReveal(item)}>{revealed[item.id] !== undefined ? 'Verbergen' : 'Anzeigen'}</button>
            <button type="button" className="btn-secondary btn-small" onClick={() => openEdit(item)}>Bearbeiten</button>
            <button type="button" className="btn-danger btn-small" onClick={() => remove(item)} disabled={busy}>Löschen</button>
          </div>
        </div>
      ))}

      {!loading && userCreds.map(item => (
        <div key={item.id} className="credential-row credential-row-locked">
          <div className="credential-main">
            <strong>{item.label}<span className="cred-tag cred-tag-user">vom Benutzer</span></strong>
            {item.username && <span className="credential-user">{item.username}</span>}
            {item.url && <span className="credential-url">{item.url}</span>}
            <code className="credential-secret">••••••••</code>
            <small className="hint-text">Nur für den Benutzer sichtbar - nicht verwaltbar.</small>
          </div>
        </div>
      ))}

      {!loading && adminCreds.length === 0 && userCreds.length === 0 && !showForm && (
        <p className="hint-text tab-empty">Noch keine Zugangsdaten hinterlegt.</p>
      )}

      {showForm && (
        <form className="form-stack credential-form" onSubmit={save}>
          <label className="form-group"><span>Bezeichnung</span><input type="text" value={form.label} onChange={e => setForm(prev => ({ ...prev, label: e.target.value }))} placeholder="z. B. SSH root" /></label>
          <label className="form-group"><span>Benutzername</span><input type="text" value={form.username} onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))} placeholder="Optional" autoComplete="off" /></label>
          <label className="form-group"><span>Passwort / Secret</span><input type="password" value={form.secret} onChange={e => setForm(prev => ({ ...prev, secret: e.target.value }))} placeholder={editId ? 'Leer lassen, wenn unverändert' : ''} autoComplete="new-password" /></label>
          <label className="form-group"><span>URL</span><input type="url" value={form.url} onChange={e => setForm(prev => ({ ...prev, url: e.target.value }))} placeholder="Optional" /></label>
          <label className="form-group"><span>Notizen</span><textarea rows="2" value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Optional"></textarea></label>
          <div className="form-actions"><button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditId(null); }}>Abbrechen</button><button type="submit" className="btn-primary" disabled={busy}>{editId ? 'Speichern' : 'Hinzufügen'}</button></div>
        </form>
      )}
    </Modal>
  );
}

/**
 * Self-Service configuration per cluster (Settings tab).
 * Cluster dropdown → LXC-only self-service, live storages/templates
 * fetched via the cluster API token, VMID/IP ranges and limits.
 */
function ProvisioningSettings({ clusters, onSaved, onError, onSuccess }) {
  const [clusterId, setClusterId] = useState('');
  const [form, setForm] = useState({
    allowProvisioning: false, allowTypes: 'ct', vmidMin: '', vmidMax: '',
    ipStart: '', ipEnd: '', ipPrefix: '24', gateway: '',
    bridge: 'vmbr0', storage: 'local', templateStorage: 'local',
    allowedTemplates: [],
    maxCores: '2', maxMemoryMb: '2048', maxDiskGb: '20'
  });
  const [storages, setStorages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [caps, setCaps] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const toggleAllowed = (field, volid, checked) => {
    setForm(prev => {
      const current = new Set(prev[field] || []);
      if (checked) current.add(volid); else current.delete(volid);
      return { ...prev, [field]: Array.from(current) };
    });
  };

  useEffect(() => {
    if (!clusterId) { setLoaded(false); return; }
    let active = true;
    (async () => {
      try {
        setBusy(true);
        const [provRes, capRes] = await Promise.all([
          adminApi.getClusterProvisioning(clusterId),
          adminApi.getClusterCapabilities(clusterId).catch(() => ({ data: { capabilities: null } }))
        ]);
        if (!active) return;
        const p = provRes.data.provisioning;
        setForm({
          allowProvisioning: !!p.allowProvisioning,
          allowTypes: 'ct',
          vmidMin: p.vmidMin === null ? '' : String(p.vmidMin ?? ''),
          vmidMax: p.vmidMax === null ? '' : String(p.vmidMax ?? ''),
          ipStart: p.ipStart || '', ipEnd: p.ipEnd || '', ipPrefix: String(p.ipPrefix ?? '24'),
          gateway: p.gateway || '', bridge: p.bridge || 'vmbr0',
          storage: p.storage || 'local', templateStorage: p.templateStorage || 'local',
          allowedTemplates: Array.isArray(p.allowedTemplates) ? p.allowedTemplates : [],
          maxCores: String(p.maxCores ?? '2'), maxMemoryMb: String(p.maxMemoryMb ?? '2048'),
          maxDiskGb: String(p.maxDiskGb ?? '20')
        });
        setCaps(capRes.data.capabilities);
        setLoaded(true);
        adminApi.getClusterStorages(clusterId).then(res => {
          if (!active) return;
          const liveStorages = (res.data.storages || []).filter(s => s && s.storage);
          setStorages(liveStorages);
          if (liveStorages.length > 0) {
            const names = liveStorages.map(s => s.storage);
            setForm(prev => names.includes(prev.storage) ? prev : { ...prev, storage: names[0] });
          }
        }).catch(() => setStorages([]));
      } catch (err) {
        onError(getErrorMessage(err, 'Konfiguration konnte nicht geladen werden.'));
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => { active = false; };
  }, [clusterId]);

  const loadTemplates = async () => {
    try {
      const res = await adminApi.getClusterTemplates(clusterId, form.templateStorage);
      const found = res.data.templates || [];
      setTemplates(found);
      if (found.length === 0) onError('Keine CT-Templates in diesem Storage gefunden.');
      else if (form.allowedTemplates.length === 0) setField('allowedTemplates', found.map(t => t.volid));
    } catch (err) {
      onError(getErrorMessage(err, 'Templates konnten nicht geladen werden.'));
    }
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      setBusy(true);
      const response = await adminApi.updateClusterProvisioning(clusterId, form);
      if (response.data.activationWarning) {
        setField('allowProvisioning', false);
        const prefix = translatePortalText('Konfiguration gespeichert. Self-Service bleibt deaktiviert:', readStoredLanguage());
        onSuccess(`${prefix} ${translateMessage(response.data.activationWarning)}`);
      } else {
        onSuccess('Self-Service-Konfiguration gespeichert.');
      }
      onSaved();
    } catch (err) {
      onError(getErrorMessage(err, 'Konfiguration konnte nicht gespeichert werden.'));
    } finally {
      setBusy(false);
    }
  };

  const storageNames = storages.map(s => s.storage);

  return (
    <section className="panel-card provisioning-settings-panel">
      <PanelHeader title="Self-Service" />

      <label className="form-group">
        <span>Cluster</span>
        <select value={clusterId} onChange={e => setClusterId(e.target.value)}>
          <option value="">Bitte auswählen</option>
          {clusters.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>

      {clusterId && caps && !caps.canProvision && (
        <div className="alert alert-danger">Der API-Token dieses Clusters hat kein VM.Allocate - Self-Service funktioniert damit nicht. Passe die Token-Rechte in Proxmox an.</div>
      )}
      {clusterId && caps && caps.canProvision && !caps.canManageFirewall && (
        <div className="alert alert-danger">Dem API-Token fehlt VM.Config.Network. Self-Service bleibt deaktiviert, weil die verpflichtende Internet-only-Isolation sonst nicht sicher angelegt werden kann.</div>
      )}
      {clusterId && caps && caps.canProvision && caps.canManageFirewall && !caps.canVerifyFirewall && (
        <div className="alert alert-danger">Dem API-Token fehlt Sys.Audit. Der Status der Proxmox-Datacenter-Firewall kann deshalb nicht sicher geprüft werden.</div>
      )}

      {clusterId && loaded && (
        <form className="form-stack provisioning-form" onSubmit={save}>
          <label className="toggle-row">
            <span className="toggle-label">Self-Service für diesen Cluster aktivieren</span>
            <span className="toggle-switch">
              <input type="checkbox" checked={form.allowProvisioning} onChange={e => setField('allowProvisioning', e.target.checked)} />
              <span className="toggle-track"><span className="toggle-thumb"></span></span>
            </span>
          </label>

          <>
              <div className="form-row-2">
                <label className="form-group"><span>VMID von</span><input type="number" min="100" value={form.vmidMin} onChange={e => setField('vmidMin', e.target.value)} placeholder="900" /></label>
                <label className="form-group"><span>VMID bis</span><input type="number" min="100" value={form.vmidMax} onChange={e => setField('vmidMax', e.target.value)} placeholder="999" /></label>
              </div>
              <div className="form-row-2">
                <label className="form-group"><span>IP von</span><input type="text" value={form.ipStart} onChange={e => setField('ipStart', e.target.value)} placeholder="10.0.10.100" /></label>
                <label className="form-group"><span>IP bis</span><input type="text" value={form.ipEnd} onChange={e => setField('ipEnd', e.target.value)} placeholder="10.0.10.150" /></label>
              </div>
              <div className="form-row-2">
                <label className="form-group"><span>Präfix (CIDR)</span><input type="number" min="8" max="32" value={form.ipPrefix} onChange={e => setField('ipPrefix', e.target.value)} placeholder="24" /></label>
                <label className="form-group"><span>Gateway</span><input type="text" value={form.gateway} onChange={e => setField('gateway', e.target.value)} placeholder="10.0.10.1" /></label>
              </div>
              <div className="form-row-2">
                <label className="form-group"><span>Bridge</span><input type="text" value={form.bridge} onChange={e => setField('bridge', e.target.value)} placeholder="vmbr0" /></label>
                <label className="form-group"><span>Disk-Storage</span><select value={storageNames.includes(form.storage) ? form.storage : ''} onChange={e => setField('storage', e.target.value)} disabled={storages.length === 0}>{storages.length === 0 && <option value="">Keine Live-Storage gefunden</option>}{storages.length > 0 && !storageNames.includes(form.storage) && <option value="" disabled>Bitte auswählen</option>}{storages.map(s => <option key={s.storage} value={s.storage}>{s.storage}{s.type ? ` (${s.type})` : ''}</option>)}</select></label>
              </div>

              <div className="form-row-2">
                <label className="form-group"><span>CT-Template-Storage</span><input type="text" value={form.templateStorage} onChange={e => setField('templateStorage', e.target.value)} placeholder="local" /></label>
              </div>

              <div className="form-row-3">
                <label className="form-group"><span>Max. Kerne</span><input type="number" min="1" value={form.maxCores} onChange={e => setField('maxCores', e.target.value)} /></label>
                <label className="form-group"><span>Max. RAM (MB)</span><input type="number" min="256" step="256" value={form.maxMemoryMb} onChange={e => setField('maxMemoryMb', e.target.value)} /></label>
                <label className="form-group"><span>Max. Disk (GB)</span><input type="number" min="4" max="64" value={form.maxDiskGb} onChange={e => setField('maxDiskGb', e.target.value)} /></label>
              </div>
          </>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Speichern...' : 'Konfiguration speichern'}</button>
          </div>
        </form>
      )}

      {clusterId && busy && !loaded && <div className="loading inline-loading"><span className="spinner"></span><span>Laden...</span></div>}
    </section>
  );
}


function TemplateAdminPanel({ clusters, language, onError, onSuccess }) {
  const text = language === 'de' ? {
    title: 'Templates', cluster: 'Cluster', select: 'Cluster auswählen', sync: 'Aus Proxmox laden', syncing: 'Wird geladen…',
    empty: 'Für diesen Cluster wurden noch keine Templates gefunden.', display: 'Anzeigename', os: 'Betriebssystem', version: 'Version',
    description: 'Beschreibung', tags: 'Zusätzliche Tags', enabled: 'Für Self-Service freigeben', save: 'Speichern', saved: 'Template wurde gespeichert.',
    missing: 'In Proxmox nicht gefunden', archive: 'CT-Archiv', prepared: 'Vorbereitetes LXC-Template', minimumDisk: 'Mindestgröße'
  } : {
    title: 'Templates', cluster: 'Cluster', select: 'Select cluster', sync: 'Load from Proxmox', syncing: 'Loading…',
    empty: 'No templates have been found for this cluster yet.', display: 'Display name', os: 'Operating system', version: 'Version',
    description: 'Description', tags: 'Additional tags', enabled: 'Available for self-service', save: 'Save', saved: 'Template saved.',
    missing: 'Missing in Proxmox', archive: 'CT archive', prepared: 'Prepared LXC template', minimumDisk: 'Minimum size'
  };
  const [clusterId, setClusterId] = useState(clusters[0] ? String(clusters[0].id) : '');
  const [templates, setTemplates] = useState([]);
  const [busy, setBusy] = useState(false);
  const load = async (sync = false) => {
    if (!clusterId) return;
    try {
      setBusy(true);
      onError('');
      const res = sync ? await adminApi.syncTemplates(clusterId) : await adminApi.getTemplates(clusterId);
      setTemplates(res.data.templates || []);
    } catch (err) {
      onError(getErrorMessage(err, language === 'de' ? 'Templates konnten nicht geladen werden.' : 'Templates could not be loaded.'));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { if (clusterId) load(false); }, [clusterId]);
  const updateField = (id, field, value) => setTemplates(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  const save = async item => {
    try {
      setBusy(true);
      await adminApi.updateTemplate(item.id, item);
      onSuccess(text.saved);
      await load(false);
    } catch (err) {
      onError(getErrorMessage(err, language === 'de' ? 'Template konnte nicht gespeichert werden.' : 'Template could not be saved.'));
    } finally {
      setBusy(false);
    }
  };
  return <section className="panel-card template-admin-panel">
    <div className="panel-header"><h2>{text.title}</h2><button type="button" className="btn-primary" onClick={() => load(true)} disabled={!clusterId || busy}>{busy ? text.syncing : text.sync}</button></div>
    <label className="form-group template-cluster-select"><span>{text.cluster}</span><select value={clusterId} onChange={e => setClusterId(e.target.value)}><option value="">{text.select}</option>{clusters.map(cluster => <option key={cluster.id} value={cluster.id}>{cluster.name}</option>)}</select></label>
    {!busy && templates.length === 0 && <div className="empty-state soft-box"><h2>{text.empty}</h2></div>}
    <div className="template-profile-grid">
      {templates.map(item => <article key={item.id} className={`template-profile-card ${!item.present ? 'template-missing' : ''}`}>
        <div className="template-profile-head">
          <div className="template-source-details"><span className="resource-id">{item.storage || 'local'} · {item.volid}</span><div className="template-source-badges"><span className="status-badge status-running">{item.sourceType === 'lxc-template' ? text.prepared : text.archive}</span>{item.sourceType === 'lxc-template' && <span className="status-badge">{item.sourceNode} · VMID {item.sourceVmid} · {text.minimumDisk} {item.minDiskGb || 4} GB</span>}{!item.present && <span className="status-badge status-stopped">{text.missing}</span>}</div></div>
          <label className={`template-self-service-toggle ${!item.present ? 'is-disabled' : ''}`}>
            <span>{text.enabled}</span>
            <span className={`toggle-switch ${item.enabled ? 'is-on' : ''}`}>
              <input type="checkbox" checked={!!item.enabled} disabled={!item.present} onChange={e => updateField(item.id, 'enabled', e.target.checked ? 1 : 0)} />
              <span className="toggle-knob" aria-hidden="true" />
            </span>
          </label>
        </div>
        <label className="form-group"><span>{text.display}</span><input value={item.displayName || ''} onChange={e => updateField(item.id, 'displayName', e.target.value)} /></label>
        <div className="form-row-2"><label className="form-group"><span>{text.os}</span><input value={item.osFamily || ''} onChange={e => updateField(item.id, 'osFamily', e.target.value)} /></label><label className="form-group"><span>{text.version}</span><input value={item.osVersion || ''} onChange={e => updateField(item.id, 'osVersion', e.target.value)} /></label></div>
        <label className="form-group"><span>{text.description}</span><textarea rows="2" value={item.description || ''} onChange={e => updateField(item.id, 'description', e.target.value)} /></label>
        <label className="form-group"><span>{text.tags}</span><input value={item.tags || ''} onChange={e => updateField(item.id, 'tags', e.target.value)} placeholder="docker;customer" /></label>
        <div className="form-actions template-save-actions"><button type="button" className="btn-primary" onClick={() => save(item)} disabled={busy}>{text.save}</button></div>
      </article>)}
    </div>
  </section>;
}

function CapabilityBadges({ caps, labels }) {
  const items = [
    [labels?.read || 'Read', true],
    [labels?.power || 'Power', caps.canPower],
    [labels?.console || 'Console', caps.canConsole],
    [labels?.create || 'Create', caps.canProvision]
  ];
  return (
    <div className="capability-badges">
      {items.map(([label, ok]) => (
        <span key={label} className={`capability-badge ${ok ? 'capability-ok' : 'capability-missing'}`}>{label}</span>
      ))}
    </div>
  );
}

function renderAuditAction(action) {
  const map = {
    'power.start': 'Maschine gestartet',
    'power.stop': 'Maschine gestoppt',
    'power.shutdown': 'Maschine heruntergefahren',
    'power.reboot': 'Maschine neu gestartet',
    'console.open': 'Konsole geöffnet',
    'credential.create': 'Zugangsdaten angelegt',
    'credential.update': 'Zugangsdaten geändert',
    'credential.delete': 'Zugangsdaten gelöscht',
    'credential.reveal': 'Passwort angezeigt',
    'machine.create': 'Maschine erstellt',
    'machine.delete': 'Maschine gelöscht',
    'group.create': 'Gruppe angelegt',
    'group.update': 'Gruppe geändert',
    'group.delete': 'Gruppe gelöscht',
    'cluster.create': 'Cluster angelegt',
    'cluster.update': 'Cluster geändert',
    'cluster.provisioning': 'Self-Service konfiguriert',
    'admin.credential.create': 'Zugangsdaten angelegt (Vault)',
    'admin.credential.update': 'Zugangsdaten geändert (Vault)',
    'admin.credential.delete': 'Zugangsdaten gelöscht (Vault)',
    'admin.credential.reveal': 'Passwort angezeigt (Vault)',
    'resource.create': 'Dienst angelegt',
    'resource.update': 'Dienst geändert',
    'password.change': 'Passwort geändert'
  };
  return map[action] || action;
}

function formatAuditTime(value) {  if (!value) return '';
  const date = new Date(`${value}Z`.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(readStoredLanguage() === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

function PanelHeader({ title, action, onAction }) {
  return <div className="panel-header"><h2>{title}</h2>{action && <button type="button" className="btn-primary" onClick={onAction}>{action}</button>}</div>;
}


function ClusterStatsSection({ clusters, labels }) {
  if (!clusters || clusters.length === 0) return null;
  return (
    <section className="panel-card cluster-stats-section">
      <div className="panel-header cluster-stats-header">
        <h2>{labels?.title || 'Cluster status'}</h2>
      </div>
      <div className="cluster-stats-grid">
        {clusters.map(cluster => <ClusterStatsCard key={cluster.id} cluster={cluster} labels={labels} />)}
      </div>
    </section>
  );
}

function ClusterStatsCard({ cluster, labels }) {
  const totals = cluster.totals || {};
  const nodes = Array.isArray(cluster.nodes) ? cluster.nodes : [];
  return (
    <article className="cluster-stats-card">
      <div className="cluster-stats-title">
        <div>
          <h3>{cluster.name}</h3>
        </div>
        <span className={`status-badge ${cluster.error ? 'status-stopped' : 'status-running cluster-node-badge'}`}>
          {cluster.error ? (labels?.unavailable || 'Unavailable') : `${totals.online || 0}/${totals.nodes || nodes.length} ${labels?.nodes || 'Nodes'}`}
        </span>
      </div>

      {cluster.error ? (
        <p className="hint-text caps-error">{cluster.error}</p>
      ) : (
        <>
          <div className="cluster-stats-summary">
            <MiniMetric label="CPU Ø" value={`${formatFixed(totals.cpuPercent)}%`} />
            <MiniMetric label="RAM" value={`${formatFixed(totals.memPercent)}%`} />
            <MiniMetric label={labels?.storage || 'Storage'} value={`${formatFixed(totals.storageTotal ? totals.storagePercent : totals.rootPercent)}%`} />
            <MiniMetric label={labels?.online || 'Online'} value={`${totals.online || 0}/${totals.nodes || 0}`} />
          </div>
          <Metric label="CPU" percent={totals.cpuPercent || 0} detail={`${formatFixed(totals.cpuPercent)} % ${labels?.average || 'average'}`} />
          <Metric label="RAM" percent={totals.memPercent || 0} detail={`${formatBytes(totals.mem)} / ${formatBytes(totals.maxmem)}`} />
          <Metric label="Storage" percent={totals.storageTotal ? totals.storagePercent : totals.rootPercent || 0} detail={totals.storageTotal ? `${formatBytes(totals.storageUsed)} / ${formatBytes(totals.storageTotal)}` : `${formatBytes(totals.rootUsed)} / ${formatBytes(totals.rootTotal)}`} />
          <div className="cluster-node-list">
            {nodes.map(node => <ClusterNodeRow key={node.node} node={node} labels={labels} />)}
          </div>
        </>
      )}
    </article>
  );
}

function ClusterNodeRow({ node, labels }) {
  return (
    <div className="cluster-node-row">
      <div className="cluster-node-head">
        <strong>{node.node}</strong>
        <span className={`status-badge status-${node.status === 'online' ? 'running' : 'stopped'}`}>{node.status === 'online' ? (labels?.online || 'Online') : (labels?.offline || 'Offline')}</span>
      </div>
      <div className="cluster-node-metrics">
        <span>CPU {formatFixed(node.cpuPercent)}%</span>
        <span>RAM {formatFixed(node.memPercent)}%</span>
        <span>{labels?.storage || 'Storage'} {formatFixed(node.storageTotal ? node.storagePercent : node.rootPercent)}%</span>
        <span>{labels?.uptime || 'Uptime'} {formatUptime(node.uptime)}</span>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return <div className="mini-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function formatFixed(value, digits = 1) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return (0).toFixed(digits);
  return number.toFixed(digits);
}

function formatUptime(seconds) {
  const total = Number(seconds || 0);
  if (!Number.isFinite(total) || total <= 0) return '-';
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function StatusEventsSection({ events }) {
  if (!events || events.length === 0) return null;
  return (
    <section className="panel-card status-events-card">
      <PanelHeader title="Letzte Statusereignisse" />
      <div className="status-events-list">
        {events.map(event => {
          const wentDown = event.new_status !== 'running';
          return (
            <div key={event.id} className="status-event-row">
              <span className={`status-dot ${wentDown ? 'is-down' : 'is-up'}`} aria-hidden="true"></span>
              <div className="status-event-text">
                <strong>{event.resource_name || `#${event.container_id}`}</strong>
                <span>{event.cluster_name || 'Cluster'} · {event.old_status || '-'} → {event.new_status || '-'}</span>
              </div>
              <time className="status-event-time">{formatDateTime(event.created_at)}</time>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MetricCard({ label, value, onClick }) {
  return <button type="button" className="metric-card metric-link-card" onClick={onClick}><span>{label}</span><div className="metric-value">{value}</div></button>;
}

function SetupCheckRow({ label, ok, detail }) {
  return (
    <div className="setup-check-row">
      <div>
        <span>{label}</span>
        <small>{detail}</small>
      </div>
      <strong className={ok ? 'setup-ok' : 'setup-missing'}>{ok ? 'OK' : 'Fehlt'}</strong>
    </div>
  );
}

function ResourceCard({ resource, onEdit, onDelete, onManageCredentials, actionLoading }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const cpuPercent = getCpuPercent(resource);
  const memPercent = getPercent(resource.mem, resource.maxmem);
  const publicUrl = resource.publicUrl || resource.webUrl;
  const ipAddress = getPrimaryIp(resource);
  const adminReadOnly = !!resource.adminReadOnly || !!resource.isSelfService;

  return (
    <article className="resource-card compact-resource-card">
      <div className="resource-card-header">
        <div>
          <span className="resource-id">{renderType(resource.type)} · {resource.containerId}</span>
          <h2>{resource.name}</h2>
          {adminReadOnly && <span className="credential-badge user-managed-badge">Benutzerverwaltet</span>}
        </div>
        <span className={`status-badge status-${resource.status || 'unknown'}`}>{renderStatus(resource.status)}</span>
      </div>

      <div className="resource-summary">
        <div><span>Benutzer</span><strong>{resource.userName || resource.userEmail || 'Nicht gesetzt'}</strong></div>
        <div><span>Cluster</span><strong>{resource.clusterName || 'Unbekannt'}</strong></div>
        {resource.groupName && <div><span>Gruppe</span><strong>{resource.groupName}</strong></div>}
      </div>

      <Metric label="CPU" percent={cpuPercent} detail={`${cpuPercent.toFixed(1)} %`} />
      <Metric label="RAM" percent={memPercent} detail={`${formatBytes(resource.mem)} / ${formatBytes(resource.maxmem)}`} />

      {(publicUrl || resource.adminUrl) && (
        <div className={`service-link-row ${(publicUrl && resource.adminUrl) ? 'dual-links' : ''}`}>
          {publicUrl && <a className="btn-secondary full-button" href={publicUrl} target="_blank" rel="noreferrer">Öffentliche Seite</a>}
          {resource.adminUrl && <a className="btn-secondary full-button" href={resource.adminUrl} target="_blank" rel="noreferrer">Verwaltungsseite</a>}
        </div>
      )}

      <button type="button" className="btn-secondary full-button service-detail-toggle" onClick={() => setDetailsOpen(true)}>
        Details anzeigen
      </button>

      {detailsOpen && (
        <Modal title={`Details · ${resource.name}`} onClose={() => setDetailsOpen(false)} className="detail-modal-card">
          <div className="resource-details detail-modal-content">
            <div className="resource-meta">
              <span>Benutzer</span><span>{resource.userName || resource.userEmail || 'Nicht gesetzt'}</span>
              <span>Cluster</span><span>{resource.clusterName || 'Unbekannt'}</span>
              <span>Node</span><span>{resource.node || 'Unbekannt'}</span>
              <span>Typ</span><span>{renderType(resource.type)}</span>
              <span>ID</span><span>{resource.containerId || 'Unbekannt'}</span>
              <span>IP-Adresse</span><span>{ipAddress || 'Nicht bekannt'}</span>
              <span>Status</span><span>{renderStatus(resource.status)}</span>
            </div>
            <DiskDetails resource={resource} />
            {!adminReadOnly && (
              <div className="button-stack">
                <button type="button" className="btn-secondary full-button" onClick={() => { setDetailsOpen(false); onManageCredentials(resource); }}>Zugangsdaten hinterlegen</button>
                <button type="button" className="btn-secondary full-button" onClick={() => { setDetailsOpen(false); onEdit(resource); }}>Bearbeiten</button>
                <button type="button" className="btn-danger full-button" onClick={() => { setDetailsOpen(false); onDelete(resource.id); }} disabled={actionLoading}>Entfernen</button>
              </div>
            )}
            {resource.monitorError && <p className="hint-text">Monitoring nicht erreichbar.</p>}
          </div>
        </Modal>
      )}
    </article>
  );
}

function DiskDetails({ resource }) {
  const filesystems = Array.isArray(resource.filesystems) ? resource.filesystems : [];
  const disks = Array.isArray(resource.disks) ? resource.disks : [];

  if (filesystems.length > 0 || disks.length > 0) {
    return (
      <div className="disk-details">
        {filesystems.length > 0 && <span className="disk-section-title">Dateisysteme</span>}
        {filesystems.map((disk) => <DiskMetric key={`fs-${disk.id || disk.name}`} disk={disk} />)}
        {disks.length > 0 && <span className="disk-section-title">Datenträger</span>}
        {disks.map((disk) => <DiskMetric key={`disk-${disk.id || disk.name}`} disk={disk} />)}
      </div>
    );
  }

  const diskPercent = getPercent(resource.disk, resource.maxdisk);
  return <Metric label="Datenträger" percent={diskPercent} detail={`${formatBytes(resource.disk)} / ${formatBytes(resource.maxdisk)}`} />;
}

function DiskMetric({ disk }) {
  const hasUsed = disk.used !== null && disk.used !== undefined && Number.isFinite(Number(disk.used));
  const maxdisk = Number(disk.maxdisk || 0);
  const percent = hasUsed && maxdisk ? getPercent(disk.used, maxdisk) : 0;
  const title = disk.name || disk.id || 'Disk';
  const subtitle = [disk.storage, disk.volume].filter(Boolean).join(' · ');
  const detail = hasUsed && maxdisk ? `${formatBytes(disk.used)} / ${formatBytes(maxdisk)}` : maxdisk ? `Größe ${formatBytes(maxdisk)}` : 'Größe nicht gemeldet';

  return (
    <div className="disk-row">
      <div className="disk-row-header"><span>{title}</span><small>{hasUsed ? `${percent.toFixed(1)}%` : 'Belegung nicht gemeldet'}</small></div>
      {hasUsed && <div className="progress-bar"><span style={{ width: `${percent}%` }}></span></div>}
      <small>{detail}</small>
      {subtitle && <small className="disk-source">{subtitle}</small>}
    </div>
  );
}

function Metric({ label, percent, detail }) {
  const safePercent = Math.min(Math.max(Number(percent) || 0, 0), 100);
  return <div className="metric-line"><div><span>{label}</span><span>{safePercent.toFixed(1)}%</span></div><div className="progress-bar"><span style={{ width: `${safePercent}%` }}></span></div><small>{detail}</small></div>;
}

function getPercent(value, max) {
  if (!max) return 0;
  return Math.min(Math.max((Number(value) / Number(max)) * 100, 0), 100);
}

function getPrimaryIp(resource) {
  if (resource.primaryIp) return resource.primaryIp;
  const ips = Array.isArray(resource.ips) ? resource.ips : [];
  return ips.find(item => item.ipv4)?.ipv4 || '';
}

function getCpuPercent(resource) {
  const cpu = Number(resource.cpu || 0);
  if (cpu <= 1) return Math.min(Math.max(cpu * 100, 0), 100);
  return Math.min(Math.max(cpu, 0), 100);
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function renderStatus(status) {
  switch (status) {
    case 'running': return 'Online';
    case 'stopped': return 'Offline';
    case 'paused': return 'Pausiert';
    case 'suspended': return 'Angehalten';
    default: return 'Unbekannt';
  }
}

function renderType(type) {
  if (type === 'lxc') return 'LXC';
  if (type === 'qemu') return 'VM';
  return 'Dienst';
}
