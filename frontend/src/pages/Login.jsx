import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi, getErrorMessage } from '../services/api';
import '../styles/globals.css';
import ThemeButton from '../components/ThemeButton';
import { readStoredLanguage } from '../components/LanguageSwitch';
import MaintenanceBanner from '../components/MaintenanceBanner';

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="7" rx="2" /><rect x="2" y="14" width="20" height="7" rx="2" />
      <line x1="6" y1="6.5" x2="6.01" y2="6.5" /><line x1="6" y1="17.5" x2="6.01" y2="17.5" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [view, setView] = useState('login'); // 'login' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Bitte E-Mail-Adresse und Passwort eingeben.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message || 'Anmeldung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Bitte E-Mail-Adresse eingeben.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await authApi.forgotPassword(email, readStoredLanguage());
      setInfo('Falls die E-Mail-Adresse existiert, wurde ein Link zum Zurücksetzen versendet. Der Link ist 1 Stunde gültig.');
    } catch (err) {
      setError(getErrorMessage(err, 'Anfrage fehlgeschlagen.'));
    } finally {
      setLoading(false);
    }
  };

  const switchView = (next) => {
    setView(next);
    setError('');
    setInfo('');
  };

  return (
    <main className="login-split">
      <MaintenanceBanner />
      <div className="login-theme-action auth-utility-actions"><ThemeButton /></div>

      {/* Brand panel */}
      <section className="login-brand-panel" aria-hidden="true">
        <div className="login-brand-inner">
          <p className="eyebrow">Hosting by TechByGiusi</p>
          <h1>Dein Zugang.<br />Deine Dienste.</h1>
          <p className="login-brand-sub">
            Ein klarer Zugang zu deinen Services, Statusmeldungen, Konsolen
            und Zugangsdaten.
          </p>
          <ul className="login-feature-list">
            <li><ServerIcon /><span>Dienste und Status auf einen Blick</span></li>
            <li><BellIcon /><span>Wartungen und Benachrichtigungen transparent</span></li>
            <li><ShieldIcon /><span>Geschützter Zugriff mit verschlüsselten Daten</span></li>
          </ul>
        </div>
        <div className="login-brand-footer">© {new Date().getFullYear()} TechByGiusi</div>
      </section>

      {/* Form panel */}
      <section className="login-form-panel">
        <div className="auth-card login-card">
          <header className="auth-header">
            <p className="eyebrow mobile-only-brand">Hosting by TechByGiusi</p>
            <h1>{view === 'login' ? 'Anmelden' : 'Passwort vergessen'}</h1>
            <p className="auth-subline">
              {view === 'login'
                ? 'Melde dich mit deinem Portal-Konto an.'
                : 'Wir senden dir einen Link zum Zurücksetzen per E-Mail.'}
            </p>
          </header>

          {error && <div className="alert alert-danger">{error}</div>}
          {info && <div className="alert alert-success">{info}</div>}

          {view === 'login' ? (
            <form onSubmit={handleSubmit} className="form-stack">
              <label className="form-group" htmlFor="email">
                <span>E-Mail-Adresse</span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="name@example.com"
                  disabled={loading}
                  autoComplete="email"
                  autoFocus
                />
              </label>

              <label className="form-group" htmlFor="password">
                <span>Passwort</span>
                <div className="password-field">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Dein Passwort"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                    tabIndex={-1}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </label>

              <button type="submit" className="btn-primary full-button" disabled={loading}>
                {loading ? 'Anmeldung läuft...' : 'Anmelden'}
              </button>

              <button type="button" className="link-button" onClick={() => switchView('forgot')} disabled={loading}>
                Passwort vergessen?
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgot} className="form-stack">
              <label className="form-group" htmlFor="forgot-email">
                <span>E-Mail-Adresse</span>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="name@example.com"
                  disabled={loading}
                  autoComplete="email"
                  autoFocus
                />
              </label>

              <button type="submit" className="btn-primary full-button" disabled={loading}>
                {loading ? 'Wird gesendet...' : 'Link anfordern'}
              </button>

              <button type="button" className="link-button" onClick={() => switchView('login')} disabled={loading}>
                Zurück zur Anmeldung
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
