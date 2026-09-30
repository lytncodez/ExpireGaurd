import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/landing.css';

const navItems = ['How It Works', 'Features', 'Pricing', 'About'];

const trustPoints = ['Real-time Alerts', 'FEFO-Smart', 'Instant Setup'];

const coreFeatures = [
  { icon: 'inventory', label: 'Inventory Recording', tone: 'navy' },
  { icon: 'risk', label: 'Expiry Risk Scoring', tone: 'indigo' },
  { icon: 'fefo', label: 'FEFO Recommendations', tone: 'teal' },
  { icon: 'scan', label: 'QR / Barcode Scan', tone: 'softblue' },
  { icon: 'csv', label: 'CSV Import', tone: 'plum' },
  { icon: 'alerts', label: 'Real-Time Alerts', tone: 'sky' },
];

const appPreviewCards = [
  { title: 'Dashboard', accent: 'Navy', variant: 'dashboard' },
  { title: 'Alerts', accent: 'Indigo', variant: 'alerts' },
  { title: 'Inventory', accent: 'Soft Blue', variant: 'inventory' },
  { title: 'Reports', accent: 'Navy', variant: 'reports' },
];

const heroSlides = [
  {
    image:
      'https://images.pexels.com/photos/8657368/pexels-photo-8657368.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'Pharmacist assisting a customer in a pharmacy with medicine shelves',
  },
  {
    image:
      'https://images.pexels.com/photos/14797855/pexels-photo-14797855.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'Pharmacist beside medicine shelves in a pharmacy',
  },
  {
    image:
      'https://images.pexels.com/photos/8657287/pexels-photo-8657287.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'Pharmacy staff working together at a medicine counter',
  },
  {
    image:
      'https://images.pexels.com/photos/9629685/pexels-photo-9629685.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'Pharmacist organizing medications in front of a pharmacy cabinet',
  },
];

const whyPoints = [
  'Reduce expiry losses before they hit your margins',
  'FEFO logic built in to prioritize older batches first',
  'Configurable alerts that fit your pharmacy workflow',
  'Designed for pharmacy teams, dispensaries, and admins',
];

const storyCards = [
  {
    category: 'Case Study',
    date: 'Sep 18, 2026',
    title: 'How a community pharmacy cut expiry write-offs by 78% in 90 days.',
    image: '/story-1.jpg',
  },
  {
    category: 'Operations',
    date: 'Aug 24, 2026',
    title: 'Why FEFO matters more than FIFO for medicine stock rotation.',
    image: '/story-2.jpg',
  },
  {
    category: 'Compliance',
    date: 'Jul 30, 2026',
    title: 'How to stay audit-ready without adding admin pressure to your team.',
    image: '/carousel-1.jpg',
  },
];

const impactStats = [
  { value: '1,200+', label: 'Pharmacies onboarded', icon: 'pharmacy' },
  { value: 'GH₵2.4M', label: 'Stock value protected', icon: 'shield' },
  { value: '48K', label: 'Alerts sent', icon: 'bell' },
  { value: '31%', label: 'Avg. waste reduction', icon: 'trend' },
];

const testimonials = [
  {
    name: 'Akwasi Mensah',
    role: 'Pharmacy Manager',
    quote: 'We used to discover expired products too late. ExpiryGuard gives us visibility before waste starts.',
    image:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Efua Osei',
    role: 'Dispensary Lead',
    quote: 'The FEFO recommendations are simple, clear, and practical for the front desk. It changed our workflow instantly.',
    image:
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Kofi Boateng',
    role: 'Operations Admin',
    quote: 'We can see risk across multiple sites and act earlier. It feels built for real pharmacy operations.',
    image:
      'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=400&q=80',
  },
];

