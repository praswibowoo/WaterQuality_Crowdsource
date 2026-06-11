import { useEffect, useState } from 'react';
import { offlineDb } from '../db/offlineDatabase';
import type { SyncLogEntry } from '../types/offline';

interface SyncLogViewerProps {
  previewMode?: boolean;
}

export default function SyncLogViewer({ previewMode = false }: SyncLogViewerProps) {
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function loadLogs() {
      try {
        const allLogs = await offlineDb.syncLog
          .orderBy('timestamp')
          .reverse()
          .limit(100)
          .toArray();

        const filtered = filter === 'all'
          ? allLogs
          : allLogs.filter((l) => l.action === filter);

        const displayLogs = previewMode ? filtered.slice(0, 10) : filtered;
        setLogs(displayLogs);
      } catch (e) {
        console.error('Failed to load sync logs:', e);
      }
    }

    loadLogs();
  }, [filter, previewMode]);

  async function clearLogs() {
    try {
      await offlineDb.syncLog.clear();
      setLogs([]);
    } catch (e) {
      console.error('Failed to clear sync logs:', e);
    }
  }

  const actionColors: Record<string, string> = {
    enqueue: '#3b82f6',
    attempt: '#f59e0b',
    success: '#10b981',
    fail: '#ef4444',
    duplicate_detected: '#8b5cf6',
    drop: '#dc2626',
    purge: '#6b7280',
  };

  return (
    <div className={previewMode ? 'sync-log-preview' : ''}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 className="section-title">🔧 Sync Log</h3>
        {previewMode ? (
          <a href="/admin/debug" className="btn-tiny btn-gray">View All →</a>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
              }}
            >
              <option value="all">All</option>
              <option value="enqueue">Enqueue</option>
              <option value="attempt">Attempt</option>
              <option value="success">Success</option>
              <option value="fail">Fail</option>
              <option value="duplicate_detected">Duplicate</option>
              <option value="drop">Drop</option>
              <option value="purge">Purge</option>
            </select>
            <button
              onClick={clearLogs}
              style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '4px',
                border: '1px solid #ef4444',
                background: 'white',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              Clear Logs
            </button>
          </div>
        )}
      </div>

      {logs.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>No sync log entries yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Time</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Action</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Record ID</th>
              {!previewMode && <th style={{ padding: '0.5rem', textAlign: 'left' }}>Details</th>}
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td style={{ padding: '0.5rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'white',
                      backgroundColor: actionColors[log.action] || '#6b7280',
                    }}
                  >
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                  {log.recordId.substring(0, 8)}...
                </td>
                {!previewMode && (
                  <td style={{ padding: '0.5rem', color: 'var(--color-text-muted)' }}>
                    {log.details || '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
