import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi, getErrorMessage } from '../services/api';
import '../styles/globals.css';
import ThemeButton from '../components/ThemeButton';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || !confirm) {
      setError('Bitte beide Felder ausfüllen.');
      return;
    }
    if (password.length < 8) {
      setError('Das neue Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }
    if (password !== confirm) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Zurücksetzen fehlgeschlagen. Der Link ist möglicherweise abgelaufen.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell login-shell">
      <div className="auth-theme-action auth-utility-actions"><ThemeButton /></div>
      <section className="auth-card login-card">
        <header className="auth-header">
          <p className="eyebrow">Hosting by TechByGiusi</p>
          <h1>Neues Passwort</h1>
          {!done && <p className="auth-subline">Vergib ein neues Passwort für dein Konto.</p>}
        </header>

        {!token ? (
          <>
            <div className="alert alert-danger">Der Link ist ungültig - es wurde kein Token übergeben.</div>
            <button type="button" className="btn-secondary full-button" onClick={() => navigate('/login')}>Zur Anmeldung</button>
          </>
        ) : done ? (
          <>
            <div className="alert alert-success">Dein Passwort wurde erfolgreich geändert. Du kannst dich jetzt anmelden.</div>
            <button type="button" className="btn-primary full-button" onClick={() => navigate('/login')}>Zur Anmeldung</button>
          </>
        ) : (
          <>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit} className="form-stack">
              <label className="form-group" htmlFor="new-password">
                <span>Neues Passwort</span>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Mindestens 8 Zeichen"
                  disabled={loading}
                  autoComplete="new-password"
                  autoFocus
                />
              </label>

              <label className="form-group" htmlFor="confirm-password">
                <span>Passwort wiederholen</span>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                  placeholder="Passwort erneut eingeben"
                  disabled={loading}
                  autoComplete="new-password"
                />
              </label>

              <button type="submit" className="btn-primary full-button" disabled={loading}>
                {loading ? 'Wird gespeichert...' : 'Passwort speichern'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
