import { Link } from 'react-router-dom';
import { useInventory } from '../api/useInventory';

function getRisk(expiryDate: string, nowTimestamp: number): { label: string; badgeClass: string } {
  const exp = new Date(expiryDate).getTime();
  const diffDays = Math.floor((exp - nowTimestamp) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Expired', badgeClass: 'risk-badge--expired' };
  if (diffDays <= 3) return { label: 'Critical', badgeClass: 'risk-badge--critical' };
  if (diffDays <= 7) return { label: 'Action Required', badgeClass: 'risk-badge--action' };
  if (diffDays <= 30) return { label: 'Monitor', badgeClass: 'risk-badge--monitor' };
  return { label: 'Safe', badgeClass: 'risk-badge--safe' };
}

interface InventoryListProps {
  quantityFilter?: number;
  expiryFilter?: number;
  searchTerm?: string;
}

export default function InventoryList({ quantityFilter, expiryFilter, searchTerm = '' }: InventoryListProps) {
  const { items, loading, error } = useInventory();
  const nowTimestamp = Date.now();

  const filteredItems = items.filter(item => {
    const qtyOk = quantityFilter !== undefined ? item.quantity <= quantityFilter : true;
    const daysLeft = (new Date(item.expiryDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24);
    const expOk = expiryFilter !== undefined ? daysLeft <= expiryFilter : true;
    const searchOk = searchTerm === '' ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    return qtyOk && expOk && searchOk;
  });

  return (
    <div className="page-body">
      <div className="card-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              Full Inventory Management
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {filteredItems.length} of {items.length} total catalog items
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

        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading inventory catalog...</p>}
        {error && <p style={{ color: 'var(--risk-critical-border)' }}>{error}</p>}

        {!loading && !error && (
          <div className="table-responsive">
            {filteredItems.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '1rem', fontWeight: 600 }}>No inventory items match your criteria.</p>
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
                    <th style={{ textAlign: 'right' }}>Actions</th>
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
                            Manage
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
