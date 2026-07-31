import axios from 'axios';
import { readStoredLanguage } from '../components/LanguageSwitch';
import { translatePortalText } from '../i18n';

const configuredApiUrl = process.env.REACT_APP_API_URL || '';
const API_URL = configuredApiUrl.trim() || '/api';

const MESSAGE_TRANSLATIONS = {
  'Invalid email or password': 'E-Mail-Adresse oder Passwort ist falsch.',
  'User with this email already exists': 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.',
  'User not found': 'Benutzer wurde nicht gefunden.',
  'Unauthorized': 'Nicht angemeldet.',
  'Forbidden': 'Keine Berechtigung.',
  'Setup has already been completed': 'Die Erstkonfiguration wurde bereits abgeschlossen.',
  'Setup wizard is required': 'Die Erstkonfiguration ist erforderlich.',
  'Invalid or expired token': 'Die Sitzung ist ungültig oder abgelaufen.',
  'Internal server error': 'Interner Serverfehler.',
  'Setup completed successfully': 'Erstkonfiguration erfolgreich abgeschlossen.',
  'Password changed successfully': 'Passwort erfolgreich geändert.',
  'Password reset successfully': 'Passwort erfolgreich zurückgesetzt.',
  'Password reset link sent to your email': 'Der Link zum Zurücksetzen des Passworts wurde per E-Mail versendet.',
  'If email exists, password reset link has been sent': 'Falls die E-Mail-Adresse existiert, wurde ein Link zum Zurücksetzen versendet.',
  'Logged out successfully': 'Erfolgreich abgemeldet.',
  'User deleted successfully': 'Benutzer erfolgreich gelöscht.',
  'Cluster deleted successfully': 'Cluster erfolgreich gelöscht.',
  'Assignment deleted successfully': 'Zuweisung erfolgreich gelöscht.',
  'Resource deleted successfully': 'Dienst erfolgreich entfernt.',
  'Resource, cluster, and user are required': 'Dienst, Cluster und Benutzer sind erforderlich.',
  'Resource not found': 'Dienst wurde nicht gefunden.',
  'Resource not accessible': 'Dieser Dienst ist nicht freigegeben.',
  'Selected Proxmox resource was not found': 'Der ausgewählte Proxmox-Dienst wurde nicht gefunden.',
  'Web link must start with http:// or https://': 'Der Weblink muss mit http:// oder https:// beginnen.',
  'Public link must start with http:// or https://': 'Die öffentliche Seite muss mit http:// oder https:// beginnen.',
  'Public page must start with http:// or https://': 'Die öffentliche Seite muss mit http:// oder https:// beginnen.',
  'Public page must be a valid URL': 'Die öffentliche Seite muss eine gültige URL sein.',
  'Public page URL is too long': 'Die URL der öffentlichen Seite ist zu lang.',
  'Only the assigned user can manage this public page': 'Nur der direkt zugewiesene Benutzer kann diese öffentliche Seite bearbeiten.',
  'Only the assigned user can manage publishing for this service': 'Nur der direkt zugewiesene Benutzer kann diesen Dienst veröffentlichen.',
  'Only the assigned user can manage the public page for this service': 'Nur der direkt zugewiesene Benutzer kann die öffentliche Seite dieses Dienstes verwalten.',
  'Public page URL is required': 'Bitte gib eine URL für die öffentliche Seite ein.',
  'Public page URL must be a valid http:// or https:// URL': 'Die öffentliche Seite muss eine gültige URL mit http:// oder https:// sein.',
  'Public page URL must not contain login credentials': 'Die URL der öffentlichen Seite darf keine Anmeldedaten enthalten.',
  'Manual public page links are only available when Pangolin publishing is disabled': 'Manuelle Webseiten-Links sind nur verfügbar, wenn die Pangolin-Veröffentlichung deaktiviert ist.',
  'Public page saved': 'Die öffentliche Seite wurde gespeichert.',
  'Public page removed': 'Die öffentliche Seite wurde entfernt.',
  'Management page URL is required': 'Bitte gib eine URL für die Verwaltungsseite ein.',
  'Management page URL must be a valid http:// or https:// URL': 'Die Verwaltungsseite muss eine gültige URL mit http:// oder https:// sein.',
  'Management page URL must not contain login credentials': 'Die URL der Verwaltungsseite darf keine Anmeldedaten enthalten.',
  'Management page saved': 'Die Verwaltungsseite wurde gespeichert.',
  'Management page removed': 'Die Verwaltungsseite wurde entfernt.',
  'Only the assigned user can remove publishing for this service': 'Nur der direkt zugewiesene Benutzer kann die Veröffentlichung dieses Dienstes entfernen.',
  'Public publishing is not configured': 'Die Veröffentlichung ist vom Administrator noch nicht eingerichtet.',
  'Public publishing is disabled for this cluster': 'Die Veröffentlichung ist für diesen Cluster vom Administrator deaktiviert.',
  'No reachable IPv4 address was found for this service': 'Für diesen Dienst wurde keine erreichbare IPv4-Adresse gefunden.',
  'Subdomain is required': 'Bitte gib eine Subdomain ein.',
  'Subdomain may only contain lowercase letters, numbers and hyphens': 'Die Subdomain darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.',
  'This subdomain is already in use': 'Diese Subdomain wird bereits verwendet.',
  'Publication not found': 'Die Veröffentlichung wurde nicht gefunden.',
  'The protocol of an existing publication cannot be changed': 'Das Protokoll einer bestehenden Veröffentlichung kann nicht geändert werden.',
  'This TCP public port is already in use': 'Dieser öffentliche TCP-Port wird bereits verwendet.',
  'This UDP public port is already in use': 'Dieser öffentliche UDP-Port wird bereits verwendet.',
  'Target port must be between 1 and 65535': 'Der Dienst-Port muss zwischen 1 und 65535 liegen.',
  'Public port must be between 1 and 65535': 'Der öffentliche Port muss zwischen 1 und 65535 liegen.',
  'Public access added': 'Der öffentliche Zugriff wurde hinzugefügt.',
  'Public access saved': 'Der öffentliche Zugriff wurde gespeichert.',
  'Public access removed': 'Der öffentliche Zugriff wurde entfernt.',
  'This subdomain is reserved by the administrator': 'Diese Subdomain ist vom Administrator reserviert.',
  'Manual public URLs are no longer supported. Use the publishing dialog.': 'Manuelle öffentliche URLs werden nicht mehr unterstützt. Verwende den Veröffentlichungsdialog.',
  'Pangolin settings updated successfully': 'Pangolin-Einstellungen erfolgreich gespeichert.',
  'Pangolin connection successful': 'Pangolin-Verbindung erfolgreich.',
  'Pangolin API hostname could not be resolved': 'Der Hostname der Pangolin API konnte nicht aufgelöst werden.',
  'Pangolin API refused the connection': 'Die Pangolin API hat die Verbindung abgelehnt.',
  'Pangolin API connection timed out': 'Zeitüberschreitung beim Verbinden mit der Pangolin API.',
  'Pangolin API TLS certificate could not be verified': 'Das TLS-Zertifikat der Pangolin API konnte nicht überprüft werden.',
  'Pangolin API URL must start with http:// or https://': 'Die Pangolin API URL muss mit http:// oder https:// beginnen.',
  'Pangolin API key is required': 'Der Pangolin API-Schlüssel ist erforderlich.',
  'Pangolin organization ID is required': 'Die Pangolin Organization ID ist erforderlich.',
  'Pangolin site ID is required': 'Die numerische Pangolin Site ID ist erforderlich.',
  'Pangolin domain ID is required': 'Die Pangolin Domain ID ist erforderlich.',
  'Pangolin base domain is required': 'Die Pangolin-Basisdomain ist erforderlich.',
  'The configured Pangolin site was not found': 'Der konfigurierte Pangolin-Standort wurde nicht gefunden.',
  'The configured Pangolin domain was not found': 'Die konfigurierte Pangolin-Domain wurde nicht gefunden.',
  'The configured base domain does not match the selected Pangolin domain': 'Die Basisdomain stimmt nicht mit der ausgewählten Pangolin-Domain überein.',
  'TCP port ranges must stay within 20000-26000': 'TCP-Portbereiche müssen vollständig innerhalb von 20000-26000 liegen.',
  'UDP port ranges must stay within 20000-26000': 'UDP-Portbereiche müssen vollständig innerhalb von 20000-26000 liegen.',
  'Public TCP ports must be between 20000 and 26000': 'Öffentliche TCP-Ports müssen zwischen 20000 und 26000 liegen.',
  'Public UDP ports must be between 20000 and 26000': 'Öffentliche UDP-Ports müssen zwischen 20000 und 26000 liegen.',
  'Admin link must start with http:// or https://': 'Die Verwaltungsseite muss mit http:// oder https:// beginnen.',
  'Settings updated successfully': 'Einstellungen erfolgreich gespeichert.',
  'Email service not configured': 'Der E-Mail-Dienst ist noch nicht konfiguriert.',
  'Connection successful': 'Verbindung erfolgreich.',
  'Connection failed: unexpected Proxmox API response': 'Verbindung fehlgeschlagen: Unerwartete Antwort der Proxmox API.',
  'Setup is not complete yet. Please finish the initial configuration first.': 'Die Erstkonfiguration ist noch nicht abgeschlossen.',
  'Email and name are required': 'E-Mail-Adresse und Name sind erforderlich.',
  'Password must be at least 6 characters': 'Das Passwort muss mindestens 6 Zeichen lang sein.',
  'Invalid role': 'Ungültige Rolle.',
  'Cannot delete your own account': 'Du kannst dein eigenes Konto nicht löschen.',
  'Name, URL, and API token are required': 'Name, URL und API-Token sind erforderlich.',
  'Missing required fields': 'Pflichtfelder fehlen.',
  'Cluster not found': 'Cluster wurde nicht gefunden.',
  'Assignment not found': 'Zuweisung wurde nicht gefunden.',
  'SMTP host, port, user, and password are required': 'SMTP-Host, Port, Benutzer und Passwort sind erforderlich.',
  'SMTP port is invalid': 'Der SMTP-Port ist ungültig.',
  'Current and new password required': 'Aktuelles und neues Passwort sind erforderlich.',
  'Current password is incorrect': 'Das aktuelle Passwort ist falsch.',
  'New password must be at least 6 characters': 'Das neue Passwort muss mindestens 6 Zeichen lang sein.',
  'New password must be at least 8 characters': 'Das neue Passwort muss mindestens 8 Zeichen lang sein.',
  'Account temporarily locked. Try again later.': 'Konto vorübergehend gesperrt. Bitte später erneut versuchen.',
  'Too many login attempts. Please try again later.': 'Zu viele Anmeldeversuche. Bitte später erneut versuchen.',
  'Rate limit exceeded.': 'Zu viele Anfragen. Bitte kurz warten.',
  'Invalid power action': 'Ungültige Power-Aktion.',
  'Power management is not permitted for this cluster token': 'Der API-Token dieses Clusters erlaubt keine Power-Aktionen.',
  'Console access is not permitted for this cluster token': 'Der API-Token dieses Clusters erlaubt keinen Konsolen-Zugriff.',
  'Only the assigned user can manage the service IP': 'Nur der direkt zugewiesene Benutzer kann die Dienst-IP bearbeiten.',
  'Manual service IPs are only available for administrator-assigned QEMU VMs': 'Manuelle Dienst-IPs sind nur für vom Administrator zugewiesene QEMU-VMs verfügbar.',
  'The service IP must be a valid IPv4 address': 'Die Dienst-IP muss eine gültige IPv4-Adresse sein.',
  'The SSH port must be between 1 and 65535': 'Der SSH-Port muss zwischen 1 und 65535 liegen.',
  'Add SSH credentials with a username and password in the Credentials tab before opening the IP console': 'Hinterlege vor dem Öffnen der IP-Konsole im Tab Zugangsdaten einen SSH-Eintrag mit Benutzername und Passwort.',
  'Service IP saved': 'Dienst-IP wurde gespeichert.',
  'Service IP removed': 'Dienst-IP wurde entfernt.',
  'Provisioning is not permitted for this cluster token': 'Der API-Token dieses Clusters erlaubt kein Erstellen von Maschinen.',
  'Provisioning is not fully configured for this cluster': 'Self-Service ist für diesen Cluster nicht vollständig konfiguriert.',
  'Credential not found': 'Zugangsdaten wurden nicht gefunden.',
  'Credential saved': 'Zugangsdaten gespeichert.',
  'Credential deleted': 'Zugangsdaten gelöscht.',
  'Label is required': 'Bitte eine Bezeichnung eingeben.',
  'Group not found': 'Gruppe wurde nicht gefunden.',
  'Group name is required': 'Bitte einen Gruppennamen eingeben.',
  'Group deleted successfully': 'Gruppe erfolgreich gelöscht.',
  'VMID range is invalid': 'Der VMID-Bereich ist ungültig.',
  'IP range or gateway is invalid': 'IP-Bereich oder Gateway ist ungültig.',
  'Hostname is invalid': 'Der Hostname ist ungültig (nur Kleinbuchstaben, Zahlen, Bindestriche).',
  'Template is invalid': 'Das Template ist ungültig.',
  'Template is not allowed': 'Dieses Template ist für den Self-Service nicht freigegeben.',
  'Template disk size exceeds the portal limit': 'Die Mindestgröße dieses Templates überschreitet das Portal-Limit.',
  'Prepared LXC templates require the Proxmox VM.Clone privilege': 'Für vorbereitete LXC-Templates benötigt der Proxmox-Token die Berechtigung VM.Clone.',
  'The node containing the prepared LXC template is not online': 'Die Node mit dem vorbereiteten LXC-Template ist nicht online.',
  'Prepared LXC template is no longer present on Proxmox': 'Das vorbereitete LXC-Template ist in Proxmox nicht mehr vorhanden.',
  'Template archive is no longer present on Proxmox': 'Das CT-Archiv ist in Proxmox nicht mehr vorhanden.',
  'No usable LXC storage found': 'Es wurde kein verwendbarer LXC-Speicher gefunden.',
  'At least one template must be allowed': 'Wähle mindestens ein CT-Template für den Self-Service aus.',
  'Community scripts are not available': 'Community Scripts sind nicht verfügbar. Verwende ein freigegebenes CT-Template.',
  'Provisioning firewall permission is missing': 'Dem Proxmox-Token fehlt VM.Config.Network für die verpflichtende Container-Isolation.',
  'Provisioning firewall audit permission is missing': 'Dem Proxmox-Token fehlt Sys.Audit zur Prüfung der Datacenter-Firewall.',
  'Proxmox datacenter firewall status could not be verified': 'Der Status der Proxmox-Datacenter-Firewall konnte nicht geprüft werden.',
  'Proxmox datacenter firewall is disabled': 'Die Proxmox-Datacenter-Firewall ist deaktiviert. Sie muss für den Self-Service aktiviert bleiben; das Portal schaltet sie nicht ab.',
  'No approved container template is currently available': 'Aktuell ist kein freigegebenes Container-Template verfügbar.',
  'Self-service is temporarily unavailable': 'Der Container-Self-Service ist vorübergehend nicht verfügbar.',
  'Self-service activation prerequisites could not be verified': 'Die Voraussetzungen zum Aktivieren des Self-Service konnten nicht geprüft werden.',
  'Container network isolation failed': 'Die Netzwerk-Isolation konnte nicht angewendet werden. Der Container wurde nicht gestartet.',
  'Self-service DNS servers must be public IPv4 addresses': 'Die Self-Service-DNS-Server müssen öffentliche IPv4-Adressen sein.',
  'Container network isolation failed and cleanup was unsuccessful': 'Die Netzwerk-Isolation ist fehlgeschlagen. Der gestoppte Container konnte nicht automatisch entfernt werden und muss in Proxmox geprüft werden.',
  'Root password must be at least 8 characters': 'Das Root-Passwort muss mindestens 8 Zeichen lang sein.',
  'No free IP address available in the configured range': 'Keine freie IP-Adresse im konfigurierten Bereich verfügbar.',
  'No online node available': 'Kein Node ist gerade online.',
  'Machine creation started': 'Maschine wird erstellt.',
  'Machine deleted': 'Maschine wurde gelöscht.',
  'Only self-created machines can be deleted by the user': 'Nur selbst erstellte Maschinen können gelöscht werden.',
  'Machine deletion is not permitted for this cluster token': 'Der API-Token dieses Clusters erlaubt kein Löschen von Maschinen.',
  'Power action started': 'Aktion wurde gestartet.',
  'ISO is invalid': 'Das ISO-Image ist ungültig.',
  'Container are not allowed on this cluster': 'Auf diesem Cluster sind keine Container erlaubt.',
  'VMs are not allowed on this cluster': 'Auf diesem Cluster sind keine VMs erlaubt.',
  'Provisioning updated': 'Self-Service-Konfiguration gespeichert.',
  'Admin-provided credentials cannot be edited': 'Vom Admin hinterlegte Zugangsdaten können nicht bearbeitet werden.',
  'Management credential already exists': 'Für diese Verwaltungsseite sind bereits Zugangsdaten hinterlegt.',
  'Provisioning is not permitted for this cluster token': 'Der Proxmox-Token erlaubt keine Container-Erstellung.',
  'Maintenance title is required': 'Bitte einen Titel für die Wartung eingeben.',
  'Maintenance time window is invalid': 'Der Wartungszeitraum ist ungültig (Ende muss nach dem Beginn liegen).',
  'Maintenance severity is invalid': 'Die Wartungsstufe ist ungültig.',
  'Maintenance window not found': 'Das Wartungsfenster wurde nicht gefunden.',
  'Maintenance window created': 'Wartungsfenster wurde angelegt.',
  'Maintenance window updated': 'Wartungsfenster wurde aktualisiert.',
  'Maintenance window deleted': 'Wartungsfenster wurde gelöscht.',
  'Notification preferences updated': 'Benachrichtigungseinstellungen gespeichert.',
  'Test email sent': 'Test-E-Mail wurde versendet.',
  'Admin password must be at least 8 characters': 'Das Admin-Passwort muss mindestens 8 Zeichen lang sein.',
  'Password must be at least 8 characters': 'Das Passwort muss mindestens 8 Zeichen lang sein.',
  'Please select a valid location from the search results': 'Bitte einen gültigen Standort aus den Suchergebnissen auswählen.',
  'Location search failed': 'Standortsuche fehlgeschlagen.',
  'Invalid token purpose': 'Ungültiger Token-Zweck.',
  'Timed out while starting Proxmox node command': 'Zeitüberschreitung beim Starten des Proxmox-Node-Befehls.',
  'Name is required': 'Name ist erforderlich.',
  'No available Proxmox storage found on the selected node': 'Auf der ausgewählten Node wurde kein verfügbarer Proxmox-Speicher gefunden.',
  'Proxmox name, URL, and API token are required': 'Proxmox-Name, URL und API-Token sind erforderlich.',
  'Proxmox URL must start with http:// or https://': 'Die Proxmox-URL muss mit http:// oder https:// beginnen.',
  'Admin name, email, and password are required': 'Name, E-Mail-Adresse und Passwort für den Administrator sind erforderlich.',
  'Email and password required': 'E-Mail-Adresse und Passwort sind erforderlich.',
  'Email is required': 'E-Mail-Adresse ist erforderlich.',
  'Token and new password required': 'Token und neues Passwort sind erforderlich.',
  'Node name is invalid': 'Node-Name ist ungültig.',
  'Disk storage is not available on the selected Proxmox node': 'Der Disk-Storage ist auf der ausgewählten Proxmox-Node nicht verfügbar.',
  'This credential belongs to the user and cannot be viewed': 'Diese Zugangsdaten gehören dem Benutzer und können nicht angezeigt werden.',
  'This credential belongs to the user and cannot be edited': 'Diese Zugangsdaten gehören dem Benutzer und können nicht bearbeitet werden.',
  'This credential belongs to the user and cannot be deleted': 'Diese Zugangsdaten gehören dem Benutzer und können nicht gelöscht werden.'
};

