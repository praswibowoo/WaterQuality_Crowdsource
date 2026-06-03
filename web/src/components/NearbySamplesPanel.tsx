import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useNearbySamples } from '../hooks/useNearbySamples';
import type { NearbySample } from '../hooks/useNearbySamples';

const RADIUS_OPTIONS = [
  { value: 100, label: '100m' },
  { value: 500, label: '500m' },
  { value: 1000, label: '1km' },
  { value: 2000, label: '2km' },
  { value: 5000, label: '5km' },
];

interface NearbySamplesPanelProps {
  userLocation?: [number, number] | null;
  onClose?: () => void;
}

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function NearbySamplesPanel({ userLocation, onClose }: NearbySamplesPanelProps) {
  const { samples, isLoading, error, radius, setRadius, search } = useNearbySamples();

  const searchRef = useRef(search);
  searchRef.current = search;

  const lastSearchedRef = useRef<[number, number] | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-search on mount when GPS position is available
  useEffect(() => {
    if (userLocation) {
      lastSearchedRef.current = userLocation;
      searchRef.current(userLocation[0], userLocation[1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-search when radius changes
  useEffect(() => {
    if (lastSearchedRef.current) {
      searchRef.current(lastSearchedRef.current[0], lastSearchedRef.current[1]);
    }
  }, [radius]);

  // Debounced re-search when GPS position moves significantly
  useEffect(() => {
    if (!userLocation) return;

    const hasSearched = lastSearchedRef.current !== null;

    if (!hasSearched) {
      lastSearchedRef.current = userLocation;
      searchRef.current(userLocation[0], userLocation[1]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const dist = haversineDistance(
        lastSearchedRef.current![0], lastSearchedRef.current![1],
        userLocation[0], userLocation[1]
      );
      if (dist > 50) {
        lastSearchedRef.current = userLocation;
        searchRef.current(userLocation[0], userLocation[1]);
      }
    }, 2000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userLocation]);

  return (
    <div className="nearby-panel">
      <div className="nearby-panel-header">
        <h3>📍 Nearby Samples</h3>
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          <button
            className={`btn-refresh ${isLoading ? 'spinning' : ''}`}
            onClick={() => userLocation && search(userLocation[0], userLocation[1])}
            disabled={isLoading || !userLocation}
            title="Refresh results"
          >
            ↻
          </button>
          {onClose && (
            <button className="nearby-close-btn" onClick={onClose}>✕</button>
          )}
        </div>
      </div>

      <div className="nearby-radius-control">
        <label>Radius:</label>
        <div className="radius-options">
          {RADIUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`radius-btn ${radius === opt.value ? 'active' : ''}`}
              onClick={() => setRadius(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="nearby-error">{error}</div>}

      {isLoading && <div className="nearby-status">Searching for nearby samples...</div>}

      {!isLoading && samples.length === 0 && !error && (
        <div className="nearby-status">
          {userLocation
            ? `No samples found within ${radius}m. Try a larger radius.`
            : 'Waiting for GPS signal...'}
        </div>
      )}

      {samples.length > 0 && (
        <>
          <div className="nearby-count">{samples.length} sample{samples.length !== 1 ? 's' : ''} found</div>
          <div className="nearby-results">
            {samples.map((sample) => (
              <SampleCard key={sample.id} sample={sample} />
            ))}
          </div>
        </>
      )}

      <style>{`
        .nearby-panel {
          background: white;
          border-radius: var(--radius-lg);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          padding: var(--spacing-md);
          max-height: 400px;
          display: flex;
          flex-direction: column;
        }
        .nearby-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-sm);
        }
        .nearby-panel-header h3 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }
        .nearby-close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--color-text-muted);
          padding: var(--spacing-xs);
          line-height: 1;
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-refresh {
          background: none;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 1rem;
          cursor: pointer;
          color: var(--color-text-muted);
          padding: 0.1rem 0.4rem;
          line-height: 1.2;
        }
        .btn-refresh:hover {
          background: var(--color-surface);
        }
        .btn-refresh:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-refresh.spinning {
          animation: spin 1s linear infinite;
        }
        .nearby-radius-control {
          margin-bottom: var(--spacing-sm);
        }
        .nearby-radius-control label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-right: var(--spacing-sm);
        }
        .radius-options {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
          margin-top: 0.25rem;
        }
        .radius-btn {
          padding: 0.5rem 0.75rem;
          font-size: 0.8rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: white;
          cursor: pointer;
          color: var(--color-text-muted);
          flex: 1;
          text-align: center;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .radius-btn.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }
        .nearby-error {
          background: #fee2e2;
          color: #991b1b;
          padding: var(--spacing-sm);
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          margin-bottom: var(--spacing-sm);
        }
        .nearby-status {
          color: var(--color-text-muted);
          font-size: 0.8rem;
          padding: var(--spacing-md);
          text-align: center;
        }
        .nearby-count {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-bottom: var(--spacing-sm);
        }
        .nearby-results {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          overflow-y: auto;
          flex: 1;
        }
        .nearby-card {
          display: block;
          padding: var(--spacing-sm);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          text-decoration: none;
          color: inherit;
          transition: border-color var(--transition-fast);
        }
        .nearby-card:hover {
          border-color: var(--color-primary);
        }
        .nearby-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.15rem;
        }
        .nearby-card-author {
          font-weight: 600;
          font-size: 0.8rem;
        }
        .nearby-card-distance {
          font-size: 0.7rem;
          color: var(--color-primary);
          font-weight: 600;
        }
        .nearby-card-meta {
          display: flex;
          gap: var(--spacing-sm);
          font-size: 0.7rem;
          color: var(--color-text-muted);
        }
        .measurement {
          background: var(--color-background);
          padding: 0.1rem 0.3rem;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}

function SampleCard({ sample }: { sample: NearbySample }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      default: return '⏳';
    }
  };

  return (
    <Link to={`/sample/${sample.id}`} className="nearby-card">
      <div className="nearby-card-top">
        <span className="nearby-card-author">{sample.authorName}</span>
        <span className="nearby-card-distance">{sample.distance_meters.toFixed(0)}m</span>
      </div>
      <div className="nearby-card-meta">
        <span>{getStatusIcon(sample.status)}</span>
        {sample.ph !== null && <span className="measurement">pH: {sample.ph}</span>}
        {sample.temperature !== null && <span className="measurement">{sample.temperature}°C</span>}
        {sample.conductivity !== null && <span className="measurement">{sample.conductivity} µS</span>}
      </div>
    </Link>
  );
}
