import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import SampleForm from './components/SampleForm';
import SampleMap from './components/SampleMap';
import SampleList from './components/SampleList';
import { SampleDetail } from './components/SampleDetail';
import AdminDashboard from './components/AdminDashboard';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MySamplesPage from './pages/MySamplesPage';
import NotFoundPage from './pages/NotFoundPage';
import RequireAuth from './components/RequireAuth';
import ErrorBoundary from './components/ErrorBoundary';
import SyncLogViewer from './components/SyncLogViewer';
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
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/submit" element={<SampleForm />} />
            <Route path="/map" element={<SampleMap />} />
            <Route path="/list" element={<SampleList />} />
            <Route path="/sample/" element={<Navigate to="/list" replace />} />
            <Route path="/sample/:id" element={<SampleDetail />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/my-samples" element={<MySamplesPage />} />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminDashboard />
                </RequireAuth>
              }
            />
            {import.meta.env.DEV && (
              <Route path="/debug/sync" element={<SyncLogViewer />} />
            )}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </Layout>
    </AuthProvider>
  );
}

export default App;
