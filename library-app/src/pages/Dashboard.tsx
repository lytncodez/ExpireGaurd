import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useInventory } from '../api/useInventory';

function getRisk(expiryDate: string, nowTimestamp: number): { label: string; key: string; badgeClass: string; hexColor: string } {
  const exp = new Date(expiryDate).getTime();
  const diffDays = Math.floor((exp - nowTimestamp) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Expired', key: 'Expired', badgeClass: 'risk-badge--expired', hexColor: '#6B7280' };
  if (diffDays <= 7) return { label: 'Critical', key: 'Critical', badgeClass: 'risk-badge--critical', hexColor: '#EF4444' };
  if (diffDays <= 30) return { label: 'Action Required', key: 'Action Required', badgeClass: 'risk-badge--action', hexColor: '#F97316' };
  if (diffDays <= 60) return { label: 'Monitor', key: 'Monitor', badgeClass: 'risk-badge--monitor', hexColor: '#F59E0B' };
  return { label: 'Safe', key: 'Safe', badgeClass: 'risk-badge--safe', hexColor: '#10B981' };
}

interface DashboardProps {
  quantityFilter: number;
  expiryFilter: number;
  searchTerm: string;
}

export default function Dashboard({ quantityFilter, expiryFilter, searchTerm }: DashboardProps) {
  const { items, loading, error } = useInventory();
  const nowTimestamp = Date.now();

  // Additional Filter States for Table
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('All');
  const [selectedRisk, setSelectedRisk] = useState<string>('All');

  // Dynamic Metrics Calculation
  const metrics = useMemo(() => {
    let totalStockVolume = 0;
    let valueAtRisk = 0;
    let nearExpiryCount = 0;
    let criticalCount = 0;
    let expiredCount = 0;
    let safeCount = 0;
    let monitorCount = 0;

    let volumeByRisk = {
      Safe: 0,
      Monitor: 0,
      'Action Required': 0,
      Critical: 0,
      Expired: 0
    };

    items.forEach(item => {
      totalStockVolume += item.quantity;
      const daysLeft = Math.floor((new Date(item.expiryDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24));
      const risk = getRisk(item.expiryDate, nowTimestamp).key;
      volumeByRisk[risk as keyof typeof volumeByRisk] += item.quantity;

      if (daysLeft < 0) {
        expiredCount += 1;
      } else if (daysLeft <= 7) {
        criticalCount += 1;
      } else if (daysLeft <= 30) {
        nearExpiryCount += 1;
      } else if (daysLeft <= 60) {
        monitorCount += 1;
      } else {
        safeCount += 1;
      }

      // Stock Value at Risk (expiring within 30 days or already expired)
      if (daysLeft <= 30) {
        valueAtRisk += item.quantity * item.unitPrice;
      }
    });

    return {
      totalProducts: items.length,
      totalStockVolume,
      valueAtRisk,
      nearExpiryCount,
      criticalCount,
      expiredCount,
      safeCount,
      monitorCount,
      volumeByRisk
    };
  }, [items, nowTimestamp]);

  // Categories & Suppliers lists for dropdowns
  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map(i => i.category)))], [items]);
  const suppliers = useMemo(() => ['All', ...Array.from(new Set(items.map(i => i.supplier)))], [items]);

  // Table Items Filtering
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const daysLeft = (new Date(item.expiryDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24);
      const riskKey = getRisk(item.expiryDate, nowTimestamp).key;

      const qtyOk = item.quantity <= quantityFilter;
      const expOk = daysLeft <= expiryFilter;
      const searchOk = searchTerm === '' ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.batchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase());

      const catOk = selectedCategory === 'All' || item.category === selectedCategory;
      const supOk = selectedSupplier === 'All' || item.supplier === selectedSupplier;
      const riskOk = selectedRisk === 'All' || riskKey === selectedRisk;

      return qtyOk && expOk && searchOk && catOk && supOk && riskOk;
    });
  }, [items, quantityFilter, expiryFilter, searchTerm, selectedCategory, selectedSupplier, selectedRisk, nowTimestamp]);

  // Donut chart calculations
  const donutPercentages = useMemo(() => {
    const total = items.length || 1;
    return {
      safePct: Math.round((metrics.safeCount / total) * 100),
      monitorPct: Math.round((metrics.monitorCount / total) * 100),
      actionPct: Math.round((metrics.nearExpiryCount / total) * 100),
      criticalPct: Math.round((metrics.criticalCount / total) * 100),
      expiredPct: Math.round((metrics.expiredCount / total) * 100),
    };
  }, [items, metrics]);

  // Urgent actions batches list
  const urgentBatches = useMemo(() => {
    return items
      .filter(item => {
        const daysLeft = Math.floor((new Date(item.expiryDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24));
        return daysLeft <= 30;
      })
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
      .slice(0, 4);
  }, [items, nowTimestamp]);

  return (
    <div className="page-body">
      {/* 1. High-Impact KPI Row (Financial & Trend Insights) */}
      <div className="overview-grid">
        {/* Card 1: Total Products */}
        <div className="stat-card" style={{ '--accent-color': 'var(--color-primary)', '--icon-bg': 'var(--color-primary-light)' } as React.CSSProperties}>
          <div className="stat-card-header">
            <div className="stat-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 12v9.5" />
              </svg>
            </div>
            <span className="trend-badge trend-badge--success">↑ 12% vs last mo</span>
          </div>
          <div className="stat-info">
            <span className="stat-count">{metrics.totalProducts.toLocaleString()}</span>
            <span className="stat-label">Total Products</span>
          </div>
        </div>

        {/* Card 2: Total Stock Volume */}
        <div className="stat-card" style={{ '--accent-color': '#0284C7', '--icon-bg': '#E0F2FE' } as React.CSSProperties}>
          <div className="stat-card-header">
            <div className="stat-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <span className="trend-badge trend-badge--success">↑ 5% vs last mo</span>
          </div>
          <div className="stat-info">
            <span className="stat-count">{metrics.totalStockVolume.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>units</span></span>
            <span className="stat-label">Total Stock Volume</span>
          </div>
        </div>

        {/* Card 3: Near Expiry (<= 30 days) */}
        <div className="stat-card" style={{ '--accent-color': 'var(--risk-action-border)', '--icon-bg': 'var(--risk-action-bg)' } as React.CSSProperties}>
          <div className="stat-card-header">
            <div className="stat-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <span className="trend-badge trend-badge--danger">↑ 18% vs last mo</span>
          </div>
          <div className="stat-info">
            <span className="stat-count">{metrics.nearExpiryCount}</span>
            <span className="stat-label" style={{ color: 'var(--risk-action-text)' }}>Near Expiry (≤30d)</span>
          </div>
        </div>

        {/* Card 4: Critical (<= 7 days) */}
        <div className="stat-card" style={{ '--accent-color': 'var(--risk-critical-border)', '--icon-bg': 'var(--risk-critical-bg)' } as React.CSSProperties}>
          <div className="stat-card-header">
            <div className="stat-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <span className="trend-badge trend-badge--danger">↑ 35% vs last mo</span>
          </div>
          <div className="stat-info">
            <span className="stat-count">{metrics.criticalCount}</span>
            <span className="stat-label" style={{ color: 'var(--risk-critical-text)' }}>Critical (≤7d)</span>
          </div>
        </div>

        {/* Card 5: Expired */}
        <div className="stat-card" style={{ '--accent-color': 'var(--risk-expired-border)', '--icon-bg': 'var(--risk-expired-bg)' } as React.CSSProperties}>
          <div className="stat-card-header">
            <div className="stat-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                <line x1="12" y1="2" x2="12" y2="12" />
              </svg>
            </div>
            <span className="trend-badge trend-badge--success">↓ 8% vs last mo</span>
          </div>
          <div className="stat-info">
            <span className="stat-count">{metrics.expiredCount}</span>
            <span className="stat-label" style={{ color: 'var(--risk-expired-text)' }}>Expired Inventory</span>
          </div>
        </div>

        {/* Card 6: Stock Value at Risk (Decision Driver) */}
        <div className="stat-card" style={{ '--accent-color': '#8B5CF6', '--icon-bg': 'rgba(139, 92, 246, 0.12)' } as React.CSSProperties}>
          <div className="stat-card-header">
            <div className="stat-icon-box" style={{ color: '#8B5CF6' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <span className="trend-badge trend-badge--purple">↑ 22% vs last mo</span>
          </div>
          <div className="stat-info">
            <span className="stat-count" style={{ color: '#6D28D9' }}>
              ${metrics.valueAtRisk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="stat-label" style={{ color: '#7C3AED' }}>Stock Value at Risk</span>
          </div>
        </div>
      </div>

      {/* 2. Analytical Visualizations Section (3-Column Middle Grid) */}
      <div className="analytics-grid">
        {/* Widget A: Expiry Risk Breakdown (Donut Chart) */}
        <div className="analytics-widget">
          <div className="widget-title-bar">
            <span className="widget-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                <path d="M22 12A10 10 0 0 0 12 2v10z" />
              </svg>
              Expiry Risk Breakdown
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Catalog Share</span>
          </div>

          <div className="donut-chart-wrapper">
            <svg width="160" height="160" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="var(--bg-canvas)" strokeWidth="4.5" />
              {/* Segments: Safe, Monitor, Action, Critical, Expired */}
              <circle
                cx="21" cy="21" r="15.91549430918954"
                fill="transparent"
                stroke="#10B981"
                strokeWidth="4.5"
                strokeDasharray={`${donutPercentages.safePct} ${100 - donutPercentages.safePct}`}
                strokeDashoffset="25"
              />
              <circle
                cx="21" cy="21" r="15.91549430918954"
                fill="transparent"
                stroke="#F59E0B"
                strokeWidth="4.5"
                strokeDasharray={`${donutPercentages.monitorPct} ${100 - donutPercentages.monitorPct}`}
                strokeDashoffset={`${25 - donutPercentages.safePct}`}
              />
              <circle
                cx="21" cy="21" r="15.91549430918954"
                fill="transparent"
                stroke="#F97316"
                strokeWidth="4.5"
                strokeDasharray={`${donutPercentages.actionPct} ${100 - donutPercentages.actionPct}`}
                strokeDashoffset={`${25 - donutPercentages.safePct - donutPercentages.monitorPct}`}
              />
              <circle
                cx="21" cy="21" r="15.91549430918954"
                fill="transparent"
                stroke="#EF4444"
                strokeWidth="4.5"
                strokeDasharray={`${donutPercentages.criticalPct} ${100 - donutPercentages.criticalPct}`}
                strokeDashoffset={`${25 - donutPercentages.safePct - donutPercentages.monitorPct - donutPercentages.actionPct}`}
              />
              <circle
                cx="21" cy="21" r="15.91549430918954"
                fill="transparent"
                stroke="#6B7280"
                strokeWidth="4.5"
                strokeDasharray={`${donutPercentages.expiredPct} ${100 - donutPercentages.expiredPct}`}
                strokeDashoffset={`${25 - donutPercentages.safePct - donutPercentages.monitorPct - donutPercentages.actionPct - donutPercentages.criticalPct}`}
              />
            </svg>

            <div className="donut-center-text">
              <div className="donut-center-value">{metrics.totalProducts}</div>
              <div className="donut-center-label">Products</div>
            </div>
          </div>

          <div className="chart-legend">
            <div className="legend-item">
              <span><span className="legend-color-dot" style={{ background: '#10B981' }} />Safe</span>
              <strong>{donutPercentages.safePct}%</strong>
            </div>
            <div className="legend-item">
              <span><span className="legend-color-dot" style={{ background: '#F59E0B' }} />Monitor</span>
              <strong>{donutPercentages.monitorPct}%</strong>
            </div>
            <div className="legend-item">
              <span><span className="legend-color-dot" style={{ background: '#F97316' }} />Action</span>
              <strong>{donutPercentages.actionPct}%</strong>
            </div>
            <div className="legend-item">
              <span><span className="legend-color-dot" style={{ background: '#EF4444' }} />Critical</span>
              <strong>{donutPercentages.criticalPct}%</strong>
            </div>
            <div className="legend-item" style={{ gridColumn: 'span 2' }}>
              <span><span className="legend-color-dot" style={{ background: '#6B7280' }} />Expired</span>
              <strong>{donutPercentages.expiredPct}%</strong>
            </div>
          </div>
        </div>

        {/* Widget B: Stock Volume by Risk Level (Bar Chart) */}
        <div className="analytics-widget">
          <div className="widget-title-bar">
            <span className="widget-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              Stock Volume by Risk
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Unit Allocation</span>
          </div>

          <div className="bar-chart-list">
            {/* Safe */}
            <div className="bar-chart-row">
              <div className="bar-row-header">
                <span style={{ color: '#065F46' }}>Safe (&gt;60d)</span>
                <strong>{metrics.volumeByRisk['Safe'].toLocaleString()} units</strong>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${Math.min(100, Math.round((metrics.volumeByRisk['Safe'] / (metrics.totalStockVolume || 1)) * 100))}%`, background: '#10B981' }} />
              </div>
            </div>

            {/* Monitor */}
            <div className="bar-chart-row">
              <div className="bar-row-header">
                <span style={{ color: '#92400E' }}>Monitor (31–60d)</span>
                <strong>{metrics.volumeByRisk['Monitor'].toLocaleString()} units</strong>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${Math.min(100, Math.round((metrics.volumeByRisk['Monitor'] / (metrics.totalStockVolume || 1)) * 100))}%`, background: '#F59E0B' }} />
              </div>
            </div>

            {/* Action Required */}
            <div className="bar-chart-row">
              <div className="bar-row-header">
                <span style={{ color: '#9A3412' }}>Action (8–30d)</span>
                <strong>{metrics.volumeByRisk['Action Required'].toLocaleString()} units</strong>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${Math.min(100, Math.round((metrics.volumeByRisk['Action Required'] / (metrics.totalStockVolume || 1)) * 100))}%`, background: '#F97316' }} />
              </div>
            </div>

            {/* Critical */}
            <div className="bar-chart-row">
              <div className="bar-row-header">
                <span style={{ color: '#991B1B' }}>Critical (≤7d)</span>
                <strong>{metrics.volumeByRisk['Critical'].toLocaleString()} units</strong>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${Math.min(100, Math.round((metrics.volumeByRisk['Critical'] / (metrics.totalStockVolume || 1)) * 100))}%`, background: '#EF4444' }} />
              </div>
            </div>

            {/* Expired */}
            <div className="bar-chart-row">
              <div className="bar-row-header">
                <span style={{ color: '#374151' }}>Expired (&lt;0d)</span>
                <strong>{metrics.volumeByRisk['Expired'].toLocaleString()} units</strong>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${Math.min(100, Math.round((metrics.volumeByRisk['Expired'] / (metrics.totalStockVolume || 1)) * 100))}%`, background: '#6B7280' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Widget C: Urgent Actions Quick-Table */}
        <div className="analytics-widget">
          <div className="widget-title-bar">
            <span className="widget-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              Urgent Batches Action
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Top Priorities</span>
          </div>

          {urgentBatches.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem 0' }}>No urgent batch actions required.</p>
          ) : (
            <div className="table-responsive">
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>Batch / Item</th>
                    <th>Days</th>
                    <th>Action CTA</th>
                  </tr>
                </thead>
                <tbody>
                  {urgentBatches.map(item => {
                    const daysLeft = Math.floor((new Date(item.expiryDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24));
                    let ctaLabel = 'Prioritize Sale';
                    let ctaClass = 'action-cta--sale';

                    if (daysLeft < 0) {
                      ctaLabel = 'Quarantine & Writeoff';
                      ctaClass = 'action-cta--return';
                    } else if (daysLeft <= 7) {
                      ctaLabel = 'Reduce Price 50%';
                      ctaClass = 'action-cta--price';
                    } else if (item.status === 'Pending Return') {
                      ctaLabel = 'Return to Supplier';
                      ctaClass = 'action-cta--return';
                    }

                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)' }}>{item.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.batchNo}</div>
                        </td>
                        <td style={{ fontWeight: 700, color: daysLeft <= 7 ? '#EF4444' : '#F97316' }}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d ago` : `${daysLeft}d left`}
                        </td>
                        <td>
                          <button className={`action-cta-pill ${ctaClass}`}>
                            {ctaLabel}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 3. Smart Recommendations Panel (Decision Engine) */}
      <div className="card-container" style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Smart Inventory Insights (FEFO Decision Engine)
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Automated First Expired, First Out recommendations to minimize waste and optimize stock velocity.
            </p>
          </div>
        </div>

        <div className="insights-panel">
          {/* Recommendation 1: FEFO Rotation */}
          <div className="insight-card">
            <div className="insight-icon" style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#2563EB' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </div>
            <div className="insight-content">
              <div className="insight-title">FEFO Stock Rotation Priority</div>
              <div className="insight-text">
                Dispatch batch <strong>AMX-2026-08 (23 days left)</strong> before opening batch MET-007-D (28 days left) to avoid <strong>$8,325</strong> in potential writeoffs.
              </div>
              <button className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
                Apply FEFO Rule
              </button>
            </div>
          </div>

          {/* Recommendation 2: Overstock Warning */}
          <div className="insight-card">
            <div className="insight-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#D97706' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="insight-content">
              <div className="insight-title">Overstock &amp; Reorder Warning</div>
              <div className="insight-text">
                Avoid reordering <strong>Vitamin C 1000mg</strong>. Current inventory is <strong>800 units</strong> (45 days expiry) with low monthly consumption rate.
              </div>
              <button className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
                Freeze Reorder
              </button>
            </div>
          </div>

          {/* Recommendation 3: Supplier Return Window */}
          <div className="insight-card">
            <div className="insight-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#DC2626' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
            </div>
            <div className="insight-content">
              <div className="insight-title">Supplier Return Warranty Closing</div>
              <div className="insight-text">
                Return batch <strong>CS-012-RET (340 units)</strong> to BioDiagnostics Tech before vendor return policy window expires in 48 hours.
              </div>
              <button className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
                Initiate Vendor Return
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Granular Inventory Table Extensions */}
      <div className="card-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>Primary Inventory Matrix</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Showing {filteredItems.length} of {items.length} items with dynamic countdowns and location tracking
            </p>
          </div>

          {/* Search & Multi-Filter Dropdown Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Category Dropdown */}
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

            {/* Supplier Dropdown */}
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

            {/* Risk Level Dropdown */}
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
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>No inventory items match the selected multi-filter criteria.</p>
              </div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Batch No.</th>
                    <th>Stock Qty</th>
                    <th>Unit Price</th>
                    <th>Value at Risk</th>
                    <th>Expiry Date</th>
                    <th>Countdown</th>
                    <th>Risk Level</th>
                    <th>Supplier</th>
                    <th>Warehouse Location</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => {
                    const daysLeft = Math.floor((new Date(item.expiryDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24));
                    const risk = getRisk(item.expiryDate, nowTimestamp);
                    const itemValueAtRisk = daysLeft <= 30 ? (item.quantity * item.unitPrice) : 0;

                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 700 }}>
                          <Link to={`/inventory/${item.id}`} style={{ color: 'var(--text-main)', textDecoration: 'none' }}>
                            {item.name}
                          </Link>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{item.category}</div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', background: 'var(--bg-canvas)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                            {item.batchNo}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{item.quantity} units</td>
                        <td>${item.unitPrice.toFixed(2)}</td>
                        <td style={{ fontWeight: 700, color: itemValueAtRisk > 0 ? '#7C3AED' : 'var(--text-muted)' }}>
                          {itemValueAtRisk > 0 ? `$${itemValueAtRisk.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td>{new Date(item.expiryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
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
                        <td style={{ fontSize: '0.85rem' }}>{item.supplier}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          <span style={{ background: 'var(--bg-canvas)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                            {item.location}
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
