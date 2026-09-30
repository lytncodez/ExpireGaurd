import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../api/useAuth';
import AuthPhotoPanel from '../components/AuthPhotoPanel';
import '../styles/landing.css';

export default function ForgotPassword() {
  const { forgotPassword, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    const result = await forgotPassword(email);
    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="auth-split-wrapper">
      {/* Left side: Photo panel with #1E3A4C navy-to-blue gradient overlay & white copy */}
      <AuthPhotoPanel
        headline={
          <>
            Know what's at risk,<br />before it's a loss.
          </>
        }
        subheading="Reset your credentials to regain access to your dispensary inventory."
      />

      {/* Right side: Clean white/light-blue form panel */}
      <div className="auth-form-side">
        <div className="auth-form-card">
          <Link to="/" className="auth-mobile-brand">
            <div className="sky-brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="sky-brand-name">ExpiryGuard</span>
          </Link>

          {!submitted ? (
            <>
              <div className="auth-form-header">
                <h2 className="auth-form-title">Reset your password</h2>
                <p className="auth-form-sub">Enter your email and we'll send you recovery instructions.</p>
              </div>

              {error && (
                <div className="auth-error-box" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="auth-form-group">
                  <label htmlFor="reset-email" className="auth-label">
                    Email address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    className="auth-input"
                    placeholder="name@pharmacy.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={isLoading}
                  id="reset-submit-btn"
                >
                  {isLoading ? 'Sending instructions...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="auth-switch-link">
                Remember your password?
                <Link to="/signin">Back to sign in</Link>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#E0F2FE',
                color: '#0284C7',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="auth-form-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Check your inbox</h2>
              <p className="auth-form-sub" style={{ marginBottom: '1.75rem' }}>
                We've sent password reset instructions to <strong>{email}</strong>.
              </p>
              <Link to="/signin" className="auth-submit-btn" style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}>
                Return to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
