import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMySamples } from '../hooks/useMySamples';
import QualityScoreBadge from '../components/QualityScoreBadge';
import type { Sample } from '../types';

export default function MySamplesPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: page, isLoading, error } = useMySamples(
    statusFilter ? { status: statusFilter } : undefined
  );

  const samples = page?.data || [];

  return (
    <div className="my-samples-page">
      <div className="page-header">
        <h2>My Samples</h2>
        <p className="subtitle">
          {user?.name ? `Submitted by ${user.name}` : 'Your water quality submissions'}
        </p>
      </div>

      <div className="filter-tabs">
        {['', 'pending', 'approved', 'rejected'].map((s) => (
          <button
            key={s}
            className={`filter-tab ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-muted">Loading your samples...</p>}
      {error && (
        <div className="error-message">
          Failed to load samples
          <button className="retry-btn" onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {!isLoading && !error && samples.length === 0 && (
        <p className="text-muted">No samples found. <Link to="/submit">Submit one now</Link></p>
      )}

      <div className="sample-list">
        {samples.map((sample: Sample) => (
          <Link to={`/sample/${sample.id}`} key={sample.id} className="sample-card">
            <div className="sample-card-header">
              <span className={`status-badge status-${sample.status}`}>{sample.status}</span>
              <span className="sample-date">
                {new Date(sample.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="sample-card-body">
              {sample.location && (
                <span className="sample-location">
                  {sample.location.latitude.toFixed(4)}, {sample.location.longitude.toFixed(4)}
                </span>
              )}
              {sample.ph != null && <span>pH: {sample.ph}</span>}
              {sample.temperature != null && <span>{sample.temperature}°C</span>}
              <QualityScoreBadge score={sample.qualityScore} size="sm" />
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        .my-samples-page {
          padding: var(--spacing-md);
          max-width: 800px;
          margin: 0 auto;
        }
        .page-header {
          margin-bottom: var(--spacing-lg);
        }
        .page-header h2 {
          margin: 0;
        }
        .subtitle {
          color: var(--color-text-muted);
          font-size: 0.875rem;
          margin: var(--spacing-xs) 0 0;
        }
        .filter-tabs {
          display: flex;
          gap: var(--spacing-xs);
          margin-bottom: var(--spacing-md);
          flex-wrap: wrap;
        }
        .filter-tab {
          padding: var(--spacing-xs) var(--spacing-md);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          cursor: pointer;
          font-size: 0.875rem;
          text-transform: capitalize;
        }
        .filter-tab.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }
        .sample-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .sample-card {
          display: block;
          padding: var(--spacing-md);
          background: var(--color-surface);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          text-decoration: none;
          color: inherit;
        }
        .sample-card:hover {
          border-color: var(--color-primary);
        }
        .sample-card-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: var(--spacing-xs);
        }
        .sample-card-body {
          display: flex;
          gap: var(--spacing-sm);
          font-size: 0.875rem;
          color: var(--color-text-muted);
          flex-wrap: wrap;
        }
        .text-muted {
          color: var(--color-text-muted);
          text-align: center;
          padding: var(--spacing-lg);
        }
        .error-message {
          color: #991b1b;
          text-align: center;
          padding: var(--spacing-md);
        }
        .retry-btn {
          margin-left: var(--spacing-sm);
          padding: var(--spacing-xs) var(--spacing-md);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
}
