import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useInventory } from '../api/useInventory';

function getRisk(expiryDate: string, nowTimestamp: number): { label: string; key: string; badgeClass: string } {
  const exp = new Date(expiryDate).getTime();
  const diffDays = Math.floor((exp - nowTimestamp) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Expired', key: 'Expired', badgeClass: 'risk-badge--expired' };
  if (diffDays <= 7) return { label: 'Critical', key: 'Critical', badgeClass: 'risk-badge--critical' };
  if (diffDays <= 30) return { label: 'Action Required', key: 'Action Required', badgeClass: 'risk-badge--action' };
  if (diffDays <= 60) return { label: 'Monitor', key: 'Monitor', badgeClass: 'risk-badge--monitor' };
  return { label: 'Safe', key: 'Safe', badgeClass: 'risk-badge--safe' };
}

interface InventoryListProps {
  quantityFilter?: number;
  expiryFilter?: number;
  searchTerm?: string;
}

export default function InventoryList({ quantityFilter, expiryFilter, searchTerm = '' }: InventoryListProps) {
  const { items, loading, error, resetToMock } = useInventory();
  const nowTimestamp = Date.now();

  // Multi-Filter dropdown states
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('All');
  const [selectedRisk, setSelectedRisk] = useState<string>('All');

  const categories = useMemo(() => ['All', ...Array.from(new Set((items || []).map(i => i.category || 'General')))], [items]);
  const suppliers = useMemo(() => ['All', ...Array.from(new Set((items || []).map(i => i.supplier || 'Standard Supplier')))], [items]);

  const filteredItems = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();
    return (items || []).filter(item => {
      const qty = item.quantity || 0;
      const qtyOk = quantityFilter !== undefined ? qty <= quantityFilter : true;
      const daysLeft = (new Date(item.expiryDate || Date.now()).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24);
      const expOk = expiryFilter !== undefined ? daysLeft <= expiryFilter : true;
      const riskKey = getRisk(item.expiryDate || new Date().toISOString(), nowTimestamp).key;

      const name = (item.name || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      const batchNo = (item.batchNo || '').toLowerCase();
      const supplier = (item.supplier || '').toLowerCase();

      const searchOk = term === '' ||
        name.includes(term) ||
        category.includes(term) ||
        batchNo.includes(term) ||
        supplier.includes(term);

      const catOk = selectedCategory === 'All' || item.category === selectedCategory;
      const supOk = selectedSupplier === 'All' || item.supplier === selectedSupplier;
      const riskOk = selectedRisk === 'All' || riskKey === selectedRisk;

      return qtyOk && expOk && searchOk && catOk && supOk && riskOk;
    });
  }, [items, quantityFilter, expiryFilter, searchTerm, selectedCategory, selectedSupplier, selectedRisk, nowTimestamp]);

  return (
    <div className="page-body">
      <div className="card-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              Inventory Catalog
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {filteredItems.length} of {(items || []).length} total products in active stock
            </p>
          </div>

          {/* Search & Filter Header Dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={resetToMock} style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}>
              Reset Data
            </button>

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="form-select"
            >
              <option value="All">All Categories</option>
              {categories.filter(c => c !== 'All').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
              className="form-select"
            >
              <option value="All">All Suppliers</option>
              {suppliers.filter(s => s !== 'All').map(sup => (
                <option key={sup} value={sup}>{sup}</option>
              ))}
            </select>

            <select
              value={selectedRisk}
              onChange={e => setSelectedRisk(e.target.value)}
              className="form-select"
            >
              <option value="All">All Risk Levels</option>
              <option value="Safe">Safe (&gt;60d)</option>
              <option value="Monitor">Monitor (31-60d)</option>
              <option value="Action Required">Action (8-30d)</option>
              <option value="Critical">Critical (1-7d)</option>
              <option value="Expired">Expired (&lt;0d)</option>
            </select>

            <Link to="/add" className="btn-primary" style={{ padding: '0.55rem 1rem', fontSize: '0.88rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Item
            </Link>
          </div>
        </div>

        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading inventory catalog...</p>}
        {error && <p style={{ color: 'var(--risk-critical-border)' }}>{error}</p>}

        {!loading && !error && (
          <div className="table-responsive">
            {filteredItems.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '1rem', fontWeight: 600 }}>No inventory items match the current multi-filter selection.</p>
              </div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Batch No.</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Value at Risk</th>
                    <th>Expiry Date</th>
                    <th>Days Left</th>
                    <th>Risk Level</th>
                    <th>Supplier</th>
                    <th>Location</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => {
                    const daysLeft = Math.floor((new Date(item.expiryDate || Date.now()).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24));
                    const risk = getRisk(item.expiryDate || new Date().toISOString(), nowTimestamp);
                    const qty = item.quantity || 0;
                    const price = item.unitPrice || 0;
                    const itemValueAtRisk = daysLeft <= 30 ? (qty * price) : 0;

                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 700 }}>
                          <Link to={`/inventory/${item.id}`} style={{ color: 'var(--text-main)', textDecoration: 'none' }}>
                            {item.name || 'Product'}
                          </Link>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.category || 'General'}</div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', background: 'var(--bg-canvas)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                            {item.batchNo || 'BATCH-000'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{qty} units</td>
                        <td>${price.toFixed(2)}</td>
                        <td style={{ fontWeight: 700, color: itemValueAtRisk > 0 ? '#7C3AED' : 'var(--text-muted)' }}>
                          {itemValueAtRisk > 0 ? `$${itemValueAtRisk.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td>{new Date(item.expiryDate || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: daysLeft < 0 ? '#DC2626' : (daysLeft <= 7 ? '#EF4444' : (daysLeft <= 30 ? '#EA580C' : 'var(--text-main)')) }}>
                            {daysLeft < 0 ? `${Math.abs(daysLeft)}d ago` : `${daysLeft} days`}
                          </span>
                        </td>
                        <td>
                          <span className={`risk-badge ${risk.badgeClass}`}>
                            <span className="risk-badge-dot" />
                            {risk.label}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{item.supplier || 'PharmaCorp Inc.'}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          <span style={{ background: 'var(--bg-canvas)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                            {item.location || 'Aisle A1'}
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
