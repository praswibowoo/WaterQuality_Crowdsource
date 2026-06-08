import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface PasswordChangeFormProps {
  onPasswordChanged?: () => void;
}

export default function AdminPasswordChange({ onPasswordChanged }: PasswordChangeFormProps) {
  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      onPasswordChanged?.();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
      setPasswordError(axiosErr?.response?.data?.message || axiosErr?.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="admin-section">
      <h3 className="section-title">🔑 Change Password</h3>
      <form onSubmit={handleChangePassword} className="password-form">
        <div className="input-group">
          <label htmlFor="currentPassword">Current Password</label>
          <input
            type="password"
            id="currentPassword"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            required
            autoComplete="current-password"
          />
        </div>
        <div className="input-group">
          <label htmlFor="newPassword">New Password</label>
          <input
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
          />
        </div>
        <div className="input-group">
          <label htmlFor="confirmNewPassword">Confirm New Password</label>
          <input
            type="password"
            id="confirmNewPassword"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            placeholder="Re-enter new password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
          />
        </div>
        {passwordError && <div className="form-error">{passwordError}</div>}
        {passwordSuccess && <div className="form-success">✓ Password changed successfully</div>}
        <button type="submit" className="btn-primary" disabled={isChangingPassword}>
          {isChangingPassword ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}
