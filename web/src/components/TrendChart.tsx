import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { MEASUREMENT_FIELDS, type MeasurementFieldKey } from '../utils/measurements';
import type { Sample } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Measurement keys that can be charted (excluding temperature which is common)
const CHARTABLE_MEASUREMENTS: MeasurementFieldKey[] = [
  'ph',
  'conductivity',
  'salinity',
  'nitrate',
  'calcium',
  'potassium',
  'sodium',
];

interface TrendChartProps {
  samples: Sample[];
  locationId: string;
}

export default function TrendChart({ samples, locationId }: TrendChartProps) {
  const [selectedField, setSelectedField] = useState<MeasurementFieldKey>('ph');

  // Filter samples that have the selected measurement and belong to this location
  const chartData = useMemo(() => {
    const relevantSamples = samples
      .filter((s) => s.locationId === locationId && s[selectedField] != null)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return {
      samples: relevantSamples,
      hasEnoughData: relevantSamples.length >= 2,
    };
  }, [samples, locationId, selectedField]);

  if (chartData.samples.length === 0) {
    return (
      <div className="trend-chart-empty">
        <p>No {MEASUREMENT_FIELDS[selectedField].label} data available for this location.</p>
      </div>
    );
  }

  if (!chartData.hasEnoughData) {
    return (
      <div className="trend-chart-insufficient">
        <div className="insufficient-icon">📊</div>
        <p>More data needed for trends</p>
        <p className="insufficient-hint">
          At least 2 samples with {MEASUREMENT_FIELDS[selectedField].label} measurements are required to display trends.
          Currently showing {chartData.samples.length} sample(s).
        </p>
      </div>
    );
  }

  const fieldConfig = MEASUREMENT_FIELDS[selectedField];

  const data = {
    labels: chartData.samples.map((s) =>
      new Date(s.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    ),
    datasets: [
      {
        label: `${fieldConfig.label} (${fieldConfig.unit})`,
        data: chartData.samples.map((s) => s[selectedField] as number),
        borderColor: '#0d9488',
        backgroundColor: 'rgba(13, 148, 136, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#0d9488',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const value = context.parsed.y;
            return value != null ? `${value} ${fieldConfig.unit}` : '';
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0,
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  };

  return (
    <div className="trend-chart">
      <div className="trend-chart-header">
        <h4>Measurement Trends</h4>
        <select
          value={selectedField}
          onChange={(e) => setSelectedField(e.target.value as MeasurementFieldKey)}
          className="trend-field-select"
        >
          {CHARTABLE_MEASUREMENTS.map((key) => {
            const hasData = samples.some(
              (s) => s.locationId === locationId && s[key] != null
            );
            return (
              <option key={key} value={key} disabled={!hasData}>
                {MEASUREMENT_FIELDS[key].label}
                {!hasData && ' (no data)'}
              </option>
            );
          })}
        </select>
      </div>

      <div className="trend-chart-container" aria-label={`Trend chart showing ${fieldConfig.label} over time with ${chartData.samples.length} data points`}>
        <Line data={data} options={options} />
      </div>

      <div className="trend-chart-info">
        <span>{chartData.samples.length} data points</span>
        <span>{fieldConfig.label} over time</span>
      </div>

      <style>{`
        .trend-chart {
          margin-top: var(--spacing-lg);
          padding: var(--spacing-md);
          background-color: var(--color-surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
        }

        .trend-chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
          flex-wrap: wrap;
          gap: var(--spacing-sm);
        }

        .trend-chart-header h4 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }

        .trend-field-select {
          padding: var(--spacing-xs) var(--spacing-sm);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background-color: var(--color-background);
          font-size: 0.875rem;
          cursor: pointer;
          min-width: 150px;
        }

        .trend-chart-container {
          position: relative;
          height: 250px;
          width: 100%;
        }

        .trend-chart-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: var(--spacing-sm);
          padding-top: var(--spacing-sm);
          border-top: 1px solid var(--color-border);
        }

        .trend-chart-empty,
        .trend-chart-insufficient {
          margin-top: var(--spacing-lg);
          padding: var(--spacing-xl);
          text-align: center;
          background-color: var(--color-surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
        }

        .trend-chart-empty p,
        .trend-chart-insufficient p {
          color: var(--color-text-muted);
          margin: 0;
        }

        .insufficient-icon {
          font-size: 2rem;
          margin-bottom: var(--spacing-sm);
        }

        .insufficient-hint {
          font-size: 0.875rem;
          margin-top: var(--spacing-sm) !important;
        }

        @media (max-width: 480px) {
          .trend-chart-container {
            height: 200px;
          }

          .trend-chart-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .trend-field-select {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}