import { useState, useCallback, useEffect } from 'react';
import { usersApi, type AdminUser } from '../api/users';

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

  const handleToggleActive = async (u: AdminUser) => {
    try { await usersApi.update(u.id, { active: !u.active }); fetchUsers(); }
    catch { alert('Failed to update user'); }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); setRError(null);
    if (rNew !== rConfirm) { setRError('Passwords do not match'); return; }
    if (rNew.length < 8) { setRError('Password must be at least 8 characters'); return; }
    if (!resetUser) return;
    setRLoading(true);
    try {
      await usersApi.resetPassword(resetUser.id, rNew);
      setRNew(''); setRConfirm(''); setResetUser(null);
      alert('Password reset successfully');
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
      {!loading && !error && users.length === 0 && <p className="empty-text">No users found.</p>}

      {!loading && !error && users.length > 0 && (
        <div className="users-table-wrapper">
          <table className="users-table">
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

      {showCreate && (
        <div className="modal-overlay" onClick={closeCreate}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-hdr"><h3>Create User</h3><button className="modal-x" onClick={closeCreate}>×</button></div>
            {tempPw ? (
              <div className="temp-pw-box">
                <p>User created successfully!</p>
                <p className="temp-pw-label">Temporary password (share with user):</p>
                <div className="temp-pw-val">{tempPw}</div>
                <p className="temp-pw-note">This password will not be shown again.</p>
                <button className="btn-primary" onClick={closeCreate}>Done</button>
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

      {resetUser && (
        <div className="modal-overlay" onClick={() => { setResetUser(null); setRError(null); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-hdr"><h3>Reset Password — {resetUser.username}</h3><button className="modal-x" onClick={() => { setResetUser(null); setRError(null); }}>×</button></div>
            <form onSubmit={handleReset}>
              <div className="input-group"><label>New Password</label><input type="password" value={rNew} onChange={(e) => setRNew(e.target.value)} placeholder="Min. 8 chars" required minLength={8} maxLength={128} /></div>
              <div className="input-group"><label>Confirm</label><input type="password" value={rConfirm} onChange={(e) => setRConfirm(e.target.value)} placeholder="Re-enter" required minLength={8} maxLength={128} /></div>
              {rError && <div className="form-error">{rError}</div>}
              <button type="submit" className="btn-primary" disabled={rLoading}>{rLoading ? 'Resetting...' : 'Reset Password'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
