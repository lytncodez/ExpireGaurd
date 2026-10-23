import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock3, CreditCard, FileCheck2, ShieldCheck } from 'lucide-react';
import {
  findApplication,
  type ApplicationStatus as Status,
  type CompanyApplication,
} from '../api/registrationService';
import {
  configuredRegistrationFeeGhs,
  openPaymentStep,
  submitManualPaymentReference,
} from '../api/paymentAdapter';
import { legalConfiguration } from '../api/legalConfig';
import AuthPhotoPanel from '../components/AuthPhotoPanel';
import '../styles/registration.css';

const STATUS_LABELS: Record<Status, string> = {
  application_submitted: 'Application Submitted',
  awaiting_payment: 'Awaiting Payment',
  payment_under_verification: 'Payment Under Verification',
  pending_company_approval: 'Pending Company Approval',
  approved_active: 'Approved / Active',
  rejected_suspended: 'Rejected / Suspended',
};

const STATUS_STEPS: Status[] = [
  'application_submitted',
  'awaiting_payment',
  'payment_under_verification',
  'pending_company_approval',
  'approved_active',
];

const STATUS_DESCRIPTIONS: Record<Status, string> = {
  application_submitted: 'Your application is recorded. Continue to the registration payment step when ready.',
  awaiting_payment: 'A registration payment is required before verification can begin.',
  payment_under_verification: 'Your payment reference was received for manual verification. No payment has been confirmed.',
  pending_company_approval: 'Payment was marked verified in the development review prototype. A platform reviewer must decide your application.',
  approved_active: 'This demo application has been marked approved by the development review prototype.',
  rejected_suspended: 'A reviewer has rejected or suspended this application. Contact platform support for details.',
};

