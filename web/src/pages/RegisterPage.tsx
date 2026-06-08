import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AxiosError } from 'axios';

function getPasswordStrength(pw: string): { label: string; color: string; width: string } {
  if (!pw) return { label: '', color: 'transparent', width: '0%' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', color: '#ef4444', width: '20%' };
  if (score <= 2) return { label: 'Fair', color: '#f59e0b', width: '40%' };
  if (score <= 3) return { label: 'Good', color: '#3b82f6', width: '70%' };
  return { label: 'Strong', color: '#22c55e', width: '100%' };
}

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await register(name, username, password);
      navigate('/', { state: { registrationSuccess: true } });
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      if (axiosError.response?.status === 409) {
        setError('Username already taken');
      } else if (axiosError.response?.status === 429) {
        setError('Too many registration attempts. Please try again after 15 minutes.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-icon">📝</span>
          <h1>Create Account</h1>
          <p>Register to submit water quality samples</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
            />
          </div>

          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              required
              minLength={3}
              maxLength={30}
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
              placeholder="Min. 8 characters"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
            {password && (
              <div className="strength-meter">
                <div className="strength-bar">
                  <div className="strength-fill" style={{ width: strength.width, backgroundColor: strength.color }} />
                </div>
                <span className="strength-label" style={{ color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
          </div>

          {error && <div className="error-message" role="alert">{error}</div>}

          <button type="submit" className="btn-primary login-btn" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>

      <style>{`
        .auth-switch {
          text-align: center;
          margin-top: var(--spacing-md);
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .auth-switch a {
          color: var(--color-primary);
        }
        .strength-meter {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-xs);
        }
        .strength-bar {
          flex: 1;
          height: 4px;
          background: var(--color-border);
          border-radius: 2px;
          overflow: hidden;
        }
        .strength-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s ease, background-color 0.3s ease;
        }
        .strength-label {
          font-size: 0.75rem;
          font-weight: 500;
          min-width: 40px;
        }
      `}</style>
    </div>
  );
}
