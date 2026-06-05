import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './helpers/test-utils';

const { mockMapMarkers, mockGeolocation, mockNearbySamples } = vi.hoisted(() => ({
  mockMapMarkers: vi.fn().mockReturnValue({ data: [], isLoading: false, error: null }),
  mockGeolocation: vi.fn().mockReturnValue({
    latitude: null, longitude: null, accuracy: null, error: null,
    isLoading: false, isTracking: false,
    requestLocation: vi.fn(), startTracking: vi.fn(), stopTracking: vi.fn(),
  }),
  mockNearbySamples: vi.fn().mockReturnValue({
    nearbySamples: [], isLoading: false, radius: 1000, setRadius: vi.fn(), setCoordinates: vi.fn(),
  }),
}));

vi.mock('../hooks/useMapMarkers', () => ({ useMapMarkers: mockMapMarkers }));
vi.mock('../hooks/useGeolocation', () => ({ useGeolocation: mockGeolocation }));
vi.mock('../hooks/useNearbySamples', () => ({ useNearbySamples: mockNearbySamples }));
vi.mock('../components/NearbySamplesPanel', () => ({ default: () => <div data-testid="nearby-panel" /> }));
vi.mock('../components/MarkerIcon', () => ({ getStatusIcon: () => ({ options: {} }) }));

import SampleMap from '../components/SampleMap';

describe('SampleMap', () => {
  beforeEach(() => {
    mockMapMarkers.mockReturnValue({ data: [], isLoading: false, error: null });
    mockGeolocation.mockReturnValue({
      latitude: null, longitude: null, accuracy: null, error: null,
      isLoading: false, isTracking: false,
      requestLocation: vi.fn(), startTracking: vi.fn(), stopTracking: vi.fn(),
    });
    mockNearbySamples.mockReturnValue({
      nearbySamples: [], isLoading: false, radius: 1000, setRadius: vi.fn(), setCoordinates: vi.fn(),
    });
  });

  it('renders the map container', () => {
    renderWithProviders(<SampleMap />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockMapMarkers.mockReturnValue({ data: undefined, isLoading: true } as never);
    renderWithProviders(<SampleMap />);
    expect(screen.getByText('Loading map...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockMapMarkers.mockReturnValue({
      data: undefined, isLoading: false, error: { message: 'Failed to load' },
    } as never);
    renderWithProviders(<SampleMap />);
    expect(screen.getByText('Failed to load samples')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows GPS toggle when position available', () => {
    mockGeolocation.mockReturnValue({
      latitude: -7.305, longitude: 112.844, accuracy: 10,
      error: null, isLoading: false, isTracking: true,
      requestLocation: vi.fn(), startTracking: vi.fn(), stopTracking: vi.fn(),
    });
    renderWithProviders(<SampleMap />);
    expect(screen.getByText(/Follow/)).toBeInTheDocument();
  });

  it('shows GPS info in subtitle', () => {
    mockGeolocation.mockReturnValue({
      latitude: -7.305, longitude: 112.844, accuracy: 10,
      error: null, isLoading: false, isTracking: true,
      requestLocation: vi.fn(), startTracking: vi.fn(), stopTracking: vi.fn(),
    });
    renderWithProviders(<SampleMap />);
    expect(screen.getByText(/GPS: ±10m/)).toBeInTheDocument();
  });
});
