import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'react-leaflet-markercluster/styles';
import L from 'leaflet';
import { useMapMarkers, type SampleMapMarker } from '../hooks/useMapMarkers';
import { useGeolocation } from '../hooks/useGeolocation';
import { getStatusIcon } from './MarkerIcon';
import { MEASUREMENT_FIELDS, MEASUREMENT_PRIORITY } from '../utils/measurements';
import NearbySamplesPanel from './NearbySamplesPanel';

// Teal pin icon for user-dropped search pin
const searchPinIcon = L.divIcon({
  html: `<div style="
    width: 32px; height: 32px;
    background: linear-gradient(135deg, #0d9488, #0f766e);
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
  ">📍</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Get top 3 measurements for popup
function getTopMeasurements(sample: SampleMapMarker) {
  return MEASUREMENT_PRIORITY
    .filter(key => sample[key] !== null && sample[key] !== undefined)
    .slice(0, 3)
    .map(key => ({
      key,
      label: MEASUREMENT_FIELDS[key].label,
      value: sample[key],
      unit: MEASUREMENT_FIELDS[key].unit
    }));
}

// Default center to Mangrove Wonorejo, configurable via env
const DEFAULT_CENTER: [number, number] = [
  parseFloat(import.meta.env.VITE_DEFAULT_LAT || '-7.3059612'),
  parseFloat(import.meta.env.VITE_DEFAULT_LNG || '112.8443053'),
];

// Memoized MapController that only auto-pans on first fix or significant movement
const MapController = React.memo(function MapController({
  userPosition,
  followUser,
}: {
  userPosition: [number, number] | null;
  followUser: boolean;
}) {
  const map = useMap();
  const lastPanRef = useRef<[number, number] | null>(null);

  // Reset pan tracker when followUser toggles on — always re-center on toggle
  useEffect(() => {
    if (followUser) {
      lastPanRef.current = null;
    }
  }, [followUser]);

  useEffect(() => {
    if (userPosition && followUser) {
      const last = lastPanRef.current;
      if (last) {
        const R = 6371000;
        const toRad = (x: number) => (x * Math.PI) / 180;
        const dLat = toRad(userPosition[0] - last[0]);
        const dLng = toRad(userPosition[1] - last[1]);
        const a = Math.sin(dLat/2)**2 + Math.cos(toRad(last[0])) * Math.cos(toRad(userPosition[0])) * Math.sin(dLng/2)**2;
        const dist = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (dist < 50) return;
      }
      lastPanRef.current = userPosition;
      map.setView(userPosition, map.getZoom());
    }
  }, [userPosition, map, followUser]);

  return null;
});

// Memoized marker component
const SampleMarker = React.memo(function SampleMarker({
  sample,
}: {
  sample: SampleMapMarker;
}) {
  return (
    <Marker
      key={sample.id}
      position={[
        sample.location!.latitude,
        sample.location!.longitude,
      ]}
      icon={getStatusIcon(sample.status)}
    >
      <Popup>
        <div className="popup-content">
          <h4 className="popup-title">{sample.authorName}</h4>
          <div className="popup-meta">
            <span className={`badge badge-${sample.status}`}>
              {sample.status}
            </span>
            <span className="popup-date">
              {new Date(sample.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="popup-data">
            {getTopMeasurements(sample).map((m) => (
              <div key={m.key}>{m.label}: {m.value} {m.unit}</div>
            ))}
          </div>
          {sample.notes && (
            <div className="popup-notes">{sample.notes}</div>
          )}
          <Link to={`/sample/${sample.id}`} className="popup-link">View details →</Link>
        </div>
      </Popup>
    </Marker>
  );
});

// Map click handler for placing search pin
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function SampleMap() {
  const { data: samples, isLoading, error } = useMapMarkers();
  const { latitude, longitude, accuracy, startTracking, stopTracking } = useGeolocation();
  const [firstFix, setFirstFix] = useState(false);
  const [followUser, setFollowUser] = useState(false);
  const [showNearby, setShowNearby] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState<[number, number] | null>(null);
  const [isPinMode, setIsPinMode] = useState(false);

  // Escape key exits pin mode
  useEffect(() => {
    if (!isPinMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPinMode(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPinMode]);

  // Memoize filtered samples
  const validSamples = useMemo(() => {
    return (samples || []).filter((s) => s.location?.latitude != null && s.location?.longitude != null) || [];
  }, [samples]);

  // Start/stop GPS tracking
  useEffect(() => {
    startTracking();
    return () => stopTracking();
  }, [startTracking, stopTracking]);

  // User position for display
  const userPosition: [number, number] | null = useMemo(() => {
    if (latitude && longitude) {
      return [latitude, longitude];
    }
    return null;
  }, [latitude, longitude]);

  // Track first GPS fix
  useEffect(() => {
    if (latitude && longitude && !firstFix) {
      setFirstFix(true);
      setFollowUser(true); // Auto-follow on first fix
    }
  }, [latitude, longitude, firstFix]);

  const toggleFollow = useCallback(() => {
    setFollowUser((prev) => !prev);
  }, []);

  const handleStartPinMode = useCallback(() => {
    setIsPinMode(true);
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (!isPinMode) return;
    setPinnedLocation([lat, lng]);
    setIsPinMode(false);
    setShowNearby(true);
  }, [isPinMode]);

  const handleToggleNearby = useCallback(() => {
    setShowNearby((prev) => !prev);
  }, []);

  const center: [number, number] = useMemo(() => {
    // Prefer user's current GPS position when available
    if (latitude !== null && longitude !== null) {
      return [latitude, longitude];
    }
    // Fallback to first sample if available
    if (validSamples.length > 0) {
      return [
        validSamples[0].location!.latitude,
        validSamples[0].location!.longitude,
      ];
    }
    return DEFAULT_CENTER;
  }, [validSamples, latitude, longitude]);

  if (isLoading) {
    return (
      <div className="map-loading">
        <div className="spinner" />
        <span>Loading map...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-error">
        <span>Failed to load samples</span>
        <button className="retry-btn" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="map-page">
      <h2 className="page-title">Water Quality Map</h2>
      <p className="page-subtitle">
        {validSamples.length} sample{validSamples.length !== 1 ? 's' : ''} collected
        {latitude && longitude && accuracy !== null && (
          <span className="gps-indicator"> · GPS: ±{Math.round(accuracy)}m</span>
        )}
      </p>

      <div className="sample-map-container">
        <MapContainer
          center={center}
          zoom={validSamples.length > 0 ? 10 : 13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'}
          />

          {/* Map click handler for pin placement */}
          {isPinMode && <MapClickHandler onMapClick={handleMapClick} />}

          {/* Blue dot for user's current GPS position */}
          {userPosition && (
            <CircleMarker
              key="user-location-dot"
              center={userPosition}
              radius={10}
              pathOptions={{ color: 'blue', fillColor: '#3b82f6', fillOpacity: 0.5 }}
              className="user-location-dot"
            >
              <Popup>Your current location</Popup>
            </CircleMarker>
          )}

          {/* Teal pin for user-dropped search location */}
          {pinnedLocation && (
            <Marker
              position={pinnedLocation}
              icon={searchPinIcon}
            >
              <Popup>
                <div style={{ textAlign: 'center' }}>
                  <strong>📍 Search Location</strong>
                  <br />
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {pinnedLocation[0].toFixed(4)}, {pinnedLocation[1].toFixed(4)}
                  </span>
                  <br />
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      setPinnedLocation(null);
                    }}
                    style={{ marginTop: '6px', fontSize: '0.75rem', color: '#dc2626' }}
                  >
                    ✕ Remove pin
                  </button>
                </div>
              </Popup>
            </Marker>
          )}

          {/* MapController only auto-pans when followUser is true */}
          {userPosition && <MapController userPosition={userPosition} followUser={followUser} />}

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
            {validSamples.map((sample) => (
              <SampleMarker key={sample.id} sample={sample} />
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        {/* Pin mode indicator */}
        {isPinMode && (
          <div className="pin-mode-indicator">
            <span>Tap anywhere on the map to place a search pin</span>
            <button
              className="pin-mode-cancel"
              onClick={() => setIsPinMode(false)}
            >
              ✕ Cancel
            </button>
          </div>
        )}

        {/* Follow GPS toggle */}
        {userPosition && (
          <button
            className={`follow-gps-btn ${followUser ? 'active' : ''}`}
            onClick={toggleFollow}
            title={followUser ? 'Following GPS' : 'Click to follow GPS'}
            aria-label={followUser ? 'Stop following GPS' : 'Follow GPS'}
          >
            {followUser ? '📍 Following' : '📍 Follow GPS'}
          </button>
        )}

        {/* Search Here button — enters pin mode */}
        <button
          className="search-here-btn"
          onClick={handleStartPinMode}
          title="Place a pin on the map to search nearby"
          aria-label="Place search pin on map"
        >
          📍 Search Here
        </button>

        {/* Nearby samples toggle */}
        <button
          className={`nearby-btn ${showNearby ? 'active' : ''}`}
          onClick={handleToggleNearby}
          aria-label={showNearby ? 'Hide nearby samples' : 'Show nearby samples'}
        >
          {showNearby ? '✕ Close' : '📍 Nearby'}
        </button>

        {/* Nearby samples panel */}
        {showNearby && (
          <div className="nearby-overlay">
            <NearbySamplesPanel
              userLocation={pinnedLocation || userPosition}
              onClose={() => setShowNearby(false)}
            />
          </div>
        )}
      </div>

      <div className="map-legend">
        <span className="legend-item">
          <span className="legend-dot pending" role="img" aria-label="Pending samples"></span>
          Pending
        </span>
        <span className="legend-item">
          <span className="legend-dot approved" role="img" aria-label="Approved samples"></span>
          Approved
        </span>
        <span className="legend-item">
          <span className="legend-dot rejected" role="img" aria-label="Rejected samples"></span>
          Rejected
        </span>
      </div>

      <style>{`
        .map-page {
          height: 100%;
        }

        .page-title {
          font-size: 1.5rem;
          margin-bottom: var(--spacing-xs);
        }

        .page-subtitle {
          color: var(--color-text-muted);
          margin-bottom: var(--spacing-md);
        }

        .gps-indicator {
          font-size: 0.8rem;
        }

        .map-loading,
        .map-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
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

        .sample-map-container {
          height: 100vh;
          height: calc(100dvh - 250px);
          min-height: 400px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid var(--color-border);
          position: relative;
        }

        @media (min-width: 768px) {
          .sample-map-container {
            height: 100vh;
            height: calc(100dvh - 200px);
          }
        }

        .follow-gps-btn {
          position: absolute;
          bottom: 20px;
          right: 20px;
          z-index: 1000;
          padding: 10px 16px;
          min-height: 44px;
          background: white;
          border: 2px solid #3b82f6;
          border-radius: 24px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          transition: all 0.2s ease;
        }

        .follow-gps-btn.active {
          background: #3b82f6;
          color: white;
        }

        .follow-gps-btn:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .map-legend {
          display: flex;
          gap: var(--spacing-lg);
          justify-content: center;
          padding: var(--spacing-md);
          background-color: var(--color-surface);
          border-radius: var(--radius-md);
          margin-top: var(--spacing-md);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .legend-dot.pending {
          background-color: var(--color-pending);
        }

        .legend-dot.approved {
          background-color: var(--color-approved);
        }

        .legend-dot.rejected {
          background-color: var(--color-rejected);
        }

        /* Blue dot for user position */
        .user-location-dot {
          animation: none;
        }

        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }

        /* Popup Styles */
        .popup-content {
          min-width: 200px;
        }

        .popup-title {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: var(--spacing-xs);
        }

        .popup-meta {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
        }

        .popup-date {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .popup-data {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.875rem;
          margin-bottom: var(--spacing-sm);
        }

        .popup-notes {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          font-style: italic;
        }

        .popup-link {
          display: inline-block;
          margin-top: var(--spacing-sm);
          font-size: 0.875rem;
          color: var(--color-primary);
          font-weight: 500;
        }

        /* Marker Cluster Styles */
        .custom-marker-cluster {
          background: transparent;
        }

        .cluster-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #0d9488, #0f766e);
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

        .leaflet-marker-icon {
          background: none;
          border: none;
        }

        .nearby-btn {
          position: absolute;
          bottom: 70px;
          right: 20px;
          z-index: 1000;
          padding: 10px 16px;
          min-height: 44px;
          background: white;
          border: 2px solid #0d9488;
          border-radius: 24px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #0d9488;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          transition: all 0.2s ease;
        }

        .nearby-btn.active {
          background: #0d9488;
          color: white;
        }

        .nearby-btn:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .search-here-btn {
          position: absolute;
          bottom: 20px;
          left: 20px;
          z-index: 1000;
          padding: 10px 16px;
          min-height: 44px;
          background: white;
          border: 2px solid #0d9488;
          border-radius: 24px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #0d9488;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          transition: all 0.2s ease;
        }

        .search-here-btn:hover {
          background: #0d9488;
          color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .pin-mode-indicator {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1001;
          background: #0d9488;
          color: white;
          padding: 8px 16px;
          border-radius: 24px;
          font-size: 0.8rem;
          font-weight: 500;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pin-mode-cancel {
          background: rgba(255,255,255,0.2);
          color: white;
          border: 1px solid rgba(255,255,255,0.4);
          border-radius: var(--radius-md);
          padding: 2px 8px;
          font-size: 0.75rem;
          cursor: pointer;
          min-height: 44px;
          white-space: nowrap;
        }

        .pin-mode-cancel:hover {
          background: rgba(255,255,255,0.3);
        }

        .nearby-overlay {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 320px;
          max-width: calc(100% - 20px);
          z-index: 1001;
        }

        @media (max-width: 480px) {
          .nearby-overlay {
            top: auto;
            bottom: 70px;
            right: 10px;
            left: 10px;
            width: auto;
          }
          .nearby-btn {
            bottom: auto;
            top: 10px;
            right: 10px;
          }
          .search-here-btn {
            bottom: auto;
            top: 60px;
            right: 10px;
            left: auto;
          }
          .follow-gps-btn {
            bottom: 10px;
            right: 10px;
          }
          .pin-mode-indicator {
            font-size: 0.7rem;
            padding: 4px 10px;
            top: 55px;
            white-space: normal;
            max-width: 90%;
          }
        }
      `}</style>
    </div>
  );
}
