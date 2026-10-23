import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { acceptStaffInvitation } from '../api/registrationService';
import AuthPhotoPanel from '../components/AuthPhotoPanel';
import '../styles/registration.css';

export default function StaffInvitation() {
  const { inviteId = '' } = useParams();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const accept = async () => {
    setBusy(true);
    setError('');
    try {
      await acceptStaffInvitation(inviteId);
      setAccepted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The invitation could not be accepted.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-split-wrapper registration-page">
      <AuthPhotoPanel headline={<>Join your<br />ExpiryGuard team.</>} subheading="Use a company administrator invitation to request dispenser access." />
      <main className="auth-form-side">
        <section className="auth-form-card registration-card">
          <p className="registration-eyebrow">Dispenser invitation</p>
          <h1 className="auth-form-title">{accepted ? 'Invitation accepted' : 'Review your invitation'}</h1>
          <p className="auth-form-sub">
            {accepted
              ? 'The development demo recorded this invitation as used. No worker account was created.'
              : 'This one-time invitation prototype is stored in the inviting administrator’s browser.'}
          </p>
          {error && <p className="registration-error" role="alert">{error}</p>}
          {!accepted && <button className="auth-submit-btn" type="button" disabled={busy} onClick={accept}>{busy ? 'Accepting…' : 'Accept dispenser invitation'}</button>}
          <p className="registration-demo-note">Production requires a backend-generated, single-use, expiring invitation tied to the intended worker, authenticated identity, company, and permitted role.</p>
          <Link to="/signin" className="registration-button registration-button--secondary">{accepted ? 'Go to sign in' : 'Cancel'}</Link>
        </section>
      </main>
    </div>
  );
}
