import React, { useEffect, useState } from 'react';
import { userApi, getErrorMessage } from '../services/api';

const NOTIFICATION_TRANSLATIONS = {
  en: {
    title: 'Notifications',
    intro: 'Choose which events you want to be notified about by e-mail. Monitoring checks your services regularly in the background.',
    loadError: 'Settings could not be loaded.',
    saveError: 'Settings could not be saved.',
    saved: 'Settings saved.',
    loading: 'Loading...',
    saving: 'Saving...',
    save: 'Save',
    resourceDown: 'Service offline',
    resourceDownText: 'Send an e-mail when one of your services stops running.',
    resourceRecovered: 'Service online again',
    resourceRecoveredText: 'Send an e-mail when a failed service is running again.',
    maintenance: 'Maintenance announcements',
    maintenanceText: 'Send an e-mail when maintenance is planned or announced.'
  },
  de: {
    title: 'Benachrichtigungen',
    intro: 'Lege fest, worüber du per E-Mail informiert werden möchtest. Die Überwachung prüft deine Dienste regelmäßig im Hintergrund.',
    loadError: 'Einstellungen konnten nicht geladen werden.',
    saveError: 'Einstellungen konnten nicht gespeichert werden.',
    saved: 'Einstellungen gespeichert.',
    loading: 'Lädt...',
    saving: 'Speichert...',
    save: 'Speichern',
    resourceDown: 'Dienst offline',
    resourceDownText: 'Sende eine E-Mail, wenn einer deiner Dienste nicht mehr läuft.',
    resourceRecovered: 'Dienst wieder online',
    resourceRecoveredText: 'Sende eine E-Mail, sobald ein ausgefallener Dienst wieder läuft.',
    maintenance: 'Wartungsankündigungen',
    maintenanceText: 'Sende eine E-Mail, wenn eine Wartung geplant oder angekündigt wird.'
  }
};

function ToggleRow({ label, description, checked, onChange, disabled }) {
  return (
    <label className={`toggle-row ${disabled ? 'is-disabled' : ''}`}>
      <span className="toggle-text">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <span className={`toggle-switch ${checked ? 'is-on' : ''}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
        />
        <span className="toggle-knob" aria-hidden="true" />
      </span>
    </label>
  );
}

export default function NotificationSettingsPanel({ language = 'en' }) {
  const labels = NOTIFICATION_TRANSLATIONS[language] || NOTIFICATION_TRANSLATIONS.en;
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    userApi.getNotificationPreferences()
      .then(response => {
        if (!cancelled) setPrefs(response.data.preferences);
      })
      .catch(err => {
        if (!cancelled) setError(getErrorMessage(err, labels.loadError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [labels.loadError]);

  const setPref = (key, value) => {
    setSaved(false);
    setPrefs(previous => ({ ...previous, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await userApi.updateNotificationPreferences(prefs);
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err, labels.saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="notification-settings-inline">
      <p className="notification-settings-intro">{labels.intro}</p>

      {error && <div className="alert alert-danger">{error}</div>}
      {saved && <div className="alert alert-success">{labels.saved}</div>}

      {loading || !prefs ? (
        <div className="loading inline-loading"><span className="spinner" /><span>{labels.loading}</span></div>
      ) : (
        <div className="toggle-stack notification-toggle-stack">
          <ToggleRow
            label={labels.resourceDown}
            description={labels.resourceDownText}
            checked={prefs.notifyResourceDown}
            onChange={(value) => setPref('notifyResourceDown', value)}
            disabled={saving}
          />
          <ToggleRow
            label={labels.resourceRecovered}
            description={labels.resourceRecoveredText}
            checked={prefs.notifyResourceRecovered}
            onChange={(value) => setPref('notifyResourceRecovered', value)}
            disabled={saving}
          />
          <ToggleRow
            label={labels.maintenance}
            description={labels.maintenanceText}
            checked={prefs.notifyMaintenance}
            onChange={(value) => setPref('notifyMaintenance', value)}
            disabled={saving}
          />
        </div>
      )}

      <div className="notification-settings-actions">
        <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || loading || !prefs}>
          {saving ? labels.saving : labels.save}
        </button>
      </div>
    </div>
  );
}
