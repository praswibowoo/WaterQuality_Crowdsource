import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, createMockSample } from './helpers/test-utils';

// Mock useSamples hooks
vi.mock('../hooks/useSamples', () => ({
  useSamples: vi.fn(),
  useSamplesStats: vi.fn(),
}));

import { useSamples, useSamplesStats } from '../hooks/useSamples';

const mockUseSamples = vi.mocked(useSamples);
const mockUseSamplesStats = vi.mocked(useSamplesStats);

// Mock IntersectionObserver (jsdom doesn't support it)
vi.stubGlobal('IntersectionObserver', vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})));

import SampleList from '../components/SampleList';

describe('SampleList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSamplesStats.mockReturnValue({ data: { total: 0, pending: 0, approved: 0, rejected: 0 } } as never);
  });

  it('shows loading state', () => {
    mockUseSamples.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as never);

    renderWithProviders(<SampleList />);
    expect(screen.getByText('Loading samples...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseSamples.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'API error' },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as never);

    renderWithProviders(<SampleList />);
    expect(screen.getByText(/Error loading samples/)).toBeInTheDocument();
  });

  it('shows empty state when no samples', () => {
    mockUseSamples.mockReturnValue({
      data: { pages: [{ data: [], totalCount: 0, nextCursor: null }] },
      isLoading: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as never);

    renderWithProviders(<SampleList />);
    expect(screen.getByText(/No submissions yet/)).toBeInTheDocument();
  });

  it('renders sample cards', () => {
    const sample = createMockSample();
    mockUseSamples.mockReturnValue({
      data: { pages: [{ data: [sample], totalCount: 1, nextCursor: null }] },
      isLoading: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as never);

    renderWithProviders(<SampleList />);

    expect(screen.getByText(sample.authorName)).toBeInTheDocument();
    expect(screen.getByText('1 samples')).toBeInTheDocument();
  });

  it('shows filter status tabs', () => {
    mockUseSamples.mockReturnValue({
      data: { pages: [{ data: [], totalCount: 0, nextCursor: null }] },
      isLoading: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as never);

    renderWithProviders(<SampleList />);

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('shows pagination info when data exists', () => {
    const sample = createMockSample();
    mockUseSamples.mockReturnValue({
      data: { pages: [{ data: [sample], totalCount: 25, nextCursor: 'cursor-2' }] },
      isLoading: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
    } as never);

    renderWithProviders(<SampleList />);

    expect(screen.getByText(/Showing 1 of 25 samples/)).toBeInTheDocument();
  });

  it('allows switching status filter tabs', () => {
    mockUseSamples.mockReturnValue({
      data: { pages: [{ data: [], totalCount: 0, nextCursor: null }] },
      isLoading: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as never);

    renderWithProviders(<SampleList />);
    const pendingTab = screen.getByText('Pending');
    fireEvent.click(pendingTab);
    expect(pendingTab.className).toContain('active');
  });
});
