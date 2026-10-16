import React, { useEffect, useRef, useState } from 'react';

interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  dataSourcesUsed?: string[];
  disabled?: boolean;
}

export default function ChatInputBar({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  dataSourcesUsed = ['Stock Ledger', 'FEFO Engine', 'Sales History (30d)'],
  disabled = false,
}: ChatInputBarProps) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API if supported in browser
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setText(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser window. Please type your message.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition error:', err);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() || isStreaming || disabled) return;
    onSendMessage(text);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Auto-resize textarea
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        padding: '0.65rem 0.9rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
        {/* Voice Input Toggle Button */}
        <button
          type="button"
          onClick={toggleListening}
          title={isListening ? 'Stop voice recording' : 'Voice input'}
          style={{
            background: isListening ? '#EF4444' : '#F1F5F9',
            color: isListening ? '#FFFFFF' : '#64748B',
            border: 'none',
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
            animation: isListening ? 'pulse 1.5s infinite' : 'none',
          }}
        >
          {isListening ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          )}
        </button>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Listening to your voice...' : 'Ask about stock, expiry runout, seasonal buying plans...'}
          rows={1}
          disabled={disabled || isStreaming}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: '0.88rem',
            color: '#1E3A4C',
            lineHeight: 1.45,
            padding: '0.4rem 0.2rem',
            maxHeight: '140px',
            fontFamily: 'inherit',
          }}
        />

        {/* Streaming Stop Button or Send Button */}
        {isStreaming ? (
          <button
            type="button"
            onClick={onStopStreaming}
            style={{
              background: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.5rem 0.85rem',
              borderRadius: '10px',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#FFFFFF', borderRadius: '1px' }} />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim() || disabled}
            style={{
              background: text.trim() && !disabled ? '#3B3593' : '#E2E8F0',
              color: text.trim() && !disabled ? '#FFFFFF' : '#94A3B8',
              border: 'none',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: text.trim() && !disabled ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        )}
      </div>

      {/* Grounding & Data Used Indicator */}
      <div
        style={{
          marginTop: '0.5rem',
          paddingTop: '0.4rem',
          borderTop: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          fontSize: '0.7rem',
          color: '#64748B',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ color: '#10B981', fontWeight: 800 }}>● Grounded Data:</span>
          <span>{dataSourcesUsed.slice(0, 3).join(', ')}</span>
        </div>
        <div style={{ color: '#94A3B8', fontSize: '0.68rem' }}>
          Press <kbd style={{ background: '#F1F5F9', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid #E2E8F0' }}>Enter</kbd> to send
        </div>
      </div>
    </div>
  );
}
