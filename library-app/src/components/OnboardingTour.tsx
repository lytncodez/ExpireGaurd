import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../api/useAuth';
import { Button } from './ui/Button';

interface TourStep {
  selector: string;
  route: string;
  title: string;
  description: string;
}

interface TargetBox { x: number; y: number; width: number; height: number; }
interface TooltipBox { top: number; left: number; }

export default function OnboardingTour() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(0);
  const [active, setActive] = useState(false);
  const [targetBox, setTargetBox] = useState<TargetBox | null>(null);
  const [tooltipBox, setTooltipBox] = useState<TooltipBox>({ top: 16, left: 12 });
  const initializedUser = useRef<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === 'admin';

  const steps = useMemo<TourStep[]>(() => {
    const base: TourStep[] = [
      { selector: '[data-tour="global-search"]', route: '/dashboard', title: 'Search your stock', description: 'Find products and batches quickly. Voice search is available beside the search field.' },
      { selector: '[data-tour="dashboard-overview"]', route: '/dashboard', title: 'Your dashboard', description: 'Start here for an overview of inventory risk and the pharmacy’s current priorities.' },
      { selector: '[data-tour="product-spotlight"]', route: '/dashboard', title: 'Product spotlight', description: 'This rotates through stock needing attention. Open the arrow to see the selected batch.' },
      { selector: '[data-tour="decision-matrix"]', route: '/dashboard', title: 'Priority actions', description: 'Review batches that need attention and follow their recommended next steps.' },
      { selector: '[data-tour="nav-inventory"]', route: '/inventory', title: 'Inventory', description: 'Browse stock, compare batches, and use FEFO to choose the earliest-expiring batch first.' },
      { selector: '[data-tour="nav-alerts"]', route: '/alerts', title: 'Alerts', description: 'Review expiry warnings, acknowledge them, and record the action taken.' },
      { selector: '[data-tour="nav-add"]', route: '/add', title: 'Add or import stock', description: 'Scan a product, enter a batch manually, or import inventory from a file.' },
    ];
    if (isAdmin) base.push({ selector: '[data-tour="nav-reports"]', route: '/reports', title: 'Reports', description: 'Explore risk, suppliers, product movement, and stock value with drill-downs to each batch.' });
    return base;
  }, [isAdmin]);

  const storageKey = user?.id ? `expireguard_tour_v1_${user.id}` : '';

  const startTour = useCallback(() => {
    if (!user?.id) return;
    try { localStorage.removeItem(`expireguard_tour_v1_${user.id}`); } catch { /* Storage can be disabled by the browser. */ }
    initializedUser.current = user.id;
    setTargetBox(null);
    setStepIndex(0);
    setActive(true);
    if (location.pathname !== '/dashboard') navigate('/dashboard');
  }, [location.pathname, navigate, user]);

  useEffect(() => {
    if (!user?.id || initializedUser.current === user.id) return;
    initializedUser.current = user.id;
    let completed = false;
    try { completed = localStorage.getItem(`expireguard_tour_v1_${user.id}`) === 'done'; } catch { /* Continue without persistence. */ }
    if (completed) return;
    const timeout = window.setTimeout(() => {
      setStepIndex(0);
      setActive(true);
      if (location.pathname !== '/dashboard') navigate('/dashboard');
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [user, location.pathname, navigate]); // Start once for each authenticated user.

  useEffect(() => {
    const restart = () => startTour();
    window.addEventListener('expireguard:restart-tour', restart);
    return () => window.removeEventListener('expireguard:restart-tour', restart);
  }, [startTour]);

  const completeTour = useCallback(() => {
    if (storageKey) {
      try { localStorage.setItem(storageKey, 'done'); } catch { /* Tour remains dismissed for this session. */ }
    }
    setActive(false);
    setTargetBox(null);
  }, [storageKey]);

  useEffect(() => {
    if (!active) return;
    const step = steps[stepIndex];
    if (!step) return;
    if (location.pathname !== step.route) {
      navigate(step.route);
      return;
    }

    let attempts = 0;
    let frame = 0;
    let timer = 0;
    const place = () => {
      const target = Array.from(document.querySelectorAll<HTMLElement>(step.selector))
        .find(element => element.getClientRects().length > 0);
      if (!target) {
        if (attempts++ < 20) timer = window.setTimeout(place, 100);
        else if (stepIndex === steps.length - 1) completeTour();
        else setStepIndex(current => Math.min(steps.length - 1, current + 1));
        return;
      }

      const rect = target.getBoundingClientRect();
      const outsideViewport = rect.top < 8 || rect.bottom > window.innerHeight - 8;
      if (outsideViewport && attempts++ < 2) {
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
        timer = window.setTimeout(place, 300);
        return;
      }

      const padding = 7;
      const box = { x: Math.max(4, rect.left - padding), y: Math.max(4, rect.top - padding), width: Math.min(window.innerWidth - 8, rect.width + padding * 2), height: Math.min(window.innerHeight - 8, rect.height + padding * 2) };
      setTargetBox(box);
      const tooltipWidth = Math.min(380, window.innerWidth - 24);
      const left = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, rect.left + rect.width / 2 - tooltipWidth / 2));
      const estimatedHeight = tooltipRef.current?.offsetHeight ?? 190;
      const top = rect.bottom + estimatedHeight + 18 < window.innerHeight ? rect.bottom + 16 : Math.max(12, rect.top - estimatedHeight - 16);
      setTooltipBox({ top, left });
    };
    frame = window.requestAnimationFrame(place);
    const reposition = () => { attempts = 0; place(); };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [active, stepIndex, steps, location.pathname, navigate, completeTour]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') completeTour();
      if (event.key === 'ArrowRight') setStepIndex(current => Math.min(steps.length - 1, current + 1));
      if (event.key === 'ArrowLeft') setStepIndex(current => Math.max(0, current - 1));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, completeTour, steps.length]);

  if (!active || !targetBox) return null;
  const step = steps[stepIndex];
  const svgWidth = window.innerWidth;
  const svgHeight = window.innerHeight;
  const cutout = { x: targetBox.x, y: targetBox.y, width: targetBox.width, height: targetBox.height };

  return <div className="onboarding-tour" data-testid="onboarding-tour">
    <svg className="onboarding-tour-shade" width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} aria-hidden="true">
      <defs><mask id="tour-spotlight-mask"><rect width="100%" height="100%" fill="white" /><rect x={cutout.x} y={cutout.y} width={cutout.width} height={cutout.height} rx="14" fill="black" /></mask></defs>
      <rect width="100%" height="100%" fill="rgba(15, 23, 42, .62)" mask="url(#tour-spotlight-mask)" />
      <rect x={cutout.x} y={cutout.y} width={cutout.width} height={cutout.height} rx="14" fill="none" stroke="#818cf8" strokeWidth="2" />
    </svg>
    <section className="onboarding-tour-card" ref={tooltipRef} style={{ top: tooltipBox.top, left: tooltipBox.left }} role="dialog" aria-modal="false" aria-labelledby="onboarding-tour-title" aria-describedby="onboarding-tour-description">
      <div className="onboarding-tour-progress">{stepIndex + 1} of {steps.length}</div>
      <h2 id="onboarding-tour-title">{step.title}</h2>
      <p id="onboarding-tour-description">{step.description}</p>
      <footer>
        <Button type="button" variant="ghost" size="sm" onClick={completeTour}>Skip Tour</Button>
        <div className="onboarding-tour-controls">
          <Button type="button" variant="outline" size="sm" disabled={stepIndex === 0} onClick={() => setStepIndex(current => Math.max(0, current - 1))}>Back</Button>
          <Button type="button" size="sm" onClick={() => stepIndex === steps.length - 1 ? completeTour() : setStepIndex(current => current + 1)}>{stepIndex === steps.length - 1 ? 'Finish' : 'Next'}</Button>
        </div>
      </footer>
    </section>
  </div>;
}
