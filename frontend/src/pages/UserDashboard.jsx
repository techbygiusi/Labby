import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi, getErrorMessage, translateMessage } from '../services/api';
import '../styles/globals.css';
import ThemeButton from '../components/ThemeButton';
import { readStoredLanguage, storeLanguage } from '../components/LanguageSwitch';
import ResourceDetail, { getPercent, formatBytes, renderType } from '../components/ResourceDetail';
import CreateMachineModal from '../components/CreateMachineModal';
import MaintenanceBanner from '../components/MaintenanceBanner';
import NotificationSettingsPanel from '../components/NotificationSettingsPanel';
import WikiBrowser from '../components/WikiBrowser';
import PublicPageModal from '../components/PublicPageModal';

const USER_LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' }
];

const PROVISIONING_SUCCESS_VISIBILITY_MS = 30 * 1000;
const PROVISIONING_FAILED_VISIBILITY_MS = 5 * 60 * 1000;

function parseServerTimestamp(value) {
  if (!value) return null;
  const parsed = Date.parse(`${String(value).replace(' ', 'T')}Z`);
  return Number.isFinite(parsed) ? parsed : null;
}

function provisioningJobVisibilityMs(job) {
  if (job.status === 'failed') return PROVISIONING_FAILED_VISIBILITY_MS;
  return PROVISIONING_SUCCESS_VISIBILITY_MS;
}

function isProvisioningJobVisible(job, now = Date.now()) {
  if (Number(job.progress) < 100) return true;
  if (job.status !== 'success' && job.status !== 'failed') return true;
  const finishedAt = parseServerTimestamp(job.finishedAt);
  return finishedAt === null || now - finishedAt < provisioningJobVisibilityMs(job);
}

