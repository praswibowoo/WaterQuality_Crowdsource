import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AxiosError } from 'axios';

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await forgotPassword(username.trim(), reason.trim() || undefined);
      setSuccess(true);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      if (axiosError.response?.status === 429) {
        setError('Too many attempts. Please try again after 15 minutes.');
      } else {
        // Show success anyway to prevent enumeration
        setSuccess(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="forgot-page">
        <div className="forgot-card">
          <div className="forgot-header">
            <span className="forgot-icon">📧</span>
            <h1>Request Submitted</h1>
            <p>If an account exists for that username, an admin has been notified. They will contact you with your new password.</p>
          </div>
          <p className="auth-switch">
            <Link to="/login">← Back to Sign In</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-page">
      <div className="forgot-card">
        <div className="forgot-header">
          <span className="forgot-icon">🔑</span>
          <h1>Forgot Password</h1>
          <p>Enter your username and an admin will help you regain access.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoComplete="username"
            />
          </div>

          <div className="input-group">
            <label htmlFor="reason">Reason (optional)</label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Forgot password after field trip"
              rows={3}
              maxLength={500}
            />
          </div>

          {error && <div className="error-message" role="alert">{error}</div>}

          <button type="submit" className="btn-primary" disabled={isLoading || !username.trim()}>
            {isLoading ? 'Submitting...' : 'Request Reset'}
          </button>
        </form>

        <p className="auth-switch">
          Remember your password? <Link to="/login">Sign In</Link>
        </p>
      </div>

      <style>{`
        .forgot-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0d9488 0%, #134e4a 100%);
          padding: var(--spacing-lg);
        }
        .forgot-card {
          background: white;
          border-radius: 12px;
          padding: var(--spacing-xl);
          width: 100%;
          max-width: 420px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.15);
        }
        .forgot-header {
          text-align: center;
          margin-bottom: var(--spacing-lg);
        }
        .forgot-icon {
          font-size: 2.5rem;
          display: block;
          margin-bottom: var(--spacing-sm);
        }
        .forgot-header h1 {
          margin: 0 0 var(--spacing-xs);
          font-size: 1.5rem;
          color: var(--color-text);
        }
        .forgot-header p {
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
        .input-group input,
        .input-group textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          font-size: 1rem;
          box-sizing: border-box;
        }
        .input-group textarea {
          resize: vertical;
          font-family: inherit;
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
