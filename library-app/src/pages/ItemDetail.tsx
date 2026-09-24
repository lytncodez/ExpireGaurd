import { useParams, useNavigate } from 'react-router-dom';
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

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { items, deleteItem } = useInventory();
  const nowTimestamp = Date.now();

  const item = items.find(i => i.id === id);

  if (!item) {
    return (
      <div className="page-body">
        <div className="card-container form-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Item Not Found
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            The requested inventory item could not be located in the system database.
          </p>
          <button className="btn-primary" onClick={() => navigate('/inventory')}>
            Return to Inventory Catalog
          </button>
        </div>
      </div>
    );
  }

  const risk = getRisk(item.expiryDate, nowTimestamp);
  const diffDays = Math.floor((new Date(item.expiryDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24));

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
      deleteItem(item.id);
      navigate('/inventory');
    }
  };

  return (
    <div className="page-body">
      <div className="card-container form-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-card)', paddingBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Item Details & Overview
            </span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {item.name}
            </h1>
          </div>
          <span className={`risk-badge ${risk.badgeClass}`}>
            <span className="risk-badge-dot" />
            {risk.label}
          </span>
        </div>

        <div className="table-responsive" style={{ marginBottom: '2rem' }}>
          <table className="modern-table">
            <tbody>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)', width: '35%' }}>Category</td>
                <td style={{ fontWeight: 600 }}>{item.category}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Quantity in Stock</td>
                <td style={{ fontWeight: 700, fontSize: '1.1rem' }}>{item.quantity} units</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Expiry Date</td>
                <td>{new Date(item.expiryDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Time to Expiry</td>
                <td style={{ fontWeight: 600, color: diffDays < 0 ? 'var(--risk-critical-border)' : 'var(--text-main)' }}>
                  {diffDays < 0 ? `Expired ${Math.abs(diffDays)} days ago` : `${diffDays} days remaining`}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>System Identifier</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-subtle)' }}>{item.id}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
          <button className="btn-secondary" onClick={() => navigate('/inventory')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Inventory
          </button>
          <button className="btn-danger" onClick={handleDelete}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete Item
          </button>
        </div>
      </div>
    </div>
  );
}
