import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usersApi, type AdminUser, type UsersFilters } from '../api/users';
import { useUsers } from '../hooks/useUsers';
import { useUsersCount } from '../hooks/useUsersCount';
import { useDebounce } from '../hooks/useDebounce';
import { useAuth } from '../contexts/AuthContext';
import CopyButton from './CopyButton';
import ConfirmDialog from './ConfirmDialog';
import { useFocusTrap } from '../hooks/useFocusTrap';

export default function AdminUsersTab() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Search & sort state
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [sortBy, setSortBy] = useState<UsersFilters['sortBy']>('username');
  const [sortOrder, setSortOrder] = useState<UsersFilters['sortOrder']>('asc');

  const filters: UsersFilters = {
    sortBy,
    sortOrder,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useUsers(filters);

  const { data: totalCount = 0 } = useUsersCount(filters);

  const users = data?.pages.flatMap((p) => p.data) ?? [];

  // Create user
  const [showCreate, setShowCreate] = useState(false);
  const [cName, setCName] = useState('');
  const [cUsername, setCUsername] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [cRole, setCRole] = useState('user');
  const [cError, setCError] = useState<string | null>(null);
  const [cLoading, setCLoading] = useState(false);
  const [tempPw, setTempPw] = useState<string | null>(null);

  // Reset password
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [rTempPassword, setRTempPassword] = useState<string | null>(null);
  const [rError, setRError] = useState<string | null>(null);
  const [rLoading, setRLoading] = useState(false);

  // Inline feedback
  const [toggleSuccess, setToggleSuccess] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // Deactivation confirmation
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setCError(null); setTempPw(null);
    if (cPassword && cPassword.length < 8) { setCError('Password must be at least 8 characters'); return; }
    setCLoading(true);
    try {
      const r = await usersApi.create({ name: cName, username: cUsername, password: cPassword || undefined, role: cRole });
      if (r.tempPassword) setTempPw(r.tempPassword);
      setCName(''); setCUsername(''); setCPassword(''); setCRole('user');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setCError(status === 409 ? 'Username already taken' : 'Failed to create user');
    } finally { setCLoading(false); }
  };

  const handleToggleActive = (u: AdminUser) => {
    setDeactivateTarget(u);
  };

  const handleConfirmToggle = async () => {
    if (!deactivateTarget) return;
    setToggleError(null); setToggleSuccess(null);
    try {
      await usersApi.update(deactivateTarget.id, { active: !deactivateTarget.active });
      setToggleSuccess(`User ${deactivateTarget.active ? 'deactivated' : 'reactivated'} successfully`);
      setDeactivateTarget(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch {
      setToggleError('Failed to update user');
      setDeactivateTarget(null);
    }
  };

  const handleConfirmReset = async () => {
    if (!resetUser) return;
    setRError(null);
    setRLoading(true);
    try {
      const r = await usersApi.resetPassword(resetUser.id);
      setRTempPassword(r.tempPassword);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
      setRError(axiosErr?.response?.data?.message || axiosErr?.response?.data?.error || 'Failed to reset password');
    } finally {
      setRLoading(false);
    }
  };

  const closeCreate = () => { setShowCreate(false); setTempPw(null); };

  const toggleSort = (field: UsersFilters['sortBy']) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortIndicator = (field: UsersFilters['sortBy']) => {
    if (sortBy !== field) return '';
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="users-tab">
      <div className="users-tab-header">
        <h3 className="users-tab-title">User Management</h3>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Create User</button>
      </div>

      {/* Search */}
      <div className="users-search">
        <input
          type="text"
          className="users-search-input"
          placeholder="Search by name or username..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Search users by name or username"
        />
        {searchInput && (
          <button
            className="btn-tiny btn-gray"
            onClick={() => setSearchInput('')}
            aria-label="Clear search"
          >
            Clear
          </button>
        )}
      </div>

      {/* Status messages */}
      {toggleSuccess && <div className="form-success">{toggleSuccess}</div>}
      {toggleError && <div className="form-error">{toggleError}</div>}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="users-loading">
          <p className="loading-text">Loading users...</p>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="form-error" role="alert">
          {error?.message || 'Failed to load users'}
        </div>
      )}

      {/* Empty states */}
      {!isLoading && !isError && users.length === 0 && !debouncedSearch && (
        <p className="empty-text">No users registered yet.</p>
      )}
      {!isLoading && !isError && users.length === 0 && debouncedSearch && (
        <p className="empty-text">No users match &lsquo;{debouncedSearch}&rsquo;</p>
      )}

      {/* User table */}
      {!isLoading && !isError && users.length > 0 && (
        <>
          <div className="users-count">
            Showing {users.length} of {totalCount} users
          </div>
          <div className="users-table-wrapper">
            <table className="users-table" aria-label="User management">
              <caption className="sr-only">User management table</caption>
              <thead>
                <tr>
                  <th>
                    <button
                      className="sort-btn"
                      onClick={() => toggleSort('name')}
                      aria-label={`Sort by name${sortIndicator('name')}`}
                    >
                      Name{sortIndicator('name')}
                    </button>
                  </th>
                  <th>
                    <button
                      className="sort-btn"
                      onClick={() => toggleSort('username')}
                      aria-label={`Sort by username${sortIndicator('username')}`}
                    >
                      Username{sortIndicator('username')}
                    </button>
                  </th>
                  <th>
                    <button
                      className="sort-btn"
                      onClick={() => toggleSort('role')}
                      aria-label={`Sort by role${sortIndicator('role')}`}
                    >
                      Role{sortIndicator('role')}
                    </button>
                  </th>
                  <th>Status</th>
                  <th>Samples</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={!u.active ? 'inactive-row' : ''}>
                    <td className="user-name">{u.name || '—'}</td>
                    <td className="user-username">{u.username}</td>
                    <td><span className={`role-badge role-${u.role}`}>{u.role}</span></td>
                    <td><span className={`st-badge ${u.active ? 'st-active' : 'st-inactive'}`}>{u.active ? 'Active' : 'Inactive'}</span></td>
                    <td>{u._count?.samples ?? 0}</td>
                    <td className="user-actions">
                      {u.role === 'admin' ? (
                        u.id !== currentUser?.id && (
                          <button className="btn-tiny btn-green" onClick={() => setResetUser(u)} aria-label={`Reset password for ${u.username}`} title="Password Reset">🔑 Reset</button>
                        )
                      ) : (
                        <>
                          {u.active
                            ? <button className="btn-tiny btn-amber" onClick={() => handleToggleActive(u)} aria-label={`Deactivate ${u.username}`}>❌ Deactivate</button>
                            : <button className="btn-tiny btn-green" onClick={() => handleToggleActive(u)} aria-label={`Reactivate ${u.username}`}>✅ Reactivate</button>}
                          {u.id !== currentUser?.id && (
                            <button className="btn-tiny btn-gray" onClick={() => setResetUser(u)} aria-label={`Reset password for ${u.username}`} title="Password Reset">🔑 Reset</button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load More */}
          {hasNextPage && (
            <div className="users-load-more">
              <button
                className="btn-primary"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Deactivation confirmation dialog */}
      {deactivateTarget && (
        <ConfirmDialog
          title={deactivateTarget.active ? 'Deactivate User' : 'Reactivate User'}
          message={`Are you sure you want to ${deactivateTarget.active ? 'deactivate' : 'reactivate'} "${deactivateTarget.username}"? ${deactivateTarget.active ? 'They will be unable to log in and all their sessions will be terminated.' : 'They will regain access to their account.'}`}
          confirmLabel={deactivateTarget.active ? 'Deactivate' : 'Reactivate'}
          variant={deactivateTarget.active ? 'warning' : 'info'}
          onConfirm={handleConfirmToggle}
          onCancel={() => setDeactivateTarget(null)}
        />
      )}

      {showCreate && <CreateUserModal onClose={closeCreate} cName={cName} setCName={setCName} cUsername={cUsername} setCUsername={setCUsername} cPassword={cPassword} setCPassword={setCPassword} cRole={cRole} setCRole={setCRole} cError={cError} cLoading={cLoading} tempPw={tempPw} handleCreate={handleCreate} />}
      {resetUser && (
        <ResetPasswordModal
          resetUser={resetUser}
          onClose={() => {
            setResetUser(null);
            setRTempPassword(null);
            setRError(null);
          }}
          onConfirmReset={handleConfirmReset}
          rTempPassword={rTempPassword}
          rLoading={rLoading}
          rError={rError}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, cName, setCName, cUsername, setCUsername, cPassword, setCPassword, cRole, setCRole, cError, cLoading, tempPw, handleCreate }: {
  onClose: () => void;
  cName: string; setCName: (v: string) => void;
  cUsername: string; setCUsername: (v: string) => void;
  cPassword: string; setCPassword: (v: string) => void;
  cRole: string; setCRole: (v: string) => void;
  cError: string | null;
  cLoading: boolean;
  tempPw: string | null;
  handleCreate: (e: React.FormEvent) => void;
}) {
  const containerRef = useFocusTrap(true, onClose);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div ref={containerRef} className="modal-card" role="dialog" aria-modal="true" aria-label="Create user" onClick={(e) => e.stopPropagation()} tabIndex={-1}>
        <div className="modal-hdr"><h3>Create User</h3><button className="modal-x" onClick={onClose} aria-label="Close create user dialog">×</button></div>
        {tempPw ? (
          <div className="temp-pw-box">
            <p>User created successfully!</p>
            <p className="temp-pw-label">Temporary password (share with user):</p>
            <div className="temp-pw-val">{tempPw}</div>
            <p className="temp-pw-note">This password will not be shown again.</p>
            <button className="btn-primary" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleCreate}>
            <div className="input-group"><label>Name</label><input type="text" value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Full name" required minLength={2} /></div>
            <div className="input-group"><label>Username</label><input type="text" value={cUsername} onChange={(e) => setCUsername(e.target.value)} placeholder="Username" required minLength={3} maxLength={30} /></div>
            <div className="input-group"><label>Password (leave empty to generate)</label><input type="password" value={cPassword} onChange={(e) => setCPassword(e.target.value)} placeholder="Min. 8 chars" minLength={8} maxLength={128} /></div>
            <div className="input-group"><label>Role</label><select value={cRole} onChange={(e) => setCRole(e.target.value)}><option value="user">User</option><option value="admin">Admin</option></select></div>
            {cError && <div className="form-error">{cError}</div>}
            <button type="submit" className="btn-primary" disabled={cLoading}>{cLoading ? 'Creating...' : 'Create User'}</button>
          </form>
        )}
      </div>
    </div>
  );
}

function ResetPasswordModal({ resetUser, onClose, onConfirmReset, rTempPassword, rLoading, rError }: {
  resetUser: AdminUser;
  onClose: () => void;
  onConfirmReset: () => void;
  rTempPassword: string | null;
  rLoading: boolean;
  rError: string | null;
}) {
  const containerRef = useFocusTrap(true, onClose);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div ref={containerRef} className="modal-card" role="dialog" aria-modal="true" aria-label={`Reset password for ${resetUser.username}`} onClick={(e) => e.stopPropagation()} tabIndex={-1}>
        <div className="modal-hdr"><h3>🔑 Reset Password — {resetUser.username}</h3><button className="modal-x" onClick={onClose} aria-label="Close reset password dialog">×</button></div>
        {rTempPassword ? (
          <div className="temp-pw-box">
            <p>Password reset successfully!</p>
            <p style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.85rem' }}>
              ⚠️ Never email this password in plaintext.
            </p>
            <p className="temp-pw-label">New password (share with user):</p>
            <div className="temp-pw-val">{rTempPassword}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <CopyButton text={rTempPassword} label="Copy password to clipboard" className="btn-primary" />
              <button className="btn-secondary" onClick={onClose}>Done</button>
            </div>
            <p className="temp-pw-note">This password will not be shown again.</p>
          </div>
        ) : (
          <div style={{ padding: '1rem' }}>
            <p style={{ marginBottom: '1rem' }}>
              Generate a new temporary password for <strong>{resetUser.username}</strong>?
              Their existing sessions will be terminated.
            </p>
            {rError && <div className="form-error" style={{ marginBottom: '1rem' }}>{rError}</div>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={onClose} disabled={rLoading}>Cancel</button>
              <button className="btn-primary" onClick={onConfirmReset} disabled={rLoading}>
                {rLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
