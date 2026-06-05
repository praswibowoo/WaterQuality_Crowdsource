import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock react-leaflet (map components don't render in jsdom)
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CircleMarker: () => null,
  useMap: () => ({ setView: vi.fn(), flyTo: vi.fn(), getZoom: () => 13 }),
  useMapEvents: () => null,
  Pane: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('leaflet', () => ({
  default: { icon: vi.fn(), divIcon: vi.fn(), point: (x: number, y: number) => [x, y] },
  Icon: { Default: { prototype: {} } },
  divIcon: vi.fn(),
  point: vi.fn(),
  DomUtil: { setPosition: vi.fn(), get: vi.fn() },
  DomEvent: { on: vi.fn(), off: vi.fn() },
  Control: { extend: vi.fn() },
  Browser: { mobile: false, tablet: false },
}));

vi.mock('react-leaflet-markercluster', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="marker-cluster">{children}</div>,
}));

// Mock chart.js (avoids Canvas rendering issues)
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart" />,
}));

vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  registerables: [],
  Filler: vi.fn(),
  Legend: vi.fn(),
  Tooltip: vi.fn(),
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  Title: vi.fn(),
}));

// Mock AuthContext — useAuth is a vi.fn() so tests can override per-test
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    isAuthenticated: true,
    user: { id: 'test-user-id', username: 'testuser', name: 'Test User', role: 'user' },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    changePassword: vi.fn(),
    getLoginHistory: vi.fn().mockResolvedValue([]),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock metadata utils
vi.mock('../../utils/metadata', () => ({
  findWaterBodyType: (key: string) => {
    const types: Record<string, { label: string; emoji: string }> = {
      river: { label: 'River', emoji: '🏞️' },
      lake: { label: 'Lake', emoji: '💧' },
      pond: { label: 'Pond', emoji: '🪷' },
      estuary: { label: 'Estuary', emoji: '🌊' },
    };
    return types[key] || null;
  },
  findLandUse: (key: string) => {
    const types: Record<string, { label: string; emoji: string }> = {
      urban: { label: 'Urban', emoji: '🏙️' },
      agriculture: { label: 'Agriculture', emoji: '🌾' },
      forest: { label: 'Forest', emoji: '🌲' },
    };
    return types[key] || null;
  },
  WATER_BODY_TYPES: [],
  LAND_USE_TYPES: [],
}));
