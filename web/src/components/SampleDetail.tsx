import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useSample, useLocationSamples } from '../hooks/useSamples';
import { MEASUREMENT_FIELDS } from '../utils/measurements';
import { findWaterBodyType, findLandUse } from '../utils/metadata';
import TrendChart from './TrendChart';
import QualityScoreBadge from './QualityScoreBadge';
import QualityScoreBreakdown from './QualityScoreBreakdown';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface MeasurementDisplayProps {
  label: string;
  value: number | null | undefined;
  unit: string;
}

function MeasurementDisplay({ label, value, unit }: MeasurementDisplayProps) {
  return (
    <div className="measurement-item">
      <span className="measurement-label">{label}</span>
      <span className="measurement-value">
        {value != null ? `${value} ${unit}` : '—'}
      </span>
    </div>
  );
}

// Wrapper component for TrendChart that handles loading and data fetching
function TrendChartWrapper({ sample }: { sample: { locationId: string } }) {
  const { data: locationSamples } = useLocationSamples(sample.locationId);

  if (!locationSamples || locationSamples.length === 0) {
    return null;
  }

  return <TrendChart samples={locationSamples} locationId={sample.locationId} />;
}

export const SampleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sample, isLoading, error } = useSample(id!);
  const { data: locationSamples } = useLocationSamples(sample?.locationId || '');
  const [lightboxPhoto, setLightboxPhoto] = useState<{ src: string; alt: string } | null>(null);

  // Find current sample index in location samples for prev/next navigation
  const sampleIndex = locationSamples?.findIndex((s) => s.id === id) ?? -1;
  const hasPrev = sampleIndex > 0;
  const hasNext = sampleIndex >= 0 && sampleIndex < (locationSamples?.length ?? 0) - 1;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/list');
    }
  };

  if (isLoading) {
    return (
      <div className="sample-detail-loading">
        <div className="spinner" />
        <p>Loading sample...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sample-detail-error">
        <h2>Error Loading Sample</h2>
        <p>{error.message}</p>
        <button onClick={handleBack} className="btn-primary">Back</button>
      </div>
    );
  }

  if (!sample) {
    return (
      <div className="sample-detail-not-found">
        <h2>Sample Not Found</h2>
        <p>The sample you're looking for doesn't exist.</p>
        <button onClick={handleBack} className="btn-primary">Back</button>
      </div>
    );
  }

  const statusClass = `badge badge-${sample.status}`;

  return (
    <div className="sample-detail">
      <div className="sample-detail-header">
        <div className="header-nav">
          <button onClick={handleBack} className="back-link">← Back</button>
          {hasPrev && (
            <button
              className="nav-prev-btn"
              onClick={() => navigate(`/sample/${locationSamples![sampleIndex - 1].id}`)}
              aria-label="Previous sample"
            >
              ← Prev
            </button>
          )}
          {hasNext && (
            <button
              className="nav-next-btn"
              onClick={() => navigate(`/sample/${locationSamples![sampleIndex + 1].id}`)}
              aria-label="Next sample"
            >
              Next →
            </button>
          )}
        </div>
        <div className="sample-detail-badges">
          <span className={statusClass}>{sample.status}</span>
          <QualityScoreBadge score={sample.qualityScore} size="md" />
        </div>
      </div>

      <div className="card">
        <h1 className="sample-detail-title">Sample Details</h1>

        <div className="sample-detail-section">
          <h3>Submitter</h3>
          <p className="sample-detail-author">{sample.authorName}</p>
        </div>

        <div className="sample-detail-section">
          <h3>Location</h3>
          <p>
            {sample.location?.address || 'No address provided'}
          </p>
          <p className="sample-detail-coords">
            {sample.location?.latitude.toFixed(6)}, {sample.location?.longitude.toFixed(6)}
          </p>
        </div>

        {/* 🌡️ Common Measurements */}
        {(sample.temperature != null) && (
          <div className="sample-detail-section">
            <h3>🌡️ Common Measurements</h3>
            <div className="sample-detail-measurements">
              <MeasurementDisplay
                label="Temperature"
                value={sample.temperature}
                unit={MEASUREMENT_FIELDS.temperature.unit}
              />
            </div>
          </div>
        )}

        {/* 🔬 pH Meter */}
        {(sample.ph != null) && (
          <div className="sample-detail-section">
            <h3>🔬 pH Meter ({MEASUREMENT_FIELDS.ph.laquatwin})</h3>
            <div className="sample-detail-measurements">
              <MeasurementDisplay
                label="pH"
                value={sample.ph}
                unit=""
              />
            </div>
          </div>
        )}

        {/* ⚡ Conductivity Meter */}
        {(sample.conductivity != null) && (
          <div className="sample-detail-section">
            <h3>⚡ Conductivity Meter ({MEASUREMENT_FIELDS.conductivity.laquatwin})</h3>
            <div className="sample-detail-measurements">
              <MeasurementDisplay
                label="Conductivity"
                value={sample.conductivity}
                unit={MEASUREMENT_FIELDS.conductivity.unit}
              />
            </div>
          </div>
        )}



        {/* 🧂 Salinity Meter */}
        {(sample.salinity != null) && (
          <div className="sample-detail-section">
            <h3>🧂 Salinity Meter ({MEASUREMENT_FIELDS.salinity.laquatwin})</h3>
            <div className="sample-detail-measurements">
              <MeasurementDisplay
                label="Salinity"
                value={sample.salinity}
                unit={MEASUREMENT_FIELDS.salinity.unit}
              />
            </div>
          </div>
        )}

        {/* 🔬 ISE Measurements */}
        {(sample.nitrate != null || sample.calcium != null || sample.potassium != null || sample.sodium != null) && (
          <div className="sample-detail-section">
            <h3>🔬 Ion-Selective Electrodes (ISE)</h3>
            <div className="sample-detail-measurements">
              <MeasurementDisplay
                label="Nitrate (NO₃⁻)"
                value={sample.nitrate}
                unit={MEASUREMENT_FIELDS.nitrate.unit}
              />
              <MeasurementDisplay
                label="Calcium (Ca²⁺)"
                value={sample.calcium}
                unit={MEASUREMENT_FIELDS.calcium.unit}
              />
              <MeasurementDisplay
                label="Potassium (K⁺)"
                value={sample.potassium}
                unit={MEASUREMENT_FIELDS.potassium.unit}
              />
              <MeasurementDisplay
                label="Sodium (Na⁺)"
                value={sample.sodium}
                unit={MEASUREMENT_FIELDS.sodium.unit}
              />
            </div>
          </div>
        )}

        {/* 📊 Quality Score */}
        <QualityScoreBreakdown sampleId={sample.id} score={sample.qualityScore} />

        {/* 📋 Water Body Metadata */}
        {(sample.waterBodyType || sample.landUse) ? (
          <div className="sample-detail-section">
            <h3>📋 Site Information</h3>
            <div className="metadata-grid">
              {sample.waterBodyType && findWaterBodyType(sample.waterBodyType) && (
                <div className="metadata-item">
                  <span className="metadata-emoji">{findWaterBodyType(sample.waterBodyType)!.emoji}</span>
                  <span className="metadata-label">Water Body</span>
                  <span className="metadata-value">{findWaterBodyType(sample.waterBodyType)!.label}</span>
                </div>
              )}
              {sample.landUse && findLandUse(sample.landUse) && (
                <div className="metadata-item">
                  <span className="metadata-emoji">{findLandUse(sample.landUse)!.emoji}</span>
                  <span className="metadata-label">Land Use</span>
                  <span className="metadata-value">{findLandUse(sample.landUse)!.label}</span>
                </div>
              )}
              {sample.gpsAccuracy != null && (
                <div className="metadata-item">
                  <span className="metadata-emoji">📍</span>
                  <span className="metadata-label">GPS Accuracy</span>
                  <span className="metadata-value">±{sample.gpsAccuracy}m</span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* 📷 Photos */}
        {sample.photos && sample.photos.length > 0 && (
          <div className="sample-detail-section">
            <h3>📷 Photos ({sample.photos.length})</h3>
            <div className="photo-gallery">
              {sample.photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  className="photo-gallery-item"
                  onClick={() => setLightboxPhoto({ src: `/api/v1/uploads/${photo.path}`, alt: photo.caption || 'Sample photo' })}
                  aria-label={`View photo ${photo.caption || ''}`}
                >
                  <img
                    src={`/api/v1/uploads/${photo.path}`}
                    alt={photo.caption || 'Sample photo'}
                    loading="lazy"
                    width={120}
                    height={120}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Photo Lightbox */}
        {lightboxPhoto && (
          <PhotoLightbox
            src={lightboxPhoto.src}
            alt={lightboxPhoto.alt}
            onClose={() => setLightboxPhoto(null)}
          />
        )}

        {/* 📍 Location Map */}
        {sample.location && (
          <div className="sample-detail-section">
            <h3>📍 Location</h3>
            <div className="sample-detail-map">
              <MapContainer
                center={[sample.location.latitude, sample.location.longitude]}
                zoom={15}
                scrollWheelZoom={false}
                style={{ height: '200px', width: '100%', borderRadius: 'var(--radius-md)' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url={import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
                />
                <Marker position={[sample.location.latitude, sample.location.longitude]}>
                  <Popup>{sample.authorName} — {sample.location.address || 'No address'}</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        )}

        {/* 📊 Trends */}
        <TrendChartWrapper sample={sample} />

        {sample.notes && (
          <div className="sample-detail-section">
            <h3>Notes</h3>
            <p className="sample-detail-notes">{sample.notes}</p>
          </div>
        )}

        <div className="sample-detail-meta">
          <p>Submitted: {new Date(sample.createdAt).toLocaleString()}</p>
          {sample.updatedAt !== sample.createdAt && (
            <p>Updated: {new Date(sample.updatedAt).toLocaleString()}</p>
          )}
        </div>
      </div>

      <style>{`
        .sample-detail {
          max-width: 600px;
          margin: 0 auto;
          padding: var(--spacing-md);
        }

        .sample-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }

        .sample-detail-badges {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .back-link {
          font-size: 0.875rem;
          color: var(--color-primary);
        }
        .header-nav {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }
        .nav-prev-btn,
        .nav-next-btn {
          font-size: 0.8rem;
          color: var(--color-primary);
          background: none;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--spacing-xs) var(--spacing-sm);
          cursor: pointer;
          transition: background var(--transition-fast);
        }
        .nav-prev-btn:hover,
        .nav-next-btn:hover {
          background: var(--color-background);
        }

        .sample-detail-title {
          font-size: 1.5rem;
          margin-bottom: var(--spacing-lg);
        }

        .sample-detail-section {
          margin-bottom: var(--spacing-lg);
          padding-bottom: var(--spacing-lg);
          border-bottom: 1px solid var(--color-border);
        }

        .sample-detail-section:last-of-type {
          border-bottom: none;
        }

        .sample-detail-section h3 {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--spacing-sm);
        }

        .sample-detail-author {
          font-size: 1.125rem;
          font-weight: 500;
        }

        .sample-detail-coords {
          font-family: monospace;
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .sample-detail-measurements {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-md);
        }

        .measurement-item {
          background-color: var(--color-background);
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
        }

        .measurement-label {
          display: block;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-bottom: var(--spacing-xs);
        }

        .measurement-value {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .sample-detail-notes {
          white-space: pre-wrap;
          color: var(--color-text);
        }

        .sample-detail-meta {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: var(--spacing-lg);
        }

        .sample-detail-meta p {
          margin-bottom: var(--spacing-xs);
        }

        .sample-detail-loading,
        .sample-detail-error,
        .sample-detail-not-found {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          text-align: center;
          gap: var(--spacing-md);
        }

        .sample-detail-loading .spinner {
          width: 2rem;
          height: 2rem;
        }

        /* Metadata Grid */
        .metadata-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-md);
        }

        .metadata-item {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          background-color: var(--color-background);
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
        }

        .metadata-emoji {
          font-size: 1.5rem;
          line-height: 1;
        }

        .metadata-label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .metadata-value {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
        }

        @media (max-width: 480px) {
          .metadata-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 767px) {
          .sample-detail-measurements {
            grid-template-columns: 1fr;
          }
        }

        /* Photo Gallery */
        .photo-gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: var(--spacing-md);
        }

        .photo-gallery-item {
          aspect-ratio: 1;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: none;
          padding: 0;
          cursor: pointer;
          background: var(--color-background);
          transition: transform var(--transition-fast);
        }

        .photo-gallery-item:hover {
          transform: scale(1.05);
        }

        .photo-gallery-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Photo Lightbox */
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
          padding: var(--spacing-lg);
        }

        .lightbox-img {
          max-width: 90vw;
          max-height: 85vh;
          object-fit: contain;
          border-radius: var(--radius-md);
        }

        .lightbox-close {
          position: absolute;
          top: var(--spacing-md);
          right: var(--spacing-md);
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          font-size: 2rem;
          cursor: pointer;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Location Map */
        .sample-detail-map {
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--color-border);
        }
      `}</style>
    </div>
  );
};

function PhotoLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const containerRef = useFocusTrap(true, onClose);
  return (
    <div className="lightbox-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Photo viewer">
      <div ref={containerRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={alt} className="lightbox-img" />
        <button className="lightbox-close" onClick={onClose} aria-label="Close photo">✕</button>
      </div>
    </div>
  );
}

export default SampleDetail;