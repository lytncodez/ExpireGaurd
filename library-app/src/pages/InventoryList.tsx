import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShieldAlert } from 'lucide-react';
import { useInventory } from '../api/useInventory';
import type { InventoryItem } from '../api/mockData';
import { formatGhc } from '../utils/currency';
import { useAuth } from '../api/useAuth';

type InventoryTab = 'all' | 'batch' | 'risk' | 'expired';
const dayMs = 24 * 60 * 60 * 1000;
const tabs: { id: InventoryTab; label: string }[] = [
  { id: 'all', label: 'All Stock' },
  { id: 'batch', label: 'By Batch (FEFO View)' },
  { id: 'risk', label: 'Near-Expiry / At Risk' },
  { id: 'expired', label: 'Expired Stock' },
];

function getRisk(item: InventoryItem, now: number) {
  const expiry = new Date(item.expiryDate || now).getTime();
  const days = Math.floor((expiry - now) / dayMs);
  if (days < 0) return { label: 'Expired', key: 'Expired', badge: 'risk-badge--expired', days };
  if (days <= 7) return { label: 'Critical', key: 'Critical', badge: 'risk-badge--critical', days };
  if (days <= 30) return { label: 'Action Required', key: 'Action Required', badge: 'risk-badge--action', days };
  if (days <= 60) return { label: 'Monitor', key: 'Monitor', badge: 'risk-badge--monitor', days };
  return { label: 'Safe', key: 'Safe', badge: 'risk-badge--safe', days };
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function InventoryList({ searchTerm = '' }: { searchTerm?: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { items, loading, error, updateItem } = useInventory();
  const [activeTab, setActiveTab] = useState<InventoryTab>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [maxQuantity, setMaxQuantity] = useState('');
  const [maxExpiryDays, setMaxExpiryDays] = useState('');
  const now = Date.now();
  const searchTerms = [searchTerm, localSearch].map(value => value.trim().toLowerCase()).filter(Boolean);
  const qtyLimit = maxQuantity === '' ? undefined : Number(maxQuantity);
  const expiryLimit = maxExpiryDays === '' ? undefined : Number(maxExpiryDays);

  const filteredItems = useMemo(() => (items || []).filter(item => {
    const risk = getRisk(item, now);
    const isQuarantined = item.status === 'Quarantined';
    if (activeTab === 'expired' && risk.key !== 'Expired') return false;
    if (activeTab !== 'expired' && (risk.key === 'Expired' || isQuarantined)) return false;
    if (activeTab === 'risk' && !['Monitor', 'Action Required', 'Critical'].includes(risk.key)) return false;
    const searchable = [item.name, item.category, item.batchNo, ...(isAdmin ? [item.supplier] : []), item.location].join(' ').toLowerCase();
    if (searchTerms.some(search => !searchable.includes(search))) return false;
    if (qtyLimit !== undefined && Number.isFinite(qtyLimit) && item.quantity > qtyLimit) return false;
    if (expiryLimit !== undefined && Number.isFinite(expiryLimit) && risk.days > expiryLimit) return false;
    return true;
  }), [items, activeTab, searchTerms.join('|'), qtyLimit, expiryLimit, now, isAdmin]);

  const visibleItems = useMemo(() => {
    if (activeTab !== 'batch') return filteredItems;
    return [...filteredItems].sort((a, b) => a.name.localeCompare(b.name) || new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [filteredItems, activeTab]);

  const firstBatchByProduct = useMemo(() => {
    const ids = new Set<string>();
    if (activeTab === 'batch') {
      for (const item of visibleItems) {
        if (!ids.has(item.name)) ids.add(item.name);
      }
    }
    return ids;
  }, [activeTab, visibleItems]);

  return <div className="page-body inventory-page">
    <div className="inventory-heading">
      <div><p className="inventory-eyebrow">STOCK MANAGEMENT</p><h1>Inventory</h1><p className="inventory-subtitle">Your full stock and batch repository, with expiry risk and FEFO priority in view.</p></div>
      <Link to="/add" className="btn-primary inventory-add">+ Add Stock</Link>
    </div>

    <div className="inventory-tabs" role="tablist" aria-label="Inventory views">
      {tabs.map(tab => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} className={`inventory-tab${activeTab === tab.id ? ' is-active' : ''}`} onClick={() => setActiveTab(tab.id)}>{tab.label}{tab.id === 'expired' && <span className="inventory-tab-count">{items.filter(item => getRisk(item, now).key === 'Expired').length}</span>}</button>)}
    </div>

    <section className="card-container inventory-card">
      <div className="inventory-toolbar">
        <label className="inventory-search"><Search size={17} /><input aria-label="Search inventory" value={localSearch} onChange={event => setLocalSearch(event.target.value)} placeholder="Search products, batches, suppliers..." /></label>
        <label className="inventory-limit"><span>Max quantity</span><span className="inventory-number"><b>&le;</b><input aria-label="Maximum quantity" type="number" min="0" value={maxQuantity} onChange={event => setMaxQuantity(event.target.value)} placeholder="Any" /></span></label>
        <label className="inventory-limit"><span>Expiry in days</span><span className="inventory-number"><b>&le;</b><input aria-label="Maximum expiry days" type="number" min="0" value={maxExpiryDays} onChange={event => setMaxExpiryDays(event.target.value)} placeholder="Any" /></span></label>
        <span className="inventory-result-count">{visibleItems.length} {visibleItems.length === 1 ? 'batch' : 'batches'}</span>
      </div>

      {activeTab === 'expired' && <div className="quarantine-notice"><ShieldAlert size={17} /><span>Expired stock is out of active circulation. Quarantine it for supplier return or disposal.</span></div>}
      {loading && <p className="inventory-empty">Loading inventory...</p>}
      {error && <p className="inventory-error">{error}</p>}
      {!loading && !error && <div className="table-responsive inventory-table-wrap">
        {visibleItems.length === 0 ? <div className="inventory-empty"><strong>No stock matches this view.</strong><span>Adjust the search or filters, or switch to another inventory tab.</span></div> : <table className="modern-table inventory-table">
          <thead><tr><th>Product &amp; Category</th><th>Batch &amp; Storage Location</th><th>Quantity</th><th>{isAdmin ? 'Unit Cost / Selling Price (GH₵)' : 'Selling Price (GH₵)'}</th><th>Manufacturing Date</th><th>Expiry Date</th>{isAdmin && <th>Supplier &amp; Date Received</th>}<th>Status</th>{activeTab === 'expired' && <th>Action</th>}</tr></thead>
          <tbody>{visibleItems.map(item => {
            const risk = getRisk(item, now);
            const expired = risk.key === 'Expired';
            const quarantined = item.status === 'Quarantined';
            const useFirst = activeTab === 'batch' && firstBatchByProduct.has(item.name) && visibleItems.find(row => row.name === item.name)?.id === item.id;
            return <tr key={item.id} className={`${expired ? 'inventory-row-expired' : ''} inventory-row-clickable`}>
              <td><Link className="inventory-product-link" to={`/inventory/${item.id}`}>{item.name || item.productName || 'Product'}</Link><span className="inventory-cell-muted">{item.category || 'General'}</span></td>
              <td><span className="inventory-batch">{item.batchNo || item.batchNumber || '-'} </span><span className="inventory-cell-muted">{item.location || item.storageLocation || '-'}{useFirst && <em className="use-first-tag">Use First</em>}</span></td>
              <td><strong>{item.quantity.toLocaleString()}</strong><span className="inventory-cell-muted">units</span></td>
              <td>{isAdmin ? <><span className="inventory-price">{formatGhc(item.unitCostGhs ?? item.unitPrice ?? 0)}</span><span className="inventory-cell-muted">Sell {formatGhc(item.sellingPriceGhs ?? item.unitPrice ?? 0)}</span></> : <span className="inventory-price">{formatGhc(item.sellingPriceGhs ?? item.unitPrice ?? 0)}</span>}</td>
              <td>{formatDate(item.manufacturingDate)}</td>
              <td><span className="inventory-expiry-date">{formatDate(item.expiryDate)}</span><span className="inventory-cell-muted">{risk.days < 0 ? `${Math.abs(risk.days)} days ago` : `${risk.days} days left`}</span></td>
              {isAdmin && <td><span>{item.supplier || '-'}</span><span className="inventory-cell-muted">Received {formatDate(item.dateReceived)}</span></td>}
              <td><span className={`risk-badge ${risk.badge}`}><span className="risk-badge-dot" />{quarantined ? 'Quarantined' : risk.label}</span></td>
              {activeTab === 'expired' && <td>{quarantined ? <span className="quarantined-label">Quarantined</span> : <button className="row-action-button" type="button" onClick={() => updateItem(item.id, { status: 'Quarantined' })}>Quarantine / Remove</button>}</td>}
            </tr>;
          })}</tbody>
        </table>}
      </div>}
    </section>
  </div>;
}