const USER_TRANSLATIONS = {
  en: {
    userConsole: 'User Portal',
    notifications: 'Notifications',
    dashboard: 'Dashboard',
    wiki: 'Wiki',
    settings: 'Settings',
    menu: 'Menu',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    close: 'Close',
    language: 'Language',
    languageText: 'Choose the language used by the portal, menus, placeholders and maintenance banners.',
    notificationsText: 'Manage e-mail notifications for outages, recoveries and maintenance.',
    notificationSettings: 'Notification settings',
    password: 'Password',
    passwordText: 'Change the password used to sign in to your portal account.',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    changePassword: 'Change password',
    changingPassword: 'Changing password...',
    passwordChanged: 'Your password was changed successfully.',
    passwordRequired: 'Enter your current password and a new password.',
    passwordTooShort: 'The new password must be at least 8 characters long.',
    passwordMismatch: 'The new passwords do not match.',
    passwordChangeFailed: 'The password could not be changed.',
    logout: 'Log out',
    createContainer: 'Create new container',
    firstContainer: 'Create first container',
    selfServiceUnavailable: 'Container self-service is temporarily unavailable.',
    provisioningJobs: 'Provisioning jobs',
    noProvisioningJobs: 'No recent provisioning jobs.',
    provisioningRunning: 'Provisioning',
    provisioningReady: 'Ready',
    provisioningFailed: 'Failed',
    loadingServices: 'Loading services...',
    noServices: 'No services',
    noServicesText: 'No services have been assigned to you yet.',
    publicPage: 'Website',
    publicPageTitle: 'Open public website',
    addPublicPage: 'Publish service',
    editPublicPage: 'Edit public access',
    managePublicAccess: 'Access',
    managePublicAccessTitle: 'Manage public access',
    addWebsite: 'Add link',
    addWebsiteTitle: 'Add a public website link',
    editWebsite: 'Edit link',
    editWebsiteTitle: 'Edit the public website link',
    publicPageUrl: 'Public page URL',
    publicPageHelp: 'Publish this service securely through Pangolin.',
    publicPageRequired: 'Enter a public page URL.',
    publicPageInvalid: 'The public page must be a valid URL starting with http:// or https://.',
    publicPageSaveFailed: 'The public page could not be saved.',
    publicPageRemoveFailed: 'The public page could not be removed.',
    removePublicPage: 'Remove public page',
    removePublicPageConfirm: 'Remove the public page from this service?',
    managementPage: 'Admin',
    managementPageTitle: 'Open management page',
    details: 'Show details',
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',
    cluster: 'Cluster',
    node: 'Node',
    unknown: 'Unknown',
    counts: {
      services: 'services',
      online: 'online'
    },
    hero: {
      title: 'Dashboard'
    },
    status: {
      running: 'Online',
      stopped: 'Offline',
      paused: 'Paused',
      suspended: 'Suspended',
      unknown: 'Unknown'
    }
  },
  de: {
    userConsole: 'Benutzer-Portal',
    notifications: 'Benachrichtigungen',
    dashboard: 'Dashboard',
    wiki: 'Wiki',
    settings: 'Einstellungen',
    menu: 'Menü',
    openMenu: 'Menü öffnen',
    closeMenu: 'Menü schließen',
    close: 'Schließen',
    language: 'Sprache',
    languageText: 'Wähle die Sprache für Portal, Menüs, Platzhalter und Wartungsbanner.',
    notificationsText: 'Verwalte E-Mail-Benachrichtigungen für Ausfälle, Wiederherstellungen und Wartungen.',
    notificationSettings: 'Benachrichtigungseinstellungen',
    password: 'Passwort',
    passwordText: 'Ändere das Passwort, mit dem du dich an deinem Portal-Konto anmeldest.',
    currentPassword: 'Aktuelles Passwort',
    newPassword: 'Neues Passwort',
    confirmPassword: 'Neues Passwort bestätigen',
    changePassword: 'Passwort ändern',
    changingPassword: 'Passwort wird geändert...',
    passwordChanged: 'Dein Passwort wurde erfolgreich geändert.',
    passwordRequired: 'Bitte das aktuelle und ein neues Passwort eingeben.',
    passwordTooShort: 'Das neue Passwort muss mindestens 8 Zeichen lang sein.',
    passwordMismatch: 'Die neuen Passwörter stimmen nicht überein.',
    passwordChangeFailed: 'Das Passwort konnte nicht geändert werden.',
    logout: 'Abmelden',
    createContainer: 'Neuen Container erstellen',
    firstContainer: 'Ersten Container erstellen',
    selfServiceUnavailable: 'Der Container-Self-Service ist vorübergehend nicht verfügbar.',
    provisioningJobs: 'Bereitstellungsaufträge',
    noProvisioningJobs: 'Keine aktuellen Bereitstellungsaufträge.',
    provisioningRunning: 'Wird bereitgestellt',
    provisioningReady: 'Bereit',
    provisioningFailed: 'Fehlgeschlagen',
    loadingServices: 'Dienste werden geladen...',
    noServices: 'Keine Dienste',
    noServicesText: 'Dir sind noch keine Dienste zugewiesen.',
    publicPage: 'Webseite',
    publicPageTitle: 'Öffentliche Webseite öffnen',
    addPublicPage: 'Dienst veröffentlichen',
    editPublicPage: 'Öffentlichen Zugriff bearbeiten',
    managePublicAccess: 'Freigaben',
    managePublicAccessTitle: 'Öffentliche Zugriffe verwalten',
    addWebsite: 'Link hinzufügen',
    addWebsiteTitle: 'Link zu einer öffentlichen Webseite hinterlegen',
    editWebsite: 'Link bearbeiten',
    editWebsiteTitle: 'Link zur öffentlichen Webseite bearbeiten',
    publicPageUrl: 'URL der öffentlichen Seite',
    publicPageHelp: 'Veröffentliche diesen Dienst sicher über Pangolin.',
    publicPageRequired: 'Bitte eine URL für die öffentliche Seite eingeben.',
    publicPageInvalid: 'Die öffentliche Seite muss eine gültige URL mit http:// oder https:// sein.',
    publicPageSaveFailed: 'Die öffentliche Seite konnte nicht gespeichert werden.',
    publicPageRemoveFailed: 'Die öffentliche Seite konnte nicht entfernt werden.',
    removePublicPage: 'Öffentliche Seite entfernen',
    removePublicPageConfirm: 'Die öffentliche Seite von diesem Dienst entfernen?',
    managementPage: 'Admin',
    managementPageTitle: 'Verwaltungsseite öffnen',
    details: 'Details anzeigen',
    save: 'Speichern',
    saving: 'Wird gespeichert...',
    cancel: 'Abbrechen',
    cluster: 'Cluster',
    node: 'Node',
    unknown: 'Unbekannt',
    counts: {
      services: 'Dienste',
      online: 'online'
    },
    hero: {
      title: 'Dashboard'
    },
    status: {
      running: 'Online',
      stopped: 'Offline',
      paused: 'Pausiert',
      suspended: 'Angehalten',
      unknown: 'Unbekannt'
    }
  }
};

