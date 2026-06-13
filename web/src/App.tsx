import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import ErrorBoundary from './components/ErrorBoundary';

const SampleForm = lazy(() => import('./components/SampleForm'));
const SampleMap = lazy(() => import('./components/SampleMap'));
const SampleList = lazy(() => import('./components/SampleList'));
const SampleDetailLazy = lazy(() => import('./components/SampleDetail').then(m => ({ default: m.SampleDetail })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'));
const MySamplesPage = lazy(() => import('./pages/MySamplesPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const SyncLogViewer = lazy(() => import('./components/SyncLogViewer'));
import { useDexieInit } from './hooks/useDexieInit';

function App() {
  const { isReady, error } = useDexieInit();

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>⚠️ Database Error</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          {error.message || 'Failed to initialize offline database. Please refresh the page.'}
        </p>
        <button onClick={() => window.location.reload()} className="btn-primary" style={{ marginTop: '1rem' }}>
          Refresh Page
        </button>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Initializing...</p>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Layout>
        <ErrorBoundary>
          <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/submit" element={<SampleForm />} />
            <Route path="/map" element={<SampleMap />} />
            <Route path="/list" element={<SampleList />} />
            <Route path="/sample/" element={<Navigate to="/list" replace />} />
            <Route path="/sample/:id" element={<SampleDetailLazy />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/my-samples" element={<MySamplesPage />} />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/debug"
              element={
                <RequireAuth>
                  <SyncLogViewer />
                </RequireAuth>
              }
            />
            {import.meta.env.DEV && (
              <Route path="/debug/sync" element={<SyncLogViewer />} />
            )}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </ErrorBoundary>
      </Layout>
    </AuthProvider>
  );
}

export default App;
