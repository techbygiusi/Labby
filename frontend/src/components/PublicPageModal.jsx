import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { userApi, getErrorMessage } from '../services/api';
import { readStoredLanguage } from './LanguageSwitch';
import { copyTextToClipboard } from '../utils/clipboard';

const TEXT = {
  en: {
    title: 'Edit public access', loading: 'Loading access settings...',
    unavailable: 'Public publishing is not available. Ask an administrator to configure Pangolin.',
    noIp: 'This service has no reachable IPv4 address yet.', protocol: 'Protocol', subdomain: 'Subdomain',
    targetPort: 'Service port', internalPort: 'Internal port', publicPort: 'Public port', backendProtocol: 'Backend protocol',
    internalPortHint: 'Port used by the service inside its network.',
    publicPortHint: 'External port selected from the administrator-defined pool.',
    backendProtocolHint: 'Protocol Pangolin uses to connect to the service.',
    autoIp: 'Target IP is selected automatically from your own service:',
    ranges: 'Allowed ports', add: 'Add access', update: 'Save changes', saving: 'Saving...', close: 'Close',
    cancelEdit: 'Cancel editing', edit: 'Edit', remove: 'Remove', removing: 'Removing...', open: 'Open',
    removeConfirm: (address) => `Remove public access ${address || ''}?`,
    saveFailed: 'Public access could not be saved.', removeFailed: 'Public access could not be removed.',
    subdomainHint: 'Lowercase letters, numbers and hyphens only.', subdomainRequired: 'Enter a subdomain.',
    security: 'You cannot enter another IP address. The portal always publishes this service only.',
    disabled: 'Disabled by administrator', existingTitle: 'Published access', noPublications: 'No public access has been configured yet.',
    addTitle: 'Add public access', editTitle: 'Edit public access', target: 'Target', internalTarget: 'Internal target',
    copyHint: 'Click to copy the address without the protocol', copied: 'Copied ✓',
    copyFailed: 'The address could not be copied.',
    saved: 'Public access was saved.', removed: 'Public access was removed.',
    multipleHint: 'You can add several HTTP, TCP and UDP publications for this service and use them in parallel.',
    protocolLocked: 'The protocol stays fixed while editing. Create another publication to use a different protocol.',
    manualTitle: 'Public website link',
    manualDescription: 'Pangolin publishing is not available for this service. Save the existing public website URL instead.',
    manualUrl: 'Public page URL',
    manualUrlHint: 'Enter the complete address starting with http:// or https://.',
    manualSave: 'Save website',
    manualSaved: 'The public website link was saved.',
    manualRemoved: 'The public website link was removed.',
    manualRemove: 'Remove website',
    manualRemoveConfirm: 'Remove the public website link from this service?',
    manualRequired: 'Enter a public page URL.',
    manualInvalid: 'The public page must be a valid URL starting with http:// or https://.',
    manualSaveFailed: 'The public website link could not be saved.',
    manualRemoveFailed: 'The public website link could not be removed.',
    previousPangolinTitle: 'Existing Pangolin access',
    previousPangolinHint: 'These existing publications remain online while Pangolin is disabled and can still be removed.',
    managementTitle: 'Management page',
    managementDescription: 'Save the management-page address and optional login credentials for this service.',
    managementUrl: 'Management page URL',
    managementUrlHint: 'Enter the complete address starting with http:// or https://.',
    managementUsername: 'Username',
    managementPassword: 'Password / secret',
    managementPasswordHint: 'Leave blank to keep the currently saved password.',
    managementNotes: 'Notes',
    optional: 'Optional',
    managementSave: 'Save management page',
    managementSaved: 'The management page was saved.',
    managementRemoved: 'The management page was removed.',
    managementRemove: 'Remove management page',
    managementRemoveConfirm: 'Remove the management page and its saved login credentials from this service?',
    managementRequired: 'Enter a management page URL.',
    managementInvalid: 'The management page must be a valid URL starting with http:// or https://.',
    managementSaveFailed: 'The management page could not be saved.',
    managementRemoveFailed: 'The management page could not be removed.',
    credentialsSaved: 'Login credentials saved'
  },
  de: {
    title: 'Öffentlichen Zugriff bearbeiten', loading: 'Zugriffseinstellungen werden geladen...',
    unavailable: 'Die Veröffentlichung ist nicht verfügbar. Ein Administrator muss Pangolin konfigurieren.',
    noIp: 'Für diesen Dienst ist noch keine erreichbare IPv4-Adresse bekannt.', protocol: 'Protokoll', subdomain: 'Subdomain',
    targetPort: 'Dienst-Port', internalPort: 'Interner Port', publicPort: 'Öffentlicher Port', backendProtocol: 'Backend-Protokoll',
    internalPortHint: 'Port, den der Dienst innerhalb seines Netzwerks verwendet.',
    publicPortHint: 'Externer Port aus dem vom Administrator festgelegten Bereich.',
    backendProtocolHint: 'Protokoll, mit dem Pangolin den Dienst erreicht.',
    autoIp: 'Die Ziel-IP wird automatisch von deinem eigenen Dienst übernommen:',
    ranges: 'Erlaubte Ports', add: 'Zugriff hinzufügen', update: 'Änderungen speichern', saving: 'Speichert...', close: 'Schließen',
    cancelEdit: 'Bearbeitung abbrechen', edit: 'Bearbeiten', remove: 'Entfernen', removing: 'Entfernt...', open: 'Öffnen',
    removeConfirm: (address) => `Öffentlichen Zugriff ${address || ''} entfernen?`,
    saveFailed: 'Der öffentliche Zugriff konnte nicht gespeichert werden.', removeFailed: 'Der öffentliche Zugriff konnte nicht entfernt werden.',
    subdomainHint: 'Nur Kleinbuchstaben, Zahlen und Bindestriche.', subdomainRequired: 'Bitte gib eine Subdomain ein.',
    security: 'Du kannst keine andere IP-Adresse eintragen. Das Portal veröffentlicht immer nur diesen Dienst.',
    disabled: 'Vom Administrator deaktiviert', existingTitle: 'Veröffentlichte Zugriffe', noPublications: 'Es wurde noch kein öffentlicher Zugriff eingerichtet.',
    addTitle: 'Öffentlichen Zugriff hinzufügen', editTitle: 'Öffentlichen Zugriff bearbeiten', target: 'Ziel', internalTarget: 'Internes Ziel',
    copyHint: 'Klicken, um die Adresse ohne Protokoll zu kopieren', copied: 'Kopiert ✓',
    copyFailed: 'Die Adresse konnte nicht kopiert werden.',
    saved: 'Der öffentliche Zugriff wurde gespeichert.', removed: 'Der öffentliche Zugriff wurde entfernt.',
    multipleHint: 'Du kannst für diesen Dienst mehrere HTTP-, TCP- und UDP-Freigaben anlegen und parallel verwenden.',
    protocolLocked: 'Das Protokoll bleibt beim Bearbeiten unverändert. Lege für ein anderes Protokoll eine weitere Freigabe an.',
    manualTitle: 'Link zur öffentlichen Webseite',
    manualDescription: 'Die Pangolin-Veröffentlichung ist für diesen Dienst nicht verfügbar. Hinterlege stattdessen die bereits vorhandene öffentliche URL.',
    manualUrl: 'URL der öffentlichen Seite',
    manualUrlHint: 'Gib die vollständige Adresse mit http:// oder https:// ein.',
    manualSave: 'Webseite speichern',
    manualSaved: 'Der Link zur öffentlichen Webseite wurde gespeichert.',
    manualRemoved: 'Der Link zur öffentlichen Webseite wurde entfernt.',
    manualRemove: 'Webseite entfernen',
    manualRemoveConfirm: 'Den Link zur öffentlichen Webseite von diesem Dienst entfernen?',
    manualRequired: 'Bitte gib eine URL für die öffentliche Seite ein.',
    manualInvalid: 'Die öffentliche Seite muss eine gültige URL mit http:// oder https:// sein.',
    manualSaveFailed: 'Der Link zur öffentlichen Webseite konnte nicht gespeichert werden.',
    manualRemoveFailed: 'Der Link zur öffentlichen Webseite konnte nicht entfernt werden.',
    previousPangolinTitle: 'Bestehende Pangolin-Zugriffe',
    previousPangolinHint: 'Diese bestehenden Freigaben bleiben trotz deaktiviertem Pangolin online und können weiterhin entfernt werden.',
    managementTitle: 'Verwaltungsseite',
    managementDescription: 'Hinterlege die Adresse der Verwaltungsseite und optional die zugehörigen Anmeldedaten für diesen Dienst.',
    managementUrl: 'URL der Verwaltungsseite',
    managementUrlHint: 'Gib die vollständige Adresse mit http:// oder https:// ein.',
    managementUsername: 'Benutzername',
    managementPassword: 'Passwort / Secret',
    managementPasswordHint: 'Leer lassen, um das aktuell gespeicherte Passwort beizubehalten.',
    managementNotes: 'Notizen',
    optional: 'Optional',
    managementSave: 'Verwaltungsseite speichern',
    managementSaved: 'Die Verwaltungsseite wurde gespeichert.',
    managementRemoved: 'Die Verwaltungsseite wurde entfernt.',
    managementRemove: 'Verwaltungsseite entfernen',
    managementRemoveConfirm: 'Die Verwaltungsseite und ihre gespeicherten Anmeldedaten von diesem Dienst entfernen?',
    managementRequired: 'Bitte gib eine URL für die Verwaltungsseite ein.',
    managementInvalid: 'Die Verwaltungsseite muss eine gültige URL mit http:// oder https:// sein.',
    managementSaveFailed: 'Die Verwaltungsseite konnte nicht gespeichert werden.',
    managementRemoveFailed: 'Die Verwaltungsseite konnte nicht entfernt werden.',
    credentialsSaved: 'Anmeldedaten gespeichert'
  }
};

