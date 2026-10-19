import React, { useState } from 'react';
import type { SeasonalCardData } from '../../api/aiService';

interface SeasonalRecommendationCardProps {
  card: SeasonalCardData;
  onAskFollowUp?: (prompt: string) => void;
}

export default function SeasonalRecommendationCard({
  card,
  onAskFollowUp,
}: SeasonalRecommendationCardProps) {
  const [products, setProducts] = useState(card.products);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [approvedStatus, setApprovedStatus] = useState<string | null>(null);

  // Recompute total cost when quantities are adjusted
  const totalCost = products.reduce((acc, p) => acc + (p.costGhs || 0), 0);

  const handleQuantityChange = (productId: string, newQty: number) => {
    const validQty = Math.max(0, isNaN(newQty) ? 0 : newQty);
    setProducts(prev =>
      prev.map(p => {
        if (p.productId === productId) {
          const unitCost = p.recommendedOrderQty > 0 ? p.costGhs / p.recommendedOrderQty : 15;
          return {
            ...p,
            recommendedOrderQty: validQty,
            costGhs: Math.round(validQty * unitCost),
          };
        }
        return p;
      })
    );
  };

  const handleApproveDraft = () => {
    setApprovedStatus('Draft purchase list created and logged in Procurement queue.');
    setTimeout(() => {
      setApprovedStatus(null);
    }, 4500);
  };

  const handleExportCSV = () => {
    const headers = [
      'Product',
      'Current Stock',
      'Recommended Order Qty',
      'Sold Last Season',
      'Sell Through Speed',
      'Confidence',
      'Estimated Cost (GHS)',
      'Reasoning',
    ];

    const rows = products.map(p => [
      `"${p.product.replace(/"/g, '""')}"`,
      p.currentStock,
      p.recommendedOrderQty,
      p.soldLastSeason,
      `"${p.sellThroughSpeed}"`,
      p.confidence,
      p.costGhs.toFixed(2),
      `"${p.why.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ExpireGuard_Seasonal_Order_${card.seasonName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        marginTop: '1rem',
        marginBottom: '1rem',
        borderRadius: '16px',
        border: '1.5px solid #D5DAF3',
        background: '#FFFFFF',
        boxShadow: '0 8px 24px rgba(59, 53, 147, 0.08)',
        overflow: 'hidden',
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E3A4C 0%, #3B3593 100%)',
          padding: '1.15rem 1.5rem',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
            }}
          >
            📋
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                }}
              >
                Seasonal Purchase Plan
              </span>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#93C5FD',
                  background: 'rgba(15, 23, 42, 0.35)',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                }}
              >
                🗓️ {card.dateRange}
              </span>
            </div>
            <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.15rem', fontWeight: 800 }}>
              {card.seasonName}
            </h3>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', opacity: 0.85, fontWeight: 700 }}>
            Estimated Order Total (Admin)
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#38BDF8', letterSpacing: '-0.02em' }}>
            GH₵{totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Cold Start Notice */}
      {card.coldStartNote && (
        <div
          style={{
            background: '#FFFBEB',
            borderBottom: '1px solid #FEF3C7',
            padding: '0.75rem 1.25rem',
            fontSize: '0.82rem',
            color: '#92400E',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            lineHeight: 1.45,
          }}
        >
          <span style={{ fontSize: '1rem' }}>⚠️</span>
          <div>
            <strong>Cold-Start Transparency:</strong> {card.coldStartNote}
          </div>
        </div>
      )}

      {/* Success Notification */}
      {approvedStatus && (
        <div
          style={{
            background: '#F0FDF4',
            borderBottom: '1px solid #BBF7D0',
            padding: '0.75rem 1.25rem',
            fontSize: '0.82rem',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 700,
          }}
        >
          <span>✅</span>
          <span>{approvedStatus}</span>
        </div>
      )}

      {/* Products Table */}
      <div style={{ overflowX: 'auto', padding: '0.75rem 1rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid #E2E8F0', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.04em' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>Product</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Current Stock</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Recommended Qty</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Sold Last Season</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Sell-Through Pace</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Confidence</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Est. Cost</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => {
              const confColors =
                p.confidence === 'High'
                  ? { bg: '#DCFCE7', text: '#15803D' }
                  : p.confidence === 'Medium'
                  ? { bg: '#FEF3C7', text: '#B45309' }
                  : { bg: '#F1F5F9', text: '#475569' };

              return (
                <React.Fragment key={p.productId || idx}>
                  <tr
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFC',
                      verticalAlign: 'middle',
                    }}
                  >
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#1E3A4C' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{p.product}</span>
                        {p.coldStart && (
                          <span
                            title="Product has <12 months sales records"
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              background: '#F1F5F9',
                              color: '#64748B',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                            }}
                          >
                            New Line
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                      {p.currentStock} units
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      {isAdjusting ? (
                        <input
                          type="number"
                          value={p.recommendedOrderQty}
                          min={0}
                          step={10}
                          onChange={e => handleQuantityChange(p.productId, parseInt(e.target.value, 10))}
                          style={{
                            width: '70px',
                            textAlign: 'center',
                            padding: '0.25rem 0.4rem',
                            border: '1.5px solid #3B3593',
                            borderRadius: '6px',
                            fontWeight: 800,
                            color: '#1E3A4C',
                            fontSize: '0.82rem',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            fontWeight: 800,
                            color: '#3B3593',
                            background: '#EEF0FD',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                          }}
                        >
                          +{p.recommendedOrderQty}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 600, color: '#64748B' }}>
                      {p.soldLastSeason > 0 ? `${p.soldLastSeason} units` : 'N/A (Cold Start)'}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: '#334155' }}>
                      {p.sellThroughSpeed}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          background: confColors.bg,
                          color: confColors.text,
                        }}
                      >
                        {p.confidence}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 800, color: '#1E3A4C' }}>
                      GH₵{p.costGhs.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* "Why" line sub-row */}
                  <tr style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <td colSpan={7} style={{ padding: '0 0.5rem 0.65rem 0.5rem', fontSize: '0.74rem', color: '#64748B' }}>
                      <span style={{ fontWeight: 700, color: '#3B3593' }}>Reasoning:</span> {p.why}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action Footer & Disclaimer */}
      <div
        style={{
          background: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          padding: '0.9rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleApproveDraft}
            style={{
              background: '#3B3593',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.5rem 0.95rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'background 0.15s ease',
            }}
          >
            <span>✓</span> Approve as draft purchase list
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              background: '#FFFFFF',
              color: '#1E3A4C',
              border: '1.5px solid #CBD5E1',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>📥</span> Export CSV
          </button>

          <button
            type="button"
            onClick={() => setIsAdjusting(!isAdjusting)}
            style={{
              background: isAdjusting ? '#EEF0FD' : '#FFFFFF',
              color: '#3B3593',
              border: '1.5px solid #D5DAF3',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>✏️</span> {isAdjusting ? 'Done Adjusting' : 'Adjust quantities'}
          </button>

          <button
            type="button"
            onClick={() => onAskFollowUp && onAskFollowUp(`How do I finance the GH₵${totalCost.toLocaleString()} seasonal order?`)}
            style={{
              background: 'transparent',
              color: '#64748B',
              border: '1px solid transparent',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>💬</span> Ask a follow-up
          </button>
        </div>

        <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, fontStyle: 'italic' }}>
          🛡️ {card.disclaimer}
        </div>
      </div>
    </div>
  );
}
