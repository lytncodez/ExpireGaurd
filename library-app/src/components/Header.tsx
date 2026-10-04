import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useAuth } from '../api/useAuth';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export default function Header({ searchTerm, setSearchTerm }: HeaderProps) {
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);

  const toggleVoiceSearch = () => {
    type SpeechRecognitionLike = {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
      start: () => void;
      stop: () => void;
    };
    type SpeechWindow = Window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      activeSearchRecognition?: SpeechRecognitionLike;
    };
    const speechWindow = window as SpeechWindow;
    if (speechWindow.activeSearchRecognition && isListening) {
      speechWindow.activeSearchRecognition.stop();
      speechWindow.activeSearchRecognition = undefined;
      setIsListening(false);
      return;
    }
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      window.alert('Voice search is not supported by this browser. Try Chrome or Edge.');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'en-GH';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) setSearchTerm(transcript);
    };
    recognition.onend = () => {
      speechWindow.activeSearchRecognition = undefined;
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    speechWindow.activeSearchRecognition = recognition;
    setIsListening(true);
    recognition.start();
  };

  return (
    <header className="app-header">
      <div className="header-greeting">
        <h1>Welcome, {user?.name || 'Dr. Amina'} 👋</h1>
        <p>Real-time expiry risk tracking &amp; inventory intelligence.</p>
      </div>

      <div className="header-actions">
        <div className="search-bar-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <Input
            type="text"
            placeholder={user?.role === 'admin' ? 'Search products, batches, suppliers...' : 'Search products and batches...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`header-voice-search${isListening ? ' is-listening' : ''}`}
            aria-label={isListening ? 'Stop voice search' : 'Start voice search'}
            aria-pressed={isListening}
            title={isListening ? 'Listening… click to stop' : 'Search by voice'}
            onClick={toggleVoiceSearch}
          >
            {isListening ? <MicOff size={17} /> : <Mic size={17} />}
          </Button>
          {searchTerm && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="header-clear-search"
              aria-label="Clear search"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </Button>
          )}
        </div>

        <Link to="/alerts" className="icon-btn" title="View Expiry Alerts" style={{ position: 'relative', textDecoration: 'none' }}>
          <span className="notification-dot" />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