export function translateMessage(message) {
  if (!message) return '';
  const language = readStoredLanguage();

  if (language !== 'de') {
    return translatePortalText(message, 'en');
  }

  if (MESSAGE_TRANSLATIONS[message]) return MESSAGE_TRANSLATIONS[message];

  if (message.startsWith('Connection failed with HTTP')) {
    return message.replace('Connection failed with HTTP', 'Verbindung fehlgeschlagen mit HTTP');
  }
  if (message.startsWith('Connection failed:')) {
    return message.replace('Connection failed:', 'Verbindung fehlgeschlagen:');
  }
  if (message.startsWith('Failed to connect to Proxmox:')) {
    return message.replace('Failed to connect to Proxmox:', 'Proxmox-Verbindung fehlgeschlagen:');
  }
  if (message.startsWith('Proxmox test failed:')) {
    return message.replace('Proxmox test failed:', 'Proxmox-Test fehlgeschlagen:');
  }
  if (message.startsWith('SMTP test failed:')) {
    return message.replace('SMTP test failed:', 'SMTP-Test fehlgeschlagen:');
  }
  if (message.startsWith('Prepared LXC template requires at least ')) {
    return message.replace('Prepared LXC template requires at least ', 'Das vorbereitete LXC-Template benötigt mindestens ').replace(' GB disk space', ' GB Speicherplatz');
  }

  return translatePortalText(message, 'de');
}