function renderUserStatus(status, labels) {
  return labels.status[status] || labels.status.unknown;
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

function LogoutIcon() {
  return (
    <svg className="logout-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M10 6H5v12h5" />
      <path d="M14 8l4 4-4 4" />
      <path d="M8 12h10" />
    </svg>
  );
}

export default function UserDashboard() {
  const { user, logout, changePassword } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [provisioningOptions, setProvisioningOptions] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [provisioningJobs, setProvisioningJobs] = useState([]);
  const [openProvisioningJob, setOpenProvisioningJob] = useState(null);
  const [publicPageResource, setPublicPageResource] = useState(null);
  const [language, setLanguage] = useState(readStoredLanguage);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);

  const fetchResources = useCallback(async (withSpinner = true) => {
    try {
      if (withSpinner) setLoading(true);
      setError('');
      const response = await userApi.getResources();
      setResources(response.data.resources || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Dienste konnten nicht geladen werden.'));
    } finally {
      if (withSpinner) setLoading(false);
    }
  }, []);


  const fetchProvisioningJobs = useCallback(async () => {
    try {
      const response = await userApi.getProvisioningJobs(10);
      setProvisioningJobs(response.data.jobs || []);
    } catch (_) {
      setProvisioningJobs([]);
    }
  }, []);

  useEffect(() => {
    fetchResources();
    fetchProvisioningJobs();
    userApi.getProvisioningOptions()
      .then(res => setProvisioningOptions(res.data.clusters || []))
      .catch(() => setProvisioningOptions([]));
  }, [fetchResources, fetchProvisioningJobs]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') fetchResources(false);
    }, 30 * 1000);
    return () => clearInterval(timer);
  }, [fetchResources]);


  useEffect(() => {
    const active = provisioningJobs.some(job => ['queued', 'running'].includes(job.status));
    if (!active) return undefined;
    const timer = setInterval(() => {
      fetchProvisioningJobs();
      fetchResources(false);
    }, 2000);
    return () => clearInterval(timer);
  }, [provisioningJobs, fetchProvisioningJobs, fetchResources]);


  useEffect(() => {
    const now = Date.now();
    const expired = provisioningJobs.some(job => !isProvisioningJobVisible(job, now));
    if (expired) {
      setProvisioningJobs(current => current.filter(job => isProvisioningJobVisible(job)));
      return undefined;
    }
    const remaining = provisioningJobs
      .filter(job => (job.status === 'success' || job.status === 'failed') && Number(job.progress) >= 100)
      .map(job => {
        const finishedAt = parseServerTimestamp(job.finishedAt);
        return finishedAt === null ? null : Math.max((finishedAt + provisioningJobVisibilityMs(job)) - now, 0);
      })
      .filter(value => value !== null);
    if (!remaining.length) return undefined;
    const timer = setTimeout(() => {
      setProvisioningJobs(current => current.filter(job => isProvisioningJobVisible(job)));
    }, Math.min(...remaining) + 50);
    return () => clearTimeout(timer);
  }, [provisioningJobs]);

  const detailResource = resources.find(item => item.id === detailId) || null;
  const labels = USER_TRANSLATIONS[language] || USER_TRANSLATIONS.en;
  const onlineCount = useMemo(() => resources.filter(item => item.status === 'running').length, [resources]);
  const availableProvisioningOptions = useMemo(
    () => provisioningOptions.filter(item => item.available !== false),
    [provisioningOptions]
  );
  const unavailableProvisioningOptions = useMemo(
    () => provisioningOptions.filter(item => item.available === false),
    [provisioningOptions]
  );

  const selectTab = (tab) => {
    setActiveTab(tab);
    setMenuOpen(false);
  };

  const selectLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);
    storeLanguage(nextLanguage);
  };

  return (
    <div className="app-page user-page">
      <MaintenanceBanner />
      <header className="site-header">
        <div className="site-header-inner">
          <div className="site-brand">
            <h1>Hosting by TechByGiusi</h1>
          </div>
          <div className="site-actions">
            <ThemeButton />
            <button type="button" className="btn-secondary admin-mobile-menu-toggle user-menu-toggle-icon-only" onClick={() => setMenuOpen(true)} aria-label={labels.openMenu} title={labels.menu}><MenuIcon /></button>
            <button type="button" className="btn-secondary logout-button" onClick={logout} aria-label={labels.logout}><LogoutIcon /><span className="logout-label">{labels.logout}</span></button>
          </div>
        </div>
      </header>

      <div className={`user-fullscreen-menu-overlay ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden={!menuOpen}>
        <div className="user-fullscreen-menu-panel" onClick={(e) => e.stopPropagation()}>
          <div className="mobile-admin-menu-header">
            <div>
              <span className="resource-id">{labels.userConsole}</span>
              <h2>{user?.name || user?.email || 'User'}</h2>
              <p>{resources.length} {labels.counts.services} · {onlineCount} {labels.counts.online}</p>
            </div>
            <button type="button" className="btn-secondary mobile-admin-menu-close" onClick={() => setMenuOpen(false)} aria-label={labels.closeMenu}>{labels.close}</button>
          </div>
          <div className="mobile-admin-language-switch user-menu-language-switch" role="group" aria-label={labels.language}>
            {USER_LANGUAGE_OPTIONS.map(option => (
              <button
                key={option.code}
                type="button"
                className={language === option.code ? 'active' : ''}
                onClick={() => selectLanguage(option.code)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <nav className="console-nav-tabs mobile-admin-menu-nav" aria-label={labels.menu}>
            <button type="button" className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => selectTab('dashboard')}>{labels.dashboard}</button>
            <button type="button" className={activeTab === 'wiki' ? 'active' : ''} onClick={() => selectTab('wiki')}>{labels.wiki}</button>
            <button type="button" className={activeTab === 'settings' ? 'active' : ''} onClick={() => selectTab('settings')}>{labels.settings}</button>
          </nav>
          <div className="mobile-admin-menu-footer">
            <button type="button" className="btn-secondary mobile-admin-menu-logout" onClick={logout}>{labels.logout}</button>
          </div>
        </div>
      </div>

      <main className="app-container compact-container admin-shell user-dashboard-shell">
        <aside className="admin-sidebar-shell desktop-admin-sidebar user-desktop-sidebar">
          <div className="panel-card console-sidebar-card">
            <span className="resource-id">{labels.userConsole}</span>
            <h2>{user?.name || user?.email || 'User'}</h2>
            <p>{resources.length} {labels.counts.services} · {onlineCount} {labels.counts.online}</p>
          </div>
          <nav className="app-tabs console-nav-tabs" aria-label={labels.menu}>
            <button type="button" className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => selectTab('dashboard')}>{labels.dashboard}</button>
            <button type="button" className={activeTab === 'wiki' ? 'active' : ''} onClick={() => selectTab('wiki')}>{labels.wiki}</button>
            <button type="button" className={activeTab === 'settings' ? 'active' : ''} onClick={() => selectTab('settings')}>{labels.settings}</button>
          </nav>
        </aside>

        <section className="admin-main-shell">
          {error && <div className="alert alert-danger">{error}</div>}

          {activeTab === 'dashboard' && (
            <>
              <section className="panel-card dashboard-hero-card user-dashboard-hero-card">
                <div>
                  <span className="resource-id">Hosting by TechByGiusi</span>
                  <h2>{labels.hero.title}</h2>
                </div>
                {availableProvisioningOptions.length > 0 && (
                  <div className="dashboard-hero-actions">
                    <button type="button" className="btn-primary" onClick={() => setShowCreate(true)}>{labels.createContainer}</button>
                  </div>
                )}
              </section>

              {availableProvisioningOptions.length === 0 && unavailableProvisioningOptions.length > 0 && (
                <div className="alert alert-warning provisioning-unavailable-notice">
                  <strong>{labels.selfServiceUnavailable}</strong>
                  <span>{unavailableProvisioningOptions.map(item => `${item.clusterName}: ${translateMessage(item.unavailableReason)}`).join(' · ')}</span>
                </div>
              )}


              {provisioningJobs.length > 0 && (
                <section className="panel-card provisioning-jobs-panel">
                  <h2>{labels.provisioningJobs}</h2>
                  <div className="provisioning-job-list">
                    {provisioningJobs.map(job => (
                      <button type="button" key={job.id} className="provisioning-job-card provisioning-job-button" onClick={() => setOpenProvisioningJob(job)}>
                        <div><strong>{job.hostname}</strong><small>{job.templateName || 'Template'} · {job.clusterName}</small></div>
                        <div className="provisioning-job-progress">
                          <div className="progress-bar"><span style={{ width: `${job.progress || 0}%` }} /></div>
                          <small>{job.status === 'success' ? labels.provisioningReady : job.status === 'failed' ? labels.provisioningFailed : labels.provisioningRunning} · {job.progress || 0}%</small>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {loading ? (
                <div className="loading"><span className="spinner"></span><span>{labels.loadingServices}</span></div>
              ) : resources.length === 0 ? (
                <section className="empty-state panel-card">
                  <h2>{labels.noServices}</h2>
                  <p>{labels.noServicesText}</p>
                  {availableProvisioningOptions.length > 0 && (
                    <button type="button" className="btn-primary" onClick={() => setShowCreate(true)}>{labels.firstContainer}</button>
                  )}
                </section>
              ) : (
                <section className="resource-grid">
                  {resources.map(resource => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      onOpenDetails={() => setDetailId(resource.id)}
                      onManagePublicPage={() => setPublicPageResource(resource)}
                      labels={labels}
                    />
                  ))}
                </section>
              )}
            </>
          )}

          {activeTab === 'wiki' && <WikiBrowser language={language} />}

          {activeTab === 'settings' && (
            <section className="panel-card user-settings-card">
              <div className="panel-header"><h2>{labels.settings}</h2></div>
              <div className="settings-language-card language-settings-block">
                <div>
                  <h3>{labels.language}</h3>
                  <p>{labels.languageText}</p>
                </div>
                <div className="mobile-admin-language-switch settings-language-buttons" role="group" aria-label={labels.language}>
                  {USER_LANGUAGE_OPTIONS.map(option => (
                    <button
                      key={option.code}
                      type="button"
                      className={language === option.code ? 'active' : ''}
                      onClick={() => selectLanguage(option.code)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <PasswordSettingsPanel labels={labels} onChangePassword={changePassword} />
              <div className="settings-notification-card">
                <div className="settings-section-header">
                  <h3>{labels.notifications}</h3>
                </div>
                <NotificationSettingsPanel language={language} />
              </div>
            </section>
          )}
        </section>
      </main>

      {detailResource && (
        <ResourceDetail
          resource={detailResource}
          onClose={() => setDetailId(null)}
          onChanged={() => fetchResources(false)}
          onManagePublicPage={() => {
            setDetailId(null);
            setPublicPageResource(detailResource);
          }}
        />
      )}


      {publicPageResource && (
        <PublicPageModal
          resource={publicPageResource}
          language={language}
          labels={labels}
          onClose={() => setPublicPageResource(null)}
          onSaved={() => fetchResources(false)}
        />
      )}

      {openProvisioningJob && !showCreate && (
        <CreateMachineModal
          options={[]}
          initialJob={openProvisioningJob}
          onClose={() => setOpenProvisioningJob(null)}
          onCreated={() => { fetchResources(false); fetchProvisioningJobs(); }}
        />
      )}

      {showCreate && (
        <CreateMachineModal
          options={availableProvisioningOptions}
          onClose={() => setShowCreate(false)}
          onCreated={() => { fetchResources(false); fetchProvisioningJobs(); }}
        />
      )}
    </div>
  );
}


function PasswordSettingsPanel({ labels, onChangePassword }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError(labels.passwordRequired);
      return;
    }
    if (form.newPassword.length < 8) {
      setError(labels.passwordTooShort);
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError(labels.passwordMismatch);
      return;
    }

    try {
      setBusy(true);
      await onChangePassword(form.currentPassword, form.newPassword);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess(labels.passwordChanged);
    } catch (changeError) {
      setError(changeError?.message || labels.passwordChangeFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-password-card">
      <div className="settings-section-header">
        <div>
          <h3>{labels.password}</h3>
          <p>{labels.passwordText}</p>
        </div>
      </div>
      <form className="settings-password-form" onSubmit={submit}>
        <div className="settings-password-grid">
          <label className="form-group">
            <span>{labels.currentPassword}</span>
            <input
              type="password"
              value={form.currentPassword}
              onChange={event => updateField('currentPassword', event.target.value)}
              autoComplete="current-password"
              disabled={busy}
            />
          </label>
          <label className="form-group">
            <span>{labels.newPassword}</span>
            <input
              type="password"
              value={form.newPassword}
              onChange={event => updateField('newPassword', event.target.value)}
              autoComplete="new-password"
              minLength="8"
              disabled={busy}
            />
          </label>
          <label className="form-group">
            <span>{labels.confirmPassword}</span>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={event => updateField('confirmPassword', event.target.value)}
              autoComplete="new-password"
              minLength="8"
              disabled={busy}
            />
          </label>
        </div>
        {error && <div className="alert alert-danger settings-password-message">{error}</div>}
        {success && <div className="alert alert-success settings-password-message">{success}</div>}
        <div className="settings-password-actions">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? labels.changingPassword : labels.changePassword}
          </button>
        </div>
      </form>
    </div>
  );
}

function ResourceCard({ resource, onOpenDetails, onManagePublicPage, labels }) {
  const cpuPercent = getCpuPercent(resource);
  const memPercent = getPercent(resource.mem, resource.maxmem);
  const publicUrl = resource.publicUrl || resource.webUrl;
  const adminUrl = resource.adminUrl || '';
  const managePublicPageLabel = `${labels.managePublicAccess}${Number(resource.publicationCount || 0) > 0 ? ` (${resource.publicationCount})` : ''}`;
  const managePublicPageTitle = labels.editPublicPage;

  return (
    <article className="resource-card compact-resource-card">
      <div className="resource-card-header">
        <div>
          <span className="resource-id">
            {renderType(resource.type)} · {resource.containerId}
            {resource.groupName && <span className="group-chip">{resource.groupName}</span>}
          </span>
          <h2>{resource.name}</h2>
        </div>
        <span className={`status-badge status-${resource.status || 'unknown'}`}>{renderUserStatus(resource.status || 'unknown', labels)}</span>
      </div>

      <div className="resource-summary">
        <div><span>{labels.cluster}</span><strong>{resource.clusterName || labels.unknown}</strong></div>
        <div><span>{labels.node}</span><strong>{resource.node || labels.unknown}</strong></div>
      </div>

      <Metric label="CPU" percent={cpuPercent} detail={`${cpuPercent.toFixed(1)} %`} />
      <Metric label="RAM" percent={memPercent} detail={`${formatBytes(resource.mem)} / ${formatBytes(resource.maxmem)}`} />

      {(publicUrl || adminUrl || resource.canManagePublicPage) ? (
        <div className="service-link-row publishing-service-links">
          {publicUrl && (
            <a
              className="btn-primary full-button"
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              title={labels.publicPageTitle}
              aria-label={labels.publicPageTitle}
            >
              {labels.publicPage}
            </a>
          )}
          {resource.canManagePublicPage && (
            <button
              type="button"
              className={publicUrl ? 'btn-secondary full-button' : 'btn-primary full-button'}
              onClick={onManagePublicPage}
              title={managePublicPageTitle}
              aria-label={managePublicPageTitle}
            >
              {managePublicPageLabel}
            </button>
          )}
          {adminUrl && (
            <a
              className="btn-secondary full-button"
              href={adminUrl}
              target="_blank"
              rel="noreferrer"
              title={labels.managementPageTitle}
              aria-label={labels.managementPageTitle}
            >
              {labels.managementPage}
            </a>
          )}
        </div>
      ) : null}

      <button type="button" className="btn-secondary full-button service-detail-toggle" onClick={onOpenDetails}>
        {labels.details}
      </button>
    </article>
  );
}

function Metric({ label, percent, detail }) {
  const safePercent = Math.min(Math.max(Number(percent) || 0, 0), 100);
  return (
    <div className="metric-line">
      <div><span>{label}</span><span>{safePercent.toFixed(1)}%</span></div>
      <div className="progress-bar"><span style={{ width: `${safePercent}%` }}></span></div>
      <small>{detail}</small>
    </div>
  );
}

function getCpuPercent(resource) {
  const cpu = Number(resource.cpu || 0);
  if (cpu <= 1) return Math.min(Math.max(cpu * 100, 0), 100);
  return Math.min(Math.max(cpu, 0), 100);
}
