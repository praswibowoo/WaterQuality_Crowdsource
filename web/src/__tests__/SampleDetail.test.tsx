import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, createMockSample } from './helpers/test-utils';

// Mock useSamples hooks
vi.mock('../hooks/useSamples', () => ({
  useSample: vi.fn(),
  useLocationSamples: vi.fn(),
}));

import { useSample, useLocationSamples } from '../hooks/useSamples';

const mockUseSample = vi.mocked(useSample);
const mockUseLocationSamples = vi.mocked(useLocationSamples);

// Mock TrendChart
vi.mock('../components/TrendChart', () => ({
  default: () => <div data-testid="trend-chart" />,
}));

vi.mock('../components/QualityScoreBadge', () => ({
  default: ({ score }: { score: number }) => <span data-testid="quality-score-badge">{score}</span>,
}));

vi.mock('../components/QualityScoreBreakdown', () => ({
  default: () => <div data-testid="quality-score-breakdown" />,
}));

import SampleDetail from '../components/SampleDetail';

describe('SampleDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocationSamples.mockReturnValue({ data: null, isLoading: false } as never);
  });

  it('shows loading state', () => {
    mockUseSample.mockReturnValue({ data: null, isLoading: true, error: null } as never);
    renderWithProviders(<SampleDetail />, { initialEntries: ['/sample/test-id'] });
    expect(screen.getByText('Loading sample...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseSample.mockReturnValue({ data: null, isLoading: false, error: { message: 'Network error' } } as never);
    renderWithProviders(<SampleDetail />, { initialEntries: ['/sample/test-id'] });
    expect(screen.getByText('Error Loading Sample')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('shows not found state when sample is null', () => {
    mockUseSample.mockReturnValue({ data: null, isLoading: false, error: null } as never);
    renderWithProviders(<SampleDetail />, { initialEntries: ['/sample/test-id'] });
    expect(screen.getByText("Sample Not Found")).toBeInTheDocument();
  });

  it('renders sample details correctly', () => {
    const sample = createMockSample();
    mockUseSample.mockReturnValue({ data: sample, isLoading: false, error: null } as never);

    renderWithProviders(<SampleDetail />, { initialEntries: ['/sample/test-id'] });

    expect(screen.getByText('Sample Details')).toBeInTheDocument();
    expect(screen.getByText(sample.authorName)).toBeInTheDocument();
    expect(screen.getByText(sample.location.address)).toBeInTheDocument();
    expect(screen.getByText(/28\.5.*°C/)).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('renders measurement sections based on available data', () => {
    const sample = createMockSample({ ph: null, conductivity: null });
    mockUseSample.mockReturnValue({ data: sample, isLoading: false, error: null } as never);

    renderWithProviders(<SampleDetail />, { initialEntries: ['/sample/test-id'] });

    // Temperature should still show (it's a common measurement)
    expect(screen.getByText('🌡️ Common Measurements')).toBeInTheDocument();
    // pH should not show because it's null
    expect(screen.queryByText('🔬 pH Meter')).not.toBeInTheDocument();
  });

  it('shows metadata badges when waterBodyType and landUse are set', () => {
    const sample = createMockSample({
      waterBodyType: 'estuary',
      landUse: 'urban',
    });
    mockUseSample.mockReturnValue({ data: sample, isLoading: false, error: null } as never);

    renderWithProviders(<SampleDetail />, { initialEntries: ['/sample/test-id'] });

    expect(screen.getByText('📋 Site Information')).toBeInTheDocument();
    expect(screen.getByText('Water Body')).toBeInTheDocument();
    expect(screen.getByText('Estuary')).toBeInTheDocument();
    expect(screen.getByText('Land Use')).toBeInTheDocument();
    expect(screen.getByText('Urban')).toBeInTheDocument();
  });

  it('shows GPS accuracy when set', () => {
    const sample = createMockSample({ gpsAccuracy: 5 });
    mockUseSample.mockReturnValue({ data: sample, isLoading: false, error: null } as never);

    renderWithProviders(<SampleDetail />, { initialEntries: ['/sample/test-id'] });

    expect(screen.getByText('±5m')).toBeInTheDocument();
  });

  it('shows photos section when photos exist', () => {
    const sample = createMockSample({
      photos: [{ id: 'p1', path: 'photo1.jpg', caption: 'Test photo', mimeType: 'image/jpeg', size: 1000, createdAt: '2026-06-01T00:00:00.000Z' }],
    });
    mockUseSample.mockReturnValue({ data: sample, isLoading: false, error: null } as never);

    renderWithProviders(<SampleDetail />, { initialEntries: ['/sample/test-id'] });

    expect(screen.getByText('📷 Photos (1)')).toBeInTheDocument();
  });

  it('shows notes when provided', () => {
    const sample = createMockSample({ notes: 'Clear water, slightly turbid' });
    mockUseSample.mockReturnValue({ data: sample, isLoading: false, error: null } as never);

    renderWithProviders(<SampleDetail />, { initialEntries: ['/sample/test-id'] });

    expect(screen.getByText('Clear water, slightly turbid')).toBeInTheDocument();
  });

  it('shows quality score badge', () => {
    const sample = createMockSample({ qualityScore: 0.92 });
    mockUseSample.mockReturnValue({ data: sample, isLoading: false, error: null } as never);

    renderWithProviders(<SampleDetail />, { initialEntries: ['/sample/test-id'] });

    expect(screen.getByTestId('quality-score-badge')).toHaveTextContent('0.92');
  });
});
