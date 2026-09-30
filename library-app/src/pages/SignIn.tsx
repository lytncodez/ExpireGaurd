import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../api/useAuth';
import AuthPhotoPanel from '../components/AuthPhotoPanel';
import '../styles/landing.css';

export default function SignIn() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Login failed. Please check your credentials.');
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
        subheading="Sign in to track inventory, risk, and alerts across your pharmacy."
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

          <div className="auth-form-header">
            <h2 className="auth-form-title">Welcome back</h2>
            <p className="auth-form-sub">Sign in to your pharmacy management portal.</p>
          </div>

          {error && (
            <div className="auth-error-box" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-form-group">
              <label htmlFor="signin-email" className="auth-label">
                Email address
              </label>
              <input
                id="signin-email"
                type="email"
                className="auth-input"
                placeholder="name@pharmacy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label htmlFor="signin-password" className="auth-label">
                  Password
                </label>
                <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: '#0284C7', textDecoration: 'none', fontWeight: 600 }}>
                  Forgot password?
                </Link>
              </div>
              <input
                id="signin-password"
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading}
              id="signin-submit-btn"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-switch-link">
            Don't have an account?
            <Link to="/signup" id="link-to-signup">Sign up</Link>
          </div>

          <div className="auth-demo-box">
            <strong>Quick Demo Login:</strong>
            <code>admin@expireguard.com / admin123</code>
          </div>
        </div>
      </div>
    </div>
  );
}
