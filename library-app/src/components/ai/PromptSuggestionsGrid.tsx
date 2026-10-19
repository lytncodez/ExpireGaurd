import { SUGGESTED_STARTERS } from '../../api/aiService';

interface PromptSuggestionsGridProps {
  onSelectPrompt: (prompt: string) => void;
}

export default function PromptSuggestionsGrid({ onSelectPrompt }: PromptSuggestionsGridProps) {
  return (
    <div style={{ padding: '1rem 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #EEF0FD 0%, #D5DAF3 100%)',
            color: '#3B3593',
            fontSize: '1.75rem',
            marginBottom: '0.75rem',
            boxShadow: '0 4px 12px rgba(59, 53, 147, 0.1)',
          }}
        >
          ✨
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1E3A4C', margin: '0 0 0.4rem' }}>
          Welcome, Pharmacy Administrator
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#64748B', maxWidth: '580px', margin: '0 auto', lineHeight: 1.5 }}>
          I am your intelligent inventory advisory assistant, grounded directly in your stock ledger, sales history,
          and Ghana seasonal demand patterns. Choose a prompt below or ask anything.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '0.85rem',
          maxWidth: '960px',
          margin: '0 auto',
        }}
      >
        {SUGGESTED_STARTERS.map(starter => (
          <button
            key={starter.id}
            type="button"
            onClick={() => onSelectPrompt(starter.prompt)}
            style={{
              textAlign: 'left',
              padding: '1.1rem 1.15rem',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.85rem',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#3B3593';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 53, 147, 0.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.02)';
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#EEF0FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                flexShrink: 0,
              }}
            >
              {starter.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1E3A4C', marginBottom: '0.2rem' }}>
                {starter.title}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748B', lineHeight: 1.4 }}>
                {starter.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
