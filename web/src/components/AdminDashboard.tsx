import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSamples, useUpdateSample, useDeleteSample, useSamplesStats } from '../hooks/useSamples';
import { findWaterBodyType, findLandUse } from '../utils/metadata';
import { getKeyMeasurements, formatMeasurementValue, getMeasurementIcon, formatDate, truncateAddress } from '../utils/display';
import { useDebounce } from '../hooks/useDebounce';
import QualityScoreBadge from './QualityScoreBadge';
import ConfirmDialog from './ConfirmDialog';
import AdminUsersTab from './AdminUsersTab';
import AdminPasswordChange from './admin/AdminPasswordChange';
import AdminLoginHistory from './admin/AdminLoginHistory';
import SyncLogViewer from './SyncLogViewer';
import PasswordResetRequestsPanel from './PasswordResetRequestsPanel';
import BatchActionBar from './BatchActionBar';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type QualityScoreFilter = 'all' | 'high' | 'moderate' | 'low' | 'none';

export default function AdminDashboard() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [qualityScoreFilter, setQualityScoreFilter] = useState<QualityScoreFilter>('all');
  const [authorSearchInput, setAuthorSearchInput] = useState('');
  const authorSearch = useDebounce(authorSearchInput.trim(), 300);

  // Server-side filtering: pass status, qualityScore, and authorName to API
  const filters = {
    status: statusFilter === 'all' ? undefined : statusFilter,
    qualityScoreFilter: qualityScoreFilter === 'all' ? undefined : qualityScoreFilter,
    authorName: authorSearch || undefined,
    sortBy: 'createdAt' as const,
    sortOrder: 'desc' as const,
  };

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useSamples(filters);
  const { data: statsData } = useSamplesStats();
  const updateSample = useUpdateSample();
  const deleteSample = useDeleteSample();
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject' | 'delete' | 'revert';
    sampleId: string;
    authorName: string;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // WQ-195: batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const clearActionFeedback = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  // WQ-195: batch selection helpers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === samples.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(samples.map((s) => s.id)));
    }
  };

  // Clear confirm dialog when filters change
  useEffect(() => {
    setConfirmAction(null);
  }, [statusFilter, qualityScoreFilter, authorSearch]);

  const [activeTab, setActiveTab] = useState<'samples' | 'users'>('samples');

  // Flatten paginated data
  const samples = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data]
  );
  const totalCount = data?.pages?.[0]?.totalCount ?? 0;

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
    clearActionFeedback();
    try {
      await updateSample.mutateAsync({ id: confirmAction.sampleId, data: { status: 'approved' } });
      setActionSuccess('Sample approved successfully');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to approve sample:', err);
      setActionError('Failed to approve sample');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleReject = async (id: string, author: string) => {
    setConfirmAction({ type: 'reject', sampleId: id, authorName: author });
  };

  const handleConfirmReject = async () => {
    if (!confirmAction) return;
    clearActionFeedback();
    try {
      await updateSample.mutateAsync({ id: confirmAction.sampleId, data: { status: 'rejected' } });
      setActionSuccess('Sample rejected');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to reject sample:', err);
      setActionError('Failed to reject sample');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleRevert = (id: string, author: string) => {
    setConfirmAction({ type: 'revert', sampleId: id, authorName: author });
  };

  const handleConfirmRevert = async () => {
    if (!confirmAction) return;
    clearActionFeedback();
    try {
      await updateSample.mutateAsync({ id: confirmAction.sampleId, data: { status: 'pending' } });
      setActionSuccess('Sample reverted to pending');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to revert sample:', err);
      setActionError('Failed to revert sample');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleDelete = async (id: string, author: string) => {
    setConfirmAction({ type: 'delete', sampleId: id, authorName: author });
  };

  const handleConfirmDelete = async () => {
    if (!confirmAction) return;
    clearActionFeedback();
    try {
      await deleteSample.mutateAsync(confirmAction.sampleId);
      setActionSuccess('Sample deleted');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to delete sample:', err);
      setActionError('Failed to delete sample. Please try again.');
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
        <button className="retry-btn" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h2 className="page-title">Admin Dashboard</h2>
        <p className="page-subtitle">Review and moderate water quality submissions</p>
      </div>

      {/* Action feedback */}
      {actionSuccess && <div className="form-success">{actionSuccess}</div>}
      {actionError && <div className="form-error">{actionError}</div>}

      {/* Tab Navigation */}
      <div className="tab-nav" role="tablist">
        <button
          className={`tab-nav-btn ${activeTab === 'samples' ? 'active' : ''}`}
          onClick={() => setActiveTab('samples')}
          role="tab"
          aria-selected={activeTab === 'samples'}
          aria-controls="samples-tab"
        >📋 Samples</button>
        <button
          className={`tab-nav-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
          role="tab"
          aria-selected={activeTab === 'users'}
          aria-controls="users-tab"
        >👥 Users</button>
      </div>

      {activeTab === 'samples' ? (<div id="samples-tab" role="tabpanel">
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
          value={authorSearchInput}
          onChange={(e) => setAuthorSearchInput(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="filter-tabs">
        <label className="select-all-label" aria-label="Select all visible samples">
          <input
            type="checkbox"
            checked={samples.length > 0 && selectedIds.size === samples.length}
            onChange={handleSelectAll}
          />
          All
        </label>
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

      {samples.length === 0 && !isLoading ? (
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
                <input
                  type="checkbox"
                  className="sample-select-cb"
                  checked={selectedIds.has(sample.id)}
                  onChange={() => handleToggleSelect(sample.id)}
                  aria-label={`Select sample by ${sample.authorName}`}
                />
                <Link to={`/sample/${sample.id}`} className="sample-card-link">
                  <div className="sample-card-icon">
                    {getMeasurementIcon(sample)}
                  </div>
                  <div className="sample-card-content">
                    <div className="sample-card-header">
                      <span className="sample-card-title">
                        {sample.authorName}
                      </span>
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
                  </div>
                </Link>
                {/* Admin Actions — outside Link to prevent navigation */}
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
                        onClick={() => handleRevert(sample.id, sample.authorName)}
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
            );
          })}
        </div>
      )}

      {samples.length > 0 && (
        <div className="pagination-bar">
          <span className="pagination-info">
            Showing {samples.length}{totalCount > samples.length ? ` of ${totalCount}` : ''} samples
            {isFetchingNextPage && <span className="pagination-loading"> · Loading more...</span>}
          </span>
          {hasNextPage && (
            <button
              className="btn-primary"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              style={{ fontSize: '0.8rem', padding: 'var(--spacing-xs) var(--spacing-md)' }}
            >
              {isFetchingNextPage ? 'Loading...' : 'Load More'}
            </button>
          )}
        </div>
      )}

      {confirmAction?.type === 'approve' && (
        <ConfirmDialog
          title="Approve Sample"
          message={`Are you sure you want to approve ${confirmAction.authorName}'s submission? This will mark it as verified.`}
          confirmLabel="Approve"
          variant="info"
          onConfirm={handleConfirmApprove}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction?.type === 'reject' && (
        <ConfirmDialog
          title="Reject Sample"
          message={`Are you sure you want to reject ${confirmAction.authorName}'s submission? This will mark it as invalid.`}
          confirmLabel="Reject"
          variant="warning"
          onConfirm={handleConfirmReject}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction?.type === 'revert' && (
        <ConfirmDialog
          title="Revert to Pending"
          message={`Revert ${confirmAction.authorName}'s submission back to pending status?`}
          confirmLabel="Revert"
          variant="warning"
          onConfirm={handleConfirmRevert}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction?.type === 'delete' && (
        <ConfirmDialog
          title="Delete Sample"
          message={`Permanently delete ${confirmAction.authorName}'s submission? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* WQ-195: Batch Action Bar */}
      <BatchActionBar
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        sampleCount={samples.length}
        onSelectAll={handleSelectAll}
        onSuccess={(msg) => { setActionSuccess(msg); setTimeout(() => setActionSuccess(null), 3000); }}
        onError={(msg) => setActionError(msg)}
      />

      </div>) : (
        <div id="users-tab" role="tabpanel">
          <AdminUsersTab />

          {/* WQ-196v2: Reset Requests Panel */}
          <PasswordResetRequestsPanel
            onSuccess={(msg) => { setActionSuccess(msg); setTimeout(() => setActionSuccess(null), 8000); }}
            onError={(msg) => setActionError(msg)}
          />
        </div>
      )}

      {/* 🔑 Change Password Section */}
      <AdminPasswordChange />

      {/* 🔧 Sync Log */}
      <div className="admin-section">
        <SyncLogViewer previewMode={true} />
      </div>

      {/* 📋 Login History */}
      <AdminLoginHistory />

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
          flex-direction: column;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          background-color: var(--color-surface);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          transition: box-shadow var(--transition-fast);
        }
        .admin-sample-card:hover {
          box-shadow: var(--shadow-md);
        }

        .sample-card-link {
          display: flex;
          gap: var(--spacing-md);
          text-decoration: none;
          color: inherit;
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
          background-color: #16a34a;
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

        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-md) 0;
          gap: var(--spacing-sm);
        }
        .pagination-info {
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }
        .pagination-loading {
          font-style: italic;
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
        .retry-btn {
          padding: var(--spacing-xs) var(--spacing-md);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: 0.8rem;
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

        /* Tab Navigation */
        .tab-nav { display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-lg); border-bottom: 2px solid var(--color-border); padding-bottom: 0; }
        .tab-nav-btn { padding: var(--spacing-sm) var(--spacing-md); border: none; background: none; cursor: pointer; font-size: 0.875rem; color: var(--color-text-muted); border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.15s; }
        .tab-nav-btn.active { color: var(--color-primary); border-bottom-color: var(--color-primary); font-weight: 600; }
        .tab-nav-btn:hover:not(.active) { color: var(--color-text); }

        /* Users Tab */
        .users-tab { margin-top: var(--spacing-md); }
        .users-tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md); }
        .users-tab-title { font-size: 0.875rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
        .users-table-wrapper { overflow-x: auto; }
        .users-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .users-table th { text-align: left; padding: var(--spacing-sm); font-weight: 600; color: var(--color-text-muted); border-bottom: 2px solid var(--color-border); white-space: nowrap; }
        .users-table td { padding: var(--spacing-sm); border-bottom: 1px solid var(--color-border); vertical-align: middle; }
        .users-table tbody tr:hover { background: var(--color-background); }
        .inactive-row { opacity: 0.6; }
        .user-name { font-weight: 500; }
        .user-username { font-family: monospace; color: var(--color-text-muted); }
        .role-badge { display: inline-block; padding: 0.1rem 0.4rem; border-radius: var(--radius-full); font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
        .role-admin { background: #e0e7ff; color: #4338ca; }
        .role-user { background: #f0fdf4; color: #166534; }
        .st-badge { display: inline-block; padding: 0.1rem 0.4rem; border-radius: var(--radius-full); font-size: 0.7rem; font-weight: 600; }
        .st-badge.st-active { background: #dcfce7; color: #166534; }
        .st-badge.st-inactive { background: #fee2e2; color: #991b1b; }
        .user-actions { display: flex; gap: var(--spacing-xs); white-space: nowrap; }
        .btn-tiny { padding: 0.2rem 0.5rem; border: none; border-radius: var(--radius-md); font-size: 0.7rem; cursor: pointer; white-space: nowrap; }
        .btn-green { background: #dcfce7; color: #166534; }
        .btn-amber { background: #fef3c7; color: #92400e; }
        .btn-gray { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
        .btn-tiny:hover { filter: brightness(0.95); }
        /* Modal */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-card { background: var(--color-surface); border-radius: var(--radius-xl); padding: var(--spacing-lg); width: 90%; max-width: 450px; max-height: 80vh; overflow-y: auto; }
        .modal-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md); }
        .modal-hdr h3 { font-size: 1.125rem; margin: 0; }
        .modal-x { font-size: 1.5rem; background: none; border: none; cursor: pointer; color: var(--color-text-muted); line-height: 1; }
        .modal-card .input-group { margin-bottom: var(--spacing-sm); }
        .modal-card label { display: block; font-size: 0.75rem; font-weight: 500; color: var(--color-text-muted); margin-bottom: var(--spacing-xs); }
        .modal-card input, .modal-card select { width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.875rem; background: var(--color-surface); }
        .temp-pw-box { text-align: center; padding: var(--spacing-md) 0; }
        .temp-pw-label { font-size: 0.8rem; color: var(--color-text-muted); margin: var(--spacing-md) 0 var(--spacing-sm); }
        .temp-pw-val { font-family: monospace; font-size: 1.5rem; font-weight: 700; letter-spacing: 0.1em; background: #f0fdf4; color: #166534; padding: var(--spacing-md); border-radius: var(--radius-md); border: 2px dashed #86efac; margin-bottom: var(--spacing-sm); }
        .temp-pw-note { font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: var(--spacing-md); }

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

        /* WQ-195: batch selection */
        .select-all-label {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          color: var(--color-text-muted);
          padding: 4px 8px;
          border-radius: var(--radius-md);
        }
        .select-all-label:hover { background: var(--color-background); }
        .sample-select-cb {
          position: absolute;
          top: 8px;
          left: 8px;
          width: 18px;
          height: 18px;
          cursor: pointer;
          z-index: 1;
        }
        .admin-sample-card { position: relative; }
        .batch-action-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 2px solid var(--color-primary);
          padding: var(--spacing-sm) var(--spacing-md);
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          z-index: 100;
          box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
        }
        .batch-count {
          font-weight: 600;
          color: var(--color-text);
          margin-right: auto;
        }
        .btn-clear {
          background: var(--color-background);
          border: 1px solid var(--color-border);
          padding: 6px 12px;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: 0.8rem;
        }
        .btn-clear:hover { background: var(--color-border); }

        /* WQ-195/196v2: modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
        }
        .modal-content {
          background: white;
          border-radius: 12px;
          padding: var(--spacing-xl);
          max-width: 480px;
          width: 90%;
          box-shadow: 0 4px 24px rgba(0,0,0,0.2);
        }
        .modal-content h3 { margin: 0 0 var(--spacing-sm); }
        .modal-actions {
          display: flex;
          gap: var(--spacing-sm);
          justify-content: flex-end;
          margin-top: var(--spacing-lg);
        }
        .btn-cancel {
          background: var(--color-background);
          border: 1px solid var(--color-border);
          padding: 8px 16px;
          border-radius: var(--radius-md);
          cursor: pointer;
        }

        /* WQ-196v2: reset requests */
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
