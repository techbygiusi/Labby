import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { getErrorMessage, translateMessage, userApi } from '../services/api';
import { readStoredLanguage } from './LanguageSwitch';

function rangeStyle(value, min, max) {
  const percent = ((Number(value) - Number(min)) / Math.max(Number(max) - Number(min), 1)) * 100;
  return { '--range-progress': `${Math.min(Math.max(percent, 0), 100)}%` };
}
function clamp(value, min, max) { return Math.min(Math.max(Number(value), min), max); }
function snapWeighted(rawValue, { min, max, minorStep, majorStep }) {
  const raw = clamp(rawValue, min, max);
  const minor = clamp(Math.round(raw / minorStep) * minorStep, min, max);
  const major = Math.round(raw / majorStep) * majorStep;
  return major >= min && major <= max && Math.abs(raw - major) <= minorStep * 0.8 ? major : minor;
}

const TEXT = {
  en: {
    title: 'Create new container', cluster: 'Cluster', select: 'Please select', hostname: 'Hostname', template: 'Template', selectTemplate: 'Select template',
    noTemplates: 'No usable container templates are available for this cluster.', cores: 'CPU cores', ram: 'RAM', disk: 'Disk', password: 'Root password',
    defaultPassword: 'Leave blank to use the cluster default', passwordHint: 'At least 8 characters', cancel: 'Cancel', create: 'Create container', queued: 'Provisioning container', close: 'Close',
    progress: 'Provisioning progress', technical: 'Live log', done: 'Container is ready.', failed: 'Provisioning failed.', unavailable: 'Container self-service is temporarily unavailable.', archive: 'CT archive', prepared: 'Prepared LXC template'
  },
  de: {
    title: 'Neuen Container erstellen', cluster: 'Cluster', select: 'Bitte auswählen', hostname: 'Hostname', template: 'Template', selectTemplate: 'Template auswählen',
    noTemplates: 'Für diesen Cluster sind keine verwendbaren Container-Templates verfügbar.', cores: 'CPU-Kerne', ram: 'RAM', disk: 'Festplatte', password: 'Root-Passwort',
    defaultPassword: 'Leer lassen für Cluster-Standard', passwordHint: 'Mindestens 8 Zeichen', cancel: 'Abbrechen', create: 'Container erstellen', queued: 'Container wird bereitgestellt', close: 'Schließen',
    progress: 'Bereitstellungsfortschritt', technical: 'Live-Protokoll', done: 'Container ist bereit.', failed: 'Bereitstellung fehlgeschlagen.', unavailable: 'Der Container-Self-Service ist vorübergehend nicht verfügbar.', archive: 'CT-Archiv', prepared: 'Vorbereitetes LXC-Template'
  }
};

