import type { MiniChartData } from '../../api/aiService';

export default function MiniChart({ chart }: { chart: MiniChartData }) {
  const maxVal = Math.max(...chart.values, 1);
  const color = chart.color || '#3B3593';

  return (
    <div
      style={{
        marginTop: '0.75rem',
        marginBottom: '0.75rem',
        padding: '0.85rem 1rem',
        borderRadius: '12px',
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        maxWidth: '520px',
      }}
    >
      <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1E3A4C', marginBottom: '0.65rem' }}>
        📊 {chart.title}
      </div>

      {chart.type === 'bar' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {chart.labels.map((label, idx) => {
            const val = chart.values[idx] || 0;
            const pct = Math.round((val / maxVal) * 100);
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.74rem' }}>
                <span
                  style={{
                    width: '90px',
                    textAlign: 'right',
                    color: '#64748B',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={label}
                >
                  {label}
                </span>

                <div style={{ flex: 1, background: '#E2E8F0', height: '14px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: color,
                      borderRadius: '4px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                <span style={{ width: '65px', fontWeight: 800, color: '#1E3A4C', fontSize: '0.72rem' }}>
                  {chart.unit === 'GH₵' ? `GH₵${val.toLocaleString()}` : `${val} ${chart.unit || ''}`}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        /* Line Chart SVG */
        <div style={{ width: '100%', height: '80px', display: 'flex', alignItems: 'center' }}>
          <svg viewBox="0 0 300 80" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={chart.values
                .map((v, i) => {
                  const x = (i / Math.max(chart.values.length - 1, 1)) * 280 + 10;
                  const y = 70 - (v / maxVal) * 60;
                  return `${x},${y}`;
                })
                .join(' ')}
            />
            {chart.values.map((v, i) => {
              const x = (i / Math.max(chart.values.length - 1, 1)) * 280 + 10;
              const y = 70 - (v / maxVal) * 60;
              return <circle key={i} cx={x} cy={y} r="4" fill={color} />;
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
