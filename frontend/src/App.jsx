import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Setup from './pages/Setup';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ConsolePage from './pages/ConsolePage';
import WikiEditorPage from './pages/WikiEditorPage';
import { useDocumentTheme } from './components/ThemeButton';
import { usePortalLanguageRuntime } from './i18n';

function FullscreenLoader({ text }) {
  return (
    <div className="app-loader">
      <div className="spinner spinner-lg"></div>
      <div>{text}</div>
    </div>
  );
}

function FullscreenError({ title, text }) {
  return (
    <div className="app-loader app-error">
      <div className="app-error-card">
        <p className="eyebrow">Hosting by TechByGiusi</p>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </div>
  );
}

function PrivateRoute({ children, requiredRole = null }) {
  const { isAuthenticated, user, loading, setupRequired } = useAuth();

  if (loading) {
    return <FullscreenLoader text="Lädt..." />;
  }

  if (setupRequired) {
    return <Navigate to="/setup" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/login" />;
  }

  return children;
}

export default function App() {
  useDocumentTheme();
  usePortalLanguageRuntime();
  const { setupRequired, loading, isAuthenticated, user, error } = useAuth();

  if (loading) {
    return <FullscreenLoader text="Initialisierung..." />;
  }

  if (error && !isAuthenticated && error.includes('Backend')) {
    return <FullscreenError title="Backend nicht erreichbar" text={error} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/setup"
          element={setupRequired ? <Setup /> : <Navigate to={isAuthenticated ? (user?.role === 'admin' ? '/admin' : '/dashboard') : '/login'} />}
        />

        <Route
          path="/login"
          element={
            setupRequired ?
              <Navigate to="/setup" /> :
              isAuthenticated ?
                <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} /> :
                <Login />
          }
        />

        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute requiredRole="user">
              <UserDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <PrivateRoute requiredRole="admin">
              <AdminDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/wiki/:articleId"
          element={
            <PrivateRoute requiredRole="admin">
              <WikiEditorPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/console/:resourceId"
          element={
            <PrivateRoute requiredRole="user">
              <ConsolePage />
            </PrivateRoute>
          }
        />

        <Route
          path="/"
          element={
            setupRequired ?
              <Navigate to="/setup" /> :
              isAuthenticated ?
                <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} /> :
                <Navigate to="/login" />
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