export default function CreateMachineModal({ options = [], onClose, onCreated, initialJob = null }) {
  const language = readStoredLanguage();
  const t = TEXT[language] || TEXT.en;
  const first = options.find(item => item.available !== false);
  const [clusterId, setClusterId] = useState(first ? String(first.clusterId) : '');
  const [form, setForm] = useState({ hostname: '', templateProfileId: '', cores: 1, memoryMb: 1024, diskGb: 8, rootPassword: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [job, setJob] = useState(initialJob);
  const cluster = useMemo(() => options.find(item => String(item.clusterId) === String(clusterId)), [options, clusterId]);
  const selectedTemplate = (cluster?.templates || []).find(item => String(item.id) === String(form.templateProfileId));
  const diskMin = Math.max(4, Number(selectedTemplate?.minDiskGb) || 4);
  const diskMax = Math.min(cluster?.maxDiskGb || 64, 64);

  useEffect(() => {
    if (!selectedTemplate) return;
    setForm(prev => ({ ...prev, diskGb: clamp(prev.diskGb, diskMin, diskMax) }));
  }, [selectedTemplate?.id, diskMin, diskMax]);

  useEffect(() => {
    if (!job || ['success', 'failed'].includes(job.status)) return undefined;
    const timer = setInterval(async () => {
      try {
        const res = await userApi.getProvisioningJob(job.id);
        setJob(res.data.job);
        if (res.data.job.status === 'success') onCreated?.();
      } catch (_) { /* keep last known state */ }
    }, 1000);
    return () => clearInterval(timer);
  }, [job, onCreated]);

  const setField = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); setError(''); };
  const submit = async event => {
    event.preventDefault();
    if (!cluster) return setError(t.select);
    if (!form.templateProfileId) return setError(t.selectTemplate);
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(form.hostname)) return setError(language === 'de' ? 'Hostname: nur Kleinbuchstaben, Zahlen und Bindestriche.' : 'Hostname: lowercase letters, numbers and hyphens only.');
    if (!cluster.hasDefaultPassword && form.rootPassword.length < 8) return setError(language === 'de' ? 'Das Root-Passwort muss mindestens 8 Zeichen lang sein.' : 'The root password must be at least 8 characters long.');
    try {
      setBusy(true); setError('');
      const res = await userApi.createMachine({ clusterId: cluster.clusterId, type: 'ct', ...form });
      setJob(res.data.job);
      onCreated?.();
    } catch (err) { setError(getErrorMessage(err, language === 'de' ? 'Container konnte nicht erstellt werden.' : 'Container could not be created.')); }
    finally { setBusy(false); }
  };

  if (job) {
    const events = job.events || [];
    return <Modal title={t.queued} onClose={onClose}>
      <div className="provisioning-live-view">
        <div className="provisioning-progress-head"><strong>{job.hostname}</strong><span>{job.progress || 0}%</span></div>
        <div className="progress-bar provisioning-progress"><span style={{ width: `${job.progress || 0}%` }} /></div>
        <div className="provisioning-summary-chips"><span>{job.clusterName}</span><span>{job.templateName}</span>{job.vmid && <span>ID {job.vmid}</span>}{job.ip && <span>{job.ip}</span>}</div>
        {job.status === 'failed' && <div className="alert alert-danger">{t.failed}{job.error && <small className="provisioning-failure-detail">{translateMessage(job.error)}</small>}</div>}
        {job.status === 'success' && <div className="alert alert-success">{t.done}</div>}
        <h3>{t.progress}</h3>
        <div className="provisioning-event-list">
          {events.map(event => <div key={event.id} className={`provisioning-event event-${event.level}`}><span className="provisioning-event-dot" /><div><strong>{language === 'de' ? event.messageDe : event.messageEn}</strong><small>{new Date(String(event.createdAt).replace(' ', 'T') + 'Z').toLocaleTimeString(language === 'de' ? 'de-DE' : 'en-GB')}</small></div></div>)}
        </div>
        <div className="form-actions"><button type="button" className="btn-primary" onClick={onClose}>{t.close}</button></div>
      </div>
    </Modal>;
  }

  return <Modal title={t.title} onClose={onClose}>
    <form className="form-stack" onSubmit={submit}>
      {error && <div className="alert alert-danger">{translateMessage(error)}</div>}
      <label className="form-group"><span>{t.cluster}</span><select value={clusterId} onChange={e => { setClusterId(e.target.value); setField('templateProfileId', ''); }}><option value="">{t.select}</option>{options.map(item => <option key={item.clusterId} value={item.clusterId} disabled={item.available === false}>{item.clusterName}{item.available === false ? ` · ${t.unavailable}` : ''}</option>)}</select></label>
      {cluster && cluster.available !== false && <div className="provisioning-source-card"><div className="provisioning-mode-content">
        <label className="form-group"><span>{t.hostname}</span><input value={form.hostname} onChange={e => setField('hostname', e.target.value.toLowerCase())} placeholder="my-app" autoComplete="off" /></label>
        <label className="form-group"><span>{t.template}</span><select value={form.templateProfileId} onChange={e => setField('templateProfileId', e.target.value)} disabled={!cluster.templates?.length}><option value="" disabled hidden>{t.selectTemplate}</option>{(cluster.templates || []).map(item => <option key={item.id} value={item.id}>{item.displayName || item.name} · {item.sourceType === 'lxc-template' ? t.prepared : t.archive}</option>)}</select>{!cluster.templates?.length && <small className="hint-text">{t.noTemplates}</small>}</label>{selectedTemplate?.description && <div className="template-selection-description">{selectedTemplate.description}</div>}
        {form.templateProfileId && <>
          <div className="slider-grid">
            <label className="form-group"><span>{t.cores} · {form.cores}</span><input className="resource-range" type="range" min="1" max={cluster.maxCores} value={form.cores} style={rangeStyle(form.cores, 1, cluster.maxCores)} onChange={e => setField('cores', Number(e.target.value))} /></label>
            <label className="form-group"><span>{t.ram} · {form.memoryMb} MB</span><input className="resource-range" type="range" min="256" max={cluster.maxMemoryMb} step="1" value={form.memoryMb} style={rangeStyle(form.memoryMb, 256, cluster.maxMemoryMb)} onChange={e => setField('memoryMb', snapWeighted(e.target.value, { min: 256, max: cluster.maxMemoryMb, minorStep: 256, majorStep: 1024 }))} /></label>
            <label className="form-group"><span>{t.disk} · {form.diskGb} GB</span><input className="resource-range" type="range" min={diskMin} max={diskMax} step="1" value={form.diskGb} style={rangeStyle(form.diskGb, diskMin, diskMax)} onChange={e => setField('diskGb', snapWeighted(e.target.value, { min: diskMin, max: diskMax, minorStep: 2, majorStep: 8 }))} /></label>
          </div>
          <label className="form-group"><span>{t.password}</span><input type="password" value={form.rootPassword} onChange={e => setField('rootPassword', e.target.value)} placeholder={cluster.hasDefaultPassword ? t.defaultPassword : t.passwordHint} autoComplete="new-password" /></label>
        </>}
      </div></div>}
      <div className="form-actions"><button type="button" className="btn-secondary" onClick={onClose}>{t.cancel}</button><button type="submit" className="btn-primary" disabled={busy || !cluster || cluster.available === false || !cluster.templates?.length}>{busy ? t.queued : t.create}</button></div>
    </form>
  </Modal>;
}
