import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../api/useAuth';
import AuthPhotoPanel from '../components/AuthPhotoPanel';
import '../styles/landing.css';

export default function SignUp() {
  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const result = await signup(name.trim(), email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="auth-split-wrapper">
      {/* Left side: Photo panel with #1E3A4C navy-to-blue gradient overlay & white copy */}
      <AuthPhotoPanel
        headline={
          <>
            Stay ahead of<br />every expiry.
          </>
        }
        subheading="Create your account to track inventory, risk, and alerts across your pharmacy."
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
            <h2 className="auth-form-title">Create your account</h2>
            <p className="auth-form-sub">Start eliminating expiry waste and protecting pharmacy profits.</p>
          </div>

          {error && (
            <div className="auth-error-box" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-form-group">
              <label htmlFor="signup-name" className="auth-label">
                Full name
              </label>
              <input
                id="signup-name"
                type="text"
                className="auth-input"
                placeholder="Dr. Amina Bello"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="signup-email" className="auth-label">
                Email address
              </label>
              <input
                id="signup-email"
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
              <label htmlFor="signup-password" className="auth-label">
                Password (min. 6 characters)
              </label>
              <input
                id="signup-password"
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading}
              id="signup-submit-btn"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-switch-link">
            Already have an account?
            <Link to="/signin" id="link-to-signin">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
