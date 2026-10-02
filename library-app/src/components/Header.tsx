import { Link } from 'react-router-dom';
import { useAuth } from '../api/useAuth';

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export default function Header({ searchTerm, setSearchTerm }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="app-header">
      <div className="header-greeting">
        <h1>Welcome, {user?.name || 'Dr. Amina'} 👋</h1>
        <p>Real-time expiry risk tracking &amp; inventory intelligence.</p>
      </div>

      <div className="header-actions">
        <div className="search-bar-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder={user?.role === 'admin' ? 'Search products, batches, suppliers...' : 'Search products and batches...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{ background: 'transparent', border: 'none', color: '#8E9BAE', cursor: 'pointer', paddingRight: '0.5rem' }}
            >
              ✕
            </button>
          )}
        </div>

        <Link to="/alerts" className="icon-btn" title="View Expiry Alerts" style={{ position: 'relative', textDecoration: 'none' }}>
          <span className="notification-dot" />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
