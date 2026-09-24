import { NavLink } from 'react-router-dom';

interface SidebarProps {
  quantityFilter: number;
  setQuantityFilter: (val: number) => void;
  expiryFilter: number;
  setExpiryFilter: (val: number) => void;
}

export default function Sidebar({
  quantityFilter,
  setQuantityFilter,
  expiryFilter,
  setExpiryFilter,
}: SidebarProps) {
  return (
    <aside className="app-sidebar">
      <div>
        {/* Brand Identity Header */}
        <div className="brand-header">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="brand-title">ExpiryGuard</span>
        </div>

        {/* User Profile Avatar Card */}
        <div className="user-profile-card">
          <div className="avatar-circle">AD</div>
          <div className="user-info">
            <span className="user-name">Admin User</span>
            <span className="user-role">System Manager</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
            </span>
            Dashboard
          </NavLink>

          <NavLink
            to="/inventory"
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m7.5 4.27 9 5.15" />
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 12v9.5" />
              </svg>
            </span>
            Inventory
          </NavLink>

          <NavLink
            to="/add"
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
              </svg>
            </span>
            Add Item
          </NavLink>
        </nav>
      </div>

      {/* Sidebar Sliders (Lower Section) */}
      <div className="sidebar-filters">
        <div className="filter-group">
          <div className="filter-label-header">
            <span>Max Quantity</span>
            <span className="filter-badge">≤ {quantityFilter}</span>
          </div>
          <input
            id="quantityRange"
            type="range"
            min="0"
            max="200"
            value={quantityFilter}
            onChange={(e) => setQuantityFilter(parseInt(e.target.value, 10))}
            className="custom-slider"
          />
        </div>

        <div className="filter-group">
          <div className="filter-label-header">
            <span>Expiry Days</span>
            <span className="filter-badge">≤ {expiryFilter} days</span>
          </div>
          <input
            id="expiryRange"
            type="range"
            min="0"
            max="180"
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(parseInt(e.target.value, 10))}
            className="custom-slider"
          />
        </div>
      </div>
    </aside>
  );
}
