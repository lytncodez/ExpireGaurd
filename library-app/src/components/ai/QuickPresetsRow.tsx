import { QUICK_PRESETS } from '../../api/aiService';

interface QuickPresetsRowProps {
  onSelectPreset: (prompt: string) => void;
}

export default function QuickPresetsRow({ onSelectPreset }: QuickPresetsRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        overflowX: 'auto',
        padding: '0.4rem 0',
        marginBottom: '0.75rem',
        scrollbarWidth: 'none',
      }}
    >
      <span
        style={{
          fontSize: '0.72rem',
          fontWeight: 800,
          color: '#64748B',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
          marginRight: '0.25rem',
        }}
      >
        ⚡ Quick Presets:
      </span>

      {QUICK_PRESETS.map(preset => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onSelectPreset(preset.prompt)}
          style={{
            background: '#FFFFFF',
            color: '#1E3A4C',
            border: '1px solid #CBD5E1',
            padding: '0.35rem 0.8rem',
            borderRadius: '9999px',
            fontSize: '0.76rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#3B3593';
            e.currentTarget.style.background = '#EEF0FD';
            e.currentTarget.style.color = '#3B3593';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#CBD5E1';
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.color = '#1E3A4C';
          }}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
