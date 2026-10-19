import React, { useState } from 'react';
import type { Conversation } from '../../api/aiService';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onTogglePinConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onTogglePinConversation,
  onDeleteConversation,
  isCollapsed,
  onToggleCollapse,
}: ConversationSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  // Filter conversations by title
  const filtered = conversations.filter(c =>
    (c.title || 'Untitled Conversation').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group conversations by timeframes
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const pinnedConvs: Conversation[] = [];
  const todayConvs: Conversation[] = [];
  const yesterdayConvs: Conversation[] = [];
  const past7DaysConvs: Conversation[] = [];
  const olderConvs: Conversation[] = [];

  filtered.forEach(c => {
    if (c.isPinned) {
      pinnedConvs.push(c);
      return;
    }
    const cDate = new Date(c.updatedAt || c.createdAt);
    const diffDays = Math.floor((now.getTime() - cDate.getTime()) / dayMs);

    if (diffDays === 0) {
      todayConvs.push(c);
    } else if (diffDays === 1) {
      yesterdayConvs.push(c);
    } else if (diffDays <= 7) {
      past7DaysConvs.push(c);
    } else {
      olderConvs.push(c);
    }
  });

  const handleStartRename = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(c.id);
    setRenameText(c.title || 'New Chat');
  };

  const handleSaveRename = (id: string) => {
    if (renameText.trim()) {
      onRenameConversation(id, renameText.trim());
    }
    setRenamingId(null);
  };

  const renderGroup = (title: string, list: Conversation[]) => {
    if (list.length === 0) return null;

    return (
      <div style={{ marginBottom: '1.1rem' }}>
        <div
          style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            color: '#94A3B8',
            letterSpacing: '0.05em',
            padding: '0 0.65rem 0.35rem',
          }}
        >
          {title}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {list.map(c => {
            const isActive = c.id === activeConversationId;
            const isEditing = renamingId === c.id;

            return (
              <div
                key={c.id}
                onClick={() => onSelectConversation(c.id)}
                style={{
                  padding: '0.55rem 0.65rem',
                  borderRadius: '10px',
                  background: isActive ? '#EEF0FD' : 'transparent',
                  color: isActive ? '#3B3593' : '#1E3A4C',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 800 : 600,
                  transition: 'background 0.12s ease',
                  border: isActive ? '1px solid #D5DAF3' : '1px solid transparent',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.background = '#F8FAFC';
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                {isEditing ? (
                  <input
                    type="text"
                    value={renameText}
                    autoFocus
                    onChange={e => setRenameText(e.target.value)}
                    onBlur={() => handleSaveRename(c.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveRename(c.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    style={{
                      flex: 1,
                      padding: '0.2rem 0.4rem',
                      fontSize: '0.8rem',
                      border: '1.5px solid #3B3593',
                      borderRadius: '4px',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      flex: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                    title={c.title}
                  >
                    {c.isPinned && <span style={{ fontSize: '0.75rem' }}>📌</span>}
                    <span>{c.title || 'Untitled Conversation'}</span>
                  </div>
                )}

                {/* Actions on hover/active */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
                  <button
                    type="button"
                    title={c.isPinned ? 'Unpin conversation' : 'Pin conversation'}
                    onClick={e => {
                      e.stopPropagation();
                      onTogglePinConversation(c.id);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: c.isPinned ? '#3B3593' : '#94A3B8',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      fontSize: '0.8rem',
                      borderRadius: '4px',
                    }}
                  >
                    {c.isPinned ? '📌' : '📍'}
                  </button>

                  <button
                    type="button"
                    title="Rename"
                    onClick={e => handleStartRename(c, e)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      fontSize: '0.75rem',
                      borderRadius: '4px',
                    }}
                  >
                    ✏️
                  </button>

                  <button
                    type="button"
                    title="Delete conversation"
                    onClick={e => {
                      e.stopPropagation();
                      if (window.confirm('Delete this chat history?')) {
                        onDeleteConversation(c.id);
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#EF4444',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      fontSize: '0.75rem',
                      borderRadius: '4px',
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        title="Open Chat History"
        style={{
          position: 'fixed',
          left: '1.25rem',
          top: '5rem',
          zIndex: 40,
          background: '#3B3593',
          color: '#FFFFFF',
          border: 'none',
          padding: '0.65rem 0.85rem',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(59, 53, 147, 0.25)',
          fontWeight: 700,
          fontSize: '0.8rem',
        }}
      >
        <span>💬</span>
        <span>History</span>
      </button>
    );
  }

  return (
    <div
      style={{
        width: '280px',
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header & New Chat */}
      <div style={{ padding: '1rem', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#1E3A4C', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>💬</span> Chat History
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse History Panel"
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '6px',
              color: '#64748B',
              cursor: 'pointer',
              padding: '0.25rem 0.45rem',
              fontSize: '0.8rem',
            }}
          >
            ◀
          </button>
        </div>

        <button
          type="button"
          onClick={onNewChat}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #3B3593 0%, #1E3A4C 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '10px',
            padding: '0.65rem 1rem',
            fontSize: '0.84rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 8px rgba(59, 53, 147, 0.15)',
          }}
        >
          <span>＋</span> New Chat
        </button>

        {/* Search Chats Input */}
        <div style={{ marginTop: '0.65rem', position: 'relative' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search conversations..."
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem 0.45rem 1.85rem',
              fontSize: '0.78rem',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              outline: 'none',
              background: '#F8FAFC',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#94A3B8' }}>
            🔍
          </span>
        </div>
      </div>

      {/* Conversation Groups List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.5rem' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94A3B8', fontSize: '0.8rem' }}>
            {searchTerm ? 'No matching chats found.' : 'No chat history yet. Start a new conversation!'}
          </div>
        ) : (
          <>
            {renderGroup('📌 Pinned', pinnedConvs)}
            {renderGroup('📅 Today', todayConvs)}
            {renderGroup('📅 Yesterday', yesterdayConvs)}
            {renderGroup('📅 Previous 7 Days', past7DaysConvs)}
            {renderGroup('📅 Older', olderConvs)}
          </>
        )}
      </div>
    </div>
  );
}
