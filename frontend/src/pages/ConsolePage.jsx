import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import TerminalView from '../components/TerminalView';
import { userApi, getErrorMessage } from '../services/api';
import '../styles/globals.css';
import { readStoredLanguage } from '../components/LanguageSwitch';
import { translatePortalText } from '../i18n';

export default function ConsolePage() {
  const { resourceId } = useParams();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.classList.add('console-route-active');
    document.body.classList.add('console-route-active');
    return () => {
      document.documentElement.classList.remove('console-route-active');
      document.body.classList.remove('console-route-active');
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadResource() {
      try {
        setLoading(true);
        setError('');
        const res = await userApi.getResourceDetails(resourceId);
        if (!cancelled) setResource(res.data.resource || null);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Dienst konnte nicht geladen werden.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadResource();
    return () => { cancelled = true; };
  }, [resourceId]);

  const closeTab = () => {
    window.close();
  };

  const caps = resource?.capabilities || {};
  const canUseConsole = !!caps.canConsole;
  const isRunning = resource?.status === 'running';
  const language = readStoredLanguage();
  const text = (value) => translatePortalText(value, language);
  const isSshConsole = resource?.consoleMode === 'ssh';
  const consoleTitle = isSshConsole ? text('SSH-Konsole') : text('Proxmox-Konsole');
  const consoleTarget = isSshConsole
    ? `${resource?.manualIp || resource?.primaryIp || text('Unbekannte IP')}:${resource?.sshPort || 22}`
    : (resource?.node || text('Unbekannter Node'));

  return (
    <div className="app-page console-page">
      <header className="console-page-header">
        <div>
          <p className="eyebrow">{consoleTitle}</p>
          <h1>{resource?.name || text('Konsole')}</h1>
        </div>
        <div className="console-page-actions">
          <Link className="btn-secondary" to="/dashboard">{text('Zurück')}</Link>
          <button type="button" className="btn-primary" onClick={closeTab}>{text('Tab schließen')}</button>
        </div>
      </header>

      <main className="console-page-main">
        {loading && <div className="loading"><span className="spinner"></span><span>{text('Konsole wird vorbereitet...')}</span></div>}
        {error && <div className="alert alert-danger">{error}</div>}

        {!loading && !error && resource && !canUseConsole && (
          <section className="panel-card console-page-message">
            <h2>{text('Keine Konsolenberechtigung')}</h2>
            <p>{text('Der API-Token dieses Clusters erlaubt keinen Konsolen-Zugriff.')}</p>
          </section>
        )}

        {!loading && !error && resource && canUseConsole && !isRunning && (
          <section className="panel-card console-page-message">
            <h2>{text('Maschine ist gestoppt')}</h2>
            <p>{text('Starte die Maschine zuerst, danach kann die Konsole geöffnet werden.')}</p>
          </section>
        )}

        {!loading && !error && resource && canUseConsole && isRunning && (
          <section className="console-page-card">
            <div className="console-page-meta">
              <span>{resource.clusterName || text('Unbekannter Cluster')}</span>
              <span>{isSshConsole ? `${text('SSH-Ziel')} ${consoleTarget}` : consoleTarget}</span>
              <span>ID {resource.containerId || resource.id}</span>
            </div>
            <TerminalView resourceId={resource.id} resourceName={resource.name} fullscreen />
          </section>
        )}
      </main>
    </div>
  );
}
