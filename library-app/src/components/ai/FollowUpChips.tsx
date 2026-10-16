
interface FollowUpChipsProps {
  suggestions: string[];
  onSelectChip: (text: string) => void;
}

export default function FollowUpChips({ suggestions, onSelectChip }: FollowUpChipsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        overflowX: 'auto',
        padding: '0.4rem 0',
        scrollbarWidth: 'none',
      }}
    >
      <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, whiteSpace: 'nowrap' }}>
        Suggested:
      </span>
      {suggestions.map((s, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelectChip(s)}
          style={{
            background: '#EEF0FD',
            color: '#3B3593',
            border: '1px solid #D5DAF3',
            padding: '0.3rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
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
          <span>💬</span> {s}
        </button>
      ))}
    </div>
  );
}
