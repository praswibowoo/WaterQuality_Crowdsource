import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useOfflineSync } from '../hooks/useOfflineSync';
import OfflineStatusBar from './OfflineStatusBar';
import { useAuth } from '../contexts/AuthContext';
import { usePendingCount } from '../hooks/useSamples';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { pendingCount } = useOfflineSync();

  const { isAuthenticated, logout } = useAuth();
  const { data: adminPendingCount } = usePendingCount();

  const baseNavItems = [
    { path: '/', label: 'Submit', icon: '📝' },
    { path: '/map', label: 'Map', icon: '🗺️' },
    { path: '/list', label: 'Samples', icon: '📋' },
  ];

  const navItems = isAuthenticated
    ? [
        ...baseNavItems,
        { path: '/my-samples', label: 'My Samples', icon: '👤' },
        { path: '/admin', label: 'Admin', icon: '🔒', badge: adminPendingCount },
      ]
    : [
        ...baseNavItems,
        { path: '/admin', label: 'Admin', icon: '🔒', badge: adminPendingCount },
      ];

  return (
    <div className="layout">
      <OfflineStatusBar />

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="header-title">Water Quality</h1>
          <div className="header-actions">
            {pendingCount > 0 && (
              <span className="pending-badge">{pendingCount}</span>
            )}
            {isAuthenticated && (
              <button className="btn-logout" onClick={async () => { await logout(); }} title="Sign Out">
                🚪 Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">
              {item.icon}
              {'badge' in item && item.badge && item.badge > 0 && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <style>{`
        .layout {
          min-height: 100vh;
          min-height: -webkit-fill-available;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
        }

        .header {
          background-color: var(--color-primary);
          color: white;
          padding: var(--spacing-md) var(--spacing-lg);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1200px;
          margin: 0 auto;
        }

        .header-title {
          font-size: 1.25rem;
          font-weight: 600;
        }

        .pending-badge {
          background-color: var(--color-warning);
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-full);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .btn-logout {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .btn-logout:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .main-content {
          flex: 1;
          padding: var(--spacing-md);
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
        }

        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background-color: var(--color-surface);
          border-top: 1px solid var(--color-border);
          display: flex;
          justify-content: space-around;
          padding: var(--spacing-sm) 0;
          padding-bottom: env(safe-area-inset-bottom, 0);
          z-index: 100;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          padding: var(--spacing-sm) var(--spacing-md);
          min-height: 44px;
          color: var(--color-text-muted);
          transition: color var(--transition-fast);
        }

        .nav-item:hover,
        .nav-item.active {
          color: var(--color-primary);
        }

        .nav-icon {
          font-size: 1.25rem;
          position: relative;
          display: inline-block;
        }

        .nav-badge {
          position: absolute;
          top: -6px;
          right: -10px;
          background: #ef4444;
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          min-width: 16px;
          height: 16px;
          line-height: 16px;
          text-align: center;
          border-radius: 8px;
          padding: 0 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }

        .nav-label {
          font-size: 0.75rem;
          font-weight: 500;
        }

        @media (min-width: 768px) {
          .bottom-nav {
            position: static;
            border-top: none;
            background-color: transparent;
            justify-content: center;
            gap: var(--spacing-xl);
            padding: var(--spacing-lg) 0;
          }

          .nav-item {
            flex-direction: row;
            gap: var(--spacing-sm);
          }

          .main-content {
            padding-bottom: var(--spacing-xl);
          }
        }
      `}</style>
    </div>
  );
}