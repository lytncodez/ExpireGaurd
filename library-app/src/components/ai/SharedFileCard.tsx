import type { SharedFile } from '../../api/aiService';

const KIND_LABEL: Record<SharedFile['kind'], string> = {
  INVENTORY: 'Stock list',
  SALES_HISTORY: 'Sales history',
  OTHER: 'Other data',
};

const STATUS_LABEL: Record<SharedFile['status'], { text: string; color: string; bg: string }> = {
  PENDING: { text: 'Waiting for your choice', color: '#92400E', bg: '#FEF3C7' },
  KEPT: { text: 'Kept for analysis', color: '#065F46', bg: '#D1FAE5' },
  IMPORTED: { text: 'Imported into stock', color: '#1E40AF', bg: '#DBEAFE' },
};

interface Props {
  file: SharedFile;
  busy?: boolean;
  onImport: (file: SharedFile) => void;
  onKeep: (file: SharedFile) => void;
  onAsk: (prompt: string) => void;
}

function n(value: unknown): string {
  return typeof value === 'number' ? value.toLocaleString() : String(value ?? '');
}

/** Card shown in the chat after a file is uploaded: what it is, and Import / Keep buttons. */
export default function SharedFileCard({ file, busy = false, onImport, onKeep, onAsk }: Props) {
  const s = file.summary;
  const status = STATUS_LABEL[file.status];
  const facts: string[] = [];
  if (file.kind === 'INVENTORY') {
    facts.push(`${n(s.products)} products`, `${n(s.total_units)} units`);
    if (s.expired_batches) facts.push(`${n(s.expired_batches)} batch(es) already expired`);
    if (s.expiring_within_90_days) facts.push(`${n(s.expiring_within_90_days)} expiring within 90 days`);
  } else if (file.kind === 'SALES_HISTORY') {
    facts.push(`${n(s.date_start)} to ${n(s.date_end)}`, `${n(s.products)} products`);
    if (s.total_units !== undefined) facts.push(`${n(s.total_units)} units sold`);
    if (s.total_revenue !== undefined) facts.push(`${n(s.total_revenue)} in sales`);
  } else {
    facts.push(`${file.columns.length} columns`);
  }

  const button = (primary: boolean) => ({
    background: primary ? '#3B3593' : '#FFFFFF',
    color: primary ? '#FFFFFF' : '#3B3593',
    border: '1px solid #3B3593',
    padding: '0.45rem 0.85rem',
    borderRadius: '8px',
    fontSize: '0.76rem',
    fontWeight: 700,
    cursor: busy ? 'default' : 'pointer',
    opacity: busy ? 0.6 : 1,
  });

  return (
    <div
      style={{
        marginTop: '0.75rem',
        padding: '0.9rem 1rem',
        borderRadius: '12px',
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        maxWidth: '560px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E3A4C', wordBreak: 'break-all' }}>
          📎 {file.filename}
        </div>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: status.color, background: status.bg, padding: '0.15rem 0.5rem', borderRadius: '999px' }}>
          {status.text}
        </span>
      </div>
      <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.25rem' }}>
        {KIND_LABEL[file.kind]} · {file.rowCount.toLocaleString()} rows · {facts.join(' · ')}
      </div>
      {s.description && <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '0.5rem' }}>{s.description}</div>}

      {file.status === 'PENDING' && (
        <>
          <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '0.65rem' }}>
            {file.canImport
              ? 'This looks like a stock list. Import it to add the batches to your inventory, or just keep it for analysis.'
              : 'Keep this file so the assistant can use it for answers and forecasts.'}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
            {file.canImport && (
              <button type="button" disabled={busy} style={button(true)} onClick={() => onImport(file)}>
                Import as stock
              </button>
            )}
            <button type="button" disabled={busy} style={button(!file.canImport)} onClick={() => onKeep(file)}>
              Keep for analysis
            </button>
          </div>
        </>
      )}

      {file.status !== 'PENDING' && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem', flexWrap: 'wrap' }}>
          <button type="button" style={button(false)} onClick={() => onAsk(`What does the file I uploaded (${file.filename}) show?`)}>
            Summarise this file
          </button>
          <button type="button" style={button(false)} onClick={() => onAsk('Forecast my sales for the next 30 days')}>
            Forecast next 30 days
          </button>
          <button type="button" style={button(false)} onClick={() => onAsk('Based on my data, how can I increase sales?')}>
            Sales ideas
          </button>
        </div>
      )}
    </div>
  );
}
