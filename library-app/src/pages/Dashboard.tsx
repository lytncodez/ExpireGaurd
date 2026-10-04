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

interface DashboardProps {
  quantityFilter: number;
  expiryFilter: number;
  searchTerm: string;
}

type RiskLevel = 'Critical' | 'High Risk' | 'Monitor';

interface ActionItem {
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

const actionItems: ActionItem[] = [
  {
    product: 'Amoxicillin 500mg',
    category: 'Antibiotic',
    batch: 'AMX2026B12',
    location: 'Shelf B3',
    stock: 320,
    value: 2240,
    daysLeft: 6,
    risk: 'Critical',
    action: 'Prioritise stock for immediate sale',
  },
  {
    product: 'Paracetamol 500mg',
    category: 'Analgesic',
    batch: 'PCM2026D09',
    location: 'Shelf C2',
    stock: 280,
    value: 840,
    daysLeft: 12,
    risk: 'High Risk',
    action: 'Review discount window',
  },
  {
    product: 'Insulin Glargine',
    category: 'Diabetes Care',
    batch: 'INS2026F04',
    location: 'Cold Room 2',
    stock: 95,
    value: 4725,
    daysLeft: 18,
    risk: 'High Risk',
    action: 'Move to fast-turn allocation',
  },
  {
    product: 'Cefixime Oral Suspension',
    category: 'Pediatric',
    batch: 'CEF2026C18',
    location: 'Shelf A1',
    stock: 160,
    value: 1180,
    daysLeft: 27,
    risk: 'Monitor',
    action: 'Quarantine & notify manager',
  },
  {
    product: 'Salbutamol Inhaler',
    category: 'Respiratory',
    batch: 'SAL2026E21',
    location: 'Shelf D4',
    stock: 210,
    value: 1260,
    daysLeft: 31,
    risk: 'Monitor',
    action: 'Review discount window',
  },
];

const fefoQueue = [
  { rank: 1, batch: 'AMX2026B12', location: 'Shelf B3', units: 320, daysLeft: 6 },
  { rank: 2, batch: 'PCM2026D09', location: 'Shelf C2', units: 280, daysLeft: 12 },
  { rank: 3, batch: 'INS2026F04', location: 'Cold Room 2', units: 95, daysLeft: 18 },
];

const riskDistribution = [
  { label: '< 30 Days', value: 58, bar: '#ef4444' },
  { label: '31 – 60 Days', value: 26, bar: '#f97316' },
  { label: '61 – 90 Days', value: 12, bar: '#f59e0b' },
  { label: '> 90 Days', value: 32, bar: '#10b981' },
];

const kpis = [
  {
    title: 'Total Products',
    value: '4,250',
    helper: 'Across 18 active SKUs',
    tone: 'navy' as const,
    Icon: Package,
  },
  {
    title: 'Total Stock Value',
    value: formatGhc(184200),
    helper: 'Current inventory valuation',
    tone: 'indigo' as const,
    Icon: DollarSign,
  },
  {
    title: 'Near-Expiry Products',
    value: '137',
    helper: 'Within 60-day risk window',
    tone: 'monitor' as const,
    Icon: Clock3,
  },
  {
    title: 'High-Risk Products',
    value: '32',
    helper: 'Requires intervention',
    tone: 'action' as const,
    Icon: AlertTriangle,
  },
  {
    title: 'Expired Products',
    value: '8',
    helper: 'Immediate disposal queue',
    tone: 'expired' as const,
    Icon: ShieldAlert,
  },
  {
    title: 'Stock Value at Expiry Risk',
    value: formatGhc(12450),
    helper: 'Exposure from expiring stock',
    tone: 'critical' as const,
    Icon: TrendingDown,
  },
  {
    title: 'Fast-Moving Products',
    value: '245',
    helper: 'High turnover inventory',
    tone: 'safe' as const,
    Icon: TrendingUp,
  },
  {
    title: 'Slow-Moving Products',
    value: '418',
    helper: 'Needs demand review',
    tone: 'teal' as const,
    Icon: TrendingDown,
  },
];

export default function Dashboard({ searchTerm, quantityFilter, expiryFilter }: DashboardProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { items } = useInventory();
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [spotlightPaused, setSpotlightPaused] = useState(false);
  const spotlightItems = useMemo(() => (items || [])
    .filter(item => item.status !== 'Quarantined')
    .slice()
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()), [items]);
  const spotlightItem = spotlightItems.length ? spotlightItems[spotlightIndex % spotlightItems.length] : undefined;
  const spotlightDaysLeft = spotlightItem ? Math.floor((new Date(spotlightItem.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

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
  }, [searchTerm, quantityFilter, expiryFilter]);

  const queue = useMemo(() => {
    const normalizedTerm = (searchTerm || '').trim().toLowerCase();
    return fefoQueue.filter(item => {
      const searchableText = `${item.batch} ${item.location}`.toLowerCase();
      return !normalizedTerm || searchableText.includes(normalizedTerm);
    });
  }, [searchTerm]);

  const totalRiskValue = riskDistribution.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="page-body dashboard-page">
      <div className="dashboard-content">
        <header className="dashboard-overview-header">
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

        {spotlightItem && <section className="product-spotlight" onPointerEnter={() => setSpotlightPaused(true)} onPointerLeave={() => setSpotlightPaused(false)} aria-label="Product spotlight">
          <div key={spotlightItem.id} className="product-spotlight-image" style={spotlightItem.photoUrl ? { backgroundImage: `url("${spotlightItem.photoUrl}")` } : undefined}>
            {!spotlightItem.photoUrl && <div className="product-spotlight-placeholder" aria-hidden="true"><Package size={78} strokeWidth={1.1} /></div>}
            <div className="product-spotlight-shade" />
            <div className="product-spotlight-content">
              <span className="product-spotlight-eyebrow">PRODUCT SPOTLIGHT</span>
              <h2>{spotlightItem.name}</h2>
              <p>{spotlightItem.category}</p>
              <div className="product-spotlight-stats">
                <span className="product-stat-pill"><Package size={15} /><strong>{spotlightItem.quantity.toLocaleString()}</strong> in stock</span>
                <span className={`product-stat-pill ${spotlightDaysLeft <= 30 ? 'is-at-risk' : ''}`}><Clock3 size={15} /><strong>{spotlightDaysLeft < 0 ? `${Math.abs(spotlightDaysLeft)}d overdue` : `${spotlightDaysLeft} days`}</strong> to expiry</span>
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
          <div className="dashboard-panel dashboard-decision-panel">
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
                    <tr key={`${item.batch}-${item.product}`}>
                      <td>
                        <div className="dashboard-cell-primary">{item.product}</div>
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
                        <button
                          type="button"
                          className="row-action-button"
                        >
                          Execute
                        </button>
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
                <div key={item.batch} className="dashboard-fefo-item">
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
                {isAdmin && <small className="dashboard-panel-description">{totalRiskValue}% inventory value</small>}
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
