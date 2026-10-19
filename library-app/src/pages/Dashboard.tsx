import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  DollarSign,
  Package,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useInventory } from '../api/useInventory';
import StatCard from '../components/StatCard';
import { formatGhc } from '../utils/currency';
import { useAuth } from '../api/useAuth';
import type { InventoryItem } from '../api/types';
import { daysToExpiry, riskBand, type RiskBand, type RiskThresholds } from '../utils/risk';

interface DashboardProps {
  quantityFilter: number;
  expiryFilter: number;
  searchTerm: string;
}

type RiskLevel = 'Critical' | 'High Risk' | 'Monitor';

interface ActionItem {
  id: string;
  product: string;
  category: string;
  batch: string;
  location: string;
  stock: number;
  value: number;
  daysLeft: number;
  risk: RiskLevel;
  action: string;
}

const RISK_FOR_BAND: Partial<Record<RiskBand, RiskLevel>> = {
  Expired: 'Critical',
  Critical: 'Critical',
  'Action Required': 'High Risk',
  Monitor: 'Monitor',
};

function isOnSale(item: InventoryItem) {
  return item.status !== 'Disposed' && item.status !== 'Quarantined' && item.status !== 'Pending Return' && item.quantity > 0;
}

/** Everything on the dashboard is derived from the live inventory returned by the server. */
function buildDashboard(items: InventoryItem[], t: RiskThresholds) {
  const live = items.filter(item => item.status !== 'Disposed' && item.quantity > 0);
  const onSale = live.filter(isOnSale);
  const value = (item: InventoryItem) => (item.quantity || 0) * (item.unitPrice || 0);
  const bands = new Map(live.map(item => [item.id, riskBand(item, t)]));

  const actionItems: ActionItem[] = onSale
    .filter(item => RISK_FOR_BAND[bands.get(item.id) ?? 'Safe'])
    .map(item => ({
      id: item.id,
      product: item.name,
      category: item.category,
      batch: item.batchNo,
      location: item.location || '—',
      stock: item.quantity,
      value: value(item),
      daysLeft: daysToExpiry(item),
      risk: RISK_FOR_BAND[bands.get(item.id) ?? 'Safe'] as RiskLevel,
      action: item.recommendedAction || 'Review stock rotation',
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const fefoQueue = onSale
    .filter(item => daysToExpiry(item) > 0)
    .sort((a, b) => daysToExpiry(a) - daysToExpiry(b))
    .slice(0, 3)
    .map((item, index) => ({
      rank: index + 1,
      id: item.id,
      batch: `${item.batchNo} · ${item.name}`,
      location: item.location || '—',
      units: item.quantity,
      daysLeft: daysToExpiry(item),
    }));

  const horizon = [
    { label: `≤ ${t.actionDays} Days`, test: (d: number) => d <= t.actionDays, bar: '#ef4444' },
    { label: `${t.actionDays + 1} – ${t.monitorDays} Days`, test: (d: number) => d > t.actionDays && d <= t.monitorDays, bar: '#f97316' },
    { label: `${t.monitorDays + 1} – ${t.safeDays} Days`, test: (d: number) => d > t.monitorDays && d <= t.safeDays, bar: '#f59e0b' },
    { label: `> ${t.safeDays} Days`, test: (d: number) => d > t.safeDays, bar: '#10b981' },
  ];
  const totalValue = live.reduce((sum, item) => sum + value(item), 0);
  const totalUnits = live.reduce((sum, item) => sum + item.quantity, 0);
  const riskDistribution = horizon.map(({ label, test, bar }) => {
    const matching = live.filter(item => test(daysToExpiry(item)));
    const share = totalValue > 0
      ? matching.reduce((sum, item) => sum + value(item), 0) / totalValue
      : totalUnits > 0 ? matching.reduce((sum, item) => sum + item.quantity, 0) / totalUnits : 0;
    return { label, value: Math.round(share * 100), bar };
  });

  const count = (band: RiskBand | RiskBand[]) => {
    const wanted = Array.isArray(band) ? band : [band];
    return live.filter(item => wanted.includes(bands.get(item.id) ?? 'Safe')).length;
  };
  const products = new Set(live.map(item => item.productId ?? item.name));
  const atRiskValue = live
    .filter(item => daysToExpiry(item) <= t.actionDays)
    .reduce((sum, item) => sum + value(item), 0);

  const kpis = [
    { title: 'Total Products', value: products.size.toLocaleString(), helper: `${live.length.toLocaleString()} batches in stock`, tone: 'navy' as const, Icon: Package },
    { title: 'Total Stock Value', value: formatGhc(totalValue), helper: 'Current inventory valuation', tone: 'indigo' as const, Icon: DollarSign },
    { title: 'Near-Expiry Products', value: count(['Critical', 'Action Required', 'Monitor']).toLocaleString(), helper: `Within ${t.monitorDays}-day risk window`, tone: 'monitor' as const, Icon: Clock3 },
    { title: 'High-Risk Products', value: count(['Critical', 'Action Required']).toLocaleString(), helper: 'Requires intervention', tone: 'action' as const, Icon: AlertTriangle },
    { title: 'Expired Products', value: count('Expired').toLocaleString(), helper: 'Immediate disposal queue', tone: 'expired' as const, Icon: ShieldAlert },
    { title: 'Stock Value at Expiry Risk', value: formatGhc(atRiskValue), helper: `Expired or within ${t.actionDays} days`, tone: 'critical' as const, Icon: TrendingDown },
    { title: 'Fast-Moving Products', value: live.filter(item => item.velocity === 'Fast').length.toLocaleString(), helper: 'High turnover inventory', tone: 'safe' as const, Icon: TrendingUp },
    { title: 'Slow-Moving Products', value: live.filter(item => item.velocity === 'Slow' || item.velocity === 'Dead').length.toLocaleString(), helper: 'Needs demand review', tone: 'teal' as const, Icon: TrendingDown },
  ];

  return { actionItems, fefoQueue, riskDistribution, kpis };
}

export default function Dashboard({ searchTerm, quantityFilter, expiryFilter }: DashboardProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { items, thresholds } = useInventory();
  const { actionItems, fefoQueue, riskDistribution, kpis } = useMemo(() => buildDashboard(items || [], thresholds), [items, thresholds]);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [spotlightPaused, setSpotlightPaused] = useState(false);
  const spotlightItems = useMemo(() => (items || [])
    .filter(item => isOnSale(item))
    .slice()
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()), [items]);
  const spotlightItem = spotlightItems.length ? spotlightItems[spotlightIndex % spotlightItems.length] : undefined;
  const spotlightDaysLeft = spotlightItem ? daysToExpiry(spotlightItem) : 0;

  useEffect(() => {
    if (spotlightPaused || spotlightItems.length < 2) return;
    const timer = window.setInterval(() => setSpotlightIndex(index => (index + 1) % spotlightItems.length), 4500);
    return () => window.clearInterval(timer);
  }, [spotlightPaused, spotlightItems.length]);

  useEffect(() => {
    setSpotlightIndex(index => spotlightItems.length ? index % spotlightItems.length : 0);
  }, [spotlightItems.length]);

  const filteredRows = useMemo(() => {
    const normalizedTerm = (searchTerm || '').trim().toLowerCase();
    const stockLimit = Number.isFinite(quantityFilter) ? quantityFilter : 1000;
    const expiryLimit = Number.isFinite(expiryFilter) ? expiryFilter : 90;

    return actionItems.filter(item => {
      const searchableText = `${item.product} ${item.category} ${item.batch} ${item.location}`.toLowerCase();
      const matchesSearch = !normalizedTerm || searchableText.includes(normalizedTerm);
      const matchesQuantity = item.stock <= stockLimit;
      const matchesExpiry = item.daysLeft <= expiryLimit;
      return matchesSearch && matchesQuantity && matchesExpiry;
    });
  }, [actionItems, searchTerm, quantityFilter, expiryFilter]);

  const queue = useMemo(() => {
    const normalizedTerm = (searchTerm || '').trim().toLowerCase();
    return fefoQueue.filter(item => {
      const searchableText = `${item.batch} ${item.location}`.toLowerCase();
      return !normalizedTerm || searchableText.includes(normalizedTerm);
    });
  }, [fefoQueue, searchTerm]);

  return (
    <div className="page-body dashboard-page">
      <div className="dashboard-content">
        <header className="dashboard-overview-header" data-tour="dashboard-overview">
          <div>
            <div className="dashboard-overview-title-row">
              <h1>
                Inventory &amp; Expiry Risk Overview
              </h1>
              <span className="dashboard-live-pill">
                <Sparkles size={12} />
                Live Intelligence
              </span>
            </div>
            <p className="dashboard-overview-description">
              Real-time stock velocity, FEFO dispatch queue, and early warning metrics.
            </p>
          </div>

        </header>

        {spotlightItem && <section className="product-spotlight" data-tour="product-spotlight" onPointerEnter={() => setSpotlightPaused(true)} onPointerLeave={() => setSpotlightPaused(false)} aria-label="Product spotlight">
          <div key={spotlightItem.id} className="product-spotlight-image" style={spotlightItem.photoUrl ? { backgroundImage: `url("${spotlightItem.photoUrl}")` } : undefined}>
            {!spotlightItem.photoUrl && <div className="product-spotlight-placeholder" aria-hidden="true"><Package size={78} strokeWidth={1.1} /></div>}
            <div className="product-spotlight-shade" />
            <div className="product-spotlight-content">
              <span className="product-spotlight-eyebrow">PRODUCT SPOTLIGHT</span>
              <h2>{spotlightItem.name}</h2>
              <p>{spotlightItem.category}</p>
              <div className="product-spotlight-stats">
                <span className="product-stat-pill"><Package size={15} /><strong>{spotlightItem.quantity.toLocaleString()}</strong> in stock</span>
                <span className={`product-stat-pill ${spotlightDaysLeft <= thresholds.actionDays ? 'is-at-risk' : ''}`}><Clock3 size={15} /><strong>{spotlightDaysLeft < 0 ? `${Math.abs(spotlightDaysLeft)}d overdue` : `${spotlightDaysLeft} days`}</strong> to expiry</span>
              </div>
            </div>
            <Link className="product-spotlight-view" to={`/inventory/${spotlightItem.id}`} aria-label={`View ${spotlightItem.name}`} title="View product details"><ArrowUpRight size={20} /></Link>
          </div>
        </section>}

        <section className="stat-card-grid dashboard-stat-grid">
          {kpis.filter(metric => isAdmin || !metric.title.toLowerCase().includes('value')).map(({ title, value, helper, tone, Icon }) => (
            <StatCard key={title} label={title} value={value} context={helper} icon={Icon} tone={tone} />
          ))}
        </section>

        <section className="dashboard-panel-grid">
          <div className="dashboard-panel dashboard-decision-panel" data-tour="decision-matrix">
            <div className="dashboard-panel-heading">
              <div>
                <p className="dashboard-panel-title">Urgent Decision Matrix</p>
                <small className="dashboard-panel-description">Priority batches requiring immediate action</small>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="modern-table dashboard-inventory-table" style={{ minWidth: '980px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    {['Product & Category', 'Batch # / Location', isAdmin ? 'Stock Qty & Value at Risk' : 'Stock Quantity', 'Expiry Countdown', 'Risk Level', 'Recommended Action', 'Action'].map(header => (
                      <th key={header}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div className="dashboard-cell-primary" title={item.product}>{item.product}</div>
                        <div className="dashboard-cell-muted">{item.category}</div>
                      </td>

                      <td>
                        <div className="dashboard-cell-primary">{item.batch}</div>
                        <div className="dashboard-cell-muted">{item.location}</div>
                      </td>

                      <td>
                        <div className="dashboard-cell-primary">{item.stock} units</div>
                        {isAdmin && <div className="dashboard-cell-muted">{formatGhc(item.value)}</div>}
                      </td>

                      <td>
                        <div className="dashboard-cell-primary">
                          {item.daysLeft <= 0 ? `${Math.abs(item.daysLeft)} days overdue` : `${item.daysLeft} days left`}
                        </div>
                        <div className="dashboard-cell-muted">Expiry countdown</div>
                      </td>

                      <td>
                        <span className={`risk-badge ${item.risk === 'High Risk' ? 'risk-badge--action' : `risk-badge--${item.risk.toLowerCase()}`}`}>
                          <span className="risk-badge-dot" />
                          {item.risk === 'High Risk' ? 'Action Required' : item.risk}
                        </span>
                      </td>

                      <td>
                        <span className="dashboard-action-label">
                          {item.action}
                        </span>
                      </td>

                      <td>
                        <Link to={`/inventory/${item.id}`} className="row-action-button">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="dashboard-panel dashboard-fefo-panel">
            <div className="dashboard-panel-heading">
              <div>
                <p className="dashboard-panel-title">FEFO Queue</p>
                <small className="dashboard-panel-description">Earliest expiry first</small>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {queue.map(item => (
                <div key={item.id} className="dashboard-fefo-item">
                  <div className="dashboard-fefo-item-top">
                    <div className="dashboard-fefo-rank">#{item.rank}</div>
                    <span className="dashboard-dispatch-badge">
                      Dispatch First
                    </span>
                  </div>

                  <div className="dashboard-fefo-batch">{item.batch}</div>
                  <div className="dashboard-fefo-location">{item.location}</div>
                  <div className="dashboard-fefo-metric">
                    <span>Remaining units</span>
                    <strong>{item.units}</strong>
                  </div>
                  <div className="dashboard-fefo-metric">
                    <span>Days remaining</span>
                    <strong>{item.daysLeft} days</strong>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <div className="dashboard-panel-heading dashboard-risk-heading">
                <p className="dashboard-panel-title">Expiry Risk Horizon</p>
                <small className="dashboard-panel-description">{isAdmin ? 'Share of stock value' : 'Share of stock'}</small>
              </div>

              {riskDistribution.map(item => (
                <div key={item.label} style={{ marginBottom: '0.75rem' }}>
                  <div className="dashboard-risk-label-row">
                    <span>{item.label}</span>
                    <span>{item.value}%</span>
                  </div>
                  <div className="dashboard-risk-track">
                    <div
                      style={{
                        width: `${item.value}%`,
                        height: '100%',
                        background: item.bar,
                        borderRadius: '999px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
