import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from './helpers/test-utils';

// Mock hooks
vi.mock('../hooks/useGeolocation', () => ({
  useGeolocation: vi.fn(),
}));
import { useGeolocation } from '../hooks/useGeolocation';
const mockUseGeolocation = vi.mocked(useGeolocation);

vi.mock('../hooks/useOfflineSubmission', () => ({
  useOfflineSubmission: vi.fn(),
}));
import { useOfflineSubmission } from '../hooks/useOfflineSubmission';
const mockUseOfflineSubmission = vi.mocked(useOfflineSubmission);

// Mock child components
vi.mock('../components/MapPicker', () => ({
  default: ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => (
    <div data-testid="map-picker">
      <button onClick={() => onLocationSelect(-7.305, 112.844)}>Set Location</button>
    </div>
  ),
}));

vi.mock('../components/MetadataPicker', () => ({
  default: ({ title, value, onChange, error }: {
    title: string; value: string; onChange: (v: string) => void; error?: string; required?: boolean;
  }) => (
    <div data-testid="metadata-picker">
      <label>{title}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={title}>
        <option value="">Select...</option>
        <option value="river">River</option>
        <option value="estuary">Estuary</option>
      </select>
      {error && <span className="error-message">{error}</span>}
    </div>
  ),
}));

import SampleForm from '../components/SampleForm';
import { useAuth } from '../contexts/AuthContext';
const mockUseAuth = vi.mocked(useAuth);

function defaultAuth() {
  return {
    isAuthenticated: true,
    user: { id: 'test-id', username: 'testuser', name: 'Test User', role: 'user' },
    isLoading: false,
    login: vi.fn(), logout: vi.fn(), register: vi.fn(),
    changePassword: vi.fn(), getLoginHistory: vi.fn().mockResolvedValue([]),
    forgotPassword: vi.fn(),
  };
}

describe('SampleForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(defaultAuth());
    mockUseGeolocation.mockReturnValue({
      latitude: null, longitude: null, accuracy: null, error: null,
      isLoading: false, isTracking: false,
      requestLocation: vi.fn(), startTracking: vi.fn(), stopTracking: vi.fn(),
    });
    mockUseOfflineSubmission.mockReturnValue({
      submit: vi.fn().mockResolvedValue({ success: true, offline: false, serverId: 'new-id' }),
      isSubmitting: false,
    } as never);
  });

  it('shows auth prompt when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      changePassword: vi.fn(),
      getLoginHistory: vi.fn().mockResolvedValue([]),
      forgotPassword: vi.fn(),
    });

    renderWithProviders(<SampleForm />);
    expect(screen.getByText('Ready to Contribute?')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });

  it('shows the form when authenticated', () => {
    renderWithProviders(<SampleForm />);
    expect(screen.getByText('Submit Water Sample')).toBeInTheDocument();
    expect(screen.getByText('Submit Sample')).toBeInTheDocument();
  });

  it('shows validation errors on empty submit', () => {
    renderWithProviders(<SampleForm />);
    const submitBtn = screen.getByText('Submit Sample');
    fireEvent.click(submitBtn);

    // Name is auto-filled from authenticated user, so only metadata/location errors appear
    expect(screen.getByText('Location is required. Please select a location on the map.')).toBeInTheDocument();
  });

  it('renders measurement input sections', () => {
    renderWithProviders(<SampleForm />);

    expect(screen.getByText('🌡️ Common Measurements')).toBeInTheDocument();
    expect(screen.getByText(/pH Meter/)).toBeInTheDocument();
    expect(screen.getByText(/Conductivity Meter/)).toBeInTheDocument();
    expect(screen.getByText(/Ion-Selective Electrodes/)).toBeInTheDocument();
    expect(screen.getByText(/Salinity Meter/)).toBeInTheDocument();
  });

  it('auto-fills authorName from authenticated user', () => {
    renderWithProviders(<SampleForm />);
    const nameInput = screen.getByPlaceholderText('Enter your name') as HTMLInputElement;
    expect(nameInput.value).toBe('Test User');
  });

  it('shows GPS accuracy badge when accuracy is available', () => {
    mockUseGeolocation.mockReturnValue({
      latitude: -7.305, longitude: 112.844, accuracy: 8, error: null,
      isLoading: false, isTracking: true,
      requestLocation: vi.fn(), startTracking: vi.fn(), stopTracking: vi.fn(),
    });

    renderWithProviders(<SampleForm />);
    expect(screen.getByText(/High/)).toBeInTheDocument();
    expect(screen.getByText(/8m/)).toBeInTheDocument();
  });

  it('renders MapPicker and MetadataPicker', () => {
    renderWithProviders(<SampleForm />);
    expect(screen.getByTestId('map-picker')).toBeInTheDocument();
    expect(screen.getAllByTestId('metadata-picker').length).toBe(2);
  });
});