const featureIcons: Record<string, ReactNode> = {
  inventory: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" /><path d="M8 5v14" /><path d="M16 5v14" /><path d="M3 10h18" /></svg>
  ),
  risk: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 3 7v6c0 4.5 3.1 8.7 9 11 5.9-2.3 9-6.5 9-11V7l-9-4Z" /><path d="M12 7v6" /><path d="M12 17h.01" /></svg>
  ),
  fefo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16" /><path d="M7 12h10" /><path d="M9 17h6" /><path d="M12 3v18" /></svg>
  ),
  scan: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M21 7V5a2 2 0 0 0-2-2h-2" /><path d="M3 17v2a2 2 0 0 0 2 2h2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 12h10" /><path d="M12 7v10" /></svg>
  ),
  csv: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3h7v7" /><path d="M10 14 21 3" /><path d="M21 21H3V3h7" /><path d="M7 7h.01" /><path d="M7 11h.01" /><path d="M7 15h.01" /></svg>
  ),
  alerts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a6 6 0 0 1 6 6v4l2 4H4l2-4V8a6 6 0 0 1 6-6Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
  ),
};

const statIcons: Record<string, ReactNode> = {
  pharmacy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14" /><path d="M7 21v-6h10v6" /><path d="M9 3v5" /><path d="M15 3v5" /><path d="M6 11h12" /></svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 6v6c0 4.4 2.8 8.5 7 10 4.2-1.5 7-5.6 7-10V6l-7-3Z" /><path d="m9.5 12 1.6 1.6 3.4-4.1" /></svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 17h5l-1.5-1.5A2.8 2.8 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .7-.3 1.4-.8 1.9L4 17h5" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
  ),
  trend: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17 9 11l4 4 8-9" /><path d="M14 6h7v7" /></svg>
  ),
};

