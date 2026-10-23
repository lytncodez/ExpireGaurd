import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck } from 'lucide-react';
import {
  listApplications,
  reviewApplication,
  type ApplicationStatus,
  type CompanyApplication,
} from '../api/registrationService';
import '../styles/registration.css';

const LABELS: Record<ApplicationStatus, string> = {
  application_submitted: 'Application Submitted',
  awaiting_payment: 'Awaiting Payment',
  payment_under_verification: 'Payment Under Verification',
  pending_company_approval: 'Pending Company Approval',
  approved_active: 'Approved / Active',
  rejected_suspended: 'Rejected / Suspended',
};

export default function PlatformReview() {
  const [applications, setApplications] = useState<CompanyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyReference, setBusyReference] = useState('');
  const [rejectingReference, setRejectingReference] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [error, setError] = useState('');

  const refresh = async () => {
    try {
      setApplications(await listApplications());
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Application list could not be loaded.');
    }
  };

  useEffect(() => {
    let active = true;
    void listApplications()
      .then(result => {
        if (active) setApplications(result);
      })
      .catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : 'Application list could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const decide = async (application: CompanyApplication, status: ApplicationStatus) => {
    if (status === 'rejected_suspended' && !decisionNote.trim()) {
      setError('A decision reason is required to reject or suspend an application.');
      return;
    }
    setBusyReference(application.reference);
    setError('');
    try {
      await reviewApplication(application.reference, status, decisionNote);
      setRejectingReference('');
      setDecisionNote('');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the review decision.');
    } finally {
      setBusyReference('');
    }
  };

  return (
    <main className="company-portal-page platform-review-page">
      <header className="company-portal-heading">
        <div>
          <p className="registration-eyebrow">Separate internal module · development only</p>
          <h1>Platform application review</h1>
          <p>Review company applications and record payment and approval decisions.</p>
        </div>
        <span className="registration-status-pill status-awaiting_payment"><AlertTriangle size={15} /> Prototype only</span>
      </header>
      <div className="registration-warning" role="note">
        <AlertTriangle size={20} aria-hidden="true" />
        <p>This reviewer screen has no platform-admin authentication or audit backend. It is disabled in production and must not be used for real approvals.</p>
      </div>
      {error && <p className="registration-error" role="alert">{error}</p>}
      {loading ? (
        <section className="registration-status-card registration-empty">Loading applications…</section>
      ) : applications.length === 0 ? (
        <section className="registration-status-card registration-empty"><ClipboardCheck size={20} /> No company applications to review.</section>
      ) : applications.map(application => (
        <article className="registration-status-card platform-application" key={application.reference}>
          <div className="registration-status-heading">
            <div>
              <p className="registration-eyebrow">{application.reference} · {application.companyType}</p>
              <h2>{application.companyName}</h2>
              <p>{application.companyEmail} · {application.administratorName} · {application.administratorEmail}</p>
            </div>
            <span className={`registration-status-pill status-${application.status}`}>{LABELS[application.status]}</span>
          </div>
          <dl className="company-profile-list">
            <div><dt>Submitted</dt><dd>{new Date(application.submittedAt).toLocaleString()}</dd></div>
            <div><dt>Mobile</dt><dd>{application.mobile}</dd></div>
            <div><dt>Address</dt><dd>{application.address}</dd></div>
            <div><dt>Terms / privacy</dt><dd>{application.legalConsent.termsVersion} / {application.legalConsent.privacyVersion}</dd></div>
            {application.paymentReference && <div><dt>Payment reference</dt><dd>{application.paymentReference} · unverified</dd></div>}
          </dl>
          <div className="platform-review-actions">
            {application.status === 'application_submitted' && (
              <button className="registration-button" disabled={busyReference === application.reference} onClick={() => void decide(application, 'awaiting_payment')}>Request payment</button>
            )}
            {application.status === 'payment_under_verification' && (
              <button className="registration-button" disabled={busyReference === application.reference} onClick={() => void decide(application, 'pending_company_approval')}>Record payment verified</button>
            )}
            {application.status === 'pending_company_approval' && (
              <button className="registration-button" disabled={busyReference === application.reference} onClick={() => void decide(application, 'approved_active')}><CheckCircle2 size={16} /> Approve company</button>
            )}
            {application.status !== 'approved_active' && application.status !== 'rejected_suspended' && (
              rejectingReference === application.reference ? (
                <div className="platform-rejection-form">
                  <label htmlFor={`decision-note-${application.reference}`}>Decision reason</label>
                  <textarea
                    id={`decision-note-${application.reference}`}
                    className="auth-input registration-textarea"
                    value={decisionNote}
                    onChange={event => setDecisionNote(event.target.value)}
                    rows={2}
                    required
                  />
                  <button className="registration-button registration-button--danger" disabled={busyReference === application.reference} onClick={() => void decide(application, 'rejected_suspended')}>Confirm rejection / suspension</button>
                  <button className="registration-button registration-button--secondary" type="button" onClick={() => { setRejectingReference(''); setDecisionNote(''); }}>Cancel</button>
                </div>
              ) : (
                <button className="registration-button registration-button--danger" disabled={busyReference === application.reference} onClick={() => { setRejectingReference(application.reference); setDecisionNote(''); }}>Reject / suspend</button>
              )
            )}
          </div>
        </article>
      ))}
    </main>
  );
}
