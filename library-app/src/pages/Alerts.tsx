import { useState, useMemo } from 'react';
import { AlertTriangle, Bell, Check, Clock3, ShieldAlert } from 'lucide-react';
import { useInventory } from '../api/useInventory';
import StatCard from '../components/StatCard';
import { formatGhc } from '../utils/currency';
import { useAuth } from '../api/useAuth';
import { AlertWorkflowActions } from '../components/AlertWorkflowActions';
import { Button } from '../components/ui/Button';

type AlertTab = 'All' | 'Critical' | 'Expiring Soon' | 'Expired' | 'Flagged Items' | 'Supplier Returns';

function formatActionTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' });
}

interface AlertsProps {
  searchTerm?: string;
}

export default function Alerts({ searchTerm = '' }: AlertsProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { items, acknowledgeItem, closeAdminFlag, processSupplierReturn } = useInventory();
  const now = Date.now();

  const [filterTab, setFilterTab] = useState<AlertTab>('All');

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
          acknowledged: item.acknowledged,
          activityLog: item.activityLog ?? [],
          adminFlag: item.adminFlag,
          supplierReturnRequest: item.supplierReturnRequest,
          status: item.status,
          location: item.location,
          diffDays,
          riskBand,
          riskColor,
          badgeBg,
          daysLabel,
          valueAtRisk: (item.quantity || 0) * (item.unitPrice || 0),
        };
      })
      .filter(item => item.riskBand !== 'Safe' && item.status !== 'Disposed') // Only non-safe, undisposed batches generate active alerts
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
      if (filterTab === 'Flagged Items') return alert.adminFlag?.status === 'open';
      if (filterTab === 'Supplier Returns') return alert.supplierReturnRequest?.status === 'requested';
      return true;
    });
  }, [alertsList, filterTab, searchTerm]);

  const tabs: AlertTab[] = ['All', 'Critical', 'Expiring Soon', 'Expired', ...(isAdmin ? ['Flagged Items', 'Supplier Returns'] as AlertTab[] : [])];

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

      <div className="stat-card-grid alerts-stat-grid" data-tour="alerts-summary">
        <StatCard label="Active Alerts" value={alertsList.length} context="Across all non-safe batches" icon={Bell} tone="navy" />
        <StatCard label="Critical" value={alertsList.filter(alert => alert.riskBand === 'Critical').length} context="Expiring within 7 days" icon={AlertTriangle} tone="critical" />
        <StatCard label="Near Expiry" value={alertsList.filter(alert => alert.riskBand === 'Expiring Soon').length} context="Within the 90-day watch window" icon={Clock3} tone="monitor" />
        <StatCard label="Expired" value={alertsList.filter(alert => alert.riskBand === 'Expired').length} context="Requires quarantine or disposal" icon={ShieldAlert} tone="expired" />
      </div>

      {/* Filter Tabs (All / Critical / Expiring Soon / Expired) */}
      <div className="alerts-tabs" role="tablist" aria-label="Alert views">
        {tabs.map(tab => {
          const count = alertsList.filter(a => {
            if (tab === 'All') return true;
            if (tab === 'Critical') return a.riskBand === 'Critical';
            if (tab === 'Expiring Soon') return a.riskBand === 'Expiring Soon';
            if (tab === 'Expired') return a.riskBand === 'Expired';
            if (tab === 'Flagged Items') return a.adminFlag?.status === 'open';
            if (tab === 'Supplier Returns') return a.supplierReturnRequest?.status === 'requested';
            return false;
          }).length;

          const isActive = filterTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`alerts-tab${isActive ? ' is-active' : ''}`}
              role="tab"
              aria-selected={isActive}
            >
              <span>{tab}</span>
              <span className="alerts-tab-count">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Alert Cards Grid */}
      {filteredAlerts.length > 0 ? (
        <div className="alerts-card-grid">
          {filteredAlerts.map(alert => {
            const isAck = !!alert.acknowledged;
            return (
              <div
                key={alert.id}
                className="card-container alert-card"
                style={{
                  borderLeft: `5px solid ${alert.riskColor}`,
                  opacity: 1,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#8E9BAE', fontWeight: 700, textTransform: 'uppercase' }}>
                        {alert.category}
                      </span>
                      <h3 title={alert.name} style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E3A4C', margin: '0.15rem 0 0.25rem' }}>
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

                  {alert.supplierReturnRequest && <div className="workflow-notice workflow-notice--return">
                    <strong>{alert.supplierReturnRequest.status === 'requested' ? 'Supplier return requested' : 'Supplier return processed'}</strong>
                    <span>{isAdmin ? `${alert.supplierReturnRequest.supplierName || 'Supplier not recorded'} · ` : ''}Requested by {alert.supplierReturnRequest.requestedBy} · {formatActionTime(alert.supplierReturnRequest.requestedAt)}</span>
                    {alert.supplierReturnRequest.note && <small>{alert.supplierReturnRequest.note}</small>}
                    {isAdmin && alert.supplierReturnRequest.status === 'requested' && <Button size="sm" variant="secondary" onClick={() => processSupplierReturn(alert.id)}>Mark return processed</Button>}
                  </div>}

                  {alert.adminFlag && <div className={`workflow-notice workflow-notice--flag${alert.adminFlag.status === 'open' ? ' is-open' : ''}`}>
                    <strong>{alert.adminFlag.status === 'open' ? 'Flagged for Admin Review' : `Review ${alert.adminFlag.status}`}</strong>
                    {alert.adminFlag.actorName && <span>Flagged by {alert.adminFlag.actorName} · {formatActionTime(alert.adminFlag.at)}</span>}
                    {alert.adminFlag.note && <small>{alert.adminFlag.note}</small>}
                    {alert.adminFlag.status !== 'open' && alert.adminFlag.closedBy && <small>{alert.adminFlag.status} by {alert.adminFlag.closedBy} · {alert.adminFlag.closedAt && formatActionTime(alert.adminFlag.closedAt)}</small>}
                    {alert.adminFlag.resolutionNote && <small>Admin note: {alert.adminFlag.resolutionNote}</small>}
                    {isAdmin && alert.adminFlag.status === 'open' && <div className="workflow-notice-actions">
                      <Button size="sm" variant="secondary" onClick={() => closeAdminFlag(alert.id, 'resolved')}>Resolve</Button>
                      <Button size="sm" variant="outline" onClick={() => closeAdminFlag(alert.id, 'dismissed')}>Dismiss</Button>
                    </div>}
                  </div>}
                </div>

                <div className="alert-card-actions">
                  <button
                    type="button"
                    className="row-action-button ui-button ui-button--row-action ui-button--sm"
                    onClick={() => acknowledgeItem(alert.id)}
                    disabled={isAck}
                  >
                    {isAck ? '✓ Acknowledged' : 'Mark Acknowledged'}
                  </button>
                  {isAck && <span className="alert-acknowledgement"><Check size={15} aria-hidden="true" /> Acknowledged by {alert.acknowledged?.actorName}, {formatActionTime(alert.acknowledged?.at ?? '')}</span>}

                  <span className="alert-fefo-priority">
                    FEFO Dispense Priority
                  </span>
                  <AlertWorkflowActions itemId={alert.id} itemName={alert.name} returnRequested={alert.supplierReturnRequest?.status === 'requested'} />
                </div>
                <details className="alert-activity-log">
                  <summary>Activity history <span>{alert.activityLog.length}</span></summary>
                  {alert.activityLog.length > 0 ? <ol>{[...alert.activityLog].reverse().map(entry => <li key={entry.id}>
                    <div><strong>{entry.action}</strong><span>{entry.actorName} · {formatActionTime(entry.at)}</span></div>
                    {entry.note && <p>{entry.note}</p>}
                  </li>)}</ol> : <p className="alert-activity-empty">No activity recorded for this batch yet.</p>}
                </details>
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
            {filterTab === 'Flagged Items' ? 'No Items Awaiting Admin Review' : filterTab === 'Supplier Returns' ? 'No Supplier Returns Awaiting Review' : 'No Active Alerts in this Tab'}
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#64748B', margin: 0 }}>
            {filterTab === 'Flagged Items' ? 'Staff escalations will appear here for Admin review.' : filterTab === 'Supplier Returns' ? 'Supplier return requests from dispensers will appear here.' : 'All pharmaceutical batches in this category are within safe expiration thresholds.'}
          </p>
        </div>
      )}
    </div>
  );
}
