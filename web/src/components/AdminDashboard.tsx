import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSamples, useUpdateSample, useDeleteSample, useSamplesStats } from '../hooks/useSamples';
import { useAuth, type LoginLogEntry } from '../contexts/AuthContext';
import { MEASUREMENT_FIELDS, MEASUREMENT_PRIORITY } from '../utils/measurements';
import { findWaterBodyType, findLandUse } from '../utils/metadata';
import QualityScoreBadge from './QualityScoreBadge';
import ConfirmDialog from './ConfirmDialog';

type MeasurementPriorityKey = typeof MEASUREMENT_PRIORITY[number];

interface KeyMeasurementData {
  key: MeasurementPriorityKey;
  value: number;
  unit: string;
  label: string;
}

function getKeyMeasurements(sample: {
  ph?: number | null;
  conductivity?: number | null;
  salinity?: number | null;
  nitrate?: number | null;
  calcium?: number | null;
  potassium?: number | null;
  sodium?: number | null;
  temperature?: number | null;
}): KeyMeasurementData[] {
  const measurements: KeyMeasurementData[] = [];

  for (const key of MEASUREMENT_PRIORITY) {
    if (sample[key] != null) {
      const field = MEASUREMENT_FIELDS[key];
      measurements.push({
        key,
        value: sample[key] as number,
        unit: field.unit,
        label: field.label,
      });
      if (measurements.length >= 3) break;
    }
  }

  return measurements;
}

function formatMeasurementValue(label: string, value: number, unit: string): string {
  if (unit) {
    return `${label}: ${value} ${unit}`;
  }
  return `${label}: ${value}`;
}

