import { useState } from 'react';
import { authApi, type ResetRequest } from '../api/auth';
import CopyButton from './CopyButton';

interface Props {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export default function PasswordResetRequestsPanel({ onSuccess, onError }: Props) {
  const [resetRequests, setResetRequests] = useState<ResetRequest[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [fulfilledPasswords, setFulfilledPasswords] = useState<Record<string, { password: string; username: string }>>({});

  const loadResetRequests = async () => {
    try {
      const res = await authApi.listResetRequests({ status: 'pending', limit: 50 });
      setResetRequests(res.data);
      setShowRequests(true);
    } catch {
      onError('Failed to load reset requests');
    }
  };

  const handleFulfill = async (id: string) => {
    try {
      const res = await authApi.fulfillResetRequest(id);
      const request = resetRequests.find((r) => r.id === id);
      const displayName = request?.user.username ?? 'unknown user';
      setFulfilledPasswords((prev) => ({ ...prev, [id]: { password: res.tempPassword, username: displayName } }));
      onSuccess('Password reset fulfilled — copy the password below and send it securely.');
    } catch {
      onError('Failed to fulfill reset request');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await authApi.rejectResetRequest(id, 'Rejected by admin');
      setResetRequests((prev) => prev.filter((r) => r.id !== id));
      onSuccess('Reset request rejected');
    } catch {
      onError('Failed to reject reset request');
    }
  };

  const handleDismiss = (id: string) => {
    setResetRequests((prev) => prev.filter((r) => r.id !== id));
    setFulfilledPasswords((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <div className="admin-section" style={{ marginTop: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
        <h3>🔑 Password Reset Requests</h3>
        {!showRequests ? (
          <button className="btn-primary" onClick={loadResetRequests} style={{ fontSize: '0.8rem', padding: 'var(--spacing-xs) var(--spacing-md)' }}>
            View Requests
          </button>
        ) : (
          <button className="btn-clear" onClick={() => setShowRequests(false)} style={{ fontSize: '0.8rem' }}>
            Hide
          </button>
        )}
      </div>

      {showRequests && (
        <>
          {resetRequests.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--spacing-lg)' }}>
              No pending reset requests.
            </p>
          ) : (
            <div className="reset-requests-list">
              {resetRequests.map((req) => {
                const fulfilled = fulfilledPasswords[req.id];
                return (
                  <div key={req.id} className="reset-request-card">
                    <div className="reset-request-info">
                      <strong>{req.user.username}</strong>
                      {req.user.name && <span style={{ color: 'var(--color-text-muted)', marginLeft: 'var(--spacing-xs)' }}>({req.user.name})</span>}
                      {req.reason && <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>"{req.reason}"</p>}
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Requested {new Date(req.createdAt).toLocaleString()}
                      </span>
                      {fulfilled && (
                        <div className="fulfilled-password-inline">
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>New password:</span>
                          <code className="fulfilled-pw-text">{fulfilled.password}</code>
                          <CopyButton
                            text={fulfilled.password}
                            label={`Copy password for ${fulfilled.username}`}
                            className="btn-copy-pw"
                          />
                        </div>
                      )}
                    </div>
                    <div className="reset-request-actions">
                      {!fulfilled ? (
                        <>
                          <button className="btn-approve" onClick={() => handleFulfill(req.id)} style={{ fontSize: '0.8rem' }}>
                            ✓ Fulfill
                          </button>
                          <button className="btn-reject" onClick={() => handleReject(req.id)} style={{ fontSize: '0.8rem' }}>
                            ✗ Reject
                          </button>
                        </>
                      ) : (
                        <button className="btn-approve" onClick={() => handleDismiss(req.id)} style={{ fontSize: '0.8rem' }}>
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <style>{`
        .reset-requests-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .reset-request-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-md);
          background: var(--color-background);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
        }
        .reset-request-info { flex: 1; }
        .reset-request-actions {
          display: flex;
          gap: var(--spacing-xs);
          margin-left: var(--spacing-md);
        }
        .btn-copy-pw {
          background: #0d9488;
          color: white;
          border: none;
          padding: 4px 10px;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: 0.8rem;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .btn-copy-pw:hover { background: #0f766e; }
        .fulfilled-password-inline {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-sm);
          padding: var(--spacing-sm);
          background: #f0fdfa;
          border: 1px solid #99f6e4;
          border-radius: var(--radius-md);
        }
        .fulfilled-pw-text {
          flex: 1;
          font-size: 0.95rem;
          font-weight: 600;
          word-break: break-all;
        }
      `}</style>
    </div>
  );
}
