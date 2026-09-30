import { useState } from 'react';

interface InsightItem {
  id: string;
  type: 'declining' | 'overstock' | 'expiring' | 'velocity';
  title: string;
  tag: string;
  metric: string;
  recommendation: string;
  severity: 'high' | 'medium' | 'info';
  category: 'Trends' | 'Recommendations';
}

const mockInsights: InsightItem[] = [
  {
    id: 'ins-1',
    type: 'expiring',
    title: 'Items Nearing Expiry Window',
    tag: 'CRITICAL EXPIRY',
    metric: '3 items expiring in ≤7 days ($1,240 value)',
    recommendation: 'Initiate priority FEFO dispensing or negotiate supplier credit return before Friday.',
    severity: 'high',
    category: 'Recommendations',
  },
  {
    id: 'ins-2',
    type: 'declining',
    title: 'Declining Dispensing Velocity',
    tag: 'SALES VELOCITY',
    metric: 'Amoxicillin 500mg down 28% week-over-week',
    recommendation: 'Pause next scheduled wholesale order to avoid accumulating surplus inventory on shelves.',
    severity: 'medium',
    category: 'Trends',
  },
  {
    id: 'ins-3',
    type: 'overstock',
    title: 'High Stock vs. Low Turnover',
    tag: 'CAPITAL ALLOCATION',
    metric: 'Paracetamol Extra: 850 units with only 35 dispensed monthly',
    recommendation: 'Reallocate 300 units to branch dispensaries or offer bulk clearance pricing.',
    severity: 'medium',
    category: 'Recommendations',
  },
  {
    id: 'ins-4',
    type: 'velocity',
    title: 'Surge in Seasonal Antimalarial Demand',
    tag: 'SEASONAL PATTERN',
    metric: 'Artemether-Lumefantrine up 42% over past 14 days',
    recommendation: 'Increase buffer stock by 100 units to avoid stockouts during peak rain season.',
    severity: 'info',
    category: 'Trends',
  },
  {
    id: 'ins-5',
    type: 'expiring',
    title: 'Supplier Return Window Closing',
    tag: 'RETURN CLAIMS',
    metric: 'Ciprofloxacin Batch #CP-110 (22 days remaining to return cutoff)',
    recommendation: 'Submit RMA return request to PharmaCorp Inc. to recoup 85% credit value.',
    severity: 'high',
    category: 'Recommendations',
  },
];

export default function Insights() {
  const [activeTab, setActiveTab] = useState<'Trends' | 'Recommendations'>('Recommendations');

  const filteredList = mockInsights.filter(i => i.category === activeTab);

  return (
    <div className="page-body">
      <div className="card-container" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', background: '#EEF0FD', color: '#3B3593', fontSize: '0.74rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              <span>✨ AI-POWERED INVENTORY ADVISORY</span>
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1E3A4C', margin: '0 0 0.25rem' }}>
              Predictive Insights &amp; Smart Action Plans
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
              Algorithmic forecasting analyzing sales velocity, shelf-life runout, and supplier return opportunities.
            </p>
          </div>

          {/* Tabs: Trends / Recommendations */}
          <div style={{ display: 'flex', background: '#F5F6FA', padding: '0.3rem', borderRadius: '10px', border: '1px solid #E5E9F2' }}>
            <button
              type="button"
              onClick={() => setActiveTab('Recommendations')}
              style={{
                background: activeTab === 'Recommendations' ? '#3B3593' : 'transparent',
                color: activeTab === 'Recommendations' ? '#FFFFFF' : '#64748B',
                border: 'none',
                padding: '0.5rem 1.1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Action Recommendations
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('Trends')}
              style={{
                background: activeTab === 'Trends' ? '#3B3593' : 'transparent',
                color: activeTab === 'Trends' ? '#FFFFFF' : '#64748B',
                border: 'none',
                padding: '0.5rem 1.1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Inventory Trends
            </button>
          </div>
        </div>
      </div>

      {/* Insight Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredList.map(item => {
          let badgeColor = '#3B3593';
          let badgeBg = '#EEF0FD';
          let borderAccent = '#3B3593';

          if (item.severity === 'high') {
            badgeColor = '#EF4444';
            badgeBg = '#FEF2F2';
            borderAccent = '#EF4444';
          } else if (item.severity === 'medium') {
            badgeColor = '#F59E0B';
            badgeBg = '#FFFBEB';
            borderAccent = '#F59E0B';
          }

          return (
            <div
              key={item.id}
              className="card-container"
              style={{
                borderLeft: `5px solid ${borderAccent}`,
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1.25rem',
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: badgeBg,
                color: badgeColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {item.type === 'expiring' && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                )}
                {item.type === 'declining' && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                    <polyline points="17 18 23 18 23 12" />
                  </svg>
                )}
                {item.type === 'overstock' && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                )}
                {item.type === 'velocity' && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    color: badgeColor,
                    background: badgeBg,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px',
                  }}>
                    {item.tag}
                  </span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E3A4C', margin: 0 }}>
                    {item.title}
                  </h3>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600, marginBottom: '0.65rem' }}>
                  Observation: <strong style={{ color: '#1E3A4C' }}>{item.metric}</strong>
                </div>

                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #EEF2F6',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.88rem',
                  color: '#1E3A4C',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <span style={{ color: '#3B3593', fontWeight: 800 }}>💡 Recommendation:</span>
                  <span>{item.recommendation}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