function getSampleIcon(sample: {
  ph?: number | null;
  conductivity?: number | null;
  salinity?: number | null;
  nitrate?: number | null;
  calcium?: number | null;
  potassium?: number | null;
  sodium?: number | null;
  temperature?: number | null;
}): string {
  if (sample.ph !== null && sample.ph !== undefined) return '💧';
  if (sample.conductivity !== null && sample.conductivity !== undefined) return '⚡';
  if (sample.salinity !== null && sample.salinity !== undefined) return '🧂';
  if (sample.nitrate !== null && sample.nitrate !== undefined) return '🔬';
  if (sample.calcium !== null && sample.calcium !== undefined) return '🔬';
  if (sample.potassium !== null && sample.potassium !== undefined) return '🔬';
  if (sample.sodium !== null && sample.sodium !== undefined) return '🔬';
  if (sample.temperature !== null && sample.temperature !== undefined) return '🌡️';
  return '📋';
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type QualityScoreFilter = 'all' | 'high' | 'moderate' | 'low' | 'none';

export default function AdminDashboard() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [qualityScoreFilter, setQualityScoreFilter] = useState<QualityScoreFilter>('all');
  const [authorSearch, setAuthorSearch] = useState('');

  // Server-side filtering: pass status, qualityScore, and authorName to API
  const filters = {
    status: statusFilter === 'all' ? undefined : statusFilter,
    qualityScoreFilter: qualityScoreFilter === 'all' ? undefined : qualityScoreFilter,
    authorName: authorSearch.trim() || undefined,
    sortBy: 'createdAt' as const,
    sortOrder: 'desc' as const,
  };

  const { data, isLoading, error } = useSamples(filters);
  const { data: statsData } = useSamplesStats();
  const updateSample = useUpdateSample();
  const deleteSample = useDeleteSample();
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject' | 'delete';
    sampleId: string;
    authorName: string;
  } | null>(null);

  // Auth context for password change + login history
  const { changePassword, getLoginHistory } = useAuth();

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Login history state
  const [loginHistory, setLoginHistory] = useState<LoginLogEntry[]>([]);
  const [showLoginHistory, setShowLoginHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Clear confirm dialog when filters change
  useEffect(() => {
    setConfirmAction(null);
  }, [statusFilter, qualityScoreFilter, authorSearch]);

  // Fetch login history
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

  // Handle password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      // Refresh login history to show the password change event
      fetchLoginHistory();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
      setPasswordError(axiosErr?.response?.data?.message || axiosErr?.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Toggle login history visibility
  const toggleLoginHistory = () => {
    if (!showLoginHistory) {
      fetchLoginHistory();
    }
    setShowLoginHistory(!showLoginHistory);
  };

  // Flatten paginated data
  const samples = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data]
  );

  const stats = useMemo(() => ({
    total: statsData?.total ?? 0,
    pending: statsData?.pending ?? 0,
    approved: statsData?.approved ?? 0,
    rejected: statsData?.rejected ?? 0,
  }), [statsData]);

  const handleApprove = async (id: string, author: string) => {
    setConfirmAction({ type: 'approve', sampleId: id, authorName: author });
  };

  const handleConfirmApprove = async () => {
    if (!confirmAction) return;
    try {
      await updateSample.mutateAsync({ id: confirmAction.sampleId, data: { status: 'approved' } });
    } catch (err) {
      console.error('Failed to approve sample:', err);
    } finally {
      setConfirmAction(null);
    }
  };

  const handleReject = async (id: string, author: string) => {
    setConfirmAction({ type: 'reject', sampleId: id, authorName: author });
  };

  const handleConfirmReject = async () => {
    if (!confirmAction) return;
    try {
      await updateSample.mutateAsync({ id: confirmAction.sampleId, data: { status: 'rejected' } });
    } catch (err) {
      console.error('Failed to reject sample:', err);
    } finally {
      setConfirmAction(null);
    }
  };

  const handleRevert = async (id: string) => {
    try {
      await updateSample.mutateAsync({ id, data: { status: 'pending' } });
    } catch (err) {
      console.error('Failed to revert sample:', err);
    }
  };

  const handleDelete = async (id: string, author: string) => {
    setConfirmAction({ type: 'delete', sampleId: id, authorName: author });
  };

  const handleConfirmDelete = async () => {
    if (!confirmAction) return;
    try {
      await deleteSample.mutateAsync(confirmAction.sampleId);
    } catch (err) {
      console.error('Failed to delete sample:', err);
      alert('Failed to delete sample. Please try again.');
    } finally {
      setConfirmAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <span>Loading samples...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <span>Failed to load samples</span>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h2 className="page-title">Admin Dashboard</h2>
        <p className="page-subtitle">Review and moderate water quality submissions</p>
      </div>

      {/* Stats Panel */}
      <div className="stats-panel">
        <div className="stat-badge stat-total">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-badge stat-pending">
          <span className="stat-value">{stats.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-badge stat-approved">
          <span className="stat-value">{stats.approved}</span>
          <span className="stat-label">Approved</span>
        </div>
        <div className="stat-badge stat-rejected">
          <span className="stat-value">{stats.rejected}</span>
          <span className="stat-label">Rejected</span>
        </div>
      </div>

      {/* Author Search */}
      <div className="author-search">
        <input
          type="text"
          placeholder="Search by author name..."
          value={authorSearch}
          onChange={(e) => setAuthorSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="filter-tabs">
        {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map((status) => (
          <button
            key={status}
            className={`filter-tab ${statusFilter === status ? 'active' : ''}`}
            onClick={() => setStatusFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <span className={`filter-count count-${status}`}>
              {stats[status as keyof typeof stats]}
            </span>
          </button>
        ))}
      </div>

      {/* Quality Score Filter */}
      <div className="filter-tabs quality-score-filters">
        {(['all', 'high', 'moderate', 'low', 'none'] as QualityScoreFilter[]).map((level) => (
          <button
            key={level}
            className={`filter-tab ${qualityScoreFilter === level ? 'active' : ''}`}
            onClick={() => setQualityScoreFilter(level)}
          >
            {level === 'all' ? 'All Quality' :
             level === 'high' ? '✓ High (≥0.8)' :
             level === 'moderate' ? '⚠ Moderate' :
             level === 'low' ? '✗ Low (<0.5)' :
             '— Not Scored'}
          </button>
        ))}
      </div>

      {samples.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No samples found</h3>
          <p>
            {statusFilter === 'all' && !authorSearch
              ? 'No submissions yet.'
              : `No ${statusFilter}${authorSearch ? ` matching "${authorSearch}"` : ''} submissions.`}
          </p>
        </div>
      ) : (
        <div className="admin-sample-list">
          {samples.map((sample) => {
            const keyMeasurements = getKeyMeasurements(sample);
            return (
              <div key={sample.id} className="admin-sample-card">
                <div className="sample-card-icon">
                  {getSampleIcon(sample)}
                </div>
                <div className="sample-card-content">
                  <div className="sample-card-header">
                    <Link to={`/sample/${sample.id}`} className="sample-card-title">
                      {sample.authorName}
                    </Link>
                    <div className="admin-card-badges">
                      <QualityScoreBadge score={sample.qualityScore} />
                      <span className={`badge badge-${sample.status}`}>
                        {sample.status}
                      </span>
                    </div>
                  </div>
                  <div className="sample-card-meta">
                    <span className="sample-date">
                      {formatDate(sample.createdAt)}
                    </span>
                    {sample.location?.address && (
                      <span className="sample-location">
                        📍 {truncateAddress(sample.location.address)}
                      </span>
                    )}
                  </div>
                  <div className="sample-card-data">
                    {keyMeasurements.map((m) => (
                      <span key={m.key}>{formatMeasurementValue(m.label, m.value, m.unit)}</span>
                    ))}
                  </div>
                  {/* Metadata badges */}
                  <div className="card-meta-badges">
                    {sample.waterBodyType && findWaterBodyType(sample.waterBodyType) && (
                      <span className="meta-badge">
                        {findWaterBodyType(sample.waterBodyType)!.emoji} {findWaterBodyType(sample.waterBodyType)!.label}
                      </span>
                    )}
                    {sample.landUse && findLandUse(sample.landUse) && (
                      <span className="meta-badge">
                        {findLandUse(sample.landUse)!.emoji} {findLandUse(sample.landUse)!.label}
                      </span>
                    )}
                  </div>
                  {/* Admin Actions */}
                  <div className="admin-actions">
                    {sample.status === 'pending' && (
                      <>
                        <button
                          className="btn-approve"
                          onClick={() => handleApprove(sample.id, sample.authorName)}
                          disabled={updateSample.isPending}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => handleReject(sample.id, sample.authorName)}
                          disabled={updateSample.isPending}
                        >
                          ✗ Reject
                        </button>
                      </>
                    )}
                    {(sample.status === 'approved' || sample.status === 'rejected') && (
                      <>
                        <button
                          className="btn-revert"
                          onClick={() => handleRevert(sample.id)}
                          disabled={updateSample.isPending}
                        >
                          ↩ Revert to Pending
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(sample.id, sample.authorName)}
                          disabled={deleteSample.isPending}
                        >
                          🗑 Delete
                        </button>
                      </>
                    )}
                    {sample.status === 'rejected' && (
                      <span className="moderated-label">✗ Rejected</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmAction?.type === 'approve' && (
        <ConfirmDialog
          title="Approve Sample"
          message={`Are you sure you want to approve "${confirmAction.authorName}"'s submission? This will mark it as verified.`}
          confirmLabel="Approve"
          variant="info"
          onConfirm={handleConfirmApprove}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction?.type === 'reject' && (
        <ConfirmDialog
          title="Reject Sample"
          message={`Are you sure you want to reject "${confirmAction.authorName}"'s submission? This will mark it as invalid.`}
          confirmLabel="Reject"
          variant="warning"
          onConfirm={handleConfirmReject}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction?.type === 'delete' && (
        <ConfirmDialog
          title="Delete Sample"
          message={`Permanently delete "${confirmAction.authorName}"'s submission? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* 🔑 Change Password Section */}
      <div className="admin-section">
        <h3 className="section-title">🔑 Change Password</h3>
        <form onSubmit={handleChangePassword} className="password-form">
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
          {passwordError && <div className="form-error">{passwordError}</div>}
          {passwordSuccess && <div className="form-success">✓ Password changed successfully</div>}
          <button type="submit" className="btn-primary" disabled={isChangingPassword}>
            {isChangingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* 📋 Login History */}
      <div className="admin-section">
        <button className="section-toggle" onClick={toggleLoginHistory}>
          <h3 className="section-title">📋 Login History</h3>
          <span className={`section-chevron ${showLoginHistory ? 'open' : ''}`}>▾</span>
        </button>
        {showLoginHistory && (
          <div className="login-history">
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

      <style>{`
        .admin-dashboard {
          max-width: 800px;
          margin: 0 auto;
        }

        .admin-header {
          margin-bottom: var(--spacing-lg);
        }

        .stats-panel {
          display: flex;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-lg);
          flex-wrap: wrap;
        }

        .stat-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-lg);
          min-width: 70px;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .stat-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-total {
          background-color: #e0e7ff;
          color: #4338ca;
        }

        .stat-pending {
          background-color: #fef3c7;
          color: #d97706;
        }

        .stat-approved {
          background-color: #d1fae5;
          color: #059669;
        }

        .stat-rejected {
          background-color: #fee2e2;
          color: #dc2626;
        }

        .author-search {
          margin-bottom: var(--spacing-md);
        }

        .search-input {
          width: 100%;
          padding: var(--spacing-sm) var(--spacing-md);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          background-color: var(--color-surface);
        }

        .search-input:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .filter-tabs {
          display: flex;
          gap: var(--spacing-xs);
          margin-bottom: var(--spacing-lg);
          overflow-x: auto;
          padding-bottom: var(--spacing-xs);
        }

        .filter-tab {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-sm) var(--spacing-md);
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          cursor: pointer;
          font-size: 0.875rem;
          white-space: nowrap;
          transition: all var(--transition-fast);
        }

        .filter-tab.active {
          background-color: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        .filter-count {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-full);
          background-color: rgba(0, 0, 0, 0.1);
        }

        .filter-tab.active .filter-count {
          background-color: rgba(255, 255, 255, 0.2);
        }

        .count-pending {
          color: var(--color-pending);
        }

        .count-approved {
          color: var(--color-approved);
        }

        .count-rejected {
          color: var(--color-rejected);
        }

        .admin-sample-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .admin-sample-card {
          display: flex;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background-color: var(--color-surface);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
        }

        .sample-card-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .sample-card-content {
          flex: 1;
          min-width: 0;
        }

        .sample-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-xs);
        }

        .admin-card-badges {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .sample-card-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
          text-decoration: none;
        }

        .sample-card-title:hover {
          text-decoration: underline;
        }

        .sample-card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-bottom: var(--spacing-sm);
        }

        .sample-location {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 200px;
        }

        .sample-card-data {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-md);
          font-size: 0.875rem;
          color: var(--color-text);
          margin-bottom: var(--spacing-sm);
        }

        .card-meta-badges {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-xs);
          margin-bottom: var(--spacing-sm);
        }

        .meta-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.7rem;
          padding: 0.15rem 0.45rem;
          border-radius: var(--radius-full);
          background-color: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
          white-space: nowrap;
        }

        .admin-actions {
          display: flex;
          gap: var(--spacing-sm);
          padding-top: var(--spacing-sm);
          border-top: 1px solid var(--color-border);
        }

        .btn-approve,
        .btn-reject,
        .btn-revert,
        .btn-delete {
          padding: var(--spacing-xs) var(--spacing-md);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: background-color var(--transition-fast);
        }

        .btn-approve {
          background-color: var(--color-approved);
          color: white;
        }

        .btn-approve:hover:not(:disabled) {
          background-color: var(--color-primary-dark);
        }

        .btn-reject {
          background-color: var(--color-rejected);
          color: white;
        }

        .btn-reject:hover:not(:disabled) {
          background-color: #dc2626;
        }

        .btn-revert {
          background-color: var(--color-warning);
          color: white;
        }

        .btn-revert:hover:not(:disabled) {
          background-color: #d97706;
        }

        .btn-delete {
          background-color: var(--color-text-muted);
          color: white;
        }

        .btn-delete:hover:not(:disabled) {
          background-color: #4b5563;
        }

        .btn-approve:disabled,
        .btn-reject:disabled,
        .btn-revert:disabled,
        .btn-delete:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .moderated-label {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .admin-loading,
        .admin-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-2xl);
          gap: var(--spacing-sm);
          color: var(--color-text-muted);
        }

        .empty-state {
          text-align: center;
          padding: var(--spacing-2xl);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: var(--spacing-md);
        }

        .empty-state h3 {
          margin-bottom: var(--spacing-sm);
        }

        .empty-state p {
          color: var(--color-text-muted);
        }

        /* Admin Sections — Change Password & Login History */
        .admin-section {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          margin-top: var(--spacing-lg);
          box-shadow: var(--shadow-sm);
        }

        .section-title {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--spacing-md);
        }

        .section-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        .section-toggle .section-title {
          margin-bottom: 0;
        }

        .section-chevron {
          font-size: 0.75rem;
          transition: transform 0.2s;
          color: var(--color-text-muted);
        }

        .section-chevron.open {
          transform: rotate(180deg);
        }

        /* Password Form */
        .password-form .input-group {
          margin-bottom: var(--spacing-sm);
        }

        .password-form label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--color-text-muted);
          margin-bottom: var(--spacing-xs);
        }

        .password-form input {
          width: 100%;
          padding: var(--spacing-sm);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
        }

        .password-form input:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .form-error {
          background-color: #fee2e2;
          color: #991b1b;
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          margin-bottom: var(--spacing-sm);
        }

        .form-success {
          background-color: #dcfce7;
          color: #166534;
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          margin-bottom: var(--spacing-sm);
        }

        /* Login History */
        .login-history {
          margin-top: var(--spacing-md);
        }

        .loading-text, .empty-text {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .history-entry {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
          align-items: center;
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-md);
          background: var(--color-background);
          font-size: 0.8rem;
        }

        .history-action {
          font-weight: 500;
          min-width: 120px;
        }

        .history-meta {
          color: var(--color-text-muted);
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .history-time {
          color: var(--color-text-muted);
          font-size: 0.75rem;
          white-space: nowrap;
        }

        .history-login { border-left: 3px solid var(--color-approved); }
        .history-logout { border-left: 3px solid var(--color-border); }
        .history-password_change { border-left: 3px solid var(--color-warning); }

        @media (prefers-reduced-motion: reduce) {
          .section-chevron { transition: none; }
        }

        @media (max-width: 480px) {
          .admin-sample-card {
            flex-direction: column;
          }

          .sample-card-icon {
            width: 40px;
            height: 40px;
          }

          .history-entry {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function truncateAddress(address: string): string {
  if (address.length > 30) {
    return address.substring(0, 30) + '...';
  }
  return address;
}
