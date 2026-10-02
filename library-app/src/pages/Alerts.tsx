import { useState, useMemo } from 'react';
import { AlertTriangle, Bell, Clock3, ShieldAlert } from 'lucide-react';
import { useInventory } from '../api/useInventory';
import StatCard from '../components/StatCard';
import { formatGhc } from '../utils/currency';
import { useAuth } from '../api/useAuth';

interface AlertsProps {
  searchTerm?: string;
}

export default function Alerts({ searchTerm = '' }: AlertsProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { items } = useInventory();
  const now = Date.now();

  const [filterTab, setFilterTab] = useState<'All' | 'Critical' | 'Expiring Soon' | 'Expired'>('All');
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Record<string, boolean>>({});

  // Thresholds (90, 60, 30, 7 days, on-expiry)
  const thresholds = [
    { label: 'Critical Window', days: 7, color: '#EF4444' },
    { label: 'Action Required', days: 30, color: '#F97316' },
    { label: 'Monitor Stage', days: 60, color: '#F59E0B' },
    { label: 'Early Advisory', days: 90, color: '#3B3593' },
  ];

  // Process items into alert cards
  const alertsList = useMemo(() => {
    return (items || [])
      .map(item => {
        const expTime = new Date(item.expiryDate).getTime();
        const diffDays = Math.floor((expTime - now) / (1000 * 60 * 60 * 24));

        let riskBand: 'Critical' | 'Expiring Soon' | 'Expired' | 'Safe' = 'Safe';
        let riskColor = '#10B981';
        let badgeBg = '#ECFDF5';
        let daysLabel = '';

        if (diffDays < 0) {
          riskBand = 'Expired';
          riskColor = '#64748B';
          badgeBg = '#F1F5F9';
          daysLabel = `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
        } else if (diffDays <= 7) {
          riskBand = 'Critical';
          riskColor = '#EF4444';
          badgeBg = '#FEF2F2';
          daysLabel = `${diffDays} day${diffDays === 1 ? '' : 's'} left`;
        } else if (diffDays <= 30) {
          riskBand = 'Expiring Soon';
          riskColor = '#F97316';
          badgeBg = '#FFF7ED';
          daysLabel = `${diffDays} days left`;
        } else if (diffDays <= 90) {
          riskBand = 'Expiring Soon';
          riskColor = '#F59E0B';
          badgeBg = '#FFFBEB';
          daysLabel = `${diffDays} days left`;
        }

        return {
          id: item.id,
          name: item.name,
          batchNo: item.batchNo,
          category: item.category,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          expiryDate: item.expiryDate,
          supplier: item.supplier,
          location: item.location,
          diffDays,
          riskBand,
          riskColor,
          badgeBg,
          daysLabel,
          valueAtRisk: (item.quantity || 0) * (item.unitPrice || 0),
        };
      })
      .filter(item => item.riskBand !== 'Safe') // Only non-safe items generate active alerts
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [items, now]);

  // Filter based on tab and optional search
  const filteredAlerts = useMemo(() => {
    return alertsList.filter(alert => {
      const supplierText = alert.supplier?.toLowerCase() ?? '';
      const matchesSearch =
        alert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.batchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplierText.includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (filterTab === 'All') return true;
      if (filterTab === 'Critical') return alert.riskBand === 'Critical';
      if (filterTab === 'Expiring Soon') return alert.riskBand === 'Expiring Soon';
      if (filterTab === 'Expired') return alert.riskBand === 'Expired';
      return true;
    });
  }, [alertsList, filterTab, searchTerm]);

  const toggleAcknowledge = (id: string) => {
    setAcknowledgedAlerts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="page-body">
      {/* Page Title & In-App Delivery Info Banner */}
      <div className="card-container" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1E3A4C', margin: '0 0 0.35rem' }}>
              Real-Time Expiry Alerts
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
              Live threshold monitoring across all pharmaceutical batches. Early intervention stops inventory write-offs.
            </p>
          </div>

          <div style={{
            background: '#F0F7FF',
            border: '1px solid #BAE6FD',
            borderRadius: '10px',
            padding: '0.5rem 0.85rem',
            fontSize: '0.78rem',
            color: '#0369A1',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284C7', display: 'inline-block' }} />
            <span>Delivery Mode: <strong>In-App / Dashboard Only</strong> (SMS/Email offline)</span>
          </div>
        </div>

        {/* Configurable Threshold Info Row */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1E3A4C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Threshold Bands:
          </span>
          {thresholds.map(t => (
            <span key={t.label} style={{ fontSize: '0.74rem', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.color }} />
              {t.label}: <strong>≤ {t.days}d</strong>
            </span>
          ))}
          <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#64748B' }} />
            Past Expiry: <strong>On-expiry</strong>
          </span>
        </div>
      </div>

      <div className="stat-card-grid alerts-stat-grid">
        <StatCard label="Active Alerts" value={alertsList.length} context="Across all non-safe batches" icon={Bell} tone="navy" />
        <StatCard label="Critical" value={alertsList.filter(alert => alert.riskBand === 'Critical').length} context="Expiring within 7 days" icon={AlertTriangle} tone="critical" />
        <StatCard label="Near Expiry" value={alertsList.filter(alert => alert.riskBand === 'Expiring Soon').length} context="Within the 90-day watch window" icon={Clock3} tone="monitor" />
        <StatCard label="Expired" value={alertsList.filter(alert => alert.riskBand === 'Expired').length} context="Requires quarantine or disposal" icon={ShieldAlert} tone="expired" />
      </div>

      {/* Filter Tabs (All / Critical / Expiring Soon / Expired) */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {(['All', 'Critical', 'Expiring Soon', 'Expired'] as const).map(tab => {
          const count = alertsList.filter(a => {
            if (tab === 'All') return true;
            if (tab === 'Critical') return a.riskBand === 'Critical';
            if (tab === 'Expiring Soon') return a.riskBand === 'Expiring Soon';
            if (tab === 'Expired') return a.riskBand === 'Expired';
            return false;
          }).length;

          const isActive = filterTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              style={{
                background: isActive ? '#3B3593' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#1E3A4C',
                border: `1.5px solid ${isActive ? '#3B3593' : '#E5E9F2'}`,
                padding: '0.55rem 1.15rem',
                borderRadius: '10px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: isActive ? '0 4px 12px rgba(59, 53, 147, 0.2)' : '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab}</span>
              <span style={{
                background: isActive ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                color: isActive ? '#FFFFFF' : '#64748B',
                fontSize: '0.72rem',
                padding: '0.1rem 0.45rem',
                borderRadius: '9999px',
                fontWeight: 800,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Alert Cards Grid */}
      {filteredAlerts.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
          {filteredAlerts.map(alert => {
            const isAck = !!acknowledgedAlerts[alert.id];
            return (
              <div
                key={alert.id}
                className="card-container"
                style={{
                  borderLeft: `5px solid ${alert.riskColor}`,
                  opacity: isAck ? 0.65 : 1,
                  transition: 'all 0.2s ease',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#8E9BAE', fontWeight: 700, textTransform: 'uppercase' }}>
                        {alert.category}
                      </span>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E3A4C', margin: '0.15rem 0 0.25rem' }}>
                        {alert.name}
                      </h3>
                      <span style={{ fontSize: '0.78rem', color: '#3B3593', fontWeight: 700 }}>
                        Batch: {alert.batchNo}
                      </span>
                    </div>

                    <span style={{
                      background: alert.badgeBg,
                      color: alert.riskColor,
                      border: `1px solid ${alert.riskColor}40`,
                      padding: '0.25rem 0.65rem',
                      borderRadius: '9999px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}>
                      {alert.riskBand}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.85rem', padding: '0.75rem', background: '#F8FAFC', borderRadius: '8px' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#8E9BAE', display: 'block', fontWeight: 600 }}>DAYS TO EXPIRY</span>
                      <strong style={{ fontSize: '0.88rem', color: alert.riskColor }}>{alert.daysLabel}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#8E9BAE', display: 'block', fontWeight: 600 }}>STOCK UNITS</span>
                      <strong style={{ fontSize: '0.88rem', color: '#1E3A4C' }}>{alert.quantity} units</strong>
                    </div>
                    {isAdmin && <div>
                      <span style={{ fontSize: '0.68rem', color: '#8E9BAE', display: 'block', fontWeight: 600 }}>VALUE AT RISK</span>
                      <strong style={{ fontSize: '0.88rem', color: '#1E3A4C' }}>{formatGhc(alert.valueAtRisk)}</strong>
                    </div>}
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#8E9BAE', display: 'block', fontWeight: 600 }}>LOCATION</span>
                      <strong style={{ fontSize: '0.82rem', color: '#475569' }}>{alert.location}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9' }}>
                  <button
                    type="button"
                    className="row-action-button"
                    onClick={() => toggleAcknowledge(alert.id)}
                  >
                    {isAck ? '✓ Acknowledged' : 'Mark Acknowledged'}
                  </button>

                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                    FEFO Dispense Priority
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-container" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ECFDF5', color: '#10B981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E3A4C', margin: '0 0 0.5rem' }}>
            No Active Alerts in this Tab
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#64748B', margin: 0 }}>
            All pharmaceutical batches in this category are within safe expiration thresholds.
          </p>
        </div>
      )}
    </div>
  );
}
