import { useMemo } from 'react';
import {
  AlertTriangle,
  Clock3,
  DollarSign,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

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

const currencyFormatter = new Intl.NumberFormat('en-GH', {
  style: 'currency',
  currency: 'GHS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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
    accent: '#60a5fa',
    tone: 'rgba(96, 165, 250, 0.12)',
    Icon: Package,
  },
  {
    title: 'Total Stock Value',
    value: 'GHS 184,200',
    helper: 'Current inventory valuation',
    accent: '#38bdf8',
    tone: 'rgba(56, 189, 248, 0.12)',
    Icon: DollarSign,
  },
  {
    title: 'Near-Expiry Products',
    value: '137',
    helper: 'Within 60-day risk window',
    accent: '#fbbf24',
    tone: 'rgba(251, 191, 36, 0.12)',
    Icon: Clock3,
  },
  {
    title: 'High-Risk Products',
    value: '32',
    helper: 'Requires intervention',
    accent: '#f97316',
    tone: 'rgba(249, 115, 22, 0.12)',
    Icon: AlertTriangle,
  },
  {
    title: 'Expired Products',
    value: '8',
    helper: 'Immediate disposal queue',
    accent: '#f87171',
    tone: 'rgba(248, 113, 113, 0.12)',
    Icon: ShieldAlert,
  },
  {
    title: 'Stock Value at Expiry Risk',
    value: 'GHS 12,450',
    helper: 'Exposure from expiring stock',
    accent: '#fb7185',
    tone: 'rgba(251, 113, 133, 0.12)',
    Icon: TrendingDown,
  },
  {
    title: 'Fast-Moving Products',
    value: '245',
    helper: 'High turnover inventory',
    accent: '#34d399',
    tone: 'rgba(52, 211, 153, 0.12)',
    Icon: TrendingUp,
  },
  {
    title: 'Slow-Moving Products',
    value: '418',
    helper: 'Needs demand review',
    accent: '#94a3b8',
    tone: 'rgba(148, 163, 184, 0.12)',
    Icon: TrendingDown,
  },
];

const riskBadgeStyles: Record<RiskLevel, { bg: string; border: string; color: string }> = {
  Critical: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' },
  'High Risk': { bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.3)', color: '#fdba74' },
  Monitor: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', color: '#fcd34d' },
};

export default function Dashboard({ searchTerm, quantityFilter, expiryFilter }: DashboardProps) {
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
    <div style={{ minHeight: '100%', background: '#020817', color: '#e2e8f0', padding: '1.5rem 1.25rem 2rem' }}>
      <div style={{ maxWidth: '1500px', margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.25rem',
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '18px',
            padding: '1.1rem 1.25rem',
            boxShadow: '0 18px 48px rgba(2, 6, 23, 0.45)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.4rem' }}>
              <h1 style={{ margin: 0, fontSize: '2rem', lineHeight: 1.1, color: '#f8fafc', fontWeight: 800 }}>
                Inventory &amp; Expiry Risk Overview
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'rgba(59, 130, 246, 0.12)',
                  color: '#93c5fd',
                  border: '1px solid rgba(59, 130, 246, 0.32)',
                  borderRadius: '999px',
                  padding: '0.32rem 0.7rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                <Sparkles size={12} />
                Live Intelligence
              </span>
            </div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.92rem' }}>
              Real-time stock velocity, FEFO dispatch queue, and early warning metrics.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label
              htmlFor="dashboard-search"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                minWidth: '260px',
                background: '#020817',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '0.72rem 0.9rem',
                color: '#cbd5e1',
              }}
            >
              <Search size={15} color="#94a3b8" />
              <input
                id="dashboard-search"
                type="text"
                value={searchTerm}
                readOnly
                placeholder="Search products, batch numbers, or shelf locations"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.88rem',
                  color: '#e2e8f0',
                }}
              />
            </label>

            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#e2e8f0',
                cursor: 'pointer',
              }}
              aria-label="Refresh dashboard"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {kpis.map(({ title, value, helper, accent, tone, Icon }) => (
            <div
              key={title}
              style={{
                position: 'relative',
                overflow: 'hidden',
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '1rem 1.05rem',
                boxShadow: '0 12px 28px rgba(15, 23, 42, 0.2)',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: tone, opacity: 0.9 }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.9rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
                  {title}
                </span>
                <span
                  style={{
                    width: '38px',
                    height: '38px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    background: tone,
                    border: `1px solid ${accent}40`,
                    color: accent,
                  }}
                >
                  <Icon size={18} />
                </span>
              </div>

              <div style={{ position: 'relative', fontSize: '2rem', lineHeight: 1.2, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.04em' }}>
                {value}
              </div>

              <div style={{ position: 'relative', marginTop: '0.45rem', color: '#94a3b8', fontSize: '0.8rem' }}>{helper}</div>
            </div>
          ))}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.9fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '18px', padding: '1.1rem 1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <p style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem', fontWeight: 800 }}>Urgent Decision Matrix</p>
                <small style={{ color: '#94a3b8' }}>Priority batches requiring immediate action</small>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    {['Product & Category', 'Batch # / Location', 'Stock Qty & Value at Risk', 'Expiry Countdown', 'Risk Level', 'Recommended Action', 'Action'].map(header => (
                      <th
                        key={header}
                        style={{
                          textAlign: 'left',
                          padding: '0.7rem 0.55rem',
                          color: '#94a3b8',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(item => (
                    <tr key={`${item.batch}-${item.product}`} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '0.9rem 0.55rem' }}>
                        <div style={{ color: '#f8fafc', fontWeight: 700 }}>{item.product}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.76rem', marginTop: '0.25rem' }}>{item.category}</div>
                      </td>

                      <td style={{ padding: '0.9rem 0.55rem', color: '#e2e8f0' }}>
                        <div style={{ fontWeight: 700 }}>{item.batch}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.76rem', marginTop: '0.2rem' }}>{item.location}</div>
                      </td>

                      <td style={{ padding: '0.9rem 0.55rem' }}>
                        <div style={{ color: '#f8fafc', fontWeight: 700 }}>{item.stock} units</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.76rem', marginTop: '0.2rem' }}>
                          {currencyFormatter.format(item.value)}
                        </div>
                      </td>

                      <td style={{ padding: '0.9rem 0.55rem' }}>
                        <div style={{ color: '#f8fafc', fontWeight: 700 }}>
                          {item.daysLeft <= 0 ? `${Math.abs(item.daysLeft)} days overdue` : `${item.daysLeft} days left`}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.76rem', marginTop: '0.2rem' }}>Expiry countdown</div>
                      </td>

                      <td style={{ padding: '0.9rem 0.55rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            borderRadius: '999px',
                            padding: '0.38rem 0.7rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: riskBadgeStyles[item.risk].bg,
                            border: `1px solid ${riskBadgeStyles[item.risk].border}`,
                            color: riskBadgeStyles[item.risk].color,
                          }}
                        >
                          {item.risk}
                        </span>
                      </td>

                      <td style={{ padding: '0.9rem 0.55rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            borderRadius: '999px',
                            padding: '0.38rem 0.7rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: 'rgba(15, 23, 42, 0.9)',
                            border: '1px solid #334155',
                            color: '#e2e8f0',
                          }}
                        >
                          {item.action}
                        </span>
                      </td>

                      <td style={{ padding: '0.9rem 0.55rem' }}>
                        <button
                          type="button"
                          style={{
                            border: 'none',
                            borderRadius: '10px',
                            background: '#2563eb',
                            color: '#f8fafc',
                            padding: '0.55rem 0.9rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
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

          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '18px', padding: '1.1rem 1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <p style={{ margin: 0, color: '#f8fafc', fontSize: '1.05rem', fontWeight: 800 }}>FEFO Queue</p>
                <small style={{ color: '#94a3b8' }}>Earliest expiry first</small>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {queue.map(item => (
                <div key={item.batch} style={{ padding: '0.85rem 0.9rem', background: '#111827', border: '1px solid #1e293b', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ color: '#f8fafc', fontWeight: 700 }}>#{item.rank}</div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        borderRadius: '999px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#6ee7b7',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        padding: '0.3rem 0.5rem',
                        textTransform: 'uppercase',
                      }}
                    >
                      Dispatch First
                    </span>
                  </div>

                  <div style={{ marginTop: '0.6rem', color: '#f8fafc', fontWeight: 700 }}>{item.batch}</div>
                  <div style={{ marginTop: '0.22rem', color: '#94a3b8', fontSize: '0.76rem' }}>{item.location}</div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#cbd5e1', fontSize: '0.76rem' }}>
                    <span>Remaining units</span>
                    <strong style={{ color: '#f8fafc' }}>{item.units}</strong>
                  </div>
                  <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#cbd5e1', fontSize: '0.76rem' }}>
                    <span>Days remaining</span>
                    <strong style={{ color: '#f8fafc' }}>{item.daysLeft} days</strong>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.7rem' }}>
                <p style={{ margin: 0, color: '#f8fafc', fontSize: '1rem', fontWeight: 800 }}>Expiry Risk Horizon</p>
                <small style={{ color: '#94a3b8' }}>{totalRiskValue}% inventory value</small>
              </div>

              {riskDistribution.map(item => (
                <div key={item.label} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', color: '#dbeafe' }}>
                    <span style={{ fontSize: '0.76rem' }}>{item.label}</span>
                    <span style={{ fontSize: '0.76rem' }}>{item.value}%</span>
                  </div>
                  <div style={{ height: '10px', borderRadius: '999px', background: '#111827', border: '1px solid #1e293b', overflow: 'hidden' }}>
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
