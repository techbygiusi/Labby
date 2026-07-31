import React, { useEffect, useMemo, useRef, useState } from 'react';
import { publicApi } from '../services/api';
import { readStoredLanguage } from './LanguageSwitch';

const DISMISS_KEY = 'dismissedAnnouncements';

const BANNER_LABELS = {
  en: {
    locale: 'en-US',
    active: 'Maintenance active: ',
    upcoming: 'Scheduled maintenance',
    minute: 'min.',
    hour: 'h',
    day: 'days',
    in: 'in',
    hide: 'Hide',
    hideAnnouncement: 'Hide announcement'
  },
  de: {
    locale: 'de-DE',
    active: 'Wartung läuft: ',
    upcoming: 'Geplante Wartung',
    minute: 'Min.',
    hour: 'Std.',
    day: 'Tagen',
    in: 'in',
    hide: 'Ausblenden',
    hideAnnouncement: 'Ankündigung ausblenden'
  }
};

function loadDismissed() {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

function saveDismissed(ids) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(ids.slice(-50)));
  } catch (_) { /* ignore */ }
}

function formatDateTime(value, language) {
  const labels = BANNER_LABELS[language] || BANNER_LABELS.en;
  try {
    const formatted = new Date(value).toLocaleString(labels.locale, {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    return language === 'de' ? `${formatted} Uhr` : formatted;
  } catch (_) {
    return String(value);
  }
}

function relativeStart(startsAt, language) {
  const labels = BANNER_LABELS[language] || BANNER_LABELS.en;
  const diffMs = new Date(startsAt).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `${labels.in} ${minutes} ${labels.minute}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${labels.in} ${hours} ${labels.hour}`;
  return `${labels.in} ${Math.round(hours / 24)} ${labels.day}`;
}

function WrenchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.1-2.1 2.7-2.5z" />
    </svg>
  );
}

/**
 * Fixed top banner for active + upcoming maintenance windows.
 * - Active windows can NOT be dismissed (users must see ongoing maintenance).
 * - Upcoming windows can be dismissed per announcement (localStorage).
 * - Refreshes every 5 minutes.
 */
export default function MaintenanceBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState(loadDismissed);
  const [language, setLanguage] = useState(readStoredLanguage);
  const stackRef = useRef(null);

  useEffect(() => {
    const handleLanguageChange = (event) => {
      setLanguage(event.detail?.language || readStoredLanguage());
    };

    window.addEventListener('portal-language-change', handleLanguageChange);
    window.addEventListener('storage', handleLanguageChange);
    return () => {
      window.removeEventListener('portal-language-change', handleLanguageChange);
      window.removeEventListener('storage', handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      publicApi.getAnnouncements()
        .then(res => { if (!cancelled) setAnnouncements(res.data.announcements || []); })
        .catch(() => { /* Banner is optional - errors are ignored silently */ });
    };
    load();
    const timer = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  const visible = useMemo(
    () => announcements.filter(item => item.active || !dismissed.includes(item.id)),
    [announcements, dismissed]
  );

  useEffect(() => {
    const root = document.documentElement;
    const element = stackRef.current;

    const applyOffset = () => {
      const height = element ? Math.ceil(element.getBoundingClientRect().height) : 0;
      root.style.setProperty('--maintenance-banner-offset', `${height}px`);
    };

    applyOffset();

    let observer;
    if (element && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => applyOffset());
      observer.observe(element);
    }

    window.addEventListener('resize', applyOffset);

    return () => {
      window.removeEventListener('resize', applyOffset);
      if (observer) observer.disconnect();
      root.style.setProperty('--maintenance-banner-offset', '0px');
    };
  }, [visible, language]);

  if (visible.length === 0) return null;

  const labels = BANNER_LABELS[language] || BANNER_LABELS.en;

  const handleDismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    saveDismissed(next);
  };

  return (
    <div ref={stackRef} className="maintenance-banner-stack" role="status" aria-live="polite">
      {visible.map(item => {
        const upcoming = !item.active;
        const rel = relativeStart(item.startsAt, language);
        return (
          <div key={item.id} className={`maintenance-banner severity-${item.severity} ${item.active ? 'is-active' : 'is-upcoming'}`}>
            <span className="maintenance-banner-icon"><WrenchIcon /></span>
            <div className="maintenance-banner-body">
              <strong>
                {item.active ? labels.active : `${labels.upcoming}${rel ? ` (${rel})` : ''}: `}
                {item.title}
              </strong>
              <span className="maintenance-banner-time">
                {formatDateTime(item.startsAt, language)} - {formatDateTime(item.endsAt, language)}
              </span>
              {item.message ? <span className="maintenance-banner-message">{item.message}</span> : null}
            </div>
            {upcoming && (
              <button
                type="button"
                className="maintenance-banner-dismiss"
                onClick={() => handleDismiss(item.id)}
                aria-label={labels.hideAnnouncement}
                title={labels.hide}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
