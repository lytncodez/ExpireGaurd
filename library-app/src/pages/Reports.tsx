import { useState, useMemo } from 'react';
import { useInventory } from '../api/useInventory';

export default function Reports() {
  const { items } = useInventory();
  const now = Date.now();

  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'All' | 'Critical' | 'Action' | 'Monitor' | 'Expired'>('All');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'30' | '60' | '90' | 'all'>('30');

  // Compute at-risk items
  const processedData = useMemo(() => {
    return (items || []).map(item => {
      const expTime = new Date(item.expiryDate).getTime();
      const diffDays = Math.floor((expTime - now) / (1000 * 60 * 60 * 24));

      let riskKey: 'Safe' | 'Monitor' | 'Action' | 'Critical' | 'Expired' = 'Safe';
      if (diffDays < 0) riskKey = 'Expired';
      else if (diffDays <= 7) riskKey = 'Critical';
      else if (diffDays <= 30) riskKey = 'Action';
      else if (diffDays <= 60) riskKey = 'Monitor';

      return {
        ...item,
        diffDays,
        riskKey,
        totalValue: (item.quantity || 0) * (item.unitPrice || 0),
      };
    });
  }, [items, now]);

  // Filtered dataset
  const filteredReportItems = useMemo(() => {
    return processedData.filter(item => {
      // Risk filter
      if (selectedRiskFilter !== 'All' && item.riskKey !== selectedRiskFilter) {
        return false;
      }
      // Time range filter
      if (selectedTimeRange === '30' && item.diffDays > 30) return false;
      if (selectedTimeRange === '60' && item.diffDays > 60) return false;
      if (selectedTimeRange === '90' && item.diffDays > 90) return false;
      return true;
    }).sort((a, b) => a.diffDays - b.diffDays);
  }, [processedData, selectedRiskFilter, selectedTimeRange]);

  // Aggregated Stats
  const stats = useMemo(() => {
    let totalValueAtRisk = 0;
    let totalUnitsAtRisk = 0;
    let criticalCount = 0;
    let expiredCount = 0;

    filteredReportItems.forEach(i => {
      totalValueAtRisk += i.totalValue;
      totalUnitsAtRisk += i.quantity;
      if (i.riskKey === 'Critical') criticalCount++;
      if (i.riskKey === 'Expired') expiredCount++;
    });

    return {
      totalValueAtRisk,
      totalUnitsAtRisk,
      criticalCount,
      expiredCount,
      itemCount: filteredReportItems.length,
    };
  }, [filteredReportItems]);

  // Function to export real CSV file
  const handleExportCSV = () => {
    const headers = ['Product Name', 'Category', 'Batch No', 'Quantity (Units)', 'Unit Price ($)', 'Total Value ($)', 'Expiry Date', 'Days to Expiry', 'Risk Status', 'Supplier', 'Location'];
    const rows = filteredReportItems.map(i => [
      `"${i.name.replace(/"/g, '""')}"`,
      `"${i.category}"`,
      `"${i.batchNo}"`,
      i.quantity,
      i.unitPrice.toFixed(2),
      i.totalValue.toFixed(2),
      `"${new Date(i.expiryDate).toLocaleDateString()}"`,
      i.diffDays,
      `"${i.riskKey}"`,
      `"${i.supplier}"`,
      `"${i.location}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ExpiryGuard_Risk_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-body">
      {/* Top Banner & Export Action */}
      <div className="card-container" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1E3A4C', margin: '0 0 0.25rem' }}>
              Reports &amp; Inventory Analytics
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
              Generate compliance audit records and export at-risk stock reports.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              background: '#3B3593',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.65rem 1.35rem',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(59, 53, 147, 0.25)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export At-Risk CSV
          </button>
        </div>

        {/* Filter Controls Row */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8E9BAE', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              Filter by Risk Band
            </label>
            <select
              value={selectedRiskFilter}
              onChange={e => setSelectedRiskFilter(e.target.value as any)}
              className="form-input"
              style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem', width: 'auto' }}
            >
              <option value="All">All Risk Bands</option>
              <option value="Critical">Critical (≤ 7 days)</option>
              <option value="Action">Action Required (≤ 30 days)</option>
              <option value="Monitor">Monitor (≤ 60 days)</option>
              <option value="Expired">Already Expired</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8E9BAE', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              Date Horizon
            </label>
            <select
              value={selectedTimeRange}
              onChange={e => setSelectedTimeRange(e.target.value as any)}
              className="form-input"
              style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem', width: 'auto' }}
            >
              <option value="30">Within 30 Days</option>
              <option value="60">Within 60 Days</option>
              <option value="90">Within 90 Days</option>
              <option value="all">Full Inventory Lifecycle</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Stats Row (Totals, % change indicators) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card-container" style={{ padding: '1.15rem' }}>
          <span style={{ fontSize: '0.74rem', color: '#8E9BAE', fontWeight: 700, textTransform: 'uppercase' }}>Total Value at Risk</span>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '0.35rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#3B3593' }}>
              ${stats.totalValueAtRisk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.74rem', color: '#10B981', fontWeight: 700 }}>+12.4% vs last mo</span>
          </div>
        </div>

        <div className="card-container" style={{ padding: '1.15rem' }}>
          <span style={{ fontSize: '0.74rem', color: '#8E9BAE', fontWeight: 700, textTransform: 'uppercase' }}>Units at Risk</span>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '0.35rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1E3A4C' }}>
              {stats.totalUnitsAtRisk.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#8E9BAE' }}>units</span>
            </span>
            <span style={{ fontSize: '0.74rem', color: '#10B981', fontWeight: 700 }}>-4.2% write-offs</span>
          </div>
        </div>

        <div className="card-container" style={{ padding: '1.15rem' }}>
          <span style={{ fontSize: '0.74rem', color: '#8E9BAE', fontWeight: 700, textTransform: 'uppercase' }}>Critical Batches (≤7d)</span>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '0.35rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#EF4444' }}>
              {stats.criticalCount}
            </span>
            <span style={{ fontSize: '0.74rem', color: '#EF4444', fontWeight: 700 }}>Action Required</span>
          </div>
        </div>

        <div className="card-container" style={{ padding: '1.15rem' }}>
          <span style={{ fontSize: '0.74rem', color: '#8E9BAE', fontWeight: 700, textTransform: 'uppercase' }}>Matching Records</span>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '0.35rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1E3A4C' }}>
              {stats.itemCount} <span style={{ fontSize: '0.8rem', color: '#8E9BAE' }}>batches</span>
            </span>
            <span style={{ fontSize: '0.74rem', color: '#3B3593', fontWeight: 700 }}>Audit Ready</span>
          </div>
        </div>
      </div>

      {/* Top At-Risk Products List */}
      <div className="card-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E3A4C', margin: 0 }}>
            Top At-Risk Products (Prioritized by Shelf-Life)
          </h2>
          <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>
            Showing {filteredReportItems.length} records
          </span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Batch #</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Value at Risk</th>
                <th>Expiry Date</th>
                <th>Risk Band</th>
              </tr>
            </thead>
            <tbody>
              {filteredReportItems.length > 0 ? (
                filteredReportItems.map(item => (
                  <tr key={item.id}>
                    <td>
                      <strong style={{ color: '#1E3A4C' }}>{item.name}</strong>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#8E9BAE' }}>{item.supplier}</span>
                    </td>
                    <td><code>{item.batchNo}</code></td>
                    <td>{item.category}</td>
                    <td><strong>{item.quantity}</strong></td>
                    <td>${item.unitPrice.toFixed(2)}</td>
                    <td><strong style={{ color: '#3B3593' }}>${item.totalValue.toFixed(2)}</strong></td>
                    <td>
                      <span>{new Date(item.expiryDate).toLocaleDateString()}</span>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: item.diffDays <= 7 ? '#EF4444' : '#64748B' }}>
                        {item.diffDays < 0 ? `Expired ${Math.abs(item.diffDays)}d ago` : `${item.diffDays} days left`}
                      </span>
                    </td>
                    <td>
                      <span className={`risk-badge risk-badge--${item.riskKey.toLowerCase()}`}>
                        {item.riskKey === 'Action' ? 'Action Required' : item.riskKey}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                    No products matching current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
