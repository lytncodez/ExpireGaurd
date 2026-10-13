import { NavLink } from 'react-router-dom';
import { useAuth } from '../api/useAuth';
import { navigationItems } from './navigationItems';

export default function MobileBottomNav() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const items = navigationItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <nav className="app-mobile-bottom-nav" aria-label="Mobile navigation">
      {items.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to !== '/inventory'}
          aria-label={label}
          title={label}
          data-tour={`nav-${to.slice(1)}`}
          className={({ isActive }) => `mobile-nav-item${to === '/add' ? ' mobile-nav-item--add' : ''}${isActive ? ' active' : ''}`}
        >
          <span className={`mobile-nav-icon${to === '/add' ? ' mobile-nav-icon--fab' : ''}`} aria-hidden="true">
            <Icon size={20} strokeWidth={1.8} />
          </span>
          <span className="mobile-nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
