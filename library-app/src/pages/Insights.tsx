import { useEffect, useRef, useState } from 'react';
import { useInventory } from '../api/useInventory';
import {
  fetchAIResponse,
  getSavedConversations,
  saveConversations,
  type ChatMessage,
  type Conversation,
} from '../api/aiService';
import ConversationSidebar from '../components/ai/ConversationSidebar';
import ChatInputBar from '../components/ai/ChatInputBar';
import PromptSuggestionsGrid from '../components/ai/PromptSuggestionsGrid';
import QuickPresetsRow from '../components/ai/QuickPresetsRow';
import FollowUpChips from '../components/ai/FollowUpChips';
import SeasonalRecommendationCard from '../components/ai/SeasonalRecommendationCard';
import MiniChart from '../components/ai/MiniChart';
import MarkdownRenderer from '../components/ai/MarkdownRenderer';
import ExistingInsightsTabs, { type InsightItem } from '../components/ai/ExistingInsightsTabs';

export default function Insights() {
  const { items } = useInventory();

  // Conversation history state
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    return getSavedConversations();
  });
  const [activeConvId, setActiveConvId] = useState<string | null>(() => {
    const list = getSavedConversations();
    return list.length > 0 ? list[0].id : null;
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Streaming & Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const streamingAbortRef = useRef(false);

  // Error & Status states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Auto-scroll anchor
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active conversation helper
  const activeConversation = conversations.find(c => c.id === activeConvId);
  const messages = activeConversation?.messages || [];

  // Persist conversations on changes
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  // Scroll to bottom when messages update or streaming text changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamedText, isStreaming]);

  // ─── Chat Actions ──────────────────────────────────────────────────────────

  const handleStartNewChat = () => {
    const newId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: false,
      messages: [],
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConvId(newId);
    setErrorMessage(null);
    setIsRateLimited(false);
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, title: newTitle, updatedAt: new Date().toISOString() } : c))
    );
  };

  const handleTogglePinConversation = (id: string) => {
    setConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, isPinned: !c.isPinned, updatedAt: new Date().toISOString() } : c))
    );
  };

  const handleDeleteConversation = (id: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      if (activeConvId === id) {
        setActiveConvId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    let targetConvId = activeConvId;

    // Create a new conversation if none active
    if (!targetConvId || !conversations.some(c => c.id === targetConvId)) {
      targetConvId = `conv-${Date.now()}`;
      const newConv: Conversation = {
        id: targetConvId,
        title: text.length > 38 ? `${text.substring(0, 38)}...` : text,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPinned: false,
        messages: [],
      };
      setConversations(prev => [newConv, ...prev]);
      setActiveConvId(targetConvId);
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Update conversation with user message and title if first message
    setConversations(prev =>
      prev.map(c => {
        if (c.id === targetConvId) {
          const autoTitle = c.messages.length === 0 ? (text.length > 38 ? `${text.substring(0, 38)}...` : text) : c.title;
          return {
            ...c,
            title: autoTitle,
            updatedAt: new Date().toISOString(),
            messages: [...c.messages, userMessage],
          };
        }
        return c;
      })
    );

    // Compute grounded response from AI pipeline (backend Gemini or resilient local grounded fallback)
    setIsLoading(true);
    setErrorMessage(null);

    (async () => {
      try {
        const targetConv = conversations.find(c => c.id === targetConvId);
        const fullResponse = await fetchAIResponse(
          text,
          items,
          targetConvId,
          targetConv?.messages.map((m: ChatMessage) => ({ role: m.role, content: m.content }))
        );
        setIsLoading(false);
        const assistantMsgId = `msg-${Date.now()}-asst`;

        // Start streaming effect
        setIsStreaming(true);
        setStreamedText('');
        streamingAbortRef.current = false;

        const words = fullResponse.content.split(' ');
        let currentIdx = 0;

        const interval = setInterval(() => {
          if (streamingAbortRef.current || currentIdx >= words.length) {
            clearInterval(interval);
            setIsStreaming(false);

            // Commit final completed message into conversation
            const finalAssistantMsg: ChatMessage = {
              ...fullResponse,
              id: assistantMsgId,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };

            setConversations(prev =>
              prev.map(c => {
                if (c.id === targetConvId) {
                  return {
                    ...c,
                    updatedAt: new Date().toISOString(),
                    messages: [...c.messages, finalAssistantMsg],
                  };
                }
                return c;
              })
            );
            return;
          }

          setStreamedText(prev => (prev ? `${prev} ${words[currentIdx]}` : words[currentIdx]));
          currentIdx++;
        }, 28);
      } catch (err: any) {
        setIsLoading(false);
        setIsStreaming(false);
        setErrorMessage(err?.message || 'Failed to query inventory pipeline. Click retry to attempt again.');
      }
    })();
  };

  const handleStopStreaming = () => {
    streamingAbortRef.current = true;
    setIsStreaming(false);
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopyFeedback('Copied to clipboard!');
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleTogglePinMessage = (messageId: string) => {
    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeConvId) {
          return {
            ...c,
            messages: c.messages.map(m => (m.id === messageId ? { ...m, isPinned: !m.isPinned } : m)),
          };
        }
        return c;
      })
    );
  };

  const handleRegenerate = (msgIndex: number) => {
    // Find preceding user prompt
    const prevUserMsg = messages
      .slice(0, msgIndex)
      .reverse()
      .find(m => m.role === 'user');

    if (prevUserMsg) {
      handleSendMessage(prevUserMsg.content);
    }
  };

  // Connect existing insight cards to AI chat
  const handleAskAIAboutInsight = (insight: InsightItem) => {
    const prompt = `Tell me more about this ${insight.tag}: "${insight.title}" (${insight.metric}). How should I execute: ${insight.recommendation}?`;
    handleSendMessage(prompt);
  };

  // Get last suggestions for follow-up chips
  const lastAssistantMessage = messages
    .slice()
    .reverse()
    .find(m => m.role === 'assistant');
  const currentFollowUps =
    lastAssistantMessage?.followUpSuggestions || [
      'What should I stock up on this season?',
      'What is expiring in the next 60 days?',
      'Which products sell fastest right now?',
      'What should I stop reordering?',
    ];

  return (
    <div className="page-body" style={{ padding: 0, height: 'calc(100vh - 65px)', display: 'flex', overflow: 'hidden' }}>
      {/* ─── Left Sidebar: Chat History ────────────────────────────────────────── */}
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConvId}
        onSelectConversation={id => setActiveConvId(id)}
        onNewChat={handleStartNewChat}
        onRenameConversation={handleRenameConversation}
        onTogglePinConversation={handleTogglePinConversation}
        onDeleteConversation={handleDeleteConversation}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* ─── Centre Conversation Panel ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: '#F8FAFC', position: 'relative' }}>
        {/* Top Chat Header */}
        <div
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            padding: '0.85rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                title="Show Chat History"
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.4rem 0.65rem',
                  cursor: 'pointer',
                  color: '#3B3593',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>💬</span>
                <span>History</span>
              </button>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>✨</span>
                <h1 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1E3A4C', margin: 0 }}>
                  {activeConversation?.title || 'AI Inventory Assistant'}
                </h1>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    background: '#EEF0FD',
                    color: '#3B3593',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    letterSpacing: '0.04em',
                  }}
                >
                  ADMIN
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.1rem' }}>
                Grounded in Accra Pharmacy ledger • Ghana Seasonality Engine • FEFO Protocol
              </div>
            </div>
          </div>

          {/* Quick Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              style={{
                background: '#F1F5F9',
                color: '#475569',
                border: '1px solid #E2E8F0',
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>⚙️</span> AI Config &amp; Grounding
            </button>

            <button
              type="button"
              onClick={handleStartNewChat}
              style={{
                background: '#3B3593',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>＋</span> New Chat
            </button>
          </div>
        </div>

        {/* Banners: Rate Limit / Config Warning */}
        {isRateLimited && (
          <div
            style={{
              background: '#FEF2F2',
              color: '#991B1B',
              padding: '0.6rem 1.5rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #F87171',
            }}
          >
            <span>⏳ Rate limit active (20 queries/min). Please wait a few seconds before sending another question.</span>
            <button
              type="button"
              onClick={() => setIsRateLimited(false)}
              style={{ background: 'transparent', border: 'none', color: '#991B1B', cursor: 'pointer', fontWeight: 800 }}
            >
              ✕
            </button>
          </div>
        )}

        {copyFeedback && (
          <div
            style={{
              position: 'absolute',
              top: '4.5rem',
              right: '2rem',
              zIndex: 50,
              background: '#10B981',
              color: '#FFFFFF',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
            }}
          >
            ✓ {copyFeedback}
          </div>
        )}

        {/* ─── Scrollable Messages Feed ────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
          {/* Quick Presets Row at top */}
          <QuickPresetsRow onSelectPreset={handleSendMessage} />

          {/* Empty State: 8 Prompts Grid */}
          {messages.length === 0 && !isLoading && !isStreaming ? (
            <div style={{ margin: 'auto 0' }}>
              <PromptSuggestionsGrid onSelectPrompt={handleSendMessage} />

              {/* Preserved Tabs & Insight Cards below the grid */}
              <div style={{ maxWidth: '960px', margin: '2rem auto 0' }}>
                <ExistingInsightsTabs onAskAIAboutInsight={handleAskAIAboutInsight} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '960px', width: '100%', margin: '0 auto' }}>
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                      width: '100%',
                    }}
                  >
                    {isUser ? (
                      /* User Message Bubble */
                      <div style={{ maxWidth: '78%' }}>
                        <div
                          style={{
                            background: '#3B3593',
                            color: '#FFFFFF',
                            padding: '0.85rem 1.25rem',
                            borderRadius: '16px 16px 4px 16px',
                            fontSize: '0.88rem',
                            lineHeight: 1.5,
                            boxShadow: '0 2px 8px rgba(59, 53, 147, 0.15)',
                            fontWeight: 500,
                          }}
                        >
                          {msg.content}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.68rem', color: '#94A3B8', marginTop: '0.25rem', paddingRight: '0.3rem' }}>
                          {msg.timestamp || 'Just now'}
                        </div>
                      </div>
                    ) : (
                      /* AI Message Full-Width Container */
                      <div
                        style={{
                          width: '100%',
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '16px',
                          padding: '1.25rem 1.5rem',
                          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
                        }}
                      >
                        {/* AI Header & Sparkle Avatar */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #3B3593 0%, #1E3A4C 100%)',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1rem',
                              }}
                            >
                              ✨
                            </div>
                            <div>
                              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1E3A4C' }}>
                                ExpireGuard Assistant
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#10B981', fontWeight: 700 }}>
                                Grounded in verified stock numbers
                              </div>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>{msg.timestamp}</div>
                        </div>

                        {/* Render Markdown Text */}
                        <MarkdownRenderer content={msg.content} />

                        {/* Signature Seasonal Purchase Recommendation Card */}
                        {msg.seasonalCard && (
                          <SeasonalRecommendationCard
                            card={msg.seasonalCard}
                            onAskFollowUp={prompt => handleSendMessage(prompt)}
                          />
                        )}

                        {/* Mini Charts if attached */}
                        {msg.charts && msg.charts.map((chart, cIdx) => <MiniChart key={cIdx} chart={chart} />)}

                        {/* Data Sources Badge */}
                        {msg.dataSourcesUsed && msg.dataSourcesUsed.length > 0 && (
                          <div
                            style={{
                              marginTop: '0.85rem',
                              padding: '0.45rem 0.75rem',
                              background: '#F8FAFC',
                              borderRadius: '8px',
                              border: '1px solid #EEF2F6',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontSize: '0.7rem',
                              color: '#64748B',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span style={{ fontWeight: 800, color: '#3B3593' }}>📊 Data Sources Used:</span>
                            {msg.dataSourcesUsed.map((ds, sIdx) => (
                              <span
                                key={sIdx}
                                style={{
                                  background: '#FFFFFF',
                                  border: '1px solid #CBD5E1',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                }}
                              >
                                {ds}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions under AI Reply: Copy, Regenerate, Pin */}
                        <div
                          style={{
                            marginTop: '0.85rem',
                            paddingTop: '0.65rem',
                            borderTop: '1px solid #F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.content)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#64748B',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.4rem',
                              borderRadius: '4px',
                            }}
                          >
                            <span>📋</span> Copy
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRegenerate(idx)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#64748B',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.4rem',
                              borderRadius: '4px',
                            }}
                          >
                            <span>🔄</span> Regenerate
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTogglePinMessage(msg.id)}
                            style={{
                              background: msg.isPinned ? '#EEF0FD' : 'transparent',
                              border: 'none',
                              color: msg.isPinned ? '#3B3593' : '#64748B',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '4px',
                            }}
                          >
                            <span>{msg.isPinned ? '📌' : '📍'}</span> {msg.isPinned ? 'Pinned' : 'Pin reply'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Streaming Word-By-Word Container */}
              {isStreaming && (
                <div
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '1.25rem 1.5rem',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #3B3593 0%, #1E3A4C 100%)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                      }}
                    >
                      ✨
                    </div>
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1E3A4C' }}>
                        ExpireGuard Assistant
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#3B3593', fontWeight: 700 }}>
                        Generating verified response...
                      </div>
                    </div>
                  </div>

                  <MarkdownRenderer content={streamedText} />
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '16px',
                      background: '#3B3593',
                      marginLeft: '4px',
                      animation: 'blink 1s infinite',
                      verticalAlign: 'text-bottom',
                    }}
                  />
                </div>
              )}

              {/* Loading Shimmer State */}
              {isLoading && (
                <div
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#EEF0FD',
                      color: '#3B3593',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                    }}
                  >
                    ✨
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#64748B', fontWeight: 600 }}>
                    Reading shop stock &amp; querying database tools...
                  </div>
                </div>
              )}

              {/* Error State with Retry */}
              {errorMessage && (
                <div
                  style={{
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: '12px',
                    padding: '0.85rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ color: '#991B1B', fontSize: '0.82rem', fontWeight: 600 }}>
                    ⚠️ {errorMessage}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const lastUser = messages
                        .slice()
                        .reverse()
                        .find(m => m.role === 'user');
                      if (lastUser) handleSendMessage(lastUser.content);
                    }}
                    style={{
                      background: '#EF4444',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Preserved Tabs & Insight Cards at bottom of conversation */}
              <div style={{ marginTop: '2.5rem' }}>
                <ExistingInsightsTabs onAskAIAboutInsight={handleAskAIAboutInsight} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ─── Pinned Bottom Input Area ────────────────────────────────────────── */}
        <div
          style={{
            background: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            padding: '0.65rem 1.5rem 1rem',
            position: 'relative',
          }}
        >
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            {/* Context-Aware Follow-Up Chips */}
            <div style={{ marginBottom: '0.45rem' }}>
              <FollowUpChips suggestions={currentFollowUps} onSelectChip={handleSendMessage} />
            </div>

            {/* Pinned Input Bar */}
            <ChatInputBar
              onSendMessage={handleSendMessage}
              isStreaming={isStreaming}
              onStopStreaming={handleStopStreaming}
              dataSourcesUsed={lastAssistantMessage?.dataSourcesUsed}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* ─── AI Config & Grounding Transparency Modal ──────────────────────────── */}
      {showConfigModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
          onClick={() => setShowConfigModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1E3A4C', margin: 0 }}>
                🛡️ AI Security &amp; Grounding Architecture
              </h3>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <strong style={{ color: '#1E3A4C' }}>Zero Frontend Credentials:</strong>
                <div>No API provider keys are stored in client code, localStorage, or browser variables. All analysis runs server-side behind ExpireGuard's authenticated endpoints.</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <strong style={{ color: '#1E3A4C' }}>Deterministic Tool Grounding:</strong>
                <div>Numbers (quantities, values, expiry dates, sales totals) come strictly from parameterised database tool queries (`get_current_stock`, `get_expiry_risks`). The model never guesses figures.</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <strong style={{ color: '#1E3A4C' }}>Cold-Start Protection:</strong>
                <div>Products with &lt;12 months history in this pharmacy are flagged with "Low" confidence and transparently labeled as general Ghana regional assumptions.</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <strong style={{ color: '#1E3A4C' }}>Role-Based Access:</strong>
                <div>Admin-only endpoints. Dispenser accounts cannot view procurement costs, supplier lists, or valuation data.</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              style={{
                marginTop: '1.25rem',
                width: '100%',
                background: '#3B3593',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.65rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
