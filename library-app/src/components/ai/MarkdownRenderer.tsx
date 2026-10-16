import React from 'react';

export default function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;

  // Split content by lines/blocks
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let tableBuffer: string[] = [];
  let inTable = false;

  const flushTable = (key: number) => {
    if (tableBuffer.length === 0) return null;
    const headerRow = tableBuffer[0];
    const dataRows = tableBuffer.slice(2); // Skip separator row

    const parseCells = (row: string) =>
      row
        .split('|')
        .map(c => c.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

    const headers = parseCells(headerRow);

    const tableEl = (
      <div key={`table-${key}`} style={{ overflowX: 'auto', margin: '0.85rem 0' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.82rem',
            background: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
              {headers.map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: '0.55rem 0.75rem',
                    textAlign: i === 0 ? 'left' : 'center',
                    fontWeight: 800,
                    color: '#475569',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {h.replace(/\*\*/g, '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rIdx) => {
              const cells = parseCells(row);
              return (
                <tr
                  key={rIdx}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    background: rIdx % 2 === 0 ? '#FFFFFF' : '#FAFAFC',
                  }}
                >
                  {cells.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      style={{
                        padding: '0.55rem 0.75rem',
                        textAlign: cIdx === 0 ? 'left' : 'center',
                        color: '#1E3A4C',
                      }}
                      dangerouslySetInnerHTML={{
                        __html: formatInline(cell),
                      }}
                    />
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );

    tableBuffer = [];
    inTable = false;
    return tableEl;
  };

  function formatInline(str: string): string {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background:#EEF0FD;color:#3B3593;padding:0.1rem 0.35rem;border-radius:4px;font-size:0.88em;font-weight:700;">$1</code>');
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check if line is a table row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      tableBuffer.push(trimmed);
      return;
    } else if (inTable) {
      const renderedTable = flushTable(index);
      if (renderedTable) elements.push(renderedTable);
    }

    if (!trimmed) {
      elements.push(<div key={`spacer-${index}`} style={{ height: '0.5rem' }} />);
      return;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3
          key={`h3-${index}`}
          style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E3A4C', margin: '0.65rem 0 0.25rem' }}
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed.replace('### ', '')) }}
        />
      );
    } else if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${index}`}
          style={{
            margin: '0.65rem 0',
            padding: '0.6rem 0.85rem',
            background: '#F0F9FF',
            borderLeft: '4px solid #0284C7',
            borderRadius: '0 8px 8px 0',
            fontSize: '0.82rem',
            color: '#0369A1',
            lineHeight: 1.45,
          }}
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed.replace('> ', '')) }}
        />
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div
          key={`bullet-${index}`}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            fontSize: '0.84rem',
            lineHeight: 1.5,
            color: '#334155',
            margin: '0.2rem 0',
          }}
        >
          <span style={{ color: '#3B3593', fontWeight: 900, fontSize: '0.9rem' }}>•</span>
          <span dangerouslySetInnerHTML={{ __html: formatInline(trimmed.substring(2)) }} />
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      elements.push(
        <div
          key={`num-${index}`}
          style={{
            fontSize: '0.84rem',
            lineHeight: 1.5,
            color: '#334155',
            margin: '0.25rem 0',
            paddingLeft: '0.25rem',
          }}
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
        />
      );
    } else {
      elements.push(
        <p
          key={`p-${index}`}
          style={{
            fontSize: '0.84rem',
            lineHeight: 1.55,
            color: '#1E3A4C',
            margin: '0.35rem 0',
          }}
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
        />
      );
    }
  });

  if (inTable) {
    const renderedTable = flushTable(lines.length);
    if (renderedTable) elements.push(renderedTable);
  }

  return <div>{elements}</div>;
}
