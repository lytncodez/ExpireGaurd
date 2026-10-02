import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../api/useAuth';

interface SidebarProps {
  quantityFilter: number;
  setQuantityFilter: (val: number) => void;
  expiryFilter: number;
  setExpiryFilter: (val: number) => void;
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}

export default function Sidebar({
  quantityFilter,
  setQuantityFilter,
  expiryFilter,
  setExpiryFilter,
  isCollapsed,
  setIsCollapsed,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'EG';

  const roleLabel = user?.role === 'admin' ? 'Admin' : user ? 'Dispenser' : 'User';

  const normalizePositiveInteger = (value: number | string) => {
    if (value === '' || value === null || value === undefined) return 0;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.floor(parsed));
  };

  const quantitySliderMax = Math.max(100, quantityFilter || 0);
  const expirySliderMax = Math.max(30, expiryFilter || 0);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <div className={`app-sidebar-shell ${isCollapsed ? 'is-collapsed' : ''}`}>
        <aside className="app-sidebar">
          <div className="sidebar-header-row">
            <div className="brand-header">
              <div className="brand-icon" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0F172A 100%)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="brand-text-block">
                <span className="brand-title">ExpiryGuard</span>
                <span className="brand-subtitle">PHARMA</span>
                <span className="brand-subtitle brand-subtitle-secondary">DISPENSARY</span>
              </div>
            </div>

          <button
            type="button"
            className="sidebar-collapse-toggle"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18 9 12l6-6" />
              </svg>
            )}
          </button>
        </div>

        <div className="sidebar-scroll-area">
          <div className="sidebar-top-section">
            <nav className="sidebar-nav">
              <NavLink
                to="/dashboard"
                aria-label="Dashboard"
                title="Dashboard"
                className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
              >
                <span className="nav-icon">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="9" rx="1" />
                    <rect x="14" y="3" width="7" height="5" rx="1" />
                    <rect x="14" y="12" width="7" height="9" rx="1" />
                    <rect x="3" y="16" width="7" height="5" rx="1" />
                  </svg>
                </span>
                <span className="nav-label">Dashboard</span>
              </NavLink>

              <NavLink
                to="/inventory"
                aria-label="Inventory"
                title="Inventory"
                className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
              >
                <span className="nav-icon">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                    <path d="m3.3 7 8.7 5 8.7-5" />
                    <path d="M12 12v9.5" />
                  </svg>
                </span>
                <span className="nav-label">Inventory</span>
              </NavLink>

              <NavLink
                to="/add"
                aria-label="Add / Import"
                title="Add / Import"
                className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
              >
                <span className="nav-icon">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </span>
                <span className="nav-label">Add / Import</span>
              </NavLink>

              <NavLink
                to="/alerts"
                aria-label="Alerts"
                title="Alerts"
                className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
              >
                <span className="nav-icon">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </span>
                <span className="nav-label">Alerts</span>
              </NavLink>

              {isAdmin && <>
              <NavLink
                to="/reports"
                aria-label="Reports"
                title="Reports"
                className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
              >
                <span className="nav-icon">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18" />
                    <path d="m19 9-5 5-4-4-3 3" />
                  </svg>
                </span>
                <span className="nav-label">Reports</span>
              </NavLink>

              <NavLink
                to="/insights"
                aria-label="AI Insights"
                title="AI Insights"
                className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
              >
                <span className="nav-icon">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
                  </svg>
                </span>
                <span className="nav-label">AI Insights</span>
              </NavLink>
              </>}

              {isAdmin && (
                <NavLink
                  to="/settings"
                  aria-label="Settings"
                  title="Settings"
                  className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
                >
                  <span className="nav-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </span>
                  <span className="nav-label">Settings</span>
                </NavLink>
              )}
            </nav>
          </div>

          <div className="sidebar-bottom-section">
            <div className="sidebar-filters">
              <div className="filter-group">
                <div className="filter-label-header">
                  <span>MAX QUANTITY</span>
                </div>
                <div className="filter-input-row">
                  <span className="filter-prefix">≤</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={quantityFilter}
                    onChange={(e) => {
                      const nextValue = normalizePositiveInteger(e.target.value);
                      setQuantityFilter(nextValue);
                    }}
                    className="filter-number-input"
                    aria-label="Maximum quantity filter"
                  />
                </div>
                <input
                  id="quantityRange"
                  type="range"
                  min="0"
                  max={quantitySliderMax}
                  value={Math.min(quantityFilter, quantitySliderMax)}
                  onChange={(e) => setQuantityFilter(normalizePositiveInteger(e.target.value))}
                  className="custom-slider"
                  aria-label="Maximum quantity filter slider"
                />
              </div>

              <div className="filter-group">
                <div className="filter-label-header">
                  <span>EXPIRY DAYS</span>
                </div>
                <div className="filter-input-row">
                  <span className="filter-prefix">≤</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={expiryFilter}
                    onChange={(e) => {
                      const nextValue = normalizePositiveInteger(e.target.value);
                      setExpiryFilter(nextValue);
                    }}
                    className="filter-number-input"
                    aria-label="Expiry filter in days"
                  />
                </div>
                <input
                  id="expiryRange"
                  type="range"
                  min="0"
                  max={expirySliderMax}
                  value={Math.min(expiryFilter, expirySliderMax)}
                  onChange={(e) => setExpiryFilter(normalizePositiveInteger(e.target.value))}
                  className="custom-slider"
                  aria-label="Expiry filter days slider"
                />
              </div>
            </div>
          </div>
        </div>

          <div className="sidebar-footer-card">
            <div className="sidebar-profile-row">
              <div className="avatar-circle" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0F172A 100%)' }}>
                {initials}
              </div>
              <div className="sidebar-profile-meta">
                <span className="user-name">{user?.name || 'Dr. Amina'}</span>
                <span className="user-role">{roleLabel} {isAdmin && '⭐'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="sidebar-logout-btn"
              title="Sign out of your session"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