export function getErrorMessage(error, fallback = 'Ein Fehler ist aufgetreten.') {
  return translateMessage(error?.response?.data?.message || error?.message || fallback) || fallback;
}

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isSetupRoute = window.location.pathname.startsWith('/setup');
    const isPasswordChangeRequest = String(error.config?.url || '').includes('/auth/change-password');
    const serverMessage = error.response?.data?.message;

    if (error.response?.status === 401 && !isSetupRoute && !isPasswordChangeRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    if (error.response?.status === 403 && serverMessage === 'Setup wizard is required') {
      window.location.href = '/setup';
    }

    if (error.response?.data?.message) {
      error.response.data.message = translateMessage(error.response.data.message);
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  setupRequired: () => apiClient.get('/auth/setup-required'),
  setup: (data) => apiClient.post('/auth/setup', data),
  setupTestSmtp: (data) => apiClient.post('/auth/setup/test-smtp', data),
  setupTestProxmox: (data) => apiClient.post('/auth/setup/test-proxmox', data),
  login: (email, password, preferredLanguage) => apiClient.post('/auth/login', { email, password, preferredLanguage }),
  verify: () => apiClient.get('/auth/verify'),
  logout: () => apiClient.post('/auth/logout'),
  changePassword: (currentPassword, newPassword) => apiClient.post('/auth/change-password', { currentPassword, newPassword }),
  forgotPassword: (email, preferredLanguage) => apiClient.post('/auth/forgot-password', { email, preferredLanguage }),
  resetPassword: (token, newPassword) => apiClient.post('/auth/reset-password', { token, newPassword })
};

export const adminApi = {
  getUsers: () => apiClient.get('/admin/users'),
  createUser: (data) => apiClient.post('/admin/users', data),
  updateUser: (userId, data) => apiClient.put(`/admin/users/${userId}`, data),
  deleteUser: (userId) => apiClient.delete(`/admin/users/${userId}`),
  getClusters: () => apiClient.get('/admin/clusters'),
  getClusterStats: () => apiClient.get('/admin/cluster-stats'),
  createCluster: (data) => apiClient.post('/admin/clusters', data),
  updateCluster: (clusterId, data) => apiClient.put(`/admin/clusters/${clusterId}`, data),
  deleteCluster: (clusterId) => apiClient.delete(`/admin/clusters/${clusterId}`),
  getClusterContainers: (clusterId) => apiClient.get(`/admin/clusters/${clusterId}/containers`),
  getAssignments: () => apiClient.get('/admin/assignments'),
  createAssignment: (data) => apiClient.post('/admin/assignments', data),
  deleteAssignment: (assignmentId) => apiClient.delete(`/admin/assignments/${assignmentId}`),
  getResources: () => apiClient.get('/admin/resources'),
  createResource: (data) => apiClient.post('/admin/resources', data),
  updateResource: (resourceId, data) => apiClient.put(`/admin/resources/${resourceId}`, data),
  deleteResource: (resourceId) => apiClient.delete(`/admin/resources/${resourceId}`),
  getSettings: () => apiClient.get('/admin/settings'),
  updateSettings: (data) => apiClient.put('/admin/settings', data),
  getPangolinSettings: () => apiClient.get('/admin/pangolin-settings'),
  getPangolinPublications: () => apiClient.get('/admin/pangolin-publications'),
  deletePangolinPublication: (publicationId) => apiClient.delete(`/admin/pangolin-publications/${publicationId}`),
  updatePangolinSettings: (data) => apiClient.put('/admin/pangolin-settings', data),
  testPangolin: (data) => apiClient.post('/admin/pangolin-settings/test', data),
  discoverPangolin: (data) => apiClient.post('/admin/pangolin-settings/discover', data),
  testSmtp: (data) => apiClient.post('/admin/settings/test-smtp', data),
  testProxmox: (data) => apiClient.post('/admin/settings/test-proxmox', data),
  // v2.0
  getGroups: () => apiClient.get('/admin/groups'),
  createGroup: (data) => apiClient.post('/admin/groups', data),
  updateGroup: (groupId, data) => apiClient.put(`/admin/groups/${groupId}`, data),
  deleteGroup: (groupId) => apiClient.delete(`/admin/groups/${groupId}`),
  getClusterCapabilities: (clusterId) => apiClient.get(`/admin/clusters/${clusterId}/capabilities`),
  getClusterTemplates: (clusterId, storage) => apiClient.get(`/admin/clusters/${clusterId}/templates${storage ? `?storage=${encodeURIComponent(storage)}` : ''}`),
  getClusterIsos: (clusterId, storage) => apiClient.get(`/admin/clusters/${clusterId}/isos${storage ? `?storage=${encodeURIComponent(storage)}` : ''}`),
  getClusterStorages: (clusterId, content) => apiClient.get(`/admin/clusters/${clusterId}/storages${content ? `?content=${encodeURIComponent(content)}` : ''}`),
  getClusterProvisioning: (clusterId) => apiClient.get(`/admin/clusters/${clusterId}/provisioning`),
  getTemplates: (clusterId) => apiClient.get(`/admin/templates?clusterId=${encodeURIComponent(clusterId)}`),
  syncTemplates: (clusterId) => apiClient.post('/admin/templates/sync', { clusterId }),
  updateTemplate: (templateId, data) => apiClient.put(`/admin/templates/${templateId}`, data),
  getProvisioningJobs: () => apiClient.get('/admin/provisioning-jobs'),
  updateClusterProvisioning: (clusterId, data) => apiClient.put(`/admin/clusters/${clusterId}/provisioning`, data),
  getAudit: ({ page = 1, search = '' } = {}) => apiClient.get(`/admin/audit?page=${page}&limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  // Admin credential vault
  getAdminCredentials: () => apiClient.get('/admin/credentials'),
  revealAdminCredential: (credId) => apiClient.get(`/admin/credentials/${credId}/reveal`),
  createAdminCredential: (data) => apiClient.post('/admin/credentials', data),
  updateAdminCredential: (credId, data) => apiClient.put(`/admin/credentials/${credId}`, data),
  deleteAdminCredential: (credId) => apiClient.delete(`/admin/credentials/${credId}`),
  // Admin → credentials attached to a specific resource
  getResourceCredentials: (resourceId) => apiClient.get(`/admin/resources/${resourceId}/credentials`),
  revealResourceCredential: (resourceId, credId) => apiClient.get(`/admin/resources/${resourceId}/credentials/${credId}/reveal`),
  createResourceCredential: (resourceId, data) => apiClient.post(`/admin/resources/${resourceId}/credentials`, data),
  updateResourceCredential: (resourceId, credId, data) => apiClient.put(`/admin/resources/${resourceId}/credentials/${credId}`, data),
  deleteResourceCredential: (resourceId, credId) => apiClient.delete(`/admin/resources/${resourceId}/credentials/${credId}`),
  // v3.0: maintenance windows, status events, test mail
  getMaintenanceWindows: () => apiClient.get('/admin/maintenance'),
  createMaintenanceWindow: (data) => apiClient.post('/admin/maintenance', data),
  updateMaintenanceWindow: (windowId, data) => apiClient.put(`/admin/maintenance/${windowId}`, data),
  deleteMaintenanceWindow: (windowId) => apiClient.delete(`/admin/maintenance/${windowId}`),
  getStatusEvents: (limit = 25) => apiClient.get(`/admin/status-events?limit=${limit}`),
  sendTestMail: () => apiClient.post('/admin/settings/send-test-mail'),
  searchLocations: (query) => apiClient.get(`/admin/geocode?q=${encodeURIComponent(query)}`)
};

export const userApi = {
  getResources: () => apiClient.get('/user/resources'),
  getResourceDetails: (resourceId) => apiClient.get(`/user/resources/${resourceId}`),
  getPublishingOptions: (resourceId) => apiClient.get(`/user/publishing/options${resourceId ? `?resourceId=${encodeURIComponent(resourceId)}` : ''}`),
  getPublications: (resourceId) => apiClient.get(`/user/resources/${resourceId}/publications`),
  createPublication: (resourceId, data) => apiClient.post(`/user/resources/${resourceId}/publications`, data),
  updatePublication: (resourceId, publicationId, data) => apiClient.put(`/user/resources/${resourceId}/publications/${publicationId}`, data),
  deletePublication: (resourceId, publicationId) => apiClient.delete(`/user/resources/${resourceId}/publications/${publicationId}`),
  saveManualPublicPage: (resourceId, url) => apiClient.put(`/user/resources/${resourceId}/public-page`, { url }),
  removeManualPublicPage: (resourceId) => apiClient.delete(`/user/resources/${resourceId}/public-page`),
  getManagementPage: (resourceId) => apiClient.get(`/user/resources/${resourceId}/management-page`),
  saveManagementPage: (resourceId, data) => apiClient.put(`/user/resources/${resourceId}/management-page`, data),
  removeManagementPage: (resourceId) => apiClient.delete(`/user/resources/${resourceId}/management-page`),
  // Backward-compatible aliases for callers that still expect the singular API.
  getPublication: (resourceId) => apiClient.get(`/user/resources/${resourceId}/publication`),
  savePublication: (resourceId, data) => apiClient.put(`/user/resources/${resourceId}/publication`, data),
  getContainers: () => apiClient.get('/user/containers'),
  getContainerDetails: (containerId) => apiClient.get(`/user/containers/${containerId}`),
  getProfile: () => apiClient.get('/user/profile'),
  updateProfile: (data) => apiClient.put('/user/profile', data),
  updateLanguage: (language) => apiClient.put('/user/language', { language }),
  // v2.0
  powerAction: (resourceId, action) => apiClient.post(`/user/resources/${resourceId}/power`, { action }),
  getTasks: (resourceId) => apiClient.get(`/user/resources/${resourceId}/tasks`),
  getTaskLog: (resourceId, upid) => apiClient.get(`/user/resources/${resourceId}/tasks/${encodeURIComponent(upid)}/log`),
  saveServiceIp: (resourceId, ip, sshPort = 22) => apiClient.put(`/user/resources/${resourceId}/service-ip`, { ip, sshPort }),
  openConsole: (resourceId) => apiClient.post(`/user/resources/${resourceId}/console`),
  getCredentials: (resourceId) => apiClient.get(`/user/resources/${resourceId}/credentials`),
  revealCredential: (resourceId, credId) => apiClient.get(`/user/resources/${resourceId}/credentials/${credId}/reveal`),
  createCredential: (resourceId, data) => apiClient.post(`/user/resources/${resourceId}/credentials`, data),
  updateCredential: (resourceId, credId, data) => apiClient.put(`/user/resources/${resourceId}/credentials/${credId}`, data),
  deleteCredential: (resourceId, credId) => apiClient.delete(`/user/resources/${resourceId}/credentials/${credId}`),
  getProvisioningOptions: () => apiClient.get('/user/provisioning/options'),
  createMachine: (data) => apiClient.post('/user/provisioning/create', data),
  getProvisioningJobs: (limit = 20) => apiClient.get(`/user/provisioning/jobs?limit=${limit}`),
  getProvisioningJob: (jobId) => apiClient.get(`/user/provisioning/jobs/${jobId}`),
  deleteMachine: (resourceId) => apiClient.delete(`/user/resources/${resourceId}`),
  // v3.0: notification preferences
  getNotificationPreferences: () => apiClient.get('/user/notifications'),
  updateNotificationPreferences: (data) => apiClient.put('/user/notifications', data)
};

// v3.1.80: wiki - published articles for users, full management for admins
export const wikiApi = {
  // portal users
  getTree: (language) => apiClient.get(`/wiki/tree?language=${encodeURIComponent(language || 'en')}`),
  getArticle: (slug, language) => apiClient.get(`/wiki/articles/${encodeURIComponent(slug)}?language=${encodeURIComponent(language || 'en')}`),

  // administrators
  getAdminContent: () => apiClient.get('/wiki/admin/content'),
  createFolder: (data) => apiClient.post('/wiki/admin/folders', data),
  updateFolder: (folderId, data) => apiClient.put(`/wiki/admin/folders/${folderId}`, data),
  deleteFolder: (folderId) => apiClient.delete(`/wiki/admin/folders/${folderId}`),
  getArticleForEdit: (articleId) => apiClient.get(`/wiki/admin/articles/${articleId}`),
  createArticle: (data) => apiClient.post('/wiki/admin/articles', data),
  updateArticle: (articleId, data) => apiClient.put(`/wiki/admin/articles/${articleId}`, data),
  deleteArticle: (articleId) => apiClient.delete(`/wiki/admin/articles/${articleId}`),

  // Images are sent as a raw binary body: this keeps a multipart dependency out
  // of the backend and lets a pasted clipboard blob be forwarded unchanged.
  uploadImage: (file) => apiClient.post('/wiki/admin/images', file, {
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'X-Filename': encodeURIComponent(file.name || 'image')
    }
  }),
  listImages: () => apiClient.get('/wiki/admin/images'),
  deleteImage: (token) => apiClient.delete(`/wiki/admin/images/${token}`)
};

// v3.0: public - maintenance announcements for the banner (no auth required)
export const publicApi = {
  getAnnouncements: () => apiClient.get('/announcements')
};

export default apiClient;