function RegistrationStatusPanel({ application }: { application: CompanyApplication }) {
  const [paymentReference, setPaymentReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(application);
  const configuredFee = configuredRegistrationFeeGhs();
  const hasConfiguredFee = configuredFee !== null;
  const currentStepIndex = STATUS_STEPS.indexOf(current.status);

  const proceedToPayment = async () => {
    setBusy(true);
    setError('');
    try {
      setCurrent(await openPaymentStep(current.reference));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the application. Please retry.');
    } finally {
      setBusy(false);
    }
  };

  const submitReference = async (event: FormEvent) => {
    event.preventDefault();
    if (!paymentReference.trim()) {
      setError('Enter the payment reference shown by your payment provider.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      setCurrent(await submitManualPaymentReference(current.reference, paymentReference));
      setPaymentReference('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit the reference. Please retry.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="registration-status-card" aria-labelledby="application-summary">
      <div className="registration-status-heading">
        <div>
          <p className="registration-eyebrow">Application reference</p>
          <h2 id="application-summary">{current.reference}</h2>
        </div>
        <span className={`registration-status-pill status-${current.status}`}>
          {STATUS_LABELS[current.status]}
        </span>
      </div>
      <p className="registration-status-description">{STATUS_DESCRIPTIONS[current.status]}</p>

      {current.status !== 'rejected_suspended' && (
        <ol className="registration-progress" aria-label="Application progress">
          {STATUS_STEPS.map((step, index) => {
            const complete = currentStepIndex >= index;
            return (
              <li key={step} className={complete ? 'is-complete' : ''}>
                <span className="registration-progress-icon" aria-hidden="true">
                  {complete ? <CheckCircle2 size={19} /> : <span>{index + 1}</span>}
                </span>
                <span>{STATUS_LABELS[step]}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="registration-next-steps">
        <h3>Next steps</h3>
        <p>
          {current.companyName} · {current.companyEmail}
        </p>
        {current.status === 'application_submitted' && (
          <button type="button" className="registration-button" onClick={proceedToPayment} disabled={busy}>
            {busy ? 'Opening payment step…' : 'Continue to payment'}
          </button>
        )}
        {current.status === 'awaiting_payment' && (
          <div className="registration-payment-box">
            <div className="registration-payment-amount">
              <CreditCard size={20} aria-hidden="true" />
              <div>
                <strong>{configuredFee !== null ? `GH₵ ${configuredFee.toFixed(2)}` : 'Registration fee not configured'}</strong>
                <span>{hasConfiguredFee ? 'Configured application fee' : 'No confirmed amount is available yet.'}</span>
              </div>
            </div>
            <p>
              Payment provider integration is not connected. Do not send money using this demo. A real payment
              reference can only be recorded after a backend and Ghana-supported provider are configured.
            </p>
            <form onSubmit={submitReference} className="registration-reference-form">
              <label htmlFor="payment-reference">Payment reference for manual verification</label>
              <input
                id="payment-reference"
                value={paymentReference}
                onChange={event => setPaymentReference(event.target.value)}
                autoComplete="off"
                placeholder="Enter a reference only after making a real payment"
                disabled={busy}
              />
              <button
                type="submit"
                className="registration-button registration-button--secondary"
                disabled={busy || !hasConfiguredFee}
              >
                {busy ? 'Submitting…' : 'Submit reference for verification'}
              </button>
            </form>
          </div>
        )}
        {current.status === 'payment_under_verification' && (
          <p className="registration-notice">
            Reference {current.paymentReference || 'recorded'} is awaiting a platform reviewer. No receipt has been issued.
          </p>
        )}
        {current.status === 'pending_company_approval' && (
          <p className="registration-notice">Your application is waiting for a separate platform administrator review.</p>
        )}
        {current.status === 'approved_active' && (
          <p className="registration-notice">
            Portal access requires company approval and account activation from the production backend. This prototype
            status does not create login credentials.
          </p>
        )}
        {current.status === 'rejected_suspended' && current.decisionNote && (
          <p className="registration-notice">Reviewer note: {current.decisionNote}</p>
        )}
        {error && <p className="registration-error" role="alert">{error}</p>}
      </div>
      <p className="registration-demo-note">
        Development prototype only. Application and payment state are stored in this browser and are not an official submission.
      </p>
    </section>
  );
}

export default function ApplicationStatus() {
  const [searchParams] = useSearchParams();
  const [reference, setReference] = useState(searchParams.get('reference') ?? '');
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [application, setApplication] = useState<CompanyApplication | null>(null);
  const [notRegistered, setNotRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const initialReference = searchParams.get('reference');
    const initialEmail = searchParams.get('email');
    if (initialReference && initialEmail) {
      void lookup(initialReference, initialEmail);
    }
  // Search params are the intentional initial lookup; further lookups use the form.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lookup = async (referenceValue: string, emailValue: string) => {
    setBusy(true);
    setError('');
    setApplication(null);
    setNotRegistered(false);
    try {
      const found = await findApplication(referenceValue, emailValue);
      if (!found) {
        setNotRegistered(true);
        setError('No application matched that reference and email. Check both values and try again.');
        return;
      }
      setApplication(found);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Status lookup failed. Please retry.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!reference.trim() || !email.trim()) {
      setError('Enter your application reference and the company or administrator email used to apply.');
      return;
    }
    void lookup(reference, email);
  };

  return (
    <div className="auth-split-wrapper registration-page">
      <AuthPhotoPanel
        headline={<>Your application,<br />clearly tracked.</>}
        subheading="Check your company registration progress and see the next step."
      />
      <main className="auth-form-side">
        <div className="auth-form-card registration-card">
          <Link to="/" className="auth-mobile-brand">
            <div className="sky-brand-icon"><ShieldCheck size={20} aria-hidden="true" /></div>
            <span className="sky-brand-name">ExpiryGuard</span>
          </Link>
          <header className="auth-form-header">
            <h1 className="auth-form-title">Application status</h1>
            <p className="auth-form-sub">Use your application reference and registered email.</p>
          </header>

          {application ? (
            <RegistrationStatusPanel application={application} />
          ) : (
            <form onSubmit={handleSubmit} className="registration-form" noValidate>
              <label className="auth-label" htmlFor="application-reference">Application reference</label>
              <input id="application-reference" className="auth-input" value={reference} onChange={event => setReference(event.target.value)} placeholder="EG-2026-XXXXXXXX" autoComplete="off" />
              <label className="auth-label" htmlFor="application-email">Company or administrator email</label>
              <input id="application-email" className="auth-input" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" />
              {error && <p className="registration-error" role="alert"><AlertCircle size={16} />{error}</p>}
              <button className="auth-submit-btn" type="submit" disabled={busy}>{busy ? 'Checking status…' : 'Check application status'}</button>
            </form>
          )}
          {notRegistered && (
            <section className="registration-not-registered" role="status">
              <span className="registration-status-pill">Not Registered</span>
              <p>No application was found for the supplied reference and email. You can start a new company application after approved legal documents are configured.</p>
            </section>
          )}
          {!legalConfiguration.approved && (
            <p className="registration-notice">
              <FileCheck2 size={17} aria-hidden="true" /> Registration is unavailable until approved Terms of Service and
              Privacy Notice are configured.
            </p>
          )}
          <p className="registration-link-row"><Link to="/signup">Start a new company application</Link></p>
          <p className="registration-link-row"><Link to="/signin">Return to sign in</Link></p>
          {import.meta.env.DEV && <p className="registration-link-row"><Link to="/platform-review">Open development review prototype</Link></p>}
          <p className="registration-subtle"><Clock3 size={15} aria-hidden="true" /> Statuses update when reviewers record a decision.</p>
        </div>
      </main>
    </div>
  );
}
