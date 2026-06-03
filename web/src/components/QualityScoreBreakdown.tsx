import { useState } from 'react';
import { useQualityScore } from '../hooks/useQualityScore';
import QualityScoreBadge from './QualityScoreBadge';

interface QualityScoreBreakdownProps {
  sampleId: string;
  score: number | null | undefined;
}

const FACTOR_LABELS: Record<string, string> = {
  gpsAccuracy: 'GPS Accuracy',
  rangeValidity: 'Range Validity',
  spatialOutlier: 'Spatial Outlier',
  metadataCompleteness: 'Metadata',
  temporalConsistency: 'Temporal Consistency',
  photoPresence: 'Photo Presence',
};

const FACTOR_ICONS: Record<string, string> = {
  gpsAccuracy: '📍',
  rangeValidity: '📏',
  spatialOutlier: '📐',
  metadataCompleteness: '🏷️',
  temporalConsistency: '🕐',
  photoPresence: '📷',
};

const FACTOR_WEIGHTS: Record<string, string> = {
  gpsAccuracy: '20%',
  rangeValidity: '20%',
  spatialOutlier: '20%',
  metadataCompleteness: '15%',
  temporalConsistency: '15%',
  photoPresence: '10%',
};

function getScoreColor(value: number): string {
  if (value >= 0.8) return 'var(--color-approved)';
  if (value >= 0.5) return 'var(--color-warning)';
  return 'var(--color-rejected)';
}

export const QualityScoreBreakdown = ({ sampleId, score }: QualityScoreBreakdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading, error } = useQualityScore(sampleId);

  const breakdown = data?.data?.breakdown;

  return (
    <div className="quality-breakdown">
      <button
        className="quality-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Toggle quality score breakdown"
      >
        <QualityScoreBadge score={score} size="md" clickable={false} />
        <span className="quality-toggle-text">
          {isOpen ? 'Hide details' : 'Show details'}
        </span>
        <span className={`quality-chevron ${isOpen ? 'open' : ''}`}>▾</span>
      </button>

      {isOpen && (
        <div className="quality-details">
          {isLoading && <p className="quality-loading">Loading breakdown...</p>}
          {error && <p className="quality-error">Could not load quality breakdown</p>}
          {breakdown && (
            <>
              {/* Overall Score Summary */}
              <div className="quality-overall">
                <span className="overall-label">Overall Score</span>
                <span className="overall-value" style={{ color: score != null ? getScoreColor(score) : 'var(--color-text-muted)' }}>
                  {score != null ? `${(score * 100).toFixed(0)}%` : '—'}
                </span>
              </div>

              {/* Factor Details */}
              <div className="quality-factors">
                {Object.entries(breakdown).map(([key, factor]) => (
                  <div key={key} className="quality-factor">
                    <div className="factor-header">
                      <span className="factor-label">
                        <span className="factor-icon">{FACTOR_ICONS[key] || '•'}</span>
                        {FACTOR_LABELS[key] || key}
                        <span className="factor-weight">({FACTOR_WEIGHTS[key] || '?'})</span>
                      </span>
                      <span className="factor-score" style={{ color: getScoreColor(factor.score) }}>
                        {(factor.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="factor-bar-track">
                      <div
                        className="factor-bar-fill"
                        style={{
                          width: `${factor.score * 100}%`,
                          backgroundColor: getScoreColor(factor.score),
                        }}
                      />
                      {/* 80% threshold marker */}
                      <div className="factor-bar-threshold" />
                    </div>
                    <p className="factor-description">{factor.description}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        .quality-breakdown {
          margin-bottom: var(--spacing-lg);
          padding-bottom: var(--spacing-lg);
          border-bottom: 1px solid var(--color-border);
        }

        .quality-toggle {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          background: none;
          border: none;
          cursor: pointer;
          padding: var(--spacing-xs) 0;
          width: 100%;
          font-size: inherit;
          color: inherit;
        }

        .quality-toggle-text {
          font-size: 0.875rem;
          color: var(--color-primary);
          margin-left: auto;
        }

        .quality-chevron {
          font-size: 0.75rem;
          transition: transform 0.2s;
          color: var(--color-text-muted);
        }

        .quality-chevron.open {
          transform: rotate(180deg);
        }

        .quality-details {
          margin-top: var(--spacing-md);
        }

        .quality-loading, .quality-error {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .quality-error {
          color: var(--color-rejected);
        }

        .quality-overall {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--color-background);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
          font-weight: 600;
        }

        .overall-label {
          font-size: 0.875rem;
          color: var(--color-text);
        }

        .overall-value {
          font-size: 1rem;
          font-weight: 700;
        }

        .quality-factors {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .quality-factor {
          background: var(--color-background);
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-md);
        }

        .factor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-xs);
        }

        .factor-label {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .factor-icon {
          font-size: 0.75rem;
        }

        .factor-weight {
          font-size: 0.65rem;
          color: var(--color-text-muted);
          font-weight: 400;
        }

        .factor-score {
          font-size: 0.8rem;
          font-weight: 600;
        }

        .factor-bar-track {
          height: 6px;
          background: var(--color-border);
          border-radius: var(--radius-full);
          overflow: hidden;
          margin-bottom: var(--spacing-xs);
          position: relative;
        }

        .factor-bar-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.3s ease;
        }

        .factor-bar-threshold {
          position: absolute;
          left: 80%;
          top: -1px;
          bottom: -1px;
          width: 2px;
          background: var(--color-text-muted);
          opacity: 0.4;
        }

        .factor-description {
          font-size: 0.7rem;
          color: var(--color-text-muted);
        }

        @media (prefers-reduced-motion: reduce) {
          .quality-chevron {
            transition: none;
          }
          .factor-bar-fill {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
};

export default QualityScoreBreakdown;
