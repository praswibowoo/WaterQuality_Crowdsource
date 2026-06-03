import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSamples } from '../hooks/useSamples';
import { samplesApi } from '../api/samples';
import { MEASUREMENT_FIELDS, MEASUREMENT_PRIORITY } from '../utils/measurements';
import { findWaterBodyType, findLandUse } from '../utils/metadata';
import { Sample } from '../types';
import QualityScoreBadge from './QualityScoreBadge';

type MeasurementPriorityKey = typeof MEASUREMENT_PRIORITY[number];

interface KeyMeasurementData {
  key: MeasurementPriorityKey;
  value: number;
  unit: string;
  label: string;
}

function getKeyMeasurements(sample: Sample): KeyMeasurementData[] {
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

function formatMeasurementValue(key: MeasurementPriorityKey, value: number, unit: string, label: string): string {
  const icons: Record<MeasurementPriorityKey, string> = {
    ph: '🌊', conductivity: '⚡', salinity: '🧂',
    nitrate: '🔬', calcium: '🔬', potassium: '🔬', sodium: '🔬',
    temperature: '🌡️',
  };
  return unit ? `${icons[key]} ${label}: ${value} ${unit}` : `${icons[key]} ${label}: ${value}`;
}

function getSampleIcon(sample: Sample): string {
  const icons: Record<string, string> = { approved: '✅', rejected: '❌', pending: '⏳' };
  return icons[sample.status] || '📋';
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function truncateAddress(address: string): string {
  return address.length > 30 ? address.substring(0, 30) + '...' : address;
}

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date' },
  { value: 'ph', label: 'pH' },
  { value: 'temperature', label: 'Temperature' },
  { value: 'conductivity', label: 'Conductivity' },
  { value: 'salinity', label: 'Salinity' },
  { value: 'nitrate', label: 'Nitrate (NO₃⁻)' },
  { value: 'calcium', label: 'Calcium (Ca²⁺)' },
  { value: 'potassium', label: 'Potassium (K⁺)' },
  { value: 'sodium', label: 'Sodium (Na⁺)' },
  { value: 'authorName', label: 'Author' },
];

export default function SampleList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [authorSearch, setAuthorSearch] = useState(searchParams.get('author') || '');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('to') || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const filters = {
    status: statusFilter === 'all' ? undefined : statusFilter,
    authorName: authorSearch || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortBy,
    sortOrder,
  };

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useSamples(filters);

  const samples = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: '200px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const blob = await samplesApi.exportCsv(statusFilter === 'all' ? undefined : statusFilter);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `water-samples-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setExportError('Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setAuthorSearch('');
    setDateFrom('');
    setDateTo('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setSearchParams({});
  };

  const hasActiveFilters = authorSearch || dateFrom || dateTo;

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  if (isLoading) {
    return (
      <div className="sample-list-container">
        <div className="loading-state">
          <span className="spinner" />
          <p>Loading samples...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sample-list-container">
        <div className="error-state">
          <p>Error loading samples: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sample-list-container">
      <div className="list-header">
        <div>
          <h2>Water Samples</h2>
          <p className="list-subtitle">Research data view</p>
        </div>
        <span className="count-badge">{totalCount} samples</span>
      </div>

      <div className="filter-section">
        <div className="status-tabs">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              className={`tab ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="search-row">
          <input
            type="text"
            placeholder="Search by author name..."
            value={authorSearch}
            onChange={(e) => setAuthorSearch(e.target.value)}
          />
          <div className="sort-controls">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="sort-order-btn"
              onClick={toggleSortOrder}
              title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
            >
              {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>
        </div>

        <div className="date-row">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From"
          />
          <span className="date-separator">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To"
          />
          {hasActiveFilters && (
            <button className="btn-clear" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>

        <div className="action-row">
          <button className="btn-export" onClick={handleExportCsv} disabled={isExporting}>
            {isExporting ? (
              <><span className="spinner" style={{ width: '1rem', height: '1rem' }} /> Exporting...</>
            ) : (
              '📥 Export CSV'
            )}
          </button>
          {exportError && <p className="export-error">{exportError}</p>}
        </div>
      </div>

      {samples.length === 0 ? (
        <div className="empty-state">
          {hasActiveFilters ? (
            <p>No samples match your filters. Try clearing filters or adjusting dates.</p>
          ) : (
            <p>No submissions yet. <Link to="/submit">Submit a sample →</Link></p>
          )}
          {hasActiveFilters && <button onClick={clearFilters} className="btn-clear">Clear filters</button>}
        </div>
      ) : (
        <div className="sample-grid">
          {samples.map((sample) => {
            const measurements = getKeyMeasurements(sample);
            return (
              <Link key={sample.id} to={`/sample/${sample.id}`} className="sample-card research-card">
                <div className="card-header">
                  <span className="card-date">{formatDate(sample.createdAt)}</span>
                  <div className="card-header-right">
                    {sample.qualityScore != null && (
                      <QualityScoreBadge score={sample.qualityScore} />
                    )}
                    <span className={`status-badge status-${sample.status}`}>
                      {getSampleIcon(sample)} {sample.status}
                    </span>
                  </div>
                </div>

                <div className="card-author">{sample.authorName}</div>

                {measurements.length > 0 && (
                  <div className="card-measurements">
                    {measurements.map((m) => (
                      <span key={m.key}>{formatMeasurementValue(m.key, m.value, m.unit, m.label)}</span>
                    ))}
                  </div>
                )}

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

                {sample.location?.address && (
                  <div className="card-location">
                    📍 {truncateAddress(sample.location.address)}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Infinite scroll sentinel + progress */}
      {samples.length > 0 && (
        <div className="pagination-footer">
          <div className="progress-text">
            Showing {samples.length} of {totalCount} samples
            {isFetchingNextPage && (
              <span className="loading-inline">
                <span className="spinner" style={{ width: '0.8rem', height: '0.8rem', display: 'inline-block' }} />
                {' '}Loading more...
              </span>
            )}
          </div>
          {hasNextPage && (
            <div ref={sentinelRef} className="scroll-sentinel" />
          )}
          {!hasNextPage && samples.length >= totalCount && (
            <p className="all-loaded-text">All samples loaded</p>
          )}
        </div>
      )}

      <style>{`
        .sample-list-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }

        .list-subtitle {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin-top: var(--spacing-xs);
        }

        .count-badge {
          background: var(--color-primary);
          color: white;
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          font-weight: 500;
        }

        .status-badge {
          font-size: 0.7rem;
          padding: 0.2rem 0.4rem;
          border-radius: var(--radius-full);
          opacity: 0.7;
        }

        .status-pending { background: #fef3c7; color: #92400e; }
        .status-approved { background: #dcfce7; color: #166534; }
        .status-rejected { background: #fee2e2; color: #991b1b; }

        .card-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: var(--spacing-xs);
          order: 2;
        }

        .card-header-right {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .card-date {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .sample-card.research-card {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .sample-card.research-card .card-author {
          font-size: 1.125rem;
          font-weight: 600;
          order: 1;
        }

        .sample-card.research-card .card-measurements {
          order: 3;
          background: var(--color-background);
          padding: var(--spacing-sm);
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--color-text);
        }

        .sample-card.research-card .card-location {
          order: 4;
          margin-top: auto;
        }

        .sample-card.research-card .status-badge {
          font-size: 0.65rem;
          padding: 0.15rem 0.35rem;
        }

        .filter-section {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          margin-bottom: var(--spacing-md);
          box-shadow: var(--shadow-sm);
        }

        .status-tabs {
          display: flex;
          gap: var(--spacing-xs);
          margin-bottom: var(--spacing-md);
          overflow-x: auto;
        }

        .status-tabs .tab {
          padding: var(--spacing-xs) var(--spacing-sm);
          border: none;
          background: var(--color-background);
          border-radius: var(--radius-full);
          cursor: pointer;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          white-space: nowrap;
        }

        .status-tabs .tab.active {
          background: var(--color-primary);
          color: white;
        }

        .tab-count {
          font-size: 0.75rem;
          opacity: 0.8;
        }

        .search-row {
          display: flex;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
        }

        .search-row input {
          flex: 1;
          padding: var(--spacing-sm);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
        }

        .sort-controls {
          display: flex;
          gap: var(--spacing-xs);
          align-items: center;
        }

        .sort-controls select {
          padding: var(--spacing-sm);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          background: white;
        }

        .sort-order-btn {
          padding: var(--spacing-sm);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          background: white;
          cursor: pointer;
          line-height: 1;
        }

        .sort-order-btn:hover {
          background: var(--color-background);
        }

        .date-row {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
        }

        .date-row input {
          padding: var(--spacing-sm);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
        }

        .date-separator {
          color: var(--color-text-muted);
        }

        .btn-clear {
          margin-left: auto;
          padding: var(--spacing-xs) var(--spacing-sm);
          background: none;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          cursor: pointer;
        }

        .action-row {
          display: flex;
          justify-content: flex-end;
        }

        .btn-export {
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          cursor: pointer;
        }

        .sample-grid {
          display: grid;
          gap: var(--spacing-md);
        }

        .sample-card {
          display: block;
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          text-decoration: none;
          color: inherit;
          box-shadow: var(--shadow-sm);
          transition: box-shadow var(--transition-fast);
        }

        .sample-card:hover {
          box-shadow: var(--shadow-md);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: var(--spacing-xs);
        }

        .status-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-full);
        }

        .status-pending { background: #fef3c7; color: #92400e; }
        .status-approved { background: #dcfce7; color: #166534; }
        .status-rejected { background: #fee2e2; color: #991b1b; }

        .card-date {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .card-author {
          font-weight: 600;
          margin-bottom: var(--spacing-xs);
        }

        .card-measurements {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-xs);
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .card-location {
          margin-top: var(--spacing-xs);
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .card-meta-badges {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-xs);
          margin-top: var(--spacing-xs);
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

        .empty-state {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--color-text-muted);
        }

        .loading-state, .error-state {
          text-align: center;
          padding: var(--spacing-xl);
        }

        .pagination-footer {
          text-align: center;
          margin: var(--spacing-lg) 0;
        }

        .progress-text {
          color: var(--color-text-muted);
          font-size: 0.85rem;
          margin-bottom: var(--spacing-sm);
        }

        .loading-inline {
          color: var(--color-primary);
          font-weight: 500;
        }

        .scroll-sentinel {
          height: 1px;
        }

        .all-loaded-text {
          color: var(--color-text-muted);
          font-size: 0.8rem;
        }

        @media (max-width: 480px) {
          .search-row, .date-row {
            flex-direction: column;
          }

          .btn-clear {
            margin-left: 0;
            margin-top: var(--spacing-xs);
          }

          .sort-controls {
            width: 100%;
          }

          .sort-controls select {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}
