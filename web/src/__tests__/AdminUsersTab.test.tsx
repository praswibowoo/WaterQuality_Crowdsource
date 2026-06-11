import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './helpers/test-utils';
import AdminUsersTab from '../components/AdminUsersTab';

const { mockUsers, mockListFn, mockCountFn } = vi.hoisted(() => ({
  mockUsers: [
    { id: '1', name: 'Alice', username: 'alice', role: 'admin', active: true, createdAt: '2026-01-01', _count: { samples: 5, loginLogs: 10 } },
    { id: '2', name: 'Bob', username: 'bob', role: 'user', active: true, createdAt: '2026-02-01', _count: { samples: 2, loginLogs: 5 } },
    { id: '3', name: 'Charlie', username: 'charlie', role: 'user', active: false, createdAt: '2026-03-01', _count: { samples: 0, loginLogs: 1 } },
  ],
  mockListFn: vi.fn().mockResolvedValue({ data: [
    { id: '1', name: 'Alice', username: 'alice', role: 'admin', active: true, createdAt: '2026-01-01', _count: { samples: 5, loginLogs: 10 } },
    { id: '2', name: 'Bob', username: 'bob', role: 'user', active: true, createdAt: '2026-02-01', _count: { samples: 2, loginLogs: 5 } },
    { id: '3', name: 'Charlie', username: 'charlie', role: 'user', active: false, createdAt: '2026-03-01', _count: { samples: 0, loginLogs: 1 } },
  ], nextCursor: null, totalCount: 3 }),
  mockCountFn: vi.fn().mockResolvedValue(3),
}));

vi.mock('../api/users', () => ({
  usersApi: {
    list: mockListFn,
    count: mockCountFn,
    create: vi.fn(),
    update: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

describe('AdminUsersTab (WQ-185)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore the resolved implementation after each test
    mockListFn.mockResolvedValue({ data: mockUsers, nextCursor: null, totalCount: 3 });
    mockCountFn.mockResolvedValue(3);
  });

  it('renders user list with correct data', async () => {
    renderWithProviders(<AdminUsersTab />);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('charlie')).toBeInTheDocument();
    });
  });

  it('shows create user button', async () => {
    renderWithProviders(<AdminUsersTab />);
    await waitFor(() => {
      expect(screen.getByText('+ Create User')).toBeInTheDocument();
    });
  });

  it('shows deactivate button for active users', async () => {
    renderWithProviders(<AdminUsersTab />);
    await waitFor(() => {
      const deactivateBtns = screen.getAllByText('❌ Deactivate');
      expect(deactivateBtns.length).toBe(1); // Only Bob (non-admin, active)
    });
  });

  it('shows reactivate button for inactive users', async () => {
    renderWithProviders(<AdminUsersTab />);
    await waitFor(() => {
      const reactivateBtns = screen.getAllByText('✅ Reactivate');
      expect(reactivateBtns.length).toBe(1); // Charlie (inactive)
    });
  });

  it('shows user count text', async () => {
    renderWithProviders(<AdminUsersTab />);
    await waitFor(() => {
      expect(screen.getByText('Showing 3 of 3 users')).toBeInTheDocument();
    });
  });

  it('renders search input', async () => {
    renderWithProviders(<AdminUsersTab />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search by name or username...')).toBeInTheDocument();
    });
  });

  it('renders sort buttons on column headers', async () => {
    renderWithProviders(<AdminUsersTab />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sort by name/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sort by username/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sort by role/i })).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    mockListFn.mockRejectedValueOnce(new Error('API error'));

    renderWithProviders(<AdminUsersTab />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
