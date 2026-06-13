import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AxiosError } from 'axios';

export default function ChangePasswordPage() {
  const { changePassword, user } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="change-password-page">
        <div className="change-password-card">
          <div className="change-password-header">
            <span className="change-password-icon">✅</span>
            <h1>Password Changed</h1>
            <p>Your password has been updated successfully. Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="change-password-page">
      <div className="change-password-card">
        <div className="change-password-header">
          <span className="change-password-icon">🔑</span>
          <h1>Change Password</h1>
          <p>Set a new password to keep your account secure, {user?.name || user?.username || 'user'}.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
              autoComplete="current-password"
            />
          </div>

          <div className="input-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
          </div>

          <div className="input-group">
            <label htmlFor="confirmNewPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmNewPassword"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
          </div>

          {error && <div className="error-message" role="alert">{error}</div>}

          <button type="submit" className="btn-primary" disabled={isLoading || !currentPassword || !newPassword}>
            {isLoading ? 'Changing...' : 'Change Password'}
          </button>
        </form>

        <p className="auth-switch">
          <Link to="/">← Back to home</Link>
        </p>
      </div>

      <style>{`
        .change-password-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0d9488 0%, #134e4a 100%);
          padding: var(--spacing-lg);
        }
        .change-password-card {
          background: white;
          border-radius: 12px;
          padding: var(--spacing-xl);
          width: 100%;
          max-width: 420px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.15);
        }
        .change-password-header {
          text-align: center;
          margin-bottom: var(--spacing-lg);
        }
        .change-password-icon {
          font-size: 2.5rem;
          display: block;
          margin-bottom: var(--spacing-sm);
        }
        .change-password-header h1 {
          margin: 0 0 var(--spacing-xs);
          font-size: 1.5rem;
          color: var(--color-text);
        }
        .change-password-header p {
          margin: 0;
          color: var(--color-text-muted);
          font-size: 0.9rem;
        }
        .input-group {
          margin-bottom: var(--spacing-md);
        }
        .input-group label {
          display: block;
          margin-bottom: var(--spacing-xs);
          font-weight: 500;
          color: var(--color-text);
          font-size: 0.9rem;
        }
        .input-group input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          font-size: 1rem;
          box-sizing: border-box;
        }
        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 10px 12px;
          border-radius: 8px;
          margin-bottom: var(--spacing-md);
          font-size: 0.9rem;
        }
        .btn-primary {
          width: 100%;
          padding: 12px;
          background: #0d9488;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-primary:hover:not(:disabled) {
          background: #0f766e;
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .auth-switch {
          text-align: center;
          margin-top: var(--spacing-md);
          font-size: 0.9rem;
          color: var(--color-text-muted);
        }
        .auth-switch a {
          color: #0d9488;
          text-decoration: none;
          font-weight: 500;
        }
        .auth-switch a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
