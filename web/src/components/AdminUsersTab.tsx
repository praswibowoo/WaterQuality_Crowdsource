import { useState, useCallback, useEffect } from 'react';
import { usersApi, type AdminUser } from '../api/users';
import ConfirmDialog from './ConfirmDialog';
import { useFocusTrap } from '../hooks/useFocusTrap';

export default function AdminUsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const [rNew, setRNew] = useState('');
  const [rConfirm, setRConfirm] = useState('');
  const [rError, setRError] = useState<string | null>(null);
  const [rLoading, setRLoading] = useState(false);
  const [rSuccess, setRSuccess] = useState(false);

  // M4: Inline feedback
  const [toggleSuccess, setToggleSuccess] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // M5: Deactivation confirmation
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError(null);
    try { const { users: list } = await usersApi.list(); setUsers(list); }
    catch { setError('Failed to load users'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setCError(null); setTempPw(null);
    if (cPassword && cPassword.length < 8) { setCError('Password must be at least 8 characters'); return; }
    setCLoading(true);
    try {
      const r = await usersApi.create({ name: cName, username: cUsername, password: cPassword || undefined, role: cRole });
      if (r.tempPassword) setTempPw(r.tempPassword);
      setCName(''); setCUsername(''); setCPassword(''); setCRole('user');
      fetchUsers();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setCError(status === 409 ? 'Username already taken' : 'Failed to create user');
    } finally { setCLoading(false); }
  };

  // M5: Show confirmation before toggling
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
      fetchUsers();
    } catch {
      setToggleError('Failed to update user');
      setDeactivateTarget(null);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); setRError(null); setRSuccess(false);
    if (rNew !== rConfirm) { setRError('Passwords do not match'); return; }
    if (rNew.length < 8) { setRError('Password must be at least 8 characters'); return; }
    if (!resetUser) return;
    setRLoading(true);
    try {
      await usersApi.resetPassword(resetUser.id, rNew);
      setRNew(''); setRConfirm('');
      setRSuccess(true);
      setTimeout(() => { setResetUser(null); setRSuccess(false); }, 2000);
    } catch { setRError('Failed to reset password'); }
    finally { setRLoading(false); }
  };

  const closeCreate = () => { setShowCreate(false); setTempPw(null); };

  return (
    <div className="users-tab">
      <div className="users-tab-header">
        <h3 className="users-tab-title">User Management</h3>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Create User</button>
      </div>

      {loading && <p className="loading-text">Loading users...</p>}
      {error && <div className="form-error">{error}</div>}
      {toggleSuccess && <div className="form-success">{toggleSuccess}</div>}
      {toggleError && <div className="form-error">{toggleError}</div>}
      {!loading && !error && users.length === 0 && <p className="empty-text">No users found.</p>}

      {!loading && !error && users.length > 0 && (
        <div className="users-table-wrapper">
          <table className="users-table" aria-label="User management">
            <caption className="sr-only">User management table</caption>
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Samples</th><th>Actions</th></tr></thead>
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
                      <button className="btn-tiny btn-green" onClick={() => setResetUser(u)}>🔑 Reset PW</button>
                    ) : (
                      <>
                        {u.active
                          ? <button className="btn-tiny btn-amber" onClick={() => handleToggleActive(u)}>❌ Deactivate</button>
                          : <button className="btn-tiny btn-green" onClick={() => handleToggleActive(u)}>✅ Reactivate</button>}
                        <button className="btn-tiny btn-gray" onClick={() => setResetUser(u)}>🔑 Reset PW</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* M5: Deactivation confirmation dialog */}
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
      {resetUser && <ResetPasswordModal resetUser={resetUser} onClose={() => { setResetUser(null); setRError(null); setRSuccess(false); }} onReset={handleReset} rNew={rNew} setRNew={setRNew} rConfirm={rConfirm} setRConfirm={setRConfirm} rError={rError} rLoading={rLoading} rSuccess={rSuccess} />}
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
        <div className="modal-hdr"><h3>Create User</h3><button className="modal-x" onClick={onClose}>×</button></div>
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
      )}

function ResetPasswordModal({ resetUser, onClose, onReset, rNew, setRNew, rConfirm, setRConfirm, rError, rLoading, rSuccess }: {
  resetUser: AdminUser;
  onClose: () => void;
  onReset: (e: React.FormEvent) => void;
  rNew: string; setRNew: (v: string) => void;
  rConfirm: string; setRConfirm: (v: string) => void;
  rError: string | null;
  rLoading: boolean;
  rSuccess: boolean;
}) {
  const containerRef = useFocusTrap(true, onClose);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div ref={containerRef} className="modal-card" role="dialog" aria-modal="true" aria-label={`Reset password for ${resetUser.username}`} onClick={(e) => e.stopPropagation()} tabIndex={-1}>
        <div className="modal-hdr"><h3>Reset Password — {resetUser.username}</h3><button className="modal-x" onClick={onClose}>×</button></div>
            {rSuccess ? (
              <div className="temp-pw-box">
                <p className="form-success" style={{ padding: '1rem', margin: 0 }}>✓ Password reset successfully</p>
                <button className="btn-primary" onClick={onClose} style={{ marginTop: '1rem' }}>Done</button>
              </div>
            ) : (
              <form onSubmit={onReset}>
                <div className="input-group"><label>New Password</label><input type="password" value={rNew} onChange={(e) => setRNew(e.target.value)} placeholder="Min. 8 chars" required minLength={8} maxLength={128} /></div>
                <div className="input-group"><label>Confirm</label><input type="password" value={rConfirm} onChange={(e) => setRConfirm(e.target.value)} placeholder="Re-enter" required minLength={8} maxLength={128} /></div>
                {rError && <div className="form-error">{rError}</div>}
                <button type="submit" className="btn-primary" disabled={rLoading}>{rLoading ? 'Resetting...' : 'Reset Password'}</button>
              </form>
            )}
          </div>
        </div>
      );
}
