import React, { useCallback, useEffect, useState } from 'react';
import Modal from './Modal';
import { userApi, getErrorMessage } from '../services/api';
import { readStoredLanguage } from './LanguageSwitch';
import { translatePortalText } from '../i18n';

/**
 * Detail modal for one resource. Capability-driven:
 * - capabilities.canPower   -> power controls + reboot
 * - capabilities.canConsole -> desktop-only console button
 * Read-only tokens only see overview, tasks/logs and credentials.
 */
export default function ResourceDetail({ resource, onClose, onChanged, onManagePublicPage }) {
  const tabs = [
    ['overview', 'Dashboard'],
    ['tasks', 'Aufgaben & Logs'],
    ['credentials', 'Zugangsdaten']
  ];
  const [activeTab, setActiveTab] = useState('overview');

  const openConsole = () => {
    window.open(`/console/${resource.id}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal title={resource.name} onClose={onClose} className="detail-modal-card">
      <nav className="modal-tabs" aria-label="Detailbereiche">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}>{label}</button>
        ))}
      </nav>

      <div className="detail-tab-body">
        {activeTab === 'overview' && <OverviewTab resource={resource} onChanged={onChanged} onOpenConsole={openConsole} onClose={onClose} onManagePublicPage={onManagePublicPage} />}
        {activeTab === 'tasks' && <TasksTab resource={resource} />}
        {activeTab === 'credentials' && <CredentialsTab resource={resource} />}
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- POWER */
export function PowerControls({ resource, onChanged, compact = false, onOpenConsole }) {
  const caps = resource.capabilities || {};
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');
  const running = resource.status === 'running';
  // A manually configured service IP enables the SSH console independently of the
  // Proxmox VM.Console permission. Without a manual IP, the traditional Proxmox
  // serial console remains capability-driven. The full console page still handles
  // stopped or unknown machines safely.
  const canOpenConsole = !!onOpenConsole && !!caps.canConsole;

  if (!caps.canPower && !caps.canConsole) return null;

  const runAction = async (action, confirmText) => {
    if (confirmText && !window.confirm(translatePortalText(confirmText, readStoredLanguage()))) return;
    try {
      setBusyAction(action);
      setError('');
      await userApi.powerAction(resource.id, action);
      // Give Proxmox a moment before refreshing the status
      setTimeout(() => onChanged?.(), 2500);
    } catch (err) {
      setError(getErrorMessage(err, 'Aktion fehlgeschlagen.'));
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div className={compact ? 'power-row power-row-compact' : 'power-row'}>
      {!running && caps.canPower && (
        <button type="button" className="btn-primary btn-small" disabled={!!busyAction} onClick={() => runAction('start')}>
          {busyAction === 'start' ? 'Startet...' : 'Starten'}
        </button>
      )}
      {running && caps.canPower && (
        <>
          <button type="button" className="btn-secondary btn-small" disabled={!!busyAction} onClick={() => runAction('reboot', `${resource.name} jetzt neu starten?`)}>
            {busyAction === 'reboot' ? 'Neustart...' : 'Neu starten'}
          </button>
          <button type="button" className="btn-secondary btn-small" disabled={!!busyAction} onClick={() => runAction('shutdown', `${resource.name} herunterfahren?`)}>
            {busyAction === 'shutdown' ? 'Fährt herunter...' : 'Herunterfahren'}
          </button>
        </>
      )}
      {caps.canConsole && (
        <button type="button" className="btn-secondary btn-small desktop-only-inline" onClick={onOpenConsole} disabled={!canOpenConsole || !!busyAction}>
          Konsole
        </button>
      )}
      {running && caps.canPower && (
        <button type="button" className="btn-danger btn-small" disabled={!!busyAction} onClick={() => runAction('stop', `${resource.name} hart stoppen? Nicht gespeicherte Daten gehen verloren.`)}>
          {busyAction === 'stop' ? 'Stoppt...' : 'Stopp'}
        </button>
      )}
      {error && <small className="power-error">{error}</small>}
    </div>
  );
}

function OverviewTab({ resource, onChanged, onOpenConsole, onClose, onManagePublicPage }) {
  const primaryIp = getPrimaryIp(resource);
  const publicUrl = resource.publicUrl || resource.webUrl || '';
  const adminUrl = resource.adminUrl || '';
  const language = readStoredLanguage();
  const managePublicPageLabel = translatePortalText('Öffentlichen Zugriff bearbeiten', language);

  return (
    <div className="resource-details detail-modal-content">
      <PowerControls resource={resource} onChanged={onChanged} onOpenConsole={onOpenConsole} />
      {(publicUrl || adminUrl) && (
        <div className={`service-link-row ${(publicUrl && adminUrl) ? 'dual-links' : ''}`}>
          {publicUrl && <a className="btn-secondary full-button" href={publicUrl} target="_blank" rel="noreferrer">Öffentliche Seite</a>}
          {adminUrl && <a className="btn-secondary full-button" href={adminUrl} target="_blank" rel="noreferrer">Verwaltungsseite</a>}
        </div>
      )}
      {resource.canManagePublicPage && onManagePublicPage && (
        <button type="button" className="btn-secondary full-button" onClick={onManagePublicPage}>
          {managePublicPageLabel}
        </button>
      )}
      {resource.canManageServiceIp && <ServiceIpControl resource={resource} onChanged={onChanged} />}
      <div className="resource-meta">
        {resource.groupName && (<><span>Gruppe</span><span>{resource.groupName}</span></>)}
        <span>Cluster</span><span>{resource.clusterName || 'Unbekannt'}</span>
        <span>Node</span><span>{resource.node || 'Unbekannt'}</span>
        <span>Typ</span><span>{renderType(resource.type)}</span>
        <span>Zugewiesene CPU-Kerne</span><span>{Number(resource.maxcpu || 0) > 0 ? Number(resource.maxcpu) : 'Nicht bekannt'}</span>
        <span>Zugewiesener Arbeitsspeicher</span><span>{Number(resource.maxmem || 0) > 0 ? formatBytes(resource.maxmem) : 'Nicht bekannt'}</span>
        <span>Betriebssystem</span><span>{resource.operatingSystem || 'Nicht bekannt'}</span>
        {resource.sourceTemplate && (<><span>Template</span><span title={resource.sourceTemplate}>{resource.sourceTemplateName || resource.sourceTemplate}</span></>)}
        <span>ID</span><span>{resource.containerId || 'Unbekannt'}</span>
        <span>IP-Adresse</span><span>{primaryIp || 'Nicht bekannt'}</span>
        {resource.manualIp && (<><span>IP-Quelle</span><span>Manuell hinterlegt</span></>)}
        <span>Status</span><span>{renderStatus(resource.status)}</span>
        {resource.uptime > 0 && (<><span>Laufzeit</span><span>{formatUptime(resource.uptime)}</span></>)}
      </div>
      <DiskDetails resource={resource} />
      <DeleteMachineControl resource={resource} onChanged={onChanged} onClose={onClose} />
      {resource.monitorError && <p className="hint-text">Monitoring ist gerade nicht erreichbar.</p>}
    </div>
  );
}

function ServiceIpControl({ resource, onChanged }) {
  const language = readStoredLanguage();
  const text = (value) => translatePortalText(value, language);
  const [ip, setIp] = useState(resource.manualIp || '');
  const [sshPort, setSshPort] = useState(String(resource.sshPort || 22));
  const [savedIp, setSavedIp] = useState(resource.manualIp || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setIp(resource.manualIp || '');
    setSavedIp(resource.manualIp || '');
    setSshPort(String(resource.sshPort || 22));
  }, [resource.manualIp, resource.sshPort]);

  const save = async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      setError('');
      setNotice('');
      const response = await userApi.saveServiceIp(resource.id, ip.trim(), Number(sshPort || 22));
      setIp(response.data.manualIp || '');
      setSavedIp(response.data.manualIp || '');
      setSshPort(String(response.data.sshPort || 22));
      setNotice(text(response.data.manualIp ? 'Dienst-IP wurde gespeichert.' : 'Dienst-IP wurde entfernt.'));
      await onChanged?.();
    } catch (err) {
      setError(getErrorMessage(err, text('Dienst-IP konnte nicht gespeichert werden.')));
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    try {
      setBusy(true);
      setError('');
      setNotice('');
      const response = await userApi.saveServiceIp(resource.id, '', Number(sshPort || 22));
      setIp('');
      setSavedIp('');
      setSshPort(String(response.data.sshPort || 22));
      setNotice(text('Dienst-IP wurde entfernt.'));
      await onChanged?.();
    } catch (err) {
      setError(getErrorMessage(err, text('Dienst-IP konnte nicht entfernt werden.')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="service-ip-control" onSubmit={save}>
      <div className="service-ip-heading">
        <div>
          <h3>{text('Dienst-IP und SSH-Konsole')}</h3>
          <p>{text('Nur bei einer vom Administrator zugewiesenen QEMU-VM ohne erkannte Gast-IP kann hier eine feste IPv4-Adresse hinterlegt werden.')}</p>
        </div>
        {resource.consoleMode === 'ssh' && <span className="credential-badge">SSH</span>}
      </div>
      <div className="service-ip-fields">
        <label className="form-group">
          <span>{text('Manuelle IPv4-Adresse')}</span>
          <input type="text" inputMode="decimal" value={ip} onChange={(event) => setIp(event.target.value)} placeholder="10.10.20.16" disabled={busy} />
        </label>
        <label className="form-group service-ip-port">
          <span>{text('SSH-Port')}</span>
          <input type="number" min="1" max="65535" value={sshPort} onChange={(event) => setSshPort(event.target.value)} disabled={busy} />
        </label>
      </div>
      {resource.detectedIp && <small>{text('Automatisch erkannte IP')}: {resource.detectedIp}</small>}
      <small>{text('Ist eine manuelle IP gesetzt, verwendet die Konsole SSH zu dieser Adresse. Hinterlege dafür im Tab Zugangsdaten einen Eintrag mit Benutzername und Passwort, idealerweise mit „SSH“ in der Bezeichnung.')}</small>
      {error && <div className="alert alert-danger">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}
      <div className="form-actions service-ip-actions">
        {savedIp && <button type="button" className="btn-secondary btn-small" onClick={clear} disabled={busy}>{text('IP entfernen')}</button>}
        <button type="submit" className="btn-primary btn-small" disabled={busy}>{busy ? text('Wird gespeichert...') : text('IP speichern')}</button>
      </div>
    </form>
  );
}

function DeleteMachineControl({ resource, onChanged, onClose }) {
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (!resource.canDelete) return null;

  const deleteMachine = async () => {
    if (!window.confirm(translatePortalText(`${resource.name} wirklich löschen? Der Container wird in Proxmox entfernt.`, readStoredLanguage()))) return;
    try {
      setDeleteBusy(true);
      setDeleteError('');
      await userApi.deleteMachine(resource.id);
      onChanged?.();
      onClose?.();
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'Container konnte nicht gelöscht werden.'));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="detail-danger-zone">
      <button type="button" className="btn-danger full-button" onClick={deleteMachine} disabled={deleteBusy}>
        {deleteBusy ? 'Wird gelöscht...' : 'Container löschen'}
      </button>
      {deleteError && <small className="power-error">{deleteError}</small>}
    </div>
  );
}

/* ----------------------------------------------------------- TASKS/LOGS */
function TasksTab({ resource }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openUpid, setOpenUpid] = useState('');
  const [log, setLog] = useState([]);
  const [logLoading, setLogLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await userApi.getTasks(resource.id);
      setTasks(res.data.tasks || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Aufgaben konnten nicht geladen werden.'));
    } finally {
      setLoading(false);
    }
  }, [resource.id]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const openLog = async (upid) => {
    if (openUpid === upid) { setOpenUpid(''); setLog([]); return; }
    try {
      setOpenUpid(upid);
      setLogLoading(true);
      const res = await userApi.getTaskLog(resource.id, upid);
      setLog(res.data.log || []);
    } catch (err) {
      setLog([{ n: 1, t: getErrorMessage(err, 'Log konnte nicht geladen werden.') }]);
    } finally {
      setLogLoading(false);
    }
  };

  return (
    <div className="tasks-tab">
      <div className="tasks-toolbar">
        <span className="hint-text">Letzte Proxmox-Aufgaben dieser Maschine.</span>
        <button type="button" className="btn-secondary btn-small" onClick={loadTasks} disabled={loading}>Aktualisieren</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="loading inline-loading"><span className="spinner"></span><span>Laden...</span></div>}

      {!loading && tasks.length === 0 && <p className="hint-text tab-empty">Keine Aufgaben gefunden.</p>}

      {!loading && tasks.map(task => (
        <div key={task.upid} className="task-row">
          <button type="button" className="task-row-header" onClick={() => openLog(task.upid)}>
            <span className="task-type">{renderTaskType(task.type)}</span>
            <span className={`task-status task-status-${taskStatusKind(task.status)}`}>{renderTaskStatus(task.status)}</span>
            <span className="task-time">{formatTimestamp(task.starttime)}</span>
          </button>
          {openUpid === task.upid && (
            <pre className="task-log">
              {logLoading ? 'Log wird geladen...' : (log.length > 0 ? log.map(line => line.t).join('\n') : 'Kein Log vorhanden.')}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- CREDENTIALS */
const emptyCredential = { label: '', username: '', secret: '', url: '', notes: '', purpose: 'general' };

function CredentialsTab({ resource }) {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyCredential);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState({}); // credId -> secret
  const [copiedId, setCopiedId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await userApi.getCredentials(resource.id);
      setCredentials((res.data.credentials || []).filter(item => item.purpose !== 'management'));
    } catch (err) {
      setError(getErrorMessage(err, 'Zugangsdaten konnten nicht geladen werden.'));
    } finally {
      setLoading(false);
    }
  }, [resource.id]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditId(null); setForm(emptyCredential); setShowForm(true); };
  const openEdit = (item) => {
    setEditId(item.id);
    setForm({ label: item.label || '', username: item.username || '', secret: '', url: item.url || '', notes: item.notes || '', purpose: item.purpose || 'general' });
    setShowForm(true);
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.label.trim() && form.purpose !== 'management') { setError('Bitte eine Bezeichnung eingeben.'); return; }
    try {
      setBusy(true);
      setError('');
      if (editId) {
        await userApi.updateCredential(resource.id, editId, form);
      } else {
        await userApi.createCredential(resource.id, form);
      }
      setShowForm(false);
      setForm(emptyCredential);
      setEditId(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Zugangsdaten konnten nicht gespeichert werden.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(translatePortalText(`"${item.label}" wirklich löschen?`, readStoredLanguage()))) return;
    try {
      setBusy(true);
      await userApi.deleteCredential(resource.id, item.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Zugangsdaten konnten nicht gelöscht werden.'));
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
      const res = await userApi.revealCredential(resource.id, item.id);
      setRevealed(prev => ({ ...prev, [item.id]: res.data.secret || '' }));
    } catch (err) {
      setError(getErrorMessage(err, 'Passwort konnte nicht angezeigt werden.'));
    }
  };

  const copySecret = async (item) => {
    try {
      let secret = revealed[item.id];
      if (secret === undefined) {
        const res = await userApi.revealCredential(resource.id, item.id);
        secret = res.data.secret || '';
      }
      await navigator.clipboard.writeText(secret);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (err) {
      setError('Kopieren fehlgeschlagen.');
    }
  };

  return (
    <div className="credentials-tab">
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="tasks-toolbar">
        <span className="hint-text">Hinterlege hier SSH- und weitere Zugangsdaten für den Dienst. Öffentliche und Verwaltungsseiten werden im Dashboard unter „Öffentlichen Zugriff bearbeiten“ gepflegt.</span>
        <div className="inline-actions">
          <button type="button" className="btn-primary btn-small" onClick={openCreate}>Hinzufügen</button>
        </div>
      </div>

      {loading && <div className="loading inline-loading"><span className="spinner"></span><span>Laden...</span></div>}
      {!loading && credentials.length === 0 && !showForm && (
        <p className="hint-text tab-empty">Noch keine Zugangsdaten hinterlegt.</p>
      )}

      {!loading && credentials.map(item => (
        <div key={item.id} className="credential-row">
          <div className="credential-main">
            <div className="credential-label-row">
              <strong>{item.label}</strong>
              {item.purpose === 'management' && <span className="credential-badge">Verwaltungsseite</span>}
              {item.fromAdmin && item.purpose !== 'management' && <span className="credential-badge">vom Admin</span>}
            </div>
            {item.username && <span className="credential-user">{item.username}</span>}
            {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="credential-url">{item.url}</a>}
            {item.notes && <small className="credential-notes">{item.notes}</small>}
            <code className="credential-secret">{revealed[item.id] !== undefined ? (revealed[item.id] || '(leer)') : '••••••••'}</code>
          </div>
          <div className="credential-actions">
            <button type="button" className="btn-secondary btn-small" onClick={() => toggleReveal(item)}>{revealed[item.id] !== undefined ? 'Verbergen' : 'Anzeigen'}</button>
            <button type="button" className="btn-secondary btn-small" onClick={() => copySecret(item)}>{copiedId === item.id ? 'Kopiert ✓' : 'Kopieren'}</button>
            {(item.canManage || !item.fromAdmin) && <button type="button" className="btn-secondary btn-small" onClick={() => openEdit(item)}>Bearbeiten</button>}
            <button type="button" className="btn-danger btn-small" onClick={() => remove(item)} disabled={busy}>Löschen</button>
          </div>
        </div>
      ))}

      {showForm && (
        <form className="form-stack credential-form" onSubmit={save}>
          {form.purpose === 'management' && <div className="credential-purpose-note">Zugangsdaten für die Verwaltungsseite</div>}
          <label className="form-group"><span>Bezeichnung</span><input type="text" value={form.label} onChange={event => setForm(prev => ({ ...prev, label: event.target.value }))} placeholder={form.purpose === 'management' ? 'Verwaltungsseite' : 'z. B. SSH root'} /></label>
          <label className="form-group"><span>Benutzername</span><input type="text" value={form.username} onChange={event => setForm(prev => ({ ...prev, username: event.target.value }))} placeholder="Optional" autoComplete="off" /></label>
          <label className="form-group"><span>Passwort / Secret</span><input type="password" value={form.secret} onChange={event => setForm(prev => ({ ...prev, secret: event.target.value }))} placeholder={editId ? 'Leer lassen, wenn unverändert' : ''} autoComplete="new-password" /></label>
          <label className="form-group"><span>URL</span><input type="url" value={form.url} onChange={event => setForm(prev => ({ ...prev, url: event.target.value }))} placeholder="Optional" /></label>
          <label className="form-group"><span>Notizen</span><textarea rows="2" value={form.notes} onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))} placeholder="Optional"></textarea></label>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditId(null); }}>Abbrechen</button>
            <button type="submit" className="btn-primary" disabled={busy}>{editId ? 'Speichern' : 'Hinzufügen'}</button>
          </div>
        </form>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- HELPERS */
function getPrimaryIp(resource) {
  if (resource.primaryIp) return resource.primaryIp;
  const ips = Array.isArray(resource.ips) ? resource.ips : [];
  return ips.find(item => item.ipv4)?.ipv4 || '';
}

function DiskDetails({ resource }) {
  const filesystems = Array.isArray(resource.filesystems) ? resource.filesystems : [];
  const disks = Array.isArray(resource.disks) ? resource.disks : [];

  if (filesystems.length > 0 || disks.length > 0) {
    return (
      <div className="disk-details">
        {filesystems.length > 0 && <span className="disk-section-title">Dateisysteme</span>}
        {filesystems.map(disk => <DiskMetric key={`fs-${disk.id || disk.name}`} disk={disk} />)}
        {disks.length > 0 && <span className="disk-section-title">Datenträger</span>}
        {disks.map(disk => <DiskMetric key={`disk-${disk.id || disk.name}`} disk={disk} />)}
      </div>
    );
  }

  const diskPercent = getPercent(resource.disk, resource.maxdisk);
  return (
    <div className="metric-line">
      <div><span>Datenträger</span><span>{diskPercent.toFixed(1)}%</span></div>
      <div className="progress-bar"><span style={{ width: `${diskPercent}%` }}></span></div>
      <small>{formatBytes(resource.disk)} / {formatBytes(resource.maxdisk)}</small>
    </div>
  );
}

function DiskMetric({ disk }) {
  const hasUsed = disk.used !== null && disk.used !== undefined && Number.isFinite(Number(disk.used));
  const maxdisk = Number(disk.maxdisk || 0);
  const percent = hasUsed && maxdisk ? getPercent(disk.used, maxdisk) : 0;
  const subtitle = [disk.storage, disk.volume].filter(Boolean).join(' · ');

  return (
    <div className="disk-row">
      <div className="disk-row-header"><span>{disk.name || disk.id || 'Disk'}</span><small>{hasUsed ? `${percent.toFixed(1)}%` : 'Belegung nicht gemeldet'}</small></div>
      {hasUsed && <div className="progress-bar"><span style={{ width: `${percent}%` }}></span></div>}
      <small>{hasUsed && maxdisk ? `${formatBytes(disk.used)} / ${formatBytes(maxdisk)}` : maxdisk ? `Größe ${formatBytes(maxdisk)}` : 'Größe nicht gemeldet'}</small>
      {subtitle && <small className="disk-source">{subtitle}</small>}
    </div>
  );
}

export function getPercent(value, max) {
  if (!max) return 0;
  return Math.min(Math.max((Number(value) / Number(max)) * 100, 0), 100);
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function renderStatus(status) {
  switch (status) {
    case 'running': return 'Online';
    case 'stopped': return 'Offline';
    case 'paused': return 'Pausiert';
    case 'suspended': return 'Angehalten';
    default: return 'Unbekannt';
  }
}

export function renderType(type) {
  if (type === 'lxc') return 'LXC';
  if (type === 'qemu') return 'VM';
  return readStoredLanguage() === 'de' ? 'Dienst' : 'Service';
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const language = readStoredLanguage();
  if (days > 0) return language === 'de' ? `${days} T ${hours} Std` : `${days} d ${hours} h`;
  if (hours > 0) return language === 'de' ? `${hours} Std ${minutes} Min` : `${hours} h ${minutes} min`;
  return language === 'de' ? `${minutes} Min` : `${minutes} min`;
}

function formatTimestamp(unix) {
  if (!unix) return '';
  return new Date(unix * 1000).toLocaleString(readStoredLanguage() === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function renderTaskType(type) {
  // Task labels are resolved per language here instead of relying on the runtime
  // DOM phrase translation, so a missing dictionary entry can never leave a
  // German task label (e.g. "Neustart") visible while the portal is in English.
  const de = {
    vzstart: 'Start', vzstop: 'Stopp', vzshutdown: 'Herunterfahren', vzreboot: 'Neustart',
    qmstart: 'Start', qmstop: 'Stopp', qmshutdown: 'Herunterfahren', qmreboot: 'Neustart',
    vzcreate: 'Erstellen', qmcreate: 'Erstellen', vzdump: 'Backup',
    vncproxy: 'Konsole', vncshell: 'Konsole'
  };
  const en = {
    vzstart: 'Start', vzstop: 'Stop', vzshutdown: 'Shut down', vzreboot: 'Restart',
    qmstart: 'Start', qmstop: 'Stop', qmshutdown: 'Shut down', qmreboot: 'Restart',
    vzcreate: 'Create', qmcreate: 'Create', vzdump: 'Backup',
    vncproxy: 'Console', vncshell: 'Console'
  };
  const map = readStoredLanguage() === 'de' ? de : en;
  return map[type] || type;
}

function taskStatusKind(status) {
  if (status === 'OK') return 'ok';
  if (status === 'running' || !status) return 'running';
  return 'error';
}

function renderTaskStatus(status) {
  if (status === 'OK') return 'OK';
  if (status === 'running' || !status) return readStoredLanguage() === 'de' ? 'Läuft' : 'Running';
  return status;
}
