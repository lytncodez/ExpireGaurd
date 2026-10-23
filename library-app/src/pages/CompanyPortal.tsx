import { useEffect, useState, type FormEvent } from 'react';
import { Bell, Building2, CheckCircle2, Mail, MessageSquare, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../api/useAuth';
import { useInventory } from '../api/useInventory';
import {
  inviteStaff,
  listStaffInvitations,
  type StaffInvitation,
} from '../api/registrationService';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  loadNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '../api/notificationAdapter';
import '../styles/registration.css';

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isMobile(value: string): boolean {
  const compact = value.trim().replace(/[\s()-]/g, '');
  const normalized = compact.startsWith('0') ? `+233${compact.slice(1)}` : compact.startsWith('233') ? `+${compact}` : compact;
  return /^\+[1-9]\d{7,14}$/.test(normalized);
}

export default function CompanyPortal() {
  const { user } = useAuth();
  const { items } = useInventory();
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [contact, setContact] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [initialPreferences] = useState(() => {
    try {
      return { value: loadNotificationPreferences(), error: '' };
    } catch (cause) {
      return {
        value: DEFAULT_NOTIFICATION_PREFERENCES,
        error: cause instanceof Error ? cause.message : 'Could not load notification settings.',
      };
    }
  });
  const [preferences, setPreferences] = useState<NotificationPreferences>(initialPreferences.value);
  const [savedMessage, setSavedMessage] = useState('');
  const [error, setError] = useState(initialPreferences.error);

  const refreshInvitations = async () => {
    try {
      setInvitations(await listStaffInvitations());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load staff invitations.');
    } finally {
      setInvitationsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void listStaffInvitations()
      .then(result => {
        if (active) setInvitations(result);
      })
      .catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load staff invitations.');
      })
      .finally(() => {
        if (active) setInvitationsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = contact.trim();
    if (!isEmail(normalized) && !isMobile(normalized)) {
      setError('Enter a valid email address or mobile number, including a country code where applicable.');
      return;
    }
    setError('');
    setSavedMessage('');
    setInviteLoading(true);
    try {
      await inviteStaff(normalized);
      setContact('');
      setSavedMessage('A development-only invitation record was created. No email or SMS was sent.');
      await refreshInvitations();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invitation could not be created.');
    } finally {
      setInviteLoading(false);
    }
  };

  const updatePreference = <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
    setPreferences(current => ({ ...current, [key]: value }));
    setSavedMessage('');
  };

  const recentActivity = items
    .flatMap(item => (item.activityLog ?? []).map(activity => ({
      ...activity,
      productName: item.productName || item.name,
    })))
    .sort((left, right) => right.at.localeCompare(left.at))
    .slice(0, 5);

  const handleSavePreferences = (event: FormEvent) => {
    event.preventDefault();
    try {
      updateNotificationPreferences(preferences);
      setSavedMessage('Preferences saved in this browser. Email/SMS delivery is not connected.');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Preferences could not be saved.');
    }
  };

  return (
    <main className="company-portal-page">
      <header className="company-portal-heading">
        <div>
          <p className="registration-eyebrow">Company administration</p>
          <h1>Company portal</h1>
          <p>Manage your company profile, team invitations, and notification preferences.</p>
        </div>
        <span className="registration-status-pill status-approved_active"><CheckCircle2 size={15} /> Active demo</span>
      </header>

      <div className="company-portal-grid">
        <section className="registration-status-card" aria-labelledby="company-profile-title">
          <h2 id="company-profile-title"><Building2 size={19} /> Company profile</h2>
          <dl className="company-profile-list">
            <div><dt>Company</dt><dd>{user?.companyName || 'ExpiryGuard Demo Pharmacy'}</dd></div>
            <div><dt>Account status</dt><dd>Approved / Active (development demo account)</dd></div>
            <div><dt>Administrator</dt><dd>{user?.name || 'Admin User'}</dd></div>
            <div><dt>Contact email</dt><dd>{user?.email || 'admin@expireguard.com'}</dd></div>
            <div><dt>Mobile verification</dt><dd>Not connected</dd></div>
            <div><dt>Subscription</dt><dd>Not configured</dd></div>
          </dl>
          <p className="registration-demo-note">Production account status must be read from the authenticated backend; this browser-only demo status is not an authorization decision.</p>
        </section>

        <section className="registration-status-card" aria-labelledby="staff-title">
          <h2 id="staff-title"><Users size={19} /> Staff access</h2>
          <p className="registration-muted">Invite dispensers by email or active mobile number. Invitations are not sent from this mock.</p>
          <form onSubmit={handleInvite} className="registration-inline-form">
            <label htmlFor="staff-contact">Worker email or mobile number</label>
            <div className="registration-inline-row">
              <input id="staff-contact" className="auth-input" value={contact} onChange={event => setContact(event.target.value)} autoComplete="off" placeholder="worker@example.com or +233…" />
              <button className="registration-button" type="submit" disabled={inviteLoading}>{inviteLoading ? 'Creating…' : 'Create dispenser invite'}</button>
            </div>
          </form>
          <p className="registration-muted">Role assigned: Dispenser. Invitations expire after 7 days; the demo one-time token is stored only in this browser and is not a secure production invitation.</p>
          <div className="registration-invitation-list">
            {invitationsLoading ? (
              <p className="registration-empty">Loading invitations…</p>
            ) : invitations.length === 0 ? (
              <p className="registration-empty"><Mail size={17} /> No staff invitations yet.</p>
            ) : invitations.map(invitation => (
              <article className="registration-invitation" key={invitation.id}>
                <div><strong>{invitation.emailOrMobile}</strong><span>Dispenser · expires {new Date(invitation.expiresAt).toLocaleDateString()}</span></div>
                <span className={`registration-status-pill status-${invitation.status}`}>{invitation.status}</span>
                {invitation.status === 'pending' && <a href={`/invite/${encodeURIComponent(invitation.id)}`}>Open demo invite</a>}
              </article>
            ))}
          </div>
        </section>

        <section className="registration-status-card" aria-labelledby="company-activity-title">
          <h2 id="company-activity-title">Company activity and alerts</h2>
          <p className="registration-muted">Recent activity from this browser’s inventory demo:</p>
          {recentActivity.length === 0 ? (
            <p className="registration-empty">No recent stock activity is available.</p>
          ) : (
            <ul className="company-activity-list">
              {recentActivity.map(activity => (
                <li key={activity.id}>
                  <div><strong>{activity.action}</strong><span>{activity.productName} · {activity.actorName}</span></div>
                  <time dateTime={activity.at}>{new Date(activity.at).toLocaleString()}</time>
                </li>
              ))}
            </ul>
          )}
          <Link to="/alerts" className="registration-activity-link">View expiry alerts and stock notifications</Link>
          <p className="registration-demo-note">Server audit logs and notification delivery history are not connected to this frontend.</p>
        </section>

        <section className="registration-status-card company-notifications-card" aria-labelledby="notification-title">
          <h2 id="notification-title"><Bell size={19} /> Notification preferences</h2>
          <form onSubmit={handleSavePreferences}>
            <fieldset className="registration-preference-group">
              <legend>Channels (verification pending)</legend>
              <label><input type="checkbox" checked={preferences.email} onChange={event => updatePreference('email', event.target.checked)} /><Mail size={16} /> Email <span>Not connected</span></label>
              <label><input type="checkbox" checked={preferences.sms} onChange={event => updatePreference('sms', event.target.checked)} /><MessageSquare size={16} /> SMS <span>Not connected</span></label>
            </fieldset>
            <label className="registration-inline-form" htmlFor="expiry-threshold">
              Approaching expiry threshold (days)
              <input id="expiry-threshold" className="auth-input" type="number" min="1" max="365" value={preferences.expiryDays} onChange={event => updatePreference('expiryDays', Math.min(365, Math.max(1, Number(event.target.value) || 1)))} />
            </label>
            <fieldset className="registration-preference-group">
              <legend>Alerts to prepare</legend>
              {([
                ['expiredProducts', 'Expired products'],
                ['lowStock', 'Low-stock alerts'],
                ['stockUpdates', 'Stock updates'],
                ['accountUpdates', 'Application, payment, approval, rejection, and subscription updates'],
              ] as const).map(([key, label]) => (
                <label key={key}><input type="checkbox" checked={preferences[key]} onChange={event => updatePreference(key, event.target.checked)} />{label}</label>
              ))}
            </fieldset>
            <button className="registration-button" type="submit">Save notification preferences</button>
          </form>
          <p className="registration-demo-note">No messages are delivered or verified until email/SMS services and server-side notification jobs are integrated.</p>
        </section>
      </div>
      {(error || savedMessage) && <p className={error ? 'registration-error' : 'registration-success'} role={error ? 'alert' : 'status'}>{error || savedMessage}</p>}
    </main>
  );
}
