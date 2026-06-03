import { useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSamples, useSamplesStats } from '../hooks/useSamples';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'react-leaflet-markercluster/styles';
import L from 'leaflet';
import { useMapMarkers } from '../hooks/useMapMarkers';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_LAT = parseFloat(import.meta.env.VITE_DEFAULT_LAT || '-7.3059612');
const DEFAULT_LNG = parseFloat(import.meta.env.VITE_DEFAULT_LNG || '112.8443053');
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

function MapController({ userPosition }: { userPosition: [number, number] | null }) {
  const map = useMap();
  const hasCentered = useMemo(() => ({ current: false }), []);

  useEffect(() => {
    if (userPosition && !hasCentered.current) {
      hasCentered.current = true;
      map.flyTo(userPosition, 15);
    }
  }, [userPosition, map, hasCentered]);

  return null;
}

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const { data: statsData, isLoading: statsLoading } = useSamplesStats();
  const { data: recentData, isLoading: recentLoading } = useSamples();
  const { data: markers, isLoading: markersLoading } = useMapMarkers();
  const { latitude, longitude, accuracy, startTracking, stopTracking } = useGeolocation();

  // Start GPS tracking on mount
  useEffect(() => {
    startTracking();
    return () => stopTracking();
  }, [startTracking, stopTracking]);

  const userPosition = useMemo<[number, number] | null>(() => {
    if (latitude && longitude) return [latitude, longitude];
    return null;
  }, [latitude, longitude]);

  const stats = {
    total: statsData?.total ?? 0,
    pending: statsData?.pending ?? 0,
    approved: statsData?.approved ?? 0,
    rejected: statsData?.rejected ?? 0,
  };

  const recentSamples = recentData?.pages?.flatMap((p) => p.data) ?? [];

  return (
    <div className="home-page">
      {/* Hero Map */}
      <div className="home-map-wrapper">
        {markersLoading ? (
          <div className="home-map-placeholder">
            <div className="spinner" />
            <span>Loading map...</span>
          </div>
        ) : (
          <MapContainer
            center={[DEFAULT_LAT, DEFAULT_LNG]}
            zoom={13}
            scrollWheelZoom={false}
            style={{ height: '300px', width: '100%', borderRadius: 'var(--radius-lg)' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url={TILE_URL}
            />
            {userPosition && <MapController userPosition={userPosition} />}
            {userPosition && (
              <CircleMarker
                center={userPosition}
                radius={8}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.9,
                  weight: 2,
                  opacity: 1,
                }}
              >
                <Popup>Your location ({accuracy ? `${Math.round(accuracy)}m accuracy` : ''})</Popup>
              </CircleMarker>
            )}
            <MarkerClusterGroup
              showCoverageOnHover={false}
              maxClusterRadius={50}
              spiderfyOnMaxZoom={true}
              iconCreateFunction={(cluster: { getChildCount: () => number }) => {
                const count = cluster.getChildCount();
                return L.divIcon({
                  html: `<div class="cluster-icon">${count}</div>`,
                  className: 'custom-marker-cluster',
                  iconSize: L.point(40, 40),
                });
              }}
            >
              {markers?.map((sample) => (
                <Marker
                  key={sample.id}
                  position={[sample.location.latitude, sample.location.longitude]}
                >
                  <Popup>
                    <strong>{sample.authorName}</strong><br />
                    pH: {sample.ph ?? '—'}<br />
                    {sample.location.latitude.toFixed(4)}, {sample.location.longitude.toFixed(4)}
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        )}
      </div>

      {/* Stats */}
      <div className="home-stats">
        <div className="stat-card stat-total">
          <span className="stat-value">{statsLoading ? '—' : stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card stat-approved">
          <span className="stat-value">{statsLoading ? '—' : stats.approved}</span>
          <span className="stat-label">Approved</span>
        </div>
        <div className="stat-card stat-pending">
          <span className="stat-value">{statsLoading ? '—' : stats.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-card stat-rejected">
          <span className="stat-value">{statsLoading ? '—' : stats.rejected}</span>
          <span className="stat-label">Rejected</span>
        </div>
      </div>

      {/* Recent Samples */}
      {recentLoading ? (
        <div className="home-loading">Loading recent submissions...</div>
      ) : recentSamples.length > 0 ? (
        <div className="home-recent">
          <h3>Recent Submissions</h3>
          <div className="recent-list">
            {recentSamples.slice(0, 5).map((sample) => (
              <Link to={`/sample/${sample.id}`} key={sample.id} className="recent-item">
                <span className="recent-author">{sample.authorName}</span>
                <span className="recent-meta">
                  {sample.ph != null && `pH ${sample.ph}`}
                  {sample.temperature != null && ` · ${sample.temperature}°C`}
                </span>
                <span className="recent-date">
                  {new Date(sample.createdAt).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* CTA */}
      <div className="home-cta">
        <Link to={isAuthenticated ? '/submit' : '/login'} className="cta-button">
          {isAuthenticated ? '💧 Submit a Sample' : '🔑 Sign In to Submit'}
        </Link>
      </div>

      <style>{`
        .home-page {
          max-width: 800px;
          margin: 0 auto;
          padding: var(--spacing-md);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }
        .home-map-wrapper {
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }
        .home-map-placeholder {
          height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          background: var(--color-background);
          border-radius: var(--radius-lg);
          color: var(--color-text-muted);
        }
        .home-loading {
          text-align: center;
          padding: var(--spacing-md);
          color: var(--color-text-muted);
          font-size: 0.875rem;
        }
        .home-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-sm);
        }
        @media (max-width: 480px) {
          .home-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--spacing-md);
          border-radius: var(--radius-lg);
          text-align: center;
        }
        .stat-card .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
        }
        .stat-card .stat-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .stat-total { background: var(--color-admin-role-bg); color: var(--color-admin-role-text); }
        .stat-approved { background: var(--color-approved-bg); color: var(--color-approved-text); }
        .stat-pending { background: var(--color-pending-bg); color: var(--color-pending-text); }
        .stat-rejected { background: var(--color-rejected-bg); color: var(--color-rejected-text); }
        .home-recent h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: var(--spacing-sm);
          color: var(--color-text);
        }
        .recent-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }
        .recent-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          text-decoration: none;
          color: inherit;
          transition: border-color var(--transition-fast);
        }
        .recent-item:hover {
          border-color: var(--color-primary);
        }
        .recent-author {
          font-weight: 600;
          font-size: 0.875rem;
        }
        .recent-meta {
          flex: 1;
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }
        .recent-date {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          white-space: nowrap;
        }
        .home-cta {
          text-align: center;
        }
        .cta-button {
          display: inline-block;
          padding: var(--spacing-md) var(--spacing-xl);
          background: var(--color-primary);
          color: white;
          border-radius: var(--radius-lg);
          font-size: 1rem;
          font-weight: 600;
          text-decoration: none;
          transition: background var(--transition-fast);
        }
        .cta-button:hover {
          background: var(--color-primary-dark);
        }
        .custom-marker-cluster {
          background: transparent;
        }
        .cluster-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 0.875rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          border: 2px solid white;
        }
      `}</style>
    </div>
  );
}
