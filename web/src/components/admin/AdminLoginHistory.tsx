import { useState, useCallback } from 'react';
import { useAuth, type LoginLogEntry } from '../../contexts/AuthContext';

export default function AdminLoginHistory() {
  const { getLoginHistory } = useAuth();
  const [loginHistory, setLoginHistory] = useState<LoginLogEntry[]>([]);
  const [showLoginHistory, setShowLoginHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchLoginHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const logs = await getLoginHistory();
      setLoginHistory(logs);
    } catch {
      console.error('Failed to fetch login history');
    } finally {
      setHistoryLoading(false);
    }
  }, [getLoginHistory]);

  const toggleLoginHistory = () => {
    if (!showLoginHistory) {
      fetchLoginHistory();
    }
    setShowLoginHistory(!showLoginHistory);
  };

  return (
    <div className="admin-section">
      <button className="section-toggle" onClick={toggleLoginHistory} aria-expanded={showLoginHistory} aria-controls="login-history-content">
        <h3 className="section-title">📋 Login History</h3>
        <span className={`section-chevron ${showLoginHistory ? 'open' : ''}`}>▾</span>
      </button>
      {showLoginHistory && (
        <div className="login-history" id="login-history-content">
          {historyLoading ? (
            <p className="loading-text">Loading history...</p>
          ) : loginHistory.length === 0 ? (
            <p className="empty-text">No login events recorded yet.</p>
          ) : (
            <div className="history-list">
              {loginHistory.map((entry) => (
                <div key={entry.id} className={`history-entry history-${entry.action}`}>
                  <span className="history-action">
                    {entry.action === 'login' ? '🔑' : entry.action === 'logout' ? '🚪' : '🔒'}
                    {' '}{entry.action === 'password_change' ? 'Password changed' : entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                  </span>
                  <span className="history-meta">
                    {entry.ipAddress || 'Unknown IP'}
                    {entry.userAgent && ` · ${entry.userAgent.substring(0, 40)}${entry.userAgent.length > 40 ? '...' : ''}`}
                  </span>
                  <span className="history-time">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
