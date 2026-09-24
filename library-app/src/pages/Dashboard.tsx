import { Link } from 'react-router-dom';
import { useInventory } from '../api/useInventory';

function getRisk(expiryDate: string, nowTimestamp: number): { label: string; key: string; badgeClass: string } {
  const exp = new Date(expiryDate).getTime();
  const diffDays = Math.floor((exp - nowTimestamp) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Expired', key: 'Expired', badgeClass: 'risk-badge--expired' };
  if (diffDays <= 3) return { label: 'Critical', key: 'Critical', badgeClass: 'risk-badge--critical' };
  if (diffDays <= 7) return { label: 'Action Required', key: 'Action Required', badgeClass: 'risk-badge--action' };
  if (diffDays <= 30) return { label: 'Monitor', key: 'Monitor', badgeClass: 'risk-badge--monitor' };
  return { label: 'Safe', key: 'Safe', badgeClass: 'risk-badge--safe' };
}

interface DashboardProps {
  quantityFilter: number;
  expiryFilter: number;
  searchTerm: string;
}

export default function Dashboard({ quantityFilter, expiryFilter, searchTerm }: DashboardProps) {
  const { items, loading, error } = useInventory();
  const nowTimestamp = Date.now();

  const filteredItems = items.filter(item => {
    const daysLeft = (new Date(item.expiryDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24);
    const matchesFilters = item.quantity <= quantityFilter && daysLeft <= expiryFilter;
    const matchesSearch = searchTerm === '' ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilters && matchesSearch;
  });

  // Compute counts per risk band
  const riskCounts = items.reduce(
    (acc, item) => {
      const riskKey = getRisk(item.expiryDate, nowTimestamp).key;
      acc[riskKey] = (acc[riskKey] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="page-body">
      {/* Overview Stat Cards Section */}
      <div className="overview-grid">
        {/* Total Items */}
        <div className="stat-card" style={{ '--accent-color': 'var(--color-primary)', '--icon-bg': 'var(--color-primary-light)' } as React.CSSProperties}>
          <div className="stat-icon-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m7.5 4.27 9 5.15" />
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 12v9.5" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-count">{items.length}</span>
            <span className="stat-label">Total Items</span>
          </div>
        </div>

        {/* Safe */}
        <div className="stat-card" style={{ '--accent-color': 'var(--risk-safe-border)', '--icon-bg': 'var(--risk-safe-bg)' } as React.CSSProperties}>
          <div className="stat-icon-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-count">{riskCounts['Safe'] ?? 0}</span>
            <span className="stat-label" style={{ color: 'var(--risk-safe-text)' }}>Safe</span>
          </div>
        </div>

        {/* Monitor */}
        <div className="stat-card" style={{ '--accent-color': 'var(--risk-monitor-border)', '--icon-bg': 'var(--risk-monitor-bg)' } as React.CSSProperties}>
          <div className="stat-icon-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-count">{riskCounts['Monitor'] ?? 0}</span>
            <span className="stat-label" style={{ color: 'var(--risk-monitor-text)' }}>Monitor</span>
          </div>
        </div>

        {/* Action Required */}
        <div className="stat-card" style={{ '--accent-color': 'var(--risk-action-border)', '--icon-bg': 'var(--risk-action-bg)' } as React.CSSProperties}>
          <div className="stat-icon-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-count">{riskCounts['Action Required'] ?? 0}</span>
            <span className="stat-label" style={{ color: 'var(--risk-action-text)' }}>Action Required</span>
          </div>
        </div>

        {/* Critical */}
        <div className="stat-card" style={{ '--accent-color': 'var(--risk-critical-border)', '--icon-bg': 'var(--risk-critical-bg)' } as React.CSSProperties}>
          <div className="stat-icon-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-count">{riskCounts['Critical'] ?? 0}</span>
            <span className="stat-label" style={{ color: 'var(--risk-critical-text)' }}>Critical</span>
          </div>
        </div>

        {/* Expired */}
        <div className="stat-card" style={{ '--accent-color': 'var(--risk-expired-border)', '--icon-bg': 'var(--risk-expired-bg)' } as React.CSSProperties}>
          <div className="stat-icon-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-count">{riskCounts['Expired'] ?? 0}</span>
            <span className="stat-label" style={{ color: 'var(--risk-expired-text)' }}>Expired</span>
          </div>
        </div>
      </div>

      {/* Inventory Details Table Card */}
      <div className="card-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>Inventory Details</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {filteredItems.length} of {items.length} total items
            </p>
          </div>
          <Link to="/add" className="btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add New Item
          </Link>
        </div>

        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading inventory...</p>}
        {error && <p style={{ color: 'var(--risk-critical-border)' }}>{error}</p>}

        {!loading && !error && (
          <div className="table-responsive">
            {filteredItems.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1rem', opacity: 0.5 }}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <p style={{ fontSize: '1rem', fontWeight: 600 }}>No inventory items match the current filters or search term.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Try adjusting the quantity/expiry sliders in the sidebar or changing your search query.</p>
              </div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Expiry Date</th>
                    <th>Risk Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => {
                    const risk = getRisk(item.expiryDate, nowTimestamp);
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>
                          <Link to={`/inventory/${item.id}`} style={{ color: 'var(--text-main)', textDecoration: 'none' }}>
                            {item.name}
                          </Link>
                        </td>
                        <td>
                          <span style={{ background: 'var(--bg-canvas)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{item.quantity} units</td>
                        <td>{new Date(item.expiryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                        <td>
                          <span className={`risk-badge ${risk.badgeClass}`}>
                            <span className="risk-badge-dot" />
                            {risk.label}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link to={`/inventory/${item.id}`} className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                            View Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
