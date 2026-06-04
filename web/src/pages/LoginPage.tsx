import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AxiosError } from 'axios';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const loggedInUser = await login(username, password);
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      if (from && loggedInUser?.role === 'admin') {
        navigate(from, { replace: true });
      } else if (loggedInUser?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      if (axiosError.response?.status === 401) {
        const msg = axiosError.response?.data?.message || '';
        if (msg.toLowerCase().includes('deactivated')) {
          setError('Account deactivated. Contact admin.');
        } else {
          setError('Invalid username or password');
        }
      } else if (axiosError.response?.status === 429) {
        setError('Too many login attempts. Please try again after 15 minutes.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-icon">🔑</span>
          <h1>Sign In</h1>
          <p>Sign in to submit water quality samples</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoComplete="username"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary login-btn" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </p>
        <p className="auth-switch" style={{ marginTop: 'var(--spacing-xs)' }}>
          Forgot your password? <span style={{ color: 'var(--color-text-muted)' }}>Contact admin</span>
        </p>

      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0d9488 0%, #134e4a 100%);
          padding: var(--spacing-lg);
        }
        .login-card {
          background: var(--color-surface);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          width: 100%;
          max-width: 400px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .login-header {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }
        .login-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: var(--spacing-md);
        }
        .login-header h1 {
          font-size: 1.5rem;
          margin-bottom: var(--spacing-xs);
        }
        .login-header p {
          color: var(--color-text-muted);
          font-size: 0.875rem;
        }
        .login-card .input-group {
          margin-bottom: var(--spacing-md);
        }
        .login-card input {
          width: 100%;
        }
        .error-message {
          background-color: var(--color-rejected-bg);
          color: var(--color-rejected-text);
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
          font-size: 0.875rem;
        }
        .login-btn {
          width: 100%;
          padding: var(--spacing-md);
          font-size: 1rem;
        }
        .auth-switch {
          text-align: center;
          margin-top: var(--spacing-md);
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }
        .auth-switch a {
          color: var(--color-primary);
        }
      `}</style>
    </div>
  );
}
