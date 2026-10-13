import { Link } from 'react-router-dom';

interface AuthPhotoPanelProps {
  headline?: React.ReactNode;
  subheading?: string;
}

export default function AuthPhotoPanel({
  headline = (
    <>
      Know what's at risk,<br />before it's a loss.
    </>
  ),
  subheading = 'Sign in to track inventory, risk, and alerts across your pharmacy.',
}: AuthPhotoPanelProps) {
  return (
    <div className="auth-photo-side">
      {/* Background Photo: Authentic African pharmacist in modern dispensary */}
      <img
        src="/auth-side.jpg"
        alt="Pharmacist checking inventory stock on shelves"
        className="auth-full-photo"
      />

      {/* Blue gradient overlay: #1E3A4C dark navy fading from bottom up into lighter, transparent blue */}
      <div className="auth-photo-tint" />

      {/* Panel Content sitting on top in white */}
      <div className="auth-panel-overlay-content">
        {/* Logo row (top-left) */}
        <Link to="/" className="auth-panel-logo-row" title="Return to Home">
          <div className="auth-panel-logo-chip">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="auth-panel-brand-name">ExpiryGuard</span>
        </Link>

        {/* Mid-panel: Headline + Subheading + 3-item feature list */}
        <div className="auth-panel-mid">
          <h1 className="auth-panel-headline">{headline}</h1>
          <p className="auth-panel-subheading">{subheading}</p>

          <div className="auth-panel-features">
            <div className="auth-panel-feature-item">
              <div className="auth-panel-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="auth-panel-feature-text">Real-time expiry risk tracking</span>
            </div>

            <div className="auth-panel-feature-item">
              <div className="auth-panel-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <span className="auth-panel-feature-text">FEFO-prioritized stock recommendations</span>
            </div>

            <div className="auth-panel-feature-item">
              <div className="auth-panel-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <span className="auth-panel-feature-text">Configurable alerts before it's too late</span>
            </div>
          </div>
        </div>

        {/* Footer caption (bottom, small, muted) */}
        <p className="auth-panel-footer-caption">
          A safer way to manage pharmacy stock.
        </p>
      </div>
    </div>
  );
}
