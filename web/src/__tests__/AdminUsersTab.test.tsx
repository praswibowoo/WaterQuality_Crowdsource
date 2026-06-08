import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './helpers/test-utils';
import AdminUsersTab from '../components/AdminUsersTab';

const { mockUsers } = vi.hoisted(() => ({
  mockUsers: [
    { id: '1', name: 'Alice', username: 'alice', role: 'admin', active: true, createdAt: '2026-01-01', _count: { samples: 5, loginLogs: 10 } },
    { id: '2', name: 'Bob', username: 'bob', role: 'user', active: true, createdAt: '2026-02-01', _count: { samples: 2, loginLogs: 5 } },
    { id: '3', name: 'Charlie', username: 'charlie', role: 'user', active: false, createdAt: '2026-03-01', _count: { samples: 0, loginLogs: 1 } },
  ],
}));

vi.mock('../api/users', () => ({
  usersApi: {
    list: vi.fn().mockResolvedValue({ users: mockUsers }),
    create: vi.fn(),
    update: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

describe('AdminUsersTab (WQ-185)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('shows error state when API fails', async () => {
    const { usersApi } = await import('../api/users');
    (usersApi.list as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API error'));

    renderWithProviders(<AdminUsersTab />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load users')).toBeInTheDocument();
    });
  });
});
