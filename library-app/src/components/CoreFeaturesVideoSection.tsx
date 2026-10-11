import { type ReactNode, useEffect, useRef, useState, useCallback } from 'react';

export interface CoreFeatureItem {
  icon: string;
  label: string;
  tone: string;
  videoTime?: number;
}

interface CoreFeaturesVideoSectionProps {
  features: CoreFeatureItem[];
  featureIcons: Record<string, ReactNode>;
}

const chapters = [
  { label: '1. Barcode Intake', time: 0 },
  { label: '2. Risk Engine', time: 3 },
  { label: '3. FEFO Queue', time: 6 },
  { label: '4. Instant Alerts', time: 9 },
];

export default function CoreFeaturesVideoSection({
  features,
  featureIcons,
}: CoreFeaturesVideoSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(12);
  const [hasError, setHasError] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const [activeChapter, setActiveChapter] = useState(0);

  // Guarantee seamless automatic playback on mount
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      if (!prefersReducedMotion) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [prefersReducedMotion]);

  // Check reduced motion preference changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (mediaQuery.matches && videoRef.current) {
      videoRef.current.pause();
    }

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches && videoRef.current) {
        videoRef.current.pause();
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Time update listener
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Update active chapter (each chapter is ~3s)
    const chapIndex = Math.min(3, Math.floor(time / 3));
    setActiveChapter(chapIndex);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current && videoRef.current.duration) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const seekTo = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    videoRef.current.play().catch(() => {});
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      videoRef.current.requestFullscreen().catch(() => {});
    }
  }, []);

  // Map features to chapter seek times
  const getFeatureSeekTime = (icon: string) => {
    switch (icon) {
      case 'scan':
      case 'inventory':
        return 0;
      case 'risk':
      case 'csv':
        return 3;
      case 'fefo':
        return 6;
      case 'alerts':
        return 9;
      default:
        return 0;
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="sky-video-showcase-wrap">
      {/* SaaS Mockup Video Container */}
      <div className="sky-video-mockup-frame">
        {/* Browser / App Window Chrome Bar */}
        <div className="sky-video-window-bar">
          <div className="sky-video-dots">
            <span className="dot red" />
            <span className="dot amber" />
            <span className="dot green" />
          </div>
          <div className="sky-video-window-title">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="sky-video-title-icon"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>ExpiryGuard Intelligence — Live Workflow Demo</span>
          </div>
          <div className="sky-video-window-badge">
            <span className="sky-video-live-dot" />
            <span>Looping Explainer</span>
          </div>
        </div>

        {/* Video Area */}
        <div className="sky-video-player-container">
          {!hasError ? (
            <video
              ref={videoRef}
              src="/expiryguard-demo.webm"
              poster="/expiryguard-demo-poster.jpg"
              autoPlay
              loop
              muted={isMuted}
              playsInline
              preload="auto"
              className="sky-video-element"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onCanPlay={() => {
                if (videoRef.current && videoRef.current.paused && !prefersReducedMotion) {
                  videoRef.current.play().catch(() => {});
                }
              }}
              onError={() => setHasError(true)}
              aria-label="ExpiryGuard platform workflow demonstration video showing intake scanning, risk scoring, FEFO dispensing, and real-time alerts"
            >
              <track kind="captions" />
              <p>
                Your browser does not support HTML5 video. This demo highlights:
                1. Barcode scanning, 2. AI expiry risk calculation, 3. FEFO dispensing queue,
                and 4. Real-time alert notifications.
              </p>
            </video>
          ) : (
            <div className="sky-video-fallback">
              <img
                src="/expiryguard-demo-poster.jpg"
                alt="ExpiryGuard pharmacy workflow preview"
                className="sky-video-fallback-img"
              />
              <div className="sky-video-fallback-msg">
                <strong>Platform Workflow Preview</strong>
                <span>Intelligent expiry scoring, FEFO dispensing, and zero waste.</span>
              </div>
            </div>
          )}

          {/* Interactive Player Controls Bar */}
          <div className="sky-video-controls-overlay">
            {/* Progress Scrubber Bar */}
            <div
              className="sky-video-scrubber"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickPos = (e.clientX - rect.left) / rect.width;
                seekTo(clickPos * duration);
              }}
              role="slider"
              tabIndex={0}
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={currentTime}
              aria-label="Video scrubber"
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') seekTo(Math.min(duration, currentTime + 1));
                if (e.key === 'ArrowLeft') seekTo(Math.max(0, currentTime - 1));
              }}
            >
              <div
                className="sky-video-scrubber-filled"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Controls Row */}
            <div className="sky-video-controls-row">
              <div className="sky-video-controls-left">
                <button
                  type="button"
                  className="sky-video-ctrl-btn"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </button>

                {/* Workflow Chapter Pills */}
                <div className="sky-video-chapter-chips">
                  {chapters.map((chap, idx) => (
                    <button
                      key={chap.label}
                      type="button"
                      className={`sky-video-chapter-chip ${
                        activeChapter === idx ? 'is-active' : ''
                      }`}
                      onClick={() => seekTo(chap.time)}
                    >
                      {chap.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sky-video-controls-right">
                <span className="sky-video-time-text">
                  {Math.floor(currentTime)}s / {Math.floor(duration)}s
                </span>
                <button
                  type="button"
                  className="sky-video-ctrl-btn"
                  onClick={toggleFullscreen}
                  aria-label="Toggle full screen"
                  title="Fullscreen"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid (Interactive with Video Demo) */}
      <div className="sky-feature-grid sky-feature-grid--under-video">
        {features.map((feature) => {
          const seekSec = getFeatureSeekTime(feature.icon);
          const isCurrentActive =
            Math.min(3, Math.floor(seekSec / 3)) === activeChapter;

          return (
            <button
              key={feature.label}
              type="button"
              className={`sky-feature-card sky-feature-card--clickable ${
                isCurrentActive ? 'is-highlighted' : ''
              }`}
              onClick={() => seekTo(seekSec)}
              title={`Jump video to ${feature.label} demonstration`}
            >
              <div className={`sky-feature-icon sky-feature-icon--${feature.tone}`}>
                {featureIcons[feature.icon as keyof typeof featureIcons]}
              </div>
              <span className="sky-feature-label">{feature.label}</span>
              <span className="sky-feature-jump-indicator" aria-hidden="true">
                ▶ Jump
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
