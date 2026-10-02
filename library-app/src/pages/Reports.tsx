import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ClipboardCheck, DollarSign, Package, PieChart, TrendingUp, Truck, Zap } from 'lucide-react';
import { useInventory } from '../api/useInventory';
import StatCard from '../components/StatCard';
import { formatGhc } from '../utils/currency';

type Risk = 'Safe' | 'Monitor' | 'Action' | 'Critical' | 'Expired';
const riskColors: Record<Risk, string> = { Safe: '#16a36a', Monitor: '#e9a423', Action: '#f17b32', Critical: '#df4545', Expired: '#8290a2' };
const riskLabel: Record<Risk, string> = { Safe: 'Safe', Monitor: 'Monitor', Action: 'Action Required', Critical: 'Critical', Expired: 'Expired' };
const day = 86400000;

export default function Reports() {
  const { items = [] } = useInventory();
  const now = Date.now();
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'All' | Risk>('All');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'30' | '60' | '90' | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryMetric, setCategoryMetric] = useState<'quantity' | 'value'>('quantity');
  const [topSort, setTopSort] = useState<'value' | 'quantity'>('value');

  const data = useMemo(() => items.map(item => {
    const diffDays = Math.floor((new Date(item.expiryDate).getTime() - now) / day);
    const riskKey: Risk = diffDays < 0 ? 'Expired' : diffDays <= 7 ? 'Critical' : diffDays <= 30 ? 'Action' : diffDays <= 60 ? 'Monitor' : 'Safe';
    return { ...item, diffDays, riskKey, totalValue: (item.quantity || 0) * (item.unitCostGhs ?? item.unitPrice ?? 0) };
  }), [items, now]);

  const filtered = useMemo(() => data.filter(item => {
    if (item.riskKey === 'Safe') return false;
    if (selectedRiskFilter !== 'All' && item.riskKey !== selectedRiskFilter) return false;
    if (selectedTimeRange !== 'all' && item.diffDays > Number(selectedTimeRange)) return false;
    const expiry = new Date(item.expiryDate).toISOString().slice(0, 10);
    if (dateFrom && expiry < dateFrom) return false;
    if (dateTo && expiry > dateTo) return false;
    return true;
  }).sort((a, b) => a.diffDays - b.diffDays), [data, selectedRiskFilter, selectedTimeRange, dateFrom, dateTo]);

  const stats = useMemo(() => ({
    value: filtered.reduce((sum, item) => sum + item.totalValue, 0),
    units: filtered.reduce((sum, item) => sum + item.quantity, 0),
    critical: filtered.filter(item => item.riskKey === 'Critical').length,
    count: filtered.length,
  }), [filtered]);

  const exportCsv = () => {
    const headers = ['Product Name', 'Category', 'Batch Number', 'Quantity', 'Unit Cost (GH₵)', 'Stock Value (GH₵)', 'Expiry Date', 'Days to Expiry', 'Risk Status', 'Supplier', 'Location'];
    const rows = filtered.map(item => [item.name, item.category, item.batchNo, item.quantity, formatGhc(item.unitCostGhs ?? item.unitPrice), formatGhc(item.totalValue), new Date(item.expiryDate).toLocaleDateString(), item.diffDays, riskLabel[item.riskKey], item.supplier ?? '', item.location ?? ''].map(value => `"${String(value).replace(/"/g, '""')}"`));
    const blob = new Blob([[headers, ...rows].map(row => row.join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `ExpireGuard_At_Risk_Report_${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const riskSummary = (['Safe', 'Monitor', 'Action', 'Critical', 'Expired'] as Risk[]).map(risk => {
    const matching = data.filter(item => item.riskKey === risk);
    return { risk, count: matching.length, units: matching.reduce((sum, item) => sum + item.quantity, 0) };
  });
  const totalUnits = riskSummary.reduce((sum, item) => sum + item.units, 0) || 1;
  let offset = 0;
  const donutStops = riskSummary.map(item => {
    const start = offset; offset += item.units / totalUnits * 100;
    return `${riskColors[item.risk]} ${start}% ${offset}%`;
  }).join(', ');

  const categories = Object.values(data.reduce<Record<string, { name: string; quantity: number; value: number }>>((acc, item) => {
    const key = item.category || 'Uncategorized';
    acc[key] ??= { name: key, quantity: 0, value: 0 };
    acc[key].quantity += item.quantity; acc[key].value += item.totalValue; return acc;
  }, {})).sort((a, b) => (categoryMetric === 'quantity' ? b.quantity - a.quantity : b.value - a.value));
  const maxCategory = Math.max(1, ...categories.map(c => categoryMetric === 'quantity' ? c.quantity : c.value));
  const topRisk = data.filter(item => item.riskKey !== 'Safe').sort((a, b) => topSort === 'value' ? b.totalValue - a.totalValue : b.quantity - a.quantity).slice(0, 8);

  const suppliers = Object.values(data.reduce<Record<string, { name: string; batches: number; riskBatches: number; lost: number }>>((acc, item) => {
    const name = item.supplier || 'Supplier not recorded';
    acc[name] ??= { name, batches: 0, riskBatches: 0, lost: 0 };
    acc[name].batches++;
    if (item.riskKey === 'Critical' || item.riskKey === 'Expired') acc[name].riskBatches++;
    if (item.riskKey === 'Expired') acc[name].lost += item.totalValue;
    return acc;
  }, {})).sort((a, b) => b.riskBatches / b.batches - a.riskBatches / a.batches || b.lost - a.lost);
  const velocity = ['Fast', 'Moderate', 'Slow', 'Dead'].map(name => {
    const matching = data.filter(item => (item.velocity || 'Moderate') === name);
    return { name, units: matching.reduce((sum, item) => sum + item.quantity, 0), products: matching.length, color: name === 'Fast' ? '#16a36a' : name === 'Moderate' ? '#5363bd' : name === 'Slow' ? '#e9a423' : '#8290a2' };
  });

  // Project current stock cost into its future expiry month. Expired batches are already
  // out of the forward window, while empty months remain present to keep the 12-month axis stable.
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const trend = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(today.getFullYear(), today.getMonth() + index, 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1).getTime();
    const value = data.filter(item => {
      const expiry = new Date(item.expiryDate).getTime();
      return expiry >= todayStart && expiry >= month.getTime() && expiry < monthEnd;
    }).reduce((sum, item) => sum + (item.quantity || 0) * (item.unitCostGhs ?? item.unitPrice ?? 0), 0);
    return { key: month.toLocaleString('en', { month: 'short' }), monthName: month.toLocaleString('en', { month: 'long', year: 'numeric' }), value, urgency: index < 2 ? 'critical' : index < 5 ? 'action' : 'safe' };
  });
  const trendMax = Math.max(1, ...trend.map(point => point.value));

  return <div className="page-body reports-page">
    <section className="reports-toolbar card-container">
      <div className="reports-toolbar-heading">
        <div><h1>Reports &amp; Inventory Analytics</h1><p>Risk exposure, supplier quality, stock value and product movement.</p></div>
        <button type="button" className="reports-export-button" onClick={exportCsv}><ArrowDownToLine size={17} /> Export At-Risk CSV</button>
      </div>
      <div className="reports-filters">
        <label>Risk band<select value={selectedRiskFilter} onChange={e => setSelectedRiskFilter(e.target.value as 'All' | Risk)} className="form-input"><option value="All">All risk bands</option>{(['Monitor', 'Action', 'Critical', 'Expired'] as Risk[]).map(risk => <option key={risk} value={risk}>{riskLabel[risk]}</option>)}</select></label>
        <label>Expiry horizon<select value={selectedTimeRange} onChange={e => setSelectedTimeRange(e.target.value as typeof selectedTimeRange)} className="form-input"><option value="30">Within 30 days</option><option value="60">Within 60 days</option><option value="90">Within 90 days</option><option value="all">All dates</option></select></label>
        <label>Expiry date from<input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} onClick={e => { try { e.currentTarget.showPicker(); } catch { /* Browser may open the native picker from the click itself. */ } }} className={`form-input reports-date-input${dateFrom ? ' is-active' : ''}`} aria-label="Expiry date range start" /></label>
        <label>Expiry date to<input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} onClick={e => { try { e.currentTarget.showPicker(); } catch { /* Browser may open the native picker from the click itself. */ } }} className={`form-input reports-date-input${dateTo ? ' is-active' : ''}`} aria-label="Expiry date range end" /></label>
      </div>
      <p className="reports-filter-help">Expiry date range limits batches by their expiry dates. Expiry horizon is a relative window from today.</p>
    </section>

    <div className="stat-card-grid reports-stat-grid">
      <StatCard label="Total Value at Risk" value={formatGhc(stats.value)} context="Filtered batches in current report" icon={DollarSign} tone="critical" />
      <StatCard label="Units at Risk" value={stats.units.toLocaleString()} context="Units represented by matching batches" icon={Package} tone="action" />
      <StatCard label="Critical Batches" value={stats.critical} context="Expiring within 7 days" icon={AlertTriangle} tone="critical" />
      <StatCard label="Matching Records" value={stats.count} context="Batches included by current filters" icon={ClipboardCheck} tone="indigo" />
    </div>

    <div className="reports-analytics-grid">
      <section className="reports-chart-card"><header><div><h2>Risk Distribution</h2><p>Share of inventory units by current risk band</p></div><PieChart size={20} /></header>
        <div className="reports-risk-layout"><div className="reports-donut" style={{ background: `conic-gradient(${donutStops})` }} role="img" aria-label="Inventory unit risk distribution"><div><strong>{totalUnits.toLocaleString()}</strong><span>units</span></div></div>
          <div className="reports-legend">{riskSummary.map(item => <div key={item.risk}><i style={{ background: riskColors[item.risk] }} /><span>{riskLabel[item.risk]}</span><b>{(item.units / totalUnits * 100).toFixed(0)}%</b><small>{item.count} batches</small></div>)}</div></div>
      </section>

      <section className="reports-chart-card"><header><div><h2>Stock Value at Risk</h2><p>Projected stock value at risk of expiry, by month, based on current inventory.</p></div><TrendingUp size={20} /></header>
        <div className="reports-trend-scroll"><div className="reports-trend-chart reports-trend-chart--projection">{trend.map(point => <div className="reports-trend-column" key={point.monthName}><span className="reports-trend-value" title={`${point.monthName}: ${formatGhc(point.value)}`}>{formatGhc(point.value)}</span><div className="reports-trend-track"><i className={`reports-projection-bar reports-projection-bar--${point.urgency}`} style={{ height: `${point.value === 0 ? 0 : Math.max(5, point.value / trendMax * 100)}%` }} /></div><small title={point.monthName}>{point.key}</small></div>)}</div></div>
        <p className="reports-data-note">Each bar sums quantity × unit cost for batches expiring in that month. Hover a value for the month and full amount.</p>
      </section>

      <section className="reports-chart-card"><header><div><h2>Product Category Breakdown</h2><p>Compare stock distribution across categories</p></div><Package size={20} /></header>
        <div className="reports-card-tools"><div className="reports-segment"><button className={categoryMetric === 'quantity' ? 'active' : ''} onClick={() => setCategoryMetric('quantity')}>Units</button><button className={categoryMetric === 'value' ? 'active' : ''} onClick={() => setCategoryMetric('value')}>Value</button></div></div>
        <div className="reports-category-list">{categories.map(category => { const value = categoryMetric === 'quantity' ? category.quantity : category.value; return <div className="reports-category-row" key={category.name}><div><b>{category.name}</b><span>{categoryMetric === 'quantity' ? value.toLocaleString() : formatGhc(value)}</span></div><div className="reports-bar-track"><i style={{ width: `${value / maxCategory * 100}%` }} /></div></div>; })}</div>
      </section>

      <section className="reports-chart-card"><header><div><h2>Suppliers with Highest Expiry Rate</h2><p>Critical or expired batches by supplier</p></div><Truck size={20} /></header>
        <div className="table-responsive"><table className="modern-table reports-compact-table"><thead><tr><th>Supplier</th><th>Batches</th><th>Critical / expired</th><th>Value lost</th></tr></thead><tbody>{suppliers.map(supplier => <tr key={supplier.name}><td><strong>{supplier.name}</strong></td><td>{supplier.batches}</td><td><span className="reports-rate-badge">{(supplier.riskBatches / supplier.batches * 100).toFixed(0)}%</span></td><td>{formatGhc(supplier.lost)}</td></tr>)}</tbody></table></div>
      </section>

      <section className="reports-chart-card"><header><div><h2>Top At-Risk Products</h2><p>Highest exposure from filtered stock</p></div><AlertTriangle size={20} /></header>
        <div className="reports-card-tools"><div className="reports-segment"><button className={topSort === 'value' ? 'active' : ''} onClick={() => setTopSort('value')}>By value</button><button className={topSort === 'quantity' ? 'active' : ''} onClick={() => setTopSort('quantity')}>By quantity</button></div></div>
        <div className="reports-top-list">{topRisk.length ? topRisk.slice(0, 8).map((item, index) => <div className="reports-top-item" key={item.id}><span className="reports-rank">{index + 1}</span><div className="reports-top-name"><b>{item.name}</b><small>{item.batchNo} · {riskLabel[item.riskKey]}</small></div><strong>{topSort === 'value' ? formatGhc(item.totalValue) : `${item.quantity.toLocaleString()} units`}</strong></div>) : <p className="reports-empty">No at-risk batches match these filters.</p>}</div>
      </section>

      <section className="reports-chart-card"><header><div><h2>Fast-Moving vs. Slow-Moving</h2><p>Current units by recorded turnover classification</p></div><Zap size={20} /></header>
        <div className="reports-velocity-list">{velocity.map(item => <div className="reports-velocity-row" key={item.name}><div><span className="reports-velocity-dot" style={{ background: item.color }} /><b>{item.name === 'Dead' ? 'No movement' : `${item.name}-Moving`}</b><small>{item.products} products</small></div><div className="reports-velocity-track"><i style={{ width: `${item.units / Math.max(1, ...velocity.map(v => v.units)) * 100}%`, background: item.color }} /></div><strong>{item.units.toLocaleString()} units</strong></div>)}</div>
      </section>
    </div>
  </div>;
}
