import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-icon">🗺️</div>
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <div className="not-found-actions">
          <Link to="/" className="not-found-btn">
            Go Home
          </Link>
          <Link to="/list" className="not-found-btn not-found-btn-secondary">
            View Samples
          </Link>
        </div>
      </div>
      <style>{`
        .not-found-page {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
          padding: var(--spacing-lg);
        }
        .not-found-card {
          text-align: center;
          max-width: 420px;
          padding: var(--spacing-xl);
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
        }
        .not-found-icon {
          font-size: 4rem;
          margin-bottom: var(--spacing-md);
        }
        .not-found-card h1 {
          font-size: 4rem;
          font-weight: 800;
          color: var(--color-primary);
          margin-bottom: var(--spacing-xs);
          line-height: 1;
        }
        .not-found-card h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: var(--spacing-sm);
        }
        .not-found-card p {
          color: var(--color-text-muted);
          margin-bottom: var(--spacing-lg);
          font-size: 0.9rem;
        }
        .not-found-actions {
          display: flex;
          gap: var(--spacing-sm);
          justify-content: center;
        }
        .not-found-btn {
          display: inline-block;
          padding: var(--spacing-sm) var(--spacing-lg);
          background: var(--color-primary);
          color: white;
          border-radius: var(--radius-md);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: opacity var(--transition-fast);
        }
        .not-found-btn:hover {
          opacity: 0.9;
        }
        .not-found-btn-secondary {
          background: var(--color-background);
          color: var(--color-text);
          border: 1px solid var(--color-border);
        }
        .not-found-btn-secondary:hover {
          background: var(--color-surface);
        }
      `}</style>
    </div>
  );
}
