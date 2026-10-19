import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../api/useAuth';
import AuthPhotoPanel from '../components/AuthPhotoPanel';
import '../styles/landing.css';

export default function ResetPassword() {
  const { resetPassword, isLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token.trim()) {
      setError('Enter the reset code you received.');
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Use at least 8 characters with a letter and a number.');
      return;
    }
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    const result = await resetPassword(token, password);
    if (result.success) {
      setDone(true);
      setTimeout(() => navigate('/signin'), 1500);
    } else {
      setError(result.error || 'This reset code is invalid or has expired.');
    }
  };

  return (
    <div className="auth-split-wrapper">
      <AuthPhotoPanel
        headline={<>Choose a new password.</>}
        subheading="Reset codes are single-use and expire after 30 minutes."
      />
      <div className="auth-form-side">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <h2 className="auth-form-title">{done ? 'Password updated' : 'Set a new password'}</h2>
            <p className="auth-form-sub">
              {done ? 'Taking you to sign in...' : 'Paste the reset code and choose a new password.'}
            </p>
          </div>
          {error && <div className="auth-error-box" role="alert">{error}</div>}
          {!done && (
            <form onSubmit={handleSubmit} noValidate>
              <div className="auth-form-group">
                <label htmlFor="reset-token" className="auth-label">Reset code</label>
                <input id="reset-token" className="auth-input" value={token} onChange={e => setToken(e.target.value)} autoComplete="one-time-code" required />
              </div>
              <div className="auth-form-group">
                <label htmlFor="reset-password" className="auth-label">New password</label>
                <input id="reset-password" type="password" className="auth-input" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required />
              </div>
              <div className="auth-form-group">
                <label htmlFor="reset-confirm" className="auth-label">Confirm new password</label>
                <input id="reset-confirm" type="password" className="auth-input" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required />
              </div>
              <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Update password'}
              </button>
            </form>
          )}
          <div className="auth-switch-link">
            <Link to="/signin">Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
