import { useState } from 'react';

export interface InsightItem {
  id: string;
  type: 'declining' | 'overstock' | 'expiring' | 'velocity';
  title: string;
  tag: string;
  metric: string;
  recommendation: string;
  severity: 'high' | 'medium' | 'info';
  category: 'Trends' | 'Recommendations';
}

export const initialInsights: InsightItem[] = [
  {
    id: 'ins-1',
    type: 'expiring',
    title: 'Items Nearing Expiry Window',
    tag: 'CRITICAL EXPIRY',
    metric: '3 items expiring in ≤7 days (GH₵1,240.00 value)',
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

interface ExistingInsightsTabsProps {
  onAskAIAboutInsight: (insight: InsightItem) => void;
}

export default function ExistingInsightsTabs({ onAskAIAboutInsight }: ExistingInsightsTabsProps) {
  const [activeTab, setActiveTab] = useState<'Recommendations' | 'Trends'>('Recommendations');
  const filteredList = initialInsights.filter(i => i.category === activeTab);

  return (
    <div style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1E3A4C', margin: '0 0 0.25rem' }}>
            System Verified Insights &amp; Flags
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
            Algorithmic flags generated from shelf-life runout, dispensing velocity, and supplier return windows.
          </p>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', background: '#F1F5F9', padding: '0.25rem', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('Recommendations')}
            style={{
              background: activeTab === 'Recommendations' ? '#3B3593' : 'transparent',
              color: activeTab === 'Recommendations' ? '#FFFFFF' : '#64748B',
              border: 'none',
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Action Recommendations ({initialInsights.filter(i => i.category === 'Recommendations').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('Trends')}
            style={{
              background: activeTab === 'Trends' ? '#3B3593' : 'transparent',
              color: activeTab === 'Trends' ? '#FFFFFF' : '#64748B',
              border: 'none',
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Inventory Trends ({initialInsights.filter(i => i.category === 'Trends').length})
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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
              style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                borderLeft: `5px solid ${borderAccent}`,
                padding: '1.15rem 1.35rem',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      color: badgeColor,
                      background: badgeBg,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '9999px',
                    }}
                  >
                    {item.tag}
                  </span>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1E3A4C', margin: 0 }}>
                    {item.title}
                  </h4>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Observation: <strong style={{ color: '#1E3A4C' }}>{item.metric}</strong>
                </div>

                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #EEF2F6',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.82rem',
                    color: '#1E3A4C',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: '#3B3593', fontWeight: 800 }}>Recommendation: </span>
                  <span>{item.recommendation}</span>
                </div>
              </div>

              {/* "Ask AI about this" Button */}
              <button
                type="button"
                onClick={() => onAskAIAboutInsight(item)}
                style={{
                  background: '#EEF0FD',
                  color: '#3B3593',
                  border: '1px solid #D5DAF3',
                  borderRadius: '10px',
                  padding: '0.6rem 1rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  alignSelf: 'center',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#3B3593';
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#3B3593';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#EEF0FD';
                  e.currentTarget.style.color = '#3B3593';
                  e.currentTarget.style.borderColor = '#D5DAF3';
                }}
              >
                <span>✨</span> Ask AI about this
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
