import React, { useEffect, useMemo, useRef, useState } from 'react';
import { adminApi, getErrorMessage } from '../services/api';
import { readStoredLanguage } from './LanguageSwitch';

const RAW_PORT_MIN = 20000;
const RAW_PORT_MAX = 26000;
const RAW_PORT_POLICY = `${RAW_PORT_MIN}-${RAW_PORT_MAX}`;

const DEFAULTS = {
  enabled: false,
  apiUrl: 'https://pangolin-api.example.com/v1',
  apiKey: '',
  apiKeyConfigured: false,
  orgId: '',
  siteId: '',
  domainId: '',
  baseDomain: '',
  httpEnabled: true,
  tcpEnabled: true,
  udpEnabled: true,
  allowedHttpPorts: '80,443,3000-9999',
  allowedTcpPorts: RAW_PORT_POLICY,
  allowedUdpPorts: RAW_PORT_POLICY,
  defaultTargetMethod: 'http',
  reservedSubdomains: 'www,api,admin,pangolin,pangolin-api,portal'
};

const TEXT = {
  en: {
    eyebrow: 'PUBLIC ACCESS',
    title: 'Pangolin publishing',
    active: 'Enabled',
    inactive: 'Disabled',
    enableTitle: 'Enable publishing in the user portal',
    apiUrl: 'Integration API URL',
    apiKey: 'Organization API key',
    apiKeyStored: 'Stored — leave blank to keep it',
    apiKeyEnter: 'Paste API key',
    orgId: 'Organization ID',
    discovery: 'Sites and domains',
    discover: 'Load from Pangolin',
    discovering: 'Loading...',
    site: 'Pangolin site',
    siteSelect: 'Select site',
    domain: 'Pangolin domain',
    domainSelect: 'Select domain',
    baseDomain: 'Base domain for users',
    selected: 'Selected',
    backendProtocol: 'Default backend protocol',
    reserved: 'Reserved subdomains',
    reservedHint: 'Comma-separated. Users cannot create these names.',
    httpTitle: 'HTTP / HTTPS',
    httpDescription: 'Public web address with automatic TLS. The policy applies to the internal target port.',
    tcpTitle: 'TCP',
    tcpDescription: 'Raw TCP publishing with independent internal and public ports. The allowed range applies only to the public port.',
    udpTitle: 'UDP',
    udpDescription: 'Raw UDP publishing with independent internal and public ports. The allowed range applies only to the public port.',
    allowedPorts: 'Allowed ports / ranges',
    managed: 'managed publication(s)',
    test: 'Test connection',
    testing: 'Testing...',
    save: 'Save Pangolin',
    saving: 'Saving...',
    loadSettings: 'Loading Pangolin settings...',
    settingsLoadFailed: 'Pangolin settings could not be loaded.',
    dataLoaded: (sites, domains) => `${sites} site(s) and ${domains} domain(s) loaded.`,
    dataLoadFailed: 'Pangolin data could not be loaded.',
    connectionSuccess: 'Pangolin connection successful.',
    connectionFailed: 'Pangolin connection failed.',
    settingsSaved: 'Pangolin settings saved.',
    settingsSaveFailed: 'Pangolin settings could not be saved.',
    publicationsTitle: 'Managed publications',
    noPublications: 'No services published yet.',
    user: 'User',
    target: 'Internal target',
    public: 'Public',
    open: 'Open',
    remove: 'Remove publication',
    removing: 'Removing...',
    removeConfirm: (name) => `Remove the publication for ${name}?`,
    removed: 'Publication removed.',
    removeFailed: 'Publication could not be removed.',
    proxy502: 'The Pangolin connection test did not return a usable response. Check the backend log for the exact upstream error.'
  },
  de: {
    eyebrow: 'ÖFFENTLICHER ZUGRIFF',
    title: 'Pangolin-Veröffentlichung',
    active: 'Aktiv',
    inactive: 'Deaktiviert',
    enableTitle: 'Veröffentlichung im Benutzerportal aktivieren',
    apiUrl: 'Integration API URL',
    apiKey: 'Organization API Key',
    apiKeyStored: 'Gespeichert – leer lassen zum Beibehalten',
    apiKeyEnter: 'API-Schlüssel einfügen',
    orgId: 'Organization ID',
    discovery: 'Standorte und Domains',
    discover: 'Aus Pangolin laden',
    discovering: 'Wird geladen...',
    site: 'Pangolin-Standort',
    siteSelect: 'Standort wählen',
    domain: 'Pangolin-Domain',
    domainSelect: 'Domain wählen',
    baseDomain: 'Basisdomain für Benutzer',
    selected: 'Ausgewählt',
    backendProtocol: 'Standard-Backendprotokoll',
    reserved: 'Reservierte Subdomains',
    reservedHint: 'Kommagetrennt. Diese Namen können Benutzer nicht anlegen.',
    httpTitle: 'HTTP / HTTPS',
    httpDescription: 'Öffentliche Webadresse mit automatischem TLS-Zertifikat. Der Bereich gilt für den internen Zielport.',
    tcpTitle: 'TCP',
    tcpDescription: 'Rohe TCP-Freigaben mit getrennten internen und öffentlichen Ports. Der erlaubte Bereich gilt nur für den öffentlichen Port.',
    udpTitle: 'UDP',
    udpDescription: 'Rohe UDP-Freigaben mit getrennten internen und öffentlichen Ports. Der erlaubte Bereich gilt nur für den öffentlichen Port.',
    allowedPorts: 'Erlaubte Ports / Bereiche',
    managed: 'verwaltete Veröffentlichung(en)',
    test: 'Verbindung testen',
    testing: 'Test läuft...',
    save: 'Pangolin speichern',
    saving: 'Speichert...',
    loadSettings: 'Pangolin-Einstellungen werden geladen...',
    settingsLoadFailed: 'Pangolin-Einstellungen konnten nicht geladen werden.',
    dataLoaded: (sites, domains) => `${sites} Standort(e) und ${domains} Domain(s) geladen.`,
    dataLoadFailed: 'Pangolin-Daten konnten nicht geladen werden.',
    connectionSuccess: 'Pangolin-Verbindung erfolgreich.',
    connectionFailed: 'Pangolin-Verbindung fehlgeschlagen.',
    settingsSaved: 'Pangolin-Einstellungen wurden gespeichert.',
    settingsSaveFailed: 'Pangolin-Einstellungen konnten nicht gespeichert werden.',
    publicationsTitle: 'Verwaltete Veröffentlichungen',
    noPublications: 'Noch keine Dienste veröffentlicht.',
    user: 'Benutzer',
    target: 'Internes Ziel',
    public: 'Öffentlich',
    open: 'Öffnen',
    remove: 'Freigabe entfernen',
    removing: 'Entfernt...',
    removeConfirm: (name) => `Veröffentlichung für ${name} wirklich entfernen?`,
    removed: 'Veröffentlichung wurde entfernt.',
    removeFailed: 'Veröffentlichung konnte nicht entfernt werden.',
    proxy502: 'Der Pangolin-Verbindungstest hat keine verwertbare Antwort geliefert. Prüfe das Backend-Log für den genauen Upstream-Fehler.'
  }
};