export default function Landing() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="sky-landing">
      <header className="sky-nav-wrap">
        <div className="sky-container">
          <nav className="sky-nav">
            <Link to="/" className="sky-brand" aria-label="ExpiryGuard home">
              <div className="sky-brand-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="sky-brand-name">ExpiryGuard</span>
            </Link>

            <div className="sky-nav-links">
              {navItems.map((item) => (
                <a key={item} href={item === 'How It Works' ? '#how-it-works' : item === 'Features' ? '#features' : item === 'Pricing' ? '#pricing' : '#about'} className="sky-nav-link">
                  {item}
                </a>
              ))}
            </div>

            <div className="sky-nav-actions">
              <button type="button" className="sky-search-btn" aria-label="Search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="6" /><path d="m16 16 5 5" /></svg>
              </button>
              <Link to="/signin" className="sky-btn-ghost">Log In</Link>
              <Link to="/signup" className="sky-btn-primary">Get Started</Link>
            </div>
          </nav>
        </div>
      </header>

      <section className="sky-hero-section" aria-label="ExpiryGuard hero slideshow">
        <div className="sky-hero-carousel">
          {heroSlides.map((slide, index) => (
            <div
              key={slide.alt}
              className={`sky-hero-slide ${index === activeSlide ? 'is-active' : ''}`}
              style={{ backgroundImage: `url(${slide.image})` }}
              aria-hidden={index !== activeSlide}
            />
          ))}

          <div className="sky-hero-overlay" />

          <div className="sky-container sky-hero-inner">
            <div className="sky-hero-content">
              <div className="sky-hero-kicker">— PHARMACY INVENTORY INTELLIGENCE</div>

              <h1 className="sky-hero-headline">
                Stay Ahead of <span className="sky-hero-highlight">Every Expiry</span>
              </h1>

              <p className="sky-hero-sub">
                Protect margins, reduce waste, and keep every medicine batch moving on time with real-time expiry tracking built for pharmacy teams.
              </p>

              <div className="sky-trust-list sky-hero-trust-list">
                {trustPoints.map((item) => (
                  <span key={item} className="sky-trust-pill">{item}</span>
                ))}
              </div>

              <div className="sky-hero-actions">
                <Link to="/signup" className="sky-btn-primary sky-hero-btn-lg">Get Started</Link>
                <a href="#how-it-works" className="sky-btn-ghost sky-hero-btn-lg">See How It Works</a>
              </div>
            </div>
          </div>

          <div className="sky-hero-dots" aria-label="Hero slide navigation">
            {heroSlides.map((slide, index) => (
              <button
                key={slide.alt}
                type="button"
                className={`sky-hero-dot ${index === activeSlide ? 'is-active' : ''}`}
                onClick={() => setActiveSlide(index)}
                aria-label={`Show slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="sky-process-section" id="how-it-works">
        <div className="sky-container">
          <div className="sky-hiw-header">
            <span className="sky-section-kicker">How it works</span>
            <h2 className="sky-hiw-title">Built for fast, safer pharmacy operations</h2>
          </div>

          <div className="sky-process-grid">
            <div className="sky-process-card">
              <div className="sky-process-num"><span>01</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /><path d="M12 5v14" /></svg></div>
              <h3 className="sky-process-title">Record stock</h3>
              <p className="sky-process-desc">Capture batch, quantity, supplier, and expiry details from the moment products arrive.</p>
            </div>

            <div className="sky-process-card">
              <div className="sky-process-num"><span>02</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 18h18" /><path d="M7 14l3-4 3 2 4-7" /></svg></div>
              <h3 className="sky-process-title">Score risk</h3>
              <p className="sky-process-desc">Calculate remaining shelf life and highlight which batches need immediate attention.</p>
            </div>

            <div className="sky-process-card">
              <div className="sky-process-num"><span>03</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg></div>
              <h3 className="sky-process-title">Alert teams</h3>
              <p className="sky-process-desc">Send timely alerts before write-offs happen, with the right urgency for each product.</p>
            </div>

            <div className="sky-process-card">
              <div className="sky-process-num"><span>04</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 2" /></svg></div>
              <h3 className="sky-process-title">Take action</h3>
              <p className="sky-process-desc">Prioritize FEFO rotation, accelerate dispensing, and reduce unnecessary losses.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sky-feature-section" id="features">
        <div className="sky-container">
          <div className="sky-section-header">
            <span className="sky-section-kicker">Core features</span>
            <h2>Everything your pharmacy needs to stay ahead</h2>
          </div>

          <div className="sky-feature-grid">
            {coreFeatures.map((feature) => (
              <div key={feature.label} className="sky-feature-card">
                <div className={`sky-feature-icon sky-feature-icon--${feature.tone}`}>
                  {featureIcons[feature.icon as keyof typeof featureIcons]}
                </div>
                <span>{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sky-preview-section" id="pricing">
        <div className="sky-container">
          <div className="sky-section-header">
            <span className="sky-section-kicker">Product preview</span>
            <h2>See the workflow in action</h2>
          </div>

          <div className="sky-preview-grid">
            {appPreviewCards.map((card) => (
              <div key={card.title} className={`sky-preview-card sky-preview-card--${card.variant}`}>
                <div className="sky-preview-window">
                  <div className="sky-window-bar">
                    <span className="dot red" />
                    <span className="dot amber" />
                    <span className="dot green" />
                  </div>

                  <div className="sky-preview-screen">
                    <div className="preview-top-row">
                      <span className="preview-pill">{card.title}</span>
                    </div>

                    {card.variant === 'dashboard' && (
                      <>
                        <div className="preview-metrics">
                          <div className="preview-metric">
                            <span>Items</span>
                            <strong>1,284</strong>
                          </div>
                          <div className="preview-metric">
                            <span>Urgent</span>
                            <strong>42</strong>
                          </div>
                        </div>
                        <div className="preview-chart">
                          <span className="chart-bar chart-bar-1" />
                          <span className="chart-bar chart-bar-2" />
                          <span className="chart-bar chart-bar-3" />
                          <span className="chart-bar chart-bar-4" />
                          <span className="chart-bar chart-bar-5" />
                        </div>
                      </>
                    )}

                    {card.variant === 'alerts' && (
                      <>
                        <div className="preview-alert-list">
                          <div className="preview-alert preview-alert--danger">
                            <span className="alert-dot" />
                            <div>
                              <strong>Critical</strong>
                              <small>9 batches expiring in 14 days</small>
                            </div>
                          </div>
                          <div className="preview-alert preview-alert--warn">
                            <span className="alert-dot" />
                            <div>
                              <strong>Watch</strong>
                              <small>18 items nearing expiry</small>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {card.variant === 'inventory' && (
                      <>
                        <div className="preview-table">
                          <div className="table-row table-row--head">
                            <span>Batch</span>
                            <span>Qty</span>
                            <span>EXP</span>
                          </div>
                          <div className="table-row">
                            <span>AX-440</span>
                            <span>42</span>
                            <span>22 Oct</span>
                          </div>
                          <div className="table-row">
                            <span>GH-327</span>
                            <span>18</span>
                            <span>05 Nov</span>
                          </div>
                          <div className="table-row">
                            <span>FR-981</span>
                            <span>30</span>
                            <span>12 Dec</span>
                          </div>
                        </div>
                      </>
                    )}

                    {card.variant === 'reports' && (
                      <>
                        <div className="preview-report-stack">
                          <div className="report-card">
                            <span>Stock value</span>
                            <strong>GH₵ 146,200</strong>
                          </div>
                          <div className="report-mini-segment">
                            <span className="mini-line mini-line-1" />
                            <span className="mini-line mini-line-2" />
                            <span className="mini-line mini-line-3" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="sky-preview-meta">
                  <h3>{card.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sky-why-section" id="about">
        <div className="sky-container">
          <div className="sky-why-grid">
            <div className="sky-why-visual">
              <img src="/split-feature.jpg" alt="Pharmacy team organizing medicine stock" />
            </div>

            <div className="sky-why-copy">
              <span className="sky-section-kicker">Why choose ExpiryGuard</span>
              <h2>Modern expiry control for busy pharmacy teams</h2>
              <ul>
                {whyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="sky-mid-banner-section">
        <div className="sky-container">
          <div className="sky-mid-banner">
            <div>
              <span className="sky-section-kicker sky-mid-banner-kicker">Start today</span>
              <h2>Start protecting your pharmacy's margins today</h2>
            </div>
            <p>Reduce expiry losses and keep your shelves ready for faster, safer dispensing.</p>
            <Link to="/signup" className="sky-btn-primary sky-mid-banner-btn">Book a Demo</Link>
          </div>
        </div>
      </section>

      <section className="sky-mobile-section">
        <div className="sky-container">
          <div className="sky-mobile-strip">
            <div className="sky-mobile-mockup">
              <div className="mock-phone">
                <div className="mock-notch" />
                <img src="/carousel-2.jpg" alt="Mobile dashboard preview" />
              </div>
            </div>

            <div className="sky-mobile-copy">
              <span className="sky-section-kicker">Also on your phone</span>
              <h2>Works on any device, no install needed.</h2>
              <p>Access your expiry dashboard, stock alerts, and FEFO priorities anywhere your team is working.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sky-stories-section" id="insights">
        <div className="sky-container">
          <div className="sky-stories-header">
            <div>
              <span className="sky-section-kicker">Insights & articles</span>
              <h2 className="sky-stories-title">Practical guidance for healthier inventory</h2>
            </div>
            <Link to="/signup" className="sky-btn-ghost">View all</Link>
          </div>

          <div className="sky-stories-grid">
            {storyCards.map((story) => (
              <article key={story.title} className="sky-story-card">
                <div className="sky-story-photo-box">
                  <img src={story.image} alt={story.title} className="sky-story-photo" />
                </div>
                <div className="sky-story-body">
                  <div className="sky-story-meta">
                    <span className="sky-story-cat">{story.category}</span>
                    <span className="sky-story-date">{story.date}</span>
                  </div>
                  <h4 className="sky-story-heading">{story.title}</h4>
                  <Link to="/signup" className="sky-story-link">Read more →</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sky-impact-section">
        <div className="sky-container">
          <div className="sky-impact-bar">
            {impactStats.map((stat) => (
              <div key={stat.label} className="sky-impact-item">
                <span className="sky-impact-icon">{statIcons[stat.icon as keyof typeof statIcons]}</span>
                <div>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sky-testimonials-section">
        <div className="sky-container">
          <div className="sky-section-header">
            <span className="sky-section-kicker">Testimonials</span>
            <h2>Trusted by teams protecting medicine value</h2>
          </div>

          <div className="sky-testimonial-grid">
            {testimonials.map((person) => (
              <article key={person.name} className="sky-testimonial-card">
                <div className="sky-testimonial-head">
                  <img src={person.image} alt={person.name} />
                  <div>
                    <h3>{person.name}</h3>
                    <p>{person.role}</p>
                  </div>
                </div>
                <div className="sky-stars">★★★★★</div>
                <p className="sky-quote">“{person.quote}”</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sky-banner-section">
        <div className="sky-container">
          <div className="sky-banner-card">
            <div className="sky-banner-content">
              <h2 className="sky-banner-headline">Book a free demo for your pharmacy</h2>
              <p className="sky-banner-sub">See how ExpiryGuard fits your inventory workflow, alerts, and compliance goals.</p>
              <Link to="/signup" className="sky-banner-btn">Start Free Trial</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="sky-footer">
        <div className="sky-container">
          <div className="sky-footer-top">
            <div>
              <div className="sky-brand">
                <div className="sky-brand-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                </div>
                <span className="sky-brand-name" style={{ color: '#FFFFFF' }}>ExpiryGuard</span>
              </div>
              <p className="sky-footer-brand-text">Expiry forecasting, FEFO prioritization, and pharmacy stock protection built for modern dispensaries.</p>
            </div>

            <div className="sky-footer-col">
              <h5>Company</h5>
              <ul>
                <li><a href="#about">About</a></li>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
              </ul>
            </div>

            <div className="sky-footer-col">
              <h5>Resources</h5>
              <ul>
                <li><a href="#insights">Insights</a></li>
                <li><a href="#how-it-works">How it works</a></li>
                <li><a href="#pricing">Demo</a></li>
              </ul>
            </div>

            <div className="sky-footer-col">
              <h5>Contact</h5>
              <ul>
                <li><a href="mailto:hello@expireguard.com">hello@expireguard.com</a></li>
                <li><a href="tel:+233200000000">+233 20 000 0000</a></li>
                <li><a href="#">Accra, Ghana</a></li>
              </ul>
            </div>

            <div className="sky-footer-col sky-footer-newsletter-col">
              <h5>Newsletter</h5>
              <div className="sky-newsletter-form">
                <input type="email" placeholder="Your email" aria-label="Email address" />
                <button type="button">Subscribe</button>
              </div>
              <div className="sky-socials" aria-label="Social media links">
                <a href="#" aria-label="LinkedIn" title="LinkedIn">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 8.5A1.56 1.56 0 1 1 6.9 5.38a1.56 1.56 0 0 1 .04 3.12ZM5.5 10.1h2.8v8.4H5.5zm4.6 0h2.7v1.15h.04c.38-.72 1.3-1.48 2.67-1.48 2.86 0 3.39 1.88 3.39 4.32v4.41h-2.8v-4.13c0-1-.03-2.29-1.4-2.29-1.4 0-1.62 1.09-1.62 2.22v4.2H10.1z" /></svg>
                </a>
                <a href="#" aria-label="X" title="X">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2h3.2l-7.02 8.02L22.7 22h-6.38l-4.98-7.26L6.7 22H3.48l7.52-8.6L1.3 2h6.53l4.5 6.7L18.9 2Zm-1.12 18h1.77L7.35 3.9H5.48L17.78 20Z" /></svg>
                </a>
                <a href="#" aria-label="Facebook" title="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V7.5c0-.9.3-1.5 1.6-1.5h1.7V2.8c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10.8H7.5V14h2.8v8h3.2Z" /></svg>
                </a>
              </div>
            </div>
          </div>

          <div className="sky-footer-bottom">
            <p>© 2026 ExpiryGuard. All rights reserved.</p>
            <div className="sky-footer-meta">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
