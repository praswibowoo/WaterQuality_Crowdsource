import { ReactNode, ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react';

// Helper: creates a QueryClient for testing
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface WrapperOptions {
  initialEntries?: string[];
  queryClient?: QueryClient;
}

// Wraps a component with all required providers
export function createWrapper({ initialEntries = ['/'], queryClient }: WrapperOptions = {}) {
  const qc = queryClient || createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="*" element={children} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

// Render with providers
export function renderWithProviders(
  ui: ReactElement,
  options: WrapperOptions & Omit<RenderOptions, 'wrapper'> = {}
) {
  const { initialEntries, queryClient, ...renderOptions } = options;
  const Wrapper = createWrapper({ initialEntries, queryClient });
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Mock sample data for testing
export function createMockSample(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-sample-id',
    authorName: 'Test User',
    ph: 7.2,
    temperature: 28.5,
    conductivity: 10000,
    salinity: 15.0,
    nitrate: 2.5,
    calcium: 120,
    potassium: 65,
    sodium: 4500,
    waterBodyType: 'estuary',
    landUse: 'urban',
    gpsAccuracy: 8,
    notes: 'Test notes',
    status: 'pending',
    qualityScore: 0.85,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    location: {
      id: 'test-location-id',
      latitude: -7.3059612,
      longitude: 112.8443053,
      address: 'Mangrove Wonorejo, Surabaya',
    },
    userId: 'test-user-id',
    photos: [],
    ...overrides,
  };
}

// Mock authenticated user
export const mockUser = {
  id: 'test-user-id',
  username: 'testuser',
  name: 'Test User',
  role: 'user',
};
