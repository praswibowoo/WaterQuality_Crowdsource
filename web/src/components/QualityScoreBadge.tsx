import { useState, useRef, useEffect } from 'react';

interface QualityScoreBadgeProps {
  score: number | null | undefined;
  size?: 'sm' | 'md';
  clickable?: boolean;
}

function getScoreLevel(score: number | null | undefined): 'high' | 'moderate' | 'low' | 'none' {
  if (score == null) return 'none';
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'moderate';
  return 'low';
}

const LEVEL_CONFIG = {
  high: { label: 'High Reliability', icon: '✓', className: 'quality-high' },
  moderate: { label: 'Moderate Reliability', icon: '⚠', className: 'quality-moderate' },
  low: { label: 'Low Reliability', icon: '✗', className: 'quality-low' },
  none: { label: 'Not Scored', icon: '—', className: 'quality-none' },
} as const;

const INFO_TEXT = {
  high: 'This sample scored ≥0.8 across all 6 quality factors (GPS, range validity, spatial outlier, metadata, temporal consistency, photo presence). Data is highly reliable.',
  moderate: 'This sample scored 0.5–0.79 across quality factors. Some factors are below ideal thresholds. Review the breakdown for details.',
  low: 'This sample scored <0.5 across quality factors. Multiple factors scored poorly. Consider re-sampling or manual review.',
  none: 'Quality score has not been computed yet. Submit or update the sample to trigger scoring.',
};

export const QualityScoreBadge = ({ score, size = 'sm', clickable = true }: QualityScoreBadgeProps) => {
  const [showInfo, setShowInfo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const level = getScoreLevel(score);
  const config = LEVEL_CONFIG[level];
  const displayScore = score != null ? score.toFixed(2) : null;

  useEffect(() => {
    if (!showInfo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowInfo(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowInfo(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInfo]);

  const badgeContent = (
    <span className={`quality-badge ${config.className} quality-${size}`}>
      <span className="quality-icon">{config.icon}</span>
      <span className="quality-value">{displayScore || config.icon}</span>
    </span>
  );

  if (!clickable) {
    return badgeContent;
  }

  return (
    <div className="quality-badge-wrapper" ref={containerRef}>
      <button
        type="button"
        className={`quality-badge ${config.className} quality-${size}`}
        onClick={() => setShowInfo(!showInfo)}
        aria-label={`Quality score: ${config.label}${displayScore ? ` (${displayScore})` : ''}. Click for details.`}
        aria-expanded={showInfo}
      >
        <span className="quality-icon">{config.icon}</span>
        <span className="quality-value">{displayScore || config.icon}</span>
      </button>

      {showInfo && (
        <div className="quality-info-popup" role="tooltip">
          <div className="quality-info-header">
            {config.icon} {config.label}
            {displayScore ? ` (${displayScore})` : ''}
          </div>
          <p className="quality-info-text">{INFO_TEXT[level]}</p>
          <div className="quality-info-legend">
            <span className="legend-item"><span className="legend-dot dot-high" /> ≥0.8 High</span>
            <span className="legend-item"><span className="legend-dot dot-moderate" /> 0.5–0.79 Moderate</span>
            <span className="legend-item"><span className="legend-dot dot-low" /> &lt;0.5 Low</span>
          </div>
        </div>
      )}

      <style>{`
        .quality-badge-wrapper {
          position: relative;
          display: inline-flex;
        }

        .quality-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.15rem 0.45rem;
          border-radius: var(--radius-full);
          font-weight: 600;
          white-space: nowrap;
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          transition: filter 0.15s;
        }

        .quality-badge:hover {
          filter: brightness(0.95);
        }

        .quality-sm {
          font-size: 0.7rem;
        }

        .quality-md {
          font-size: 0.8rem;
          padding: 0.25rem 0.6rem;
        }

        .quality-high {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .quality-moderate {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        }

        .quality-low {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .quality-none {
          background: #f3f4f6;
          color: #6b7280;
          border: 1px solid #e5e7eb;
        }

        .quality-info-popup {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          z-index: 100;
          background: var(--color-surface, white);
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: var(--radius-lg, 8px);
          padding: 0.75rem 1rem;
          min-width: 240px;
          max-width: 320px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          font-size: 0.8rem;
          line-height: 1.4;
        }

        .quality-info-header {
          font-weight: 600;
          margin-bottom: 0.4rem;
          font-size: 0.85rem;
        }

        .quality-info-text {
          color: var(--color-text-muted, #6b7280);
          margin-bottom: 0.5rem;
        }

        .quality-info-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding-top: 0.4rem;
          border-top: 1px solid var(--color-border, #e5e7eb);
        }

        .legend-item {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        .dot-high { background: #22c55e; }
        .dot-moderate { background: #f59e0b; }
        .dot-low { background: #ef4444; }

        @media (prefers-reduced-motion: reduce) {
          .quality-badge { transition: none; }
        }
      `}</style>
    </div>
  );
};

export default QualityScoreBadge;
