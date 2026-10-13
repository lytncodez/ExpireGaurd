import { useNavigate, NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../api/useAuth';
import { navigationItems } from './navigationItems';

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
  const visibleItems = navigationItems.filter(item => !item.adminOnly || isAdmin);
  const workspaceItems = visibleItems.filter(item => !item.adminOnly);
  const adminItems = visibleItems.filter(item => item.adminOnly);
  const initials = user?.name
    ? user.name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2)
    : 'EG';
  const roleLabel = isAdmin ? 'Admin' : user ? 'Dispenser' : 'User';

  const normalizePositiveInteger = (value: number | string) => {
    if (value === '' || value === null || value === undefined) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderNavigationItem = (item: (typeof navigationItems)[number]) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to !== '/inventory'}
        aria-label={item.label}
        title={isCollapsed ? item.label : undefined}
        data-tour={`nav-${item.to.slice(1)}`}
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      >
        <span className="nav-icon" aria-hidden="true"><Icon size={19} strokeWidth={1.8} /></span>
        <span className="nav-label">{item.label}</span>
      </NavLink>
    );
  };

  return (
    <div className={`app-sidebar-shell${isCollapsed ? ' is-collapsed' : ''}`}>
      <aside className="app-sidebar" aria-label="Primary sidebar">
        <div className="sidebar-header-row">
          <div className="brand-header">
            <div className="brand-icon" aria-hidden="true"><ShieldCheck size={22} strokeWidth={2} /></div>
            <div className="brand-text-block">
              <span className="brand-title">ExpiryGuard</span>
              <span className="brand-subtitle">PHARMA DISPENSARY</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-collapse-toggle"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
            aria-controls="primary-sidebar-navigation"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronRight size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}
          </button>
        </div>

        <div className="sidebar-scroll-area">
          <nav className="sidebar-nav" id="primary-sidebar-navigation" aria-label="Main navigation">
            <section className="sidebar-nav-group" aria-labelledby="workspace-nav-label">
              <h2 className="sidebar-section-label" id="workspace-nav-label">Workspace</h2>
              {workspaceItems.map(renderNavigationItem)}
            </section>
            {adminItems.length > 0 && <section className="sidebar-nav-group" aria-labelledby="management-nav-label">
              <h2 className="sidebar-section-label" id="management-nav-label">Management</h2>
              {adminItems.map(renderNavigationItem)}
            </section>}
          </nav>

          <section className="sidebar-filters" aria-labelledby="sidebar-filters-title">
            <h2 className="sidebar-section-label" id="sidebar-filters-title">Quick filters</h2>
            <div className="filter-group">
              <label className="filter-label-header" htmlFor="quantityFilterInput">Maximum quantity</label>
              <div className="filter-input-row">
                <span className="filter-prefix" aria-hidden="true">≤</span>
                <input
                  id="quantityFilterInput"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={quantityFilter}
                  onChange={event => setQuantityFilter(normalizePositiveInteger(event.target.value))}
                  className="filter-number-input"
                  aria-label="Maximum quantity filter"
                />
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(100, quantityFilter)}
                value={Math.min(quantityFilter, Math.max(100, quantityFilter))}
                onChange={event => setQuantityFilter(normalizePositiveInteger(event.target.value))}
                className="custom-slider"
                aria-label="Maximum quantity filter slider"
              />
            </div>

            <div className="filter-group">
              <label className="filter-label-header" htmlFor="expiryFilterInput">Expiry days</label>
              <div className="filter-input-row">
                <span className="filter-prefix" aria-hidden="true">≤</span>
                <input
                  id="expiryFilterInput"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={expiryFilter}
                  onChange={event => setExpiryFilter(normalizePositiveInteger(event.target.value))}
                  className="filter-number-input"
                  aria-label="Expiry filter in days"
                />
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(30, expiryFilter)}
                value={Math.min(expiryFilter, Math.max(30, expiryFilter))}
                onChange={event => setExpiryFilter(normalizePositiveInteger(event.target.value))}
                className="custom-slider"
                aria-label="Expiry filter days slider"
              />
            </div>
          </section>
        </div>

        <footer className="sidebar-footer-card">
          <div className="sidebar-profile-row" title={`${user?.name || 'Dr. Amina'} · ${roleLabel}`}>
            <div className="avatar-circle" aria-hidden="true">{initials}</div>
            <div className="sidebar-profile-meta">
              <span className="user-name">{user?.name || 'Dr. Amina'}</span>
              <span className="user-role">{roleLabel}</span>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="sidebar-logout-btn" title="Sign out of your session">
            <LogOut size={17} aria-hidden="true" />
            <span>Log out</span>
          </button>
        </footer>
      </aside>
    </div>
  );
}