function errorText(err, fallback, text) {
  if (err?.response?.status === 502 && !err?.response?.data?.message) return text.proxy502;
  return getErrorMessage(err, fallback);
}

export default function PangolinSettingsPanel({ onSuccess, onError, language: languageProp }) {
  const language = languageProp === 'de' || languageProp === 'en'
    ? languageProp
    : (readStoredLanguage() === 'de' ? 'de' : 'en');
  const text = TEXT[language];
  const [form, setForm] = useState(DEFAULTS);
  const [sites, setSites] = useState([]);
  const [domains, setDomains] = useState([]);
  const [publicationCount, setPublicationCount] = useState(0);
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null);
  const onErrorRef = useRef(onError);

  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const selectedDomain = useMemo(
    () => domains.find((item) => String(item.id) === String(form.domainId)),
    [domains, form.domainId]
  );

  useEffect(() => {
    let active = true;
    Promise.all([adminApi.getPangolinSettings(), adminApi.getPangolinPublications()])
      .then(([settingsResponse, publicationsResponse]) => {
        if (!active) return;
        const loaded = settingsResponse.data.settings || {};
        const loadedPublications = publicationsResponse.data.publications || [];
        setForm({ ...DEFAULTS, ...loaded, apiKey: '' });
        setPublicationCount(Number(settingsResponse.data.publicationCount || loadedPublications.length || 0));
        setPublications(loadedPublications);
      })
      .catch((err) => onErrorRef.current?.(errorText(err, text.settingsLoadFailed, text)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [text]);

  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const connectionPayload = () => ({
    apiUrl: form.apiUrl,
    apiKey: form.apiKey || (form.apiKeyConfigured ? '***hidden***' : ''),
    orgId: form.orgId,
    siteId: form.siteId,
    domainId: form.domainId,
    baseDomain: form.baseDomain,
    enabled: form.enabled,
    httpEnabled: form.httpEnabled,
    tcpEnabled: form.tcpEnabled,
    udpEnabled: form.udpEnabled,
    allowedHttpPorts: form.allowedHttpPorts,
    allowedTcpPorts: form.allowedTcpPorts,
    allowedUdpPorts: form.allowedUdpPorts,
    defaultTargetMethod: form.defaultTargetMethod,
    reservedSubdomains: form.reservedSubdomains
  });

  const applyDiscovery = (nextSites, nextDomains) => {
    setSites(nextSites);
    setDomains(nextDomains);
    setForm((current) => {
      const next = { ...current };
      if (!nextSites.some((item) => String(item.id) === String(next.siteId))) {
        next.siteId = nextSites.length === 1 ? String(nextSites[0].id) : '';
      }
      if (!nextDomains.some((item) => String(item.id) === String(next.domainId))) {
        next.domainId = nextDomains.length === 1 ? String(nextDomains[0].id) : '';
      }
      const chosenDomain = nextDomains.find((item) => String(item.id) === String(next.domainId));
      if (chosenDomain?.name) next.baseDomain = chosenDomain.name;
      return next;
    });
  };

  const discover = async () => {
    try {
      setBusy('discover');
      setResult(null);
      const response = await adminApi.discoverPangolin(connectionPayload());
      const nextSites = response.data.sites || [];
      const nextDomains = response.data.domains || [];
      applyDiscovery(nextSites, nextDomains);
      setResult({ success: true, message: text.dataLoaded(nextSites.length, nextDomains.length) });
    } catch (err) {
      setResult({ success: false, message: errorText(err, text.dataLoadFailed, text) });
    } finally {
      setBusy('');
    }
  };

  const test = async () => {
    try {
      setBusy('test');
      setResult(null);
      await adminApi.testPangolin(connectionPayload());
      setResult({ success: true, message: text.connectionSuccess });
    } catch (err) {
      setResult({ success: false, message: errorText(err, text.connectionFailed, text) });
    } finally {
      setBusy('');
    }
  };

  const save = async (event) => {
    event.preventDefault();
    try {
      setBusy('save');
      setResult(null);
      const response = await adminApi.updatePangolinSettings(connectionPayload());
      const saved = response.data.settings || {};
      setForm((current) => ({
        ...current,
        ...saved,
        apiKey: '',
        apiKeyConfigured: saved.apiKeyConfigured ?? current.apiKeyConfigured
      }));
      setResult({ success: true, message: text.settingsSaved });
      onSuccess?.(text.settingsSaved);
    } catch (err) {
      const message = errorText(err, text.settingsSaveFailed, text);
      setResult({ success: false, message });
      onError?.(message);
    } finally {
      setBusy('');
    }
  };

  const removePublication = async (publication) => {
    if (!window.confirm(text.removeConfirm(publication.resourceName))) return;
    try {
      setBusy(`remove-${publication.id}`);
      setResult(null);
      await adminApi.deletePangolinPublication(publication.id);
      setPublications((items) => items.filter((item) => item.id !== publication.id));
      setPublicationCount((count) => Math.max(0, count - 1));
      setResult({ success: true, message: text.removed });
    } catch (err) {
      setResult({ success: false, message: errorText(err, text.removeFailed, text) });
    } finally {
      setBusy('');
    }
  };

  const chooseDomain = (domainId) => {
    const domain = domains.find((item) => String(item.id) === String(domainId));
    setForm((current) => ({
      ...current,
      domainId,
      baseDomain: domain?.name || current.baseDomain
    }));
  };

  if (loading) {
    return <section className="panel-card pangolin-settings-panel"><p className="loading">{text.loadSettings}</p></section>;
  }

  return (
    <section className="panel-card pangolin-settings-panel">
      <div className="panel-header pangolin-panel-header">
        <div>
          <p className="section-eyebrow">{text.eyebrow}</p>
          <h2>{text.title}</h2>
        </div>
        <span className={`status-badge ${form.enabled ? 'status-running' : 'status-stopped'}`}>{form.enabled ? text.active : text.inactive}</span>
      </div>

      <form className="pangolin-settings-form" onSubmit={save}>
        <label className="settings-toggle-card full-width">
          <span><strong>{text.enableTitle}</strong></span>
          <span className={`toggle-switch ${form.enabled ? 'is-on' : ''}`}>
            <input type="checkbox" checked={!!form.enabled} onChange={(event) => update('enabled', event.target.checked)} aria-label={text.enableTitle} />
            <span className="toggle-knob" aria-hidden="true" />
          </span>
        </label>

        <div className="pangolin-settings-grid">
          <label className="form-group">
            <span>{text.apiUrl}</span>
            <input type="url" value={form.apiUrl} onChange={(event) => update('apiUrl', event.target.value)} placeholder="https://pangolin-api.example.com/v1" />
          </label>
          <label className="form-group">
            <span>{text.apiKey}</span>
            <input
              type="password"
              value={form.apiKey}
              onChange={(event) => update('apiKey', event.target.value)}
              placeholder={form.apiKeyConfigured ? text.apiKeyStored : text.apiKeyEnter}
              autoComplete="new-password"
            />
          </label>
          <label className="form-group">
            <span>{text.orgId}</span>
            <input type="text" value={form.orgId} onChange={(event) => update('orgId', event.target.value)} placeholder="org-id" />
          </label>
          <div className="form-group pangolin-discovery-action">
            <span>{text.discovery}</span>
            <button type="button" className="btn-secondary" onClick={discover} disabled={!!busy}>
              {busy === 'discover' ? text.discovering : text.discover}
            </button>
          </div>
          <label className="form-group">
            <span>{text.site}</span>
            {sites.length ? (
              <select value={form.siteId} onChange={(event) => update('siteId', event.target.value)}>
                <option value="">{text.siteSelect}</option>
                {sites.map((site) => <option key={site.id} value={site.id}>{site.name}{site.type ? ` (${site.type})` : ''} · ID ${site.id}</option>)}
              </select>
            ) : (
              <input type="number" min="1" value={form.siteId} onChange={(event) => update('siteId', event.target.value)} placeholder="Site ID" />
            )}
          </label>
          <label className="form-group">
            <span>{text.domain}</span>
            {domains.length ? (
              <select value={form.domainId} onChange={(event) => chooseDomain(event.target.value)}>
                <option value="">{text.domainSelect}</option>
                {domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
              </select>
            ) : (
              <input type="text" value={form.domainId} onChange={(event) => update('domainId', event.target.value)} placeholder="Domain ID" />
            )}
          </label>
          <label className="form-group">
            <span>{text.baseDomain}</span>
            <input type="text" value={form.baseDomain} onChange={(event) => update('baseDomain', event.target.value)} placeholder="apps.example.com" />
            {selectedDomain?.name && <small>{text.selected}: {selectedDomain.name}</small>}
          </label>
          <label className="form-group">
            <span>{text.backendProtocol}</span>
            <select value={form.defaultTargetMethod} onChange={(event) => update('defaultTargetMethod', event.target.value)}>
              <option value="http">HTTP</option>
              <option value="https">HTTPS</option>
              <option value="h2c">h2c</option>
            </select>
          </label>
          <label className="form-group full-width">
            <span>{text.reserved}</span>
            <input type="text" value={form.reservedSubdomains} onChange={(event) => update('reservedSubdomains', event.target.value)} placeholder="www,api,admin,portal" />
            <small>{text.reservedHint}</small>
          </label>
        </div>

        <div className="pangolin-protocol-grid">
          <ProtocolPolicy
            title={text.httpTitle}
            description={text.httpDescription}
            enabled={form.httpEnabled}
            onEnabled={(value) => update('httpEnabled', value)}
            ports={form.allowedHttpPorts}
            onPorts={(value) => update('allowedHttpPorts', value)}
            placeholder="80,443,3000-9999"
            text={text}
          />
          <ProtocolPolicy
            title={text.tcpTitle}
            description={text.tcpDescription}
            enabled={form.tcpEnabled}
            onEnabled={(value) => update('tcpEnabled', value)}
            ports={form.allowedTcpPorts}
            onPorts={(value) => update('allowedTcpPorts', value)}
            placeholder={RAW_PORT_POLICY}
            text={text}
          />
          <ProtocolPolicy
            title={text.udpTitle}
            description={text.udpDescription}
            enabled={form.udpEnabled}
            onEnabled={(value) => update('udpEnabled', value)}
            ports={form.allowedUdpPorts}
            onPorts={(value) => update('allowedUdpPorts', value)}
            placeholder={RAW_PORT_POLICY}
            text={text}
          />
        </div>

        <div className="pangolin-settings-footer">
          <div className="pangolin-settings-meta">
            <strong>{publicationCount}</strong>
            <span>{text.managed}</span>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={test} disabled={!!busy}>{busy === 'test' ? text.testing : text.test}</button>
            <button type="submit" className="btn-primary" disabled={!!busy}>{busy === 'save' ? text.saving : text.save}</button>
          </div>
        </div>
      </form>

      <div className="pangolin-publication-admin-list">
        <div className="settings-section-header">
          <h3>{text.publicationsTitle}</h3>
        </div>
        {publications.length === 0 ? (
          <p className="hint-text">{text.noPublications}</p>
        ) : (
          <div className="pangolin-publication-grid">
            {publications.map((publication) => (
              <article key={publication.id} className="pangolin-publication-card">
                <div className="pangolin-publication-title">
                  <div>
                    <span>{publication.protocol?.toUpperCase()} · {publication.clusterName} · {publication.containerId}</span>
                    <strong>{publication.resourceName}</strong>
                  </div>
                  <span className={`status-badge ${publication.status === 'active' ? 'status-running' : 'status-stopped'}`}>{publication.status}</span>
                </div>
                <dl>
                  <div><dt>{text.user}</dt><dd>{publication.userName} · {publication.userEmail}</dd></div>
                  <div><dt>{text.target}</dt><dd>Port {publication.targetPort}{publication.targetMethod ? ` · ${publication.targetMethod}` : ''}</dd></div>
                  <div><dt>{text.public}</dt><dd>{publication.publicUrl || `Port ${publication.publicPort}`}</dd></div>
                </dl>
                {publication.lastError && <small className="power-error">{publication.lastError}</small>}
                <div className="form-actions">
                  {publication.publicUrl?.startsWith('http') && <a className="btn-secondary" href={publication.publicUrl} target="_blank" rel="noreferrer">{text.open}</a>}
                  <button type="button" className="btn-danger" onClick={() => removePublication(publication)} disabled={!!busy}>
                    {busy === `remove-${publication.id}` ? text.removing : text.remove}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {result && <div className={`test-result ${result.success ? 'success' : 'error'}`}>{result.message}</div>}
    </section>
  );
}

function ProtocolPolicy({ title, description, enabled, onEnabled, ports, onPorts, placeholder, text }) {
  return (
    <article className={`pangolin-protocol-card ${enabled ? 'enabled' : ''}`}>
      <label className="pangolin-protocol-toggle">
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <span className={`toggle-switch ${enabled ? 'is-on' : ''}`}>
          <input type="checkbox" checked={!!enabled} onChange={(event) => onEnabled(event.target.checked)} aria-label={title} />
          <span className="toggle-knob" aria-hidden="true" />
        </span>
      </label>
      <label className="form-group">
        <span>{text.allowedPorts}</span>
        <input type="text" value={ports} onChange={(event) => onPorts(event.target.value)} placeholder={placeholder} disabled={!enabled} />
      </label>
    </article>
  );
}
