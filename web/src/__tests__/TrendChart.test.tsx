import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './helpers/test-utils';
import TrendChart from '../components/TrendChart';
import type { Sample } from '../types';

function createSample(overrides: Partial<Sample> = {}): Sample {
  return {
    id: 'test-id',
    authorName: 'Test',
    locationId: 'loc-1',
    ph: 7.2,
    temperature: 28,
    conductivity: 10000,
    salinity: 15,
    nitrate: 2.5,
    calcium: 120,
    potassium: 65,
    sodium: 4500,
    waterBodyType: 'estuary',
    landUse: 'urban',
    gpsAccuracy: 10,
    qualityScore: null,
    notes: null,
    status: 'approved',
    createdAt: new Date('2026-06-01'),
    updatedAt: new Date('2026-06-01'),
    location: { id: 'loc-1', latitude: -7.3, longitude: 112.8, address: null, createdAt: new Date() },
    photos: [],
    ...overrides,
  };
}

describe('TrendChart (WQ-186)', () => {
  it('shows empty state when no samples for location', () => {
    const samples = [createSample({ locationId: 'other-loc' })];
    renderWithProviders(<TrendChart samples={samples} locationId="loc-1" />);
    expect(screen.getByText(/no ph data available/i)).toBeInTheDocument();
  });

  it('shows insufficient data message with < 2 samples', () => {
    const samples = [createSample()];
    renderWithProviders(<TrendChart samples={samples} locationId="loc-1" />);
    expect(screen.getByText(/More data needed/i)).toBeInTheDocument();
  });

  it('renders chart with sufficient data', () => {
    const samples = [
      createSample({ createdAt: new Date('2026-06-01'), ph: 7.0 }),
      createSample({ id: 'id-2', createdAt: new Date('2026-06-02'), ph: 7.5 }),
    ];
    renderWithProviders(<TrendChart samples={samples} locationId="loc-1" />);
    expect(screen.getByText('Measurement Trends')).toBeInTheDocument();
    expect(screen.getByText('2 data points')).toBeInTheDocument();
  });

  it('has parameter selector dropdown', () => {
    const samples = [
      createSample({ createdAt: new Date('2026-06-01'), ph: 7.0 }),
      createSample({ id: 'id-2', createdAt: new Date('2026-06-02'), ph: 7.5 }),
    ];
    renderWithProviders(<TrendChart samples={samples} locationId="loc-1" />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows chart aria-label describing the data', () => {
    const samples = [
      createSample({ createdAt: new Date('2026-06-01'), conductivity: 10000 }),
      createSample({ id: 'id-2', createdAt: new Date('2026-06-02'), conductivity: 12000 }),
    ];
    renderWithProviders(<TrendChart samples={samples} locationId="loc-1" />);
    const chartContainer = screen.getByLabelText(/trend chart/i);
    expect(chartContainer).toBeInTheDocument();
  });
});