export default function PublicPageModal({ resource, onClose, onSaved, language: languageProp }) {
  const language = languageProp === 'de' || languageProp === 'en'
    ? languageProp
    : (readStoredLanguage() === 'de' ? 'de' : 'en');
  const text = TEXT[language];
  const initialPublications = Array.isArray(resource?.publications)
    ? resource.publications
    : (resource?.publication ? [resource.publication] : []);

  const [options, setOptions] = useState(null);
  const [primaryIp, setPrimaryIp] = useState(resource?.primaryIp || '');
  const initialManualUrl = resource?.manualPublicUrl || (resource?.publicAccessMode === 'manual' ? resource?.publicUrl || '' : '');
  const [publications, setPublications] = useState(initialPublications);
  const [manualUrl, setManualUrl] = useState(initialManualUrl);
  const [savedManualUrl, setSavedManualUrl] = useState(initialManualUrl);
  const [managementPage, setManagementPage] = useState(null);
  const [managementForm, setManagementForm] = useState({ url: resource?.adminUrl || '', username: '', secret: '', notes: '' });
  const [editingId, setEditingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [protocol, setProtocol] = useState('http');
  const [subdomain, setSubdomain] = useState(slugify(resource?.name || 'service'));
  const [targetPort, setTargetPort] = useState('80');
  const [publicPort, setPublicPort] = useState('');
  const [targetMethod, setTargetMethod] = useState('http');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      userApi.getPublishingOptions(resource?.id),
      userApi.getPublications(resource?.id),
      userApi.getManagementPage(resource?.id)
    ])
      .then(([optionsResponse, publicationsResponse, managementResponse]) => {
        if (!active) return;
        const publishing = optionsResponse.data.publishing || {};
        const currentPublications = publicationsResponse.data.publications || [];
        setOptions(publishing);
        setPrimaryIp(publicationsResponse.data.primaryIp || resource?.primaryIp || '');
        setPublications(currentPublications);
        setManualUrl(publicationsResponse.data.manualPublicUrl || '');
        setSavedManualUrl(publicationsResponse.data.manualPublicUrl || '');
        const currentManagementPage = managementResponse.data.managementPage || null;
        setManagementPage(currentManagementPage);
        setManagementForm({
          url: currentManagementPage?.url || resource?.adminUrl || '',
          username: currentManagementPage?.username || '',
          secret: '',
          notes: currentManagementPage?.notes || ''
        });
        const firstProtocol = getFirstEnabledProtocol(publishing);
        setProtocol(firstProtocol);
        setSubdomain(getSuggestedSubdomain(resource?.name, firstProtocol, currentPublications));
        setTargetMethod(publishing.defaultTargetMethod || 'http');
        setDefaultPorts(firstProtocol, publishing, setTargetPort, setPublicPort);
      })
      .catch((err) => active && setError(getErrorMessage(err, text.unavailable)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [resource?.id, resource?.name, resource?.primaryIp, resource?.adminUrl, text.unavailable]);

  const manualMode = options?.manualLinkEnabled === true;
  const protocolOptions = useMemo(() => ['http', 'tcp', 'udp'].map((key) => ({
    key,
    enabled: !!options?.protocols?.[key]?.enabled,
    ports: options?.protocols?.[key]?.allowedPorts || ''
  })), [options]);

  const rawPortBounds = useMemo(
    () => getPortPolicyBounds(options?.protocols?.[protocol]?.allowedPorts),
    [options, protocol]
  );
  const commonHttpPorts = useMemo(
    () => getCommonHttpPorts(options?.protocols?.http?.allowedPorts),
    [options]
  );

  const resetForm = (currentPublications = publications, preferredProtocol = null) => {
    const nextProtocol = preferredProtocol && options?.protocols?.[preferredProtocol]?.enabled
      ? preferredProtocol
      : getFirstEnabledProtocol(options);
    setEditingId(null);
    setProtocol(nextProtocol);
    setSubdomain(getSuggestedSubdomain(resource?.name, nextProtocol, currentPublications));
    setTargetMethod(options?.defaultTargetMethod || 'http');
    setDefaultPorts(nextProtocol, options, setTargetPort, setPublicPort);
    setError('');
  };

  const beginEdit = (publication) => {
    if (manualMode) return;
    setEditingId(publication.id);
    setProtocol(publication.protocol || 'http');
    setSubdomain(publication.subdomain || slugify(resource?.name || 'service'));
    setTargetPort(String(publication.targetPort || 80));
    setPublicPort(String(publication.publicPort || publication.targetPort || ''));
    setTargetMethod(publication.targetMethod || options?.defaultTargetMethod || 'http');
    setError('');
    setNotice('');
  };

  const switchProtocol = (next) => {
    if (editingId) return;
    const entry = protocolOptions.find((item) => item.key === next);
    if (!entry?.enabled) return;
    setProtocol(next);
    setSubdomain(getSuggestedSubdomain(resource?.name, next, publications));
    setDefaultPorts(next, options, setTargetPort, setPublicPort);
    setError('');
    setNotice('');
  };

  const reloadPublications = async () => {
    const response = await userApi.getPublications(resource.id);
    const currentPublications = response.data.publications || [];
    setPublications(currentPublications);
    setManualUrl(response.data.manualPublicUrl || '');
    setSavedManualUrl(response.data.manualPublicUrl || '');
    return currentPublications;
  };

  const save = async (event) => {
    event.preventDefault();
    const normalizedSubdomain = subdomain.trim().toLowerCase();
    if (!normalizedSubdomain) {
      setError(text.subdomainRequired);
      return;
    }

    const payload = {
      protocol,
      subdomain: normalizedSubdomain,
      targetPort: Number(targetPort),
      publicPort: protocol === 'http' ? undefined : Number(publicPort),
      targetMethod: protocol === 'http' ? targetMethod : undefined
    };

    try {
      setBusy('save');
      setError('');
      setNotice('');
      if (editingId) {
        await userApi.updatePublication(resource.id, editingId, payload);
      } else {
        await userApi.createPublication(resource.id, payload);
      }
      const currentPublications = await reloadPublications();
      await onSaved?.();
      setNotice(text.saved);
      resetForm(currentPublications, protocol);
    } catch (err) {
      setError(getErrorMessage(err, text.saveFailed));
    } finally {
      setBusy('');
    }
  };

  const saveManualPage = async (event) => {
    event.preventDefault();
    const normalized = normalizeManualUrl(manualUrl);
    if (!normalized) {
      setError(manualUrl.trim() ? text.manualInvalid : text.manualRequired);
      return;
    }

    try {
      setBusy('manual-save');
      setError('');
      setNotice('');
      const response = await userApi.saveManualPublicPage(resource.id, normalized);
      setManualUrl(response.data.publicUrl || normalized);
      setSavedManualUrl(response.data.publicUrl || normalized);
      await onSaved?.();
      setNotice(text.manualSaved);
    } catch (err) {
      setError(getErrorMessage(err, text.manualSaveFailed));
    } finally {
      setBusy('');
    }
  };

  const removeManualPage = async () => {
    if (!window.confirm(text.manualRemoveConfirm)) return;
    try {
      setBusy('manual-remove');
      setError('');
      setNotice('');
      await userApi.removeManualPublicPage(resource.id);
      setManualUrl('');
      setSavedManualUrl('');
      await onSaved?.();
      setNotice(text.manualRemoved);
    } catch (err) {
      setError(getErrorMessage(err, text.manualRemoveFailed));
    } finally {
      setBusy('');
    }
  };

  const saveManagementPage = async (event) => {
    event.preventDefault();
    const normalized = normalizeManualUrl(managementForm.url);
    if (!normalized) {
      setError(managementForm.url.trim() ? text.managementInvalid : text.managementRequired);
      return;
    }

    try {
      setBusy('management-save');
      setError('');
      setNotice('');
      const response = await userApi.saveManagementPage(resource.id, {
        url: normalized,
        username: managementForm.username.trim(),
        secret: managementForm.secret,
        notes: managementForm.notes.trim()
      });
      const saved = response.data.managementPage || { url: normalized };
      setManagementPage(saved);
      setManagementForm({
        url: saved.url || normalized,
        username: saved.username || managementForm.username.trim(),
        secret: '',
        notes: saved.notes || managementForm.notes.trim()
      });
      await onSaved?.();
      setNotice(text.managementSaved);
    } catch (err) {
      setError(getErrorMessage(err, text.managementSaveFailed));
    } finally {
      setBusy('');
    }
  };

  const removeManagementPage = async () => {
    if (!window.confirm(text.managementRemoveConfirm)) return;
    try {
      setBusy('management-remove');
      setError('');
      setNotice('');
      await userApi.removeManagementPage(resource.id);
      setManagementPage(null);
      setManagementForm({ url: '', username: '', secret: '', notes: '' });
      await onSaved?.();
      setNotice(text.managementRemoved);
    } catch (err) {
      setError(getErrorMessage(err, text.managementRemoveFailed));
    } finally {
      setBusy('');
    }
  };

  const remove = async (publication) => {
    if (!window.confirm(text.removeConfirm(publication.publicUrl))) return;
    try {
      setBusy(`remove-${publication.id}`);
      setError('');
      setNotice('');
      await userApi.deletePublication(resource.id, publication.id);
      const currentPublications = publications.filter((item) => item.id !== publication.id);
      setPublications(currentPublications);
      await onSaved?.();
      if (editingId === publication.id) resetForm(currentPublications, protocol);
      setNotice(text.removed);
    } catch (err) {
      setError(getErrorMessage(err, text.removeFailed));
    } finally {
      setBusy('');
    }
  };

  const copyPublicUrl = async (publication) => {
    const value = stripUrlProtocol(publication.publicUrl);
    if (!value) return;
    const ok = await copyTextToClipboard(value);
    if (!ok) {
      setError(text.copyFailed);
      return;
    }
    setCopiedId(publication.id);
    setTimeout(() => setCopiedId((current) => (current === publication.id ? null : current)), 1800);
  };

  const renderPublicationList = ({ allowEdit = true } = {}) => (
    <div className="publishing-existing-list">
      {publications.map((publication) => (
        <article key={publication.id} className={`publishing-existing-card ${editingId === publication.id ? 'editing' : ''}`}>
          <div className="publishing-existing-card-main">
            <span className="publishing-protocol-badge">{String(publication.protocol || '').toUpperCase()}</span>
            <div>
              <button
                type="button"
                className="publishing-copy-url"
                onClick={() => copyPublicUrl(publication)}
                disabled={!publication.publicUrl}
                title={publication.publicUrl ? text.copyHint : undefined}
              >
                <strong>{publication.publicUrl ? stripUrlProtocol(publication.publicUrl) : '—'}</strong>
                {copiedId === publication.id && <span className="publishing-copy-flag">{text.copied}</span>}
              </button>
              <small>{publication.protocol === 'http' ? text.target : text.internalTarget}: {formatTarget(publication, primaryIp)}</small>
            </div>
          </div>
          <div className="publishing-existing-card-actions">
            {publication.protocol === 'http' && publication.publicUrl && (
              <a className="btn-secondary btn-small" href={publication.publicUrl} target="_blank" rel="noreferrer">{text.open}</a>
            )}
            {allowEdit && <button type="button" className="btn-secondary btn-small" onClick={() => beginEdit(publication)} disabled={!!busy}>{text.edit}</button>}
            <button type="button" className="btn-danger btn-small" onClick={() => remove(publication)} disabled={!!busy}>
              {busy === `remove-${publication.id}` ? text.removing : text.remove}
            </button>
          </div>
        </article>
      ))}
    </div>
  );

  return (
    <Modal
      title={text.title}
      onClose={onClose}
      className="public-page-modal-card publishing-modal-card publishing-manager-modal-card"
      disableBackdropClose={!!busy}
      closeLabel={text.close}
    >
      {loading ? <p className="loading">{text.loading}</p> : (
        <div className="publishing-manager-content">
          {error && <div className="alert alert-danger">{error}</div>}
          {notice && <div className="alert alert-success">{notice}</div>}

          {manualMode ? (
            <>
              <section className="publishing-existing-section manual-public-page-section">
                <div className="publishing-section-heading">
                  <div>
                    <h3>{text.manualTitle}</h3>
                    <p>{text.manualDescription}</p>
                  </div>
                </div>

                {savedManualUrl && (
                  <article className="publishing-existing-card manual-public-page-card">
                    <div className="publishing-existing-card-main">
                      <span className="publishing-protocol-badge">WEB</span>
                      <div><strong>{savedManualUrl}</strong></div>
                    </div>
                    <div className="publishing-existing-card-actions">
                      <a className="btn-secondary btn-small" href={savedManualUrl} target="_blank" rel="noreferrer">{text.open}</a>
                      <button type="button" className="btn-danger btn-small" onClick={removeManualPage} disabled={!!busy}>
                        {busy === 'manual-remove' ? text.removing : text.manualRemove}
                      </button>
                    </div>
                  </article>
                )}

                <form className="publishing-form manual-public-page-form" onSubmit={saveManualPage} noValidate>
                  <label className="form-group">
                    <span>{text.manualUrl}</span>
                    <input
                      type="url"
                      value={manualUrl}
                      onChange={(event) => setManualUrl(event.target.value)}
                      placeholder="https://service.example.com"
                      required
                      disabled={!!busy}
                    />
                    <small>{text.manualUrlHint}</small>
                  </label>
                  <div className="form-actions public-page-form-actions publishing-actions">
                    <button type="button" className="btn-secondary" onClick={onClose} disabled={!!busy}>{text.close}</button>
                    <button type="submit" className="btn-primary" disabled={!!busy}>
                      {busy === 'manual-save' ? text.saving : text.manualSave}
                    </button>
                  </div>
                </form>
              </section>

              {publications.length > 0 && (
                <section className="publishing-existing-section">
                  <div className="publishing-section-heading">
                    <div>
                      <h3>{text.previousPangolinTitle}</h3>
                      <p>{text.previousPangolinHint}</p>
                    </div>
                    <span className="publishing-count-badge">{publications.length}</span>
                  </div>
                  {renderPublicationList({ allowEdit: false })}
                </section>
              )}
            </>
          ) : (
            <>
              {!options?.enabled && <div className="alert alert-warning">{text.unavailable}</div>}
              {!primaryIp && <div className="alert alert-warning">{text.noIp}</div>}

              <div className="publishing-security-note">
                <strong>{text.autoIp}</strong>
                <code>{primaryIp || '—'}</code>
                <small>{text.security}</small>
              </div>

              <section className="publishing-existing-section">
                <div className="publishing-section-heading">
                  <div>
                    <h3>{text.existingTitle}</h3>
                    <p>{text.multipleHint}</p>
                  </div>
                  <span className="publishing-count-badge">{publications.length}</span>
                </div>

                {publications.length === 0
                  ? <p className="hint-text publishing-empty-state">{text.noPublications}</p>
                  : renderPublicationList()}
              </section>

              <form className="publishing-form publishing-manager-form" onSubmit={save} noValidate>
                <div className="publishing-section-heading publishing-form-heading">
                  <div>
                    <h3>{editingId ? text.editTitle : text.addTitle}</h3>
                    {editingId && <p>{text.protocolLocked}</p>}
                  </div>
                </div>

                <fieldset className="publishing-protocol-fieldset" disabled={!!busy || !options?.enabled}>
                  <legend>{text.protocol}</legend>
                  <div className="publishing-protocol-selector">
                    {protocolOptions.map((entry) => {
                      const locked = !!editingId && protocol !== entry.key;
                      return (
                        <button
                          key={entry.key}
                          type="button"
                          className={`${protocol === entry.key ? 'active' : ''} ${entry.enabled && !locked ? '' : 'disabled'}`}
                          onClick={() => switchProtocol(entry.key)}
                          disabled={!entry.enabled || locked}
                        >
                          <strong>{entry.key.toUpperCase()}</strong>
                          <small>{entry.enabled ? `${text.ranges}: ${entry.ports || '—'}` : text.disabled}</small>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="publishing-fields-grid publishing-subdomain-fields-grid">
                  <label className="form-group publishing-subdomain-field">
                    <span>{text.subdomain}</span>
                    <div className="subdomain-input-row">
                      <input
                        type="text"
                        value={subdomain}
                        onChange={(event) => setSubdomain(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        maxLength="63"
                        required
                        disabled={!!busy || !options?.enabled}
                      />
                      <span>.{options?.baseDomain || 'example.com'}</span>
                    </div>
                    <small>{text.subdomainHint}</small>
                  </label>
                </div>

                {protocol === 'http' ? (
                  <div className="publishing-fields-grid publishing-http-fields-grid">
                    <label className="form-group publishing-control-field">
                      <span>{text.targetPort}</span>
                      <input type="number" min="1" max="65535" list="publishing-common-http-ports" value={targetPort} onChange={(event) => setTargetPort(event.target.value)} disabled={!!busy || !options?.enabled} />
                      <datalist id="publishing-common-http-ports">
                        {commonHttpPorts.map((port) => <option key={port} value={port} />)}
                      </datalist>
                      <small>{text.ranges}: {options?.protocols?.http?.allowedPorts || '—'}</small>
                    </label>
                    <label className="form-group publishing-control-field">
                      <span>{text.backendProtocol}</span>
                      <select value={targetMethod} onChange={(event) => setTargetMethod(event.target.value)} disabled={!!busy || !options?.enabled}>
                        <option value="http">HTTP</option>
                        <option value="https">HTTPS</option>
                        <option value="h2c">h2c</option>
                      </select>
                      <small>{text.backendProtocolHint}</small>
                    </label>
                  </div>
                ) : (
                  <div className="publishing-fields-grid publishing-raw-fields-grid">
                    <label className="form-group publishing-control-field">
                      <span>{text.internalPort}</span>
                      <input
                        type="number"
                        min="1"
                        max="65535"
                        value={targetPort}
                        onChange={(event) => setTargetPort(event.target.value)}
                        disabled={!!busy || !options?.enabled}
                      />
                      <small>{text.internalPortHint}</small>
                    </label>
                    <label className="form-group publishing-control-field">
                      <span>{text.publicPort}</span>
                      <input
                        type="number"
                        min={rawPortBounds.min}
                        max={rawPortBounds.max}
                        value={publicPort}
                        onChange={(event) => setPublicPort(event.target.value)}
                        disabled={!!busy || !options?.enabled}
                      />
                      <small>{text.publicPortHint} {text.ranges}: {options?.protocols?.[protocol]?.allowedPorts || '—'}</small>
                    </label>
                  </div>
                )}

                <div className="form-actions public-page-form-actions publishing-actions">
                  {editingId && <button type="button" className="btn-secondary" onClick={() => resetForm(publications, protocol)} disabled={!!busy}>{text.cancelEdit}</button>}
                  <button type="button" className="btn-secondary" onClick={onClose} disabled={!!busy}>{text.close}</button>
                  <button type="submit" className="btn-primary" disabled={!!busy || !options?.enabled || !primaryIp}>
                    {busy === 'save' ? text.saving : editingId ? text.update : text.add}
                  </button>
                </div>
              </form>
            </>
          )}

          <section className="publishing-existing-section management-page-section">
            <div className="publishing-section-heading">
              <div>
                <h3>{text.managementTitle}</h3>
                <p>{text.managementDescription}</p>
              </div>
              {managementPage?.url && <span className="publishing-protocol-badge">ADMIN</span>}
            </div>

            {managementPage?.url && (
              <article className="publishing-existing-card management-page-card">
                <div className="publishing-existing-card-main">
                  <span className="publishing-protocol-badge">WEB</span>
                  <div>
                    <strong>{managementPage.url}</strong>
                    {managementPage.username && <small>{managementPage.username}</small>}
                    {managementPage.hasSecret && <small>{text.credentialsSaved}</small>}
                  </div>
                </div>
                <div className="publishing-existing-card-actions">
                  <a className="btn-secondary btn-small" href={managementPage.url} target="_blank" rel="noreferrer">{text.open}</a>
                  <button type="button" className="btn-danger btn-small" onClick={removeManagementPage} disabled={!!busy}>
                    {busy === 'management-remove' ? text.removing : text.managementRemove}
                  </button>
                </div>
              </article>
            )}

            <form className="publishing-form management-page-form" onSubmit={saveManagementPage} noValidate>
              <label className="form-group">
                <span>{text.managementUrl}</span>
                <input
                  type="url"
                  value={managementForm.url}
                  onChange={(event) => setManagementForm((current) => ({ ...current, url: event.target.value }))}
                  placeholder="https://admin.example.com"
                  required
                  disabled={!!busy}
                />
                <small>{text.managementUrlHint}</small>
              </label>

              <div className="management-page-fields-grid">
                <label className="form-group">
                  <span>{text.managementUsername}</span>
                  <input
                    type="text"
                    value={managementForm.username}
                    onChange={(event) => setManagementForm((current) => ({ ...current, username: event.target.value }))}
                    placeholder={text.optional}
                    autoComplete="off"
                    disabled={!!busy}
                  />
                </label>
                <label className="form-group">
                  <span>{text.managementPassword}</span>
                  <input
                    type="password"
                    value={managementForm.secret}
                    onChange={(event) => setManagementForm((current) => ({ ...current, secret: event.target.value }))}
                    placeholder={managementPage?.hasSecret ? text.managementPasswordHint : text.optional}
                    autoComplete="new-password"
                    disabled={!!busy}
                  />
                </label>
              </div>

              <label className="form-group">
                <span>{text.managementNotes}</span>
                <textarea
                  rows="2"
                  value={managementForm.notes}
                  onChange={(event) => setManagementForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder={text.optional}
                  disabled={!!busy}
                />
              </label>

              <div className="form-actions public-page-form-actions publishing-actions">
                <button type="button" className="btn-secondary" onClick={onClose} disabled={!!busy}>{text.close}</button>
                <button type="submit" className="btn-primary" disabled={!!busy}>
                  {busy === 'management-save' ? text.saving : text.managementSave}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </Modal>
  );
}

function normalizeManualUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) return '';
    return parsed.toString();
  } catch (_) {
    return '';
  }
}

function stripUrlProtocol(value) {
  // Remove a leading scheme (http://, https://, tcp://, udp://, ...) so the copied
  // value is the plain host:port users paste into clients such as a game launcher.
  return String(value || '').trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
}

function formatTarget(publication, ip) {
  const method = publication.protocol === 'http' ? `${publication.targetMethod || 'http'}://` : `${publication.protocol}://`;
  return `${method}${ip || '—'}:${publication.targetPort || '—'}`;
}

function slugify(value) {
  return String(value || 'service')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63) || 'service';
}

function getSuggestedSubdomain(resourceName, protocol, publications) {
  const base = slugify(resourceName || 'service');
  if (protocol !== 'http') return base;
  const used = new Set((publications || [])
    .filter((item) => item.protocol === 'http')
    .map((item) => String(item.subdomain || '').toLowerCase()));
  if (!used.has(base)) return base;
  for (let number = 2; number < 1000; number += 1) {
    const suffix = `-${number}`;
    const candidate = `${base.slice(0, 63 - suffix.length)}${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base.slice(0, 56)}-${Date.now().toString().slice(-6)}`;
}

function getFirstEnabledProtocol(options) {
  return ['http', 'tcp', 'udp'].find((key) => options?.protocols?.[key]?.enabled) || 'http';
}

function setDefaultPorts(protocol, options, setTargetPort, setPublicPort) {
  const firstAllowedPort = getFirstAllowedPort(options?.protocols?.[protocol]?.allowedPorts);
  if (protocol === 'http') {
    setTargetPort(String(firstAllowedPort || 80));
    setPublicPort('');
  } else {
    const value = String(firstAllowedPort || '');
    setTargetPort(value);
    setPublicPort(value);
  }
}

function parsePortPolicy(value) {
  return String(value || '')
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(\d{1,5})(?:-(\d{1,5}))?$/);
      if (!match) return null;
      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : start;
      if (start < 1 || end > 65535 || start > end) return null;
      return { start, end };
    })
    .filter(Boolean);
}

function getCommonHttpPorts(policy) {
  const ranges = parsePortPolicy(policy);
  return [80, 443].filter((port) => ranges.some((range) => port >= range.start && port <= range.end));
}

function getFirstAllowedPort(policy) {
  const ranges = parsePortPolicy(policy);
  return ranges.length ? Math.min(...ranges.map((range) => range.start)) : '';
}

function getPortPolicyBounds(policy) {
  const ranges = parsePortPolicy(policy);
  if (!ranges.length) return { min: 1, max: 65535 };
  return {
    min: Math.min(...ranges.map((range) => range.start)),
    max: Math.max(...ranges.map((range) => range.end))
  };
}
