import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, createMockSample } from './helpers/test-utils';

vi.mock('../hooks/useSamples', () => ({
  useSamples: vi.fn(),
  useSamplesStats: vi.fn(),
  useUpdateSample: vi.fn(),
  useDeleteSample: vi.fn(),
}));

import { useSamples, useSamplesStats, useUpdateSample, useDeleteSample } from '../hooks/useSamples';

const mockUseSamples = vi.mocked(useSamples);
const mockUseSamplesStats = vi.mocked(useSamplesStats);
const mockUseUpdateSample = vi.mocked(useUpdateSample);
const mockUseDeleteSample = vi.mocked(useDeleteSample);

vi.mock('../components/AdminUsersTab', () => ({
  default: () => <div data-testid="admin-users-tab" />,
}));

vi.mock('../components/ConfirmDialog', () => ({
  default: ({ message, confirmLabel, onConfirm, onCancel }: {
    message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void;
  }) => (
    <div data-testid="confirm-dialog">
      <p>{message}</p>
      <button onClick={onConfirm}>{confirmLabel}</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('../components/QualityScoreBadge', () => ({
  default: ({ score }: { score: number }) => <span data-testid="quality-badge">{score}</span>,
}));

import { useAuth } from '../contexts/AuthContext';
const mockUseAuth = vi.mocked(useAuth);

import AdminDashboard from '../components/AdminDashboard';

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'test-user-id', username: 'testuser', name: 'Test User', role: 'user' },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      changePassword: vi.fn(),
      getLoginHistory: vi.fn().mockResolvedValue([]),
    });
    mockUseSamplesStats.mockReturnValue({ data: { total: 10, pending: 3, approved: 5, rejected: 2 } } as never);
    mockUseUpdateSample.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    mockUseDeleteSample.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
  });

  it('shows loading state', () => {
    mockUseSamples.mockReturnValue({
      data: undefined, isLoading: true, error: null,
      fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false,
    } as never);

    renderWithProviders(<AdminDashboard />);
    expect(screen.getByText('Loading samples...')).toBeInTheDocument();
  });

  it('shows error state with retry button', () => {
    mockUseSamples.mockReturnValue({
      data: undefined, isLoading: false, error: { message: 'Failed' },
      fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false,
    } as never);

    renderWithProviders(<AdminDashboard />);
    expect(screen.getByText('Failed to load samples')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders stats panel', () => {
    mockUseSamples.mockReturnValue({
      data: { pages: [{ data: [], totalCount: 10, nextCursor: null }] },
      isLoading: false, error: null,
      fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false,
    } as never);

    renderWithProviders(<AdminDashboard />);

    expect(screen.getAllByText('Total').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Pending/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Approved').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Rejected').length).toBeGreaterThanOrEqual(1);
  });

  it('renders sample cards with action buttons', () => {
    const sample = createMockSample({ status: 'pending' });
    mockUseSamples.mockReturnValue({
      data: { pages: [{ data: [sample], totalCount: 1, nextCursor: null }] },
      isLoading: false, error: null,
      fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false,
    } as never);

    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText(sample.authorName)).toBeInTheDocument();
    expect(screen.getAllByText(/Approve/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Reject/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders revert and delete for approved samples', () => {
    const sample = createMockSample({ status: 'approved' });
    mockUseSamples.mockReturnValue({
      data: { pages: [{ data: [sample], totalCount: 1, nextCursor: null }] },
      isLoading: false, error: null,
      fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false,
    } as never);

    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText(/Revert to Pending/)).toBeInTheDocument();
    expect(screen.getByText(/Delete/)).toBeInTheDocument();
  });

  it('shows empty state when no samples', () => {
    mockUseSamples.mockReturnValue({
      data: { pages: [{ data: [], totalCount: 0, nextCursor: null }] },
      isLoading: false, error: null,
      fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false,
    } as never);

    renderWithProviders(<AdminDashboard />);
    expect(screen.getByText('No submissions yet.')).toBeInTheDocument();
  });

  it('has tab navigation between Samples and Users', () => {
    mockUseSamples.mockReturnValue({
      data: { pages: [{ data: [], totalCount: 0, nextCursor: null }] },
      isLoading: false, error: null,
      fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false,
    } as never);

    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('📋 Samples')).toBeInTheDocument();
    expect(screen.getByText('👥 Users')).toBeInTheDocument();
  });

  it('shows quality score filter tabs', () => {
    mockUseSamples.mockReturnValue({
      data: { pages: [{ data: [], totalCount: 0, nextCursor: null }] },
      isLoading: false, error: null,
      fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false,
    } as never);

    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('All Quality')).toBeInTheDocument();
    expect(screen.getByText('✓ High (≥0.8)')).toBeInTheDocument();
    expect(screen.getByText('⚠ Moderate')).toBeInTheDocument();
  });

  it('renders password change section', () => {
    mockUseSamples.mockReturnValue({
      data: { pages: [{ data: [], totalCount: 0, nextCursor: null }] },
      isLoading: false, error: null,
      fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false,
    } as never);

    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('🔑 Change Password')).toBeInTheDocument();
    // Password form is collapsed by default — click to expand
    fireEvent.click(screen.getByText('🔑 Change Password'));
    expect(screen.getByPlaceholderText('Enter current password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Min. 8 characters')).toBeInTheDocument();
  });

  it('renders login history section', () => {
    mockUseSamples.mockReturnValue({
      data: { pages: [{ data: [], totalCount: 0, nextCursor: null }] },
      isLoading: false, error: null,
      fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false,
    } as never);

    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('📋 Login History')).toBeInTheDocument();
  });
});
