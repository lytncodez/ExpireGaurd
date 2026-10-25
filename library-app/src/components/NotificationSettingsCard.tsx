import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../api/client';

/** Shape of GET /settings/notifications (camelCase). */
interface NotificationSettings {
  alertPhoneNumbers: string[];
  pharmacyPhone: string | null;
  emailDigestEnabled: boolean;
  adminPhones: string[];
  adminEmails: string[];
  smsRecipients: string[];
  smsMode: string;
  smsProvider: string;
  emailMode: string;
}

interface Notification {
  status: 'PENDING' | 'SENT' | 'FAILED';
  error_message: string | null;
  provider: string | null;
}

interface DigestResult {
  sent: number;
  failed: number;
  skipped_reason: string | null;
}

const label: React.CSSProperties = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' };
const input: React.CSSProperties = { width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' };
const chip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '9999px', padding: '0.25rem 0.4rem 0.25rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, color: '#1E3A4C' };
const smallBtn: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0.4rem 0.8rem', fontSize: '0.78rem', fontWeight: 700, color: '#334155', cursor: 'pointer' };

function modeBadge(mode: string, liveText: string) {
  const live = mode === 'live';
  return (
    <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '9999px', background: live ? '#DCFCE7' : '#FEF3C7', color: live ? '#166534' : '#92400E' }}>
      {live ? liveText : mode === 'off' ? 'OFF' : 'TEST MODE (not really sent)'}
    </span>
  );
}

export default function NotificationSettingsCard({ onToast }: { onToast: (message: string) => void }) {
  const [data, setData] = useState<NotificationSettings | null>(null);
  const [myPhone, setMyPhone] = useState('');
  const [myEmail, setMyEmail] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  // The parent recreates onToast every render; keep the latest in a ref so loading runs once.
  const toastRef = useRef(onToast);
  toastRef.current = onToast;
  const toast = (message: string) => toastRef.current(message);

  const load = useCallback(async () => {
    try {
      const [settings, me] = await Promise.all([
        api<NotificationSettings>('/settings/notifications'),
        api<{ phone_number: string | null; email: string }>('/auth/me'),
      ]);
      setData(settings);
      setMyPhone(me.phone_number || '');
      setMyEmail(me.email);
    } catch (err) {
      toastRef.current(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (next: Pick<NotificationSettings, 'alertPhoneNumbers' | 'pharmacyPhone' | 'emailDigestEnabled'>, message: string) => {
    setBusy('save');
    try {
      setData(await api<NotificationSettings>('/settings/notifications', { method: 'PUT', body: next }));
      toast(message);
      return true;
    } catch (err) {
      toast(errorMessage(err));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const addNumber = async () => {
    if (!data || !newNumber.trim()) return;
    const ok = await save(
      { alertPhoneNumbers: [...data.alertPhoneNumbers, newNumber.trim()], pharmacyPhone: data.pharmacyPhone, emailDigestEnabled: data.emailDigestEnabled },
      'Alert number added. It will receive expiry SMS alerts.',
    );
    if (ok) setNewNumber('');
  };

  const removeNumber = (phone: string) => {
    if (!data) return;
    void save(
      { alertPhoneNumbers: data.alertPhoneNumbers.filter(p => p !== phone), pharmacyPhone: data.pharmacyPhone, emailDigestEnabled: data.emailDigestEnabled },
      'Alert number removed.',
    );
  };

  const toggleDigest = () => {
    if (!data) return;
    void save(
      { alertPhoneNumbers: data.alertPhoneNumbers, pharmacyPhone: data.pharmacyPhone, emailDigestEnabled: !data.emailDigestEnabled },
      data.emailDigestEnabled ? 'Daily expiry email turned off.' : 'Daily expiry email turned on.',
    );
  };

  const saveMyPhone = async () => {
    setBusy('me');
    try {
      const me = await api<{ phone_number: string | null }>('/auth/me', { method: 'PATCH', body: { phone_number: myPhone.trim() || null } });
      setMyPhone(me.phone_number || '');
      await load();
      toast(me.phone_number ? `Your number is saved as ${me.phone_number}.` : 'Your phone number was removed.');
    } catch (err) {
      toast(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const testSms = async (phone: string) => {
    setBusy(`sms-${phone}`);
    try {
      const res = await api<Notification>('/alerts/test-sms', { method: 'POST', body: { phone_number: phone } });
      toast(res.status === 'SENT'
        ? `Test SMS sent to ${phone}${res.provider === 'mock' ? ' (test mode: printed in the backend window, not really sent)' : ''}.`
        : `SMS to ${phone} failed: ${res.error_message || 'unknown error'}`);
    } catch (err) {
      toast(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const testEmail = async () => {
    setBusy('email');
    try {
      const res = await api<Notification>('/alerts/test-email', { method: 'POST', body: { email: myEmail } });
      toast(res.status === 'SENT'
        ? `Test email sent to ${myEmail}${res.provider === 'mock-email' ? ' (test mode: printed in the backend window)' : ''}.`
        : `Email failed: ${res.error_message || 'unknown error'}`);
    } catch (err) {
      toast(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const sendDigestNow = async () => {
    setBusy('digest');
    try {
      const res = await api<DigestResult>('/alerts/send-digest', { method: 'POST' });
      toast(res.skipped_reason ? `Digest not sent: ${res.skipped_reason}` : `Expiry digest emailed to ${res.sent} admin${res.sent === 1 ? '' : 's'}${res.failed ? ` (${res.failed} failed)` : ''}.`);
    } catch (err) {
      toast(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card-container" style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginTop: '1.5rem' }}>
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1E3A4C', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E3A4C" strokeWidth="2.2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        Alerts &amp; Notifications
      </h2>
      <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '1.25rem' }}>
        Critical and expired stock alerts are sent by SMS and email. Numbers can be local (0241234567) or international (+233241234567).
      </p>

      {!data ? (
        <div style={{ fontSize: '0.85rem', color: '#64748B' }}>Loading notification settings…</div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* SMS */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E3A4C', margin: 0 }}>SMS alerts</h3>
              {modeBadge(data.smsMode, `LIVE via ${data.smsProvider === 'twilio' ? 'Twilio' : "Africa's Talking"}`)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={label}>My mobile number</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input style={input} type="tel" value={myPhone} placeholder="0241234567" onChange={e => setMyPhone(e.target.value)} />
                  <button type="button" style={smallBtn} disabled={busy === 'me'} onClick={() => void saveMyPhone()}>Save</button>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.3rem' }}>Admins' numbers automatically receive alerts.</div>
              </div>

              <div>
                <label style={label}>Add another alert number</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    style={input}
                    type="tel"
                    value={newNumber}
                    placeholder="e.g. pharmacist on duty"
                    onChange={e => setNewNumber(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void addNumber(); } }}
                  />
                  <button type="button" className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }} disabled={busy === 'save'} onClick={() => void addNumber()}>Add</button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <div style={{ ...label, marginBottom: '0.5rem' }}>Who gets SMS alerts ({data.smsRecipients.length})</div>
              {data.smsRecipients.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '0.6rem 0.8rem' }}>
                  No one will receive SMS alerts yet. Add your number or another alert number above.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {data.smsRecipients.map(phone => {
                    const extra = data.alertPhoneNumbers.includes(phone);
                    return (
                      <span key={phone} style={chip}>
                        {phone}
                        <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>{extra ? 'extra' : data.adminPhones.includes(phone) ? 'admin' : 'pharmacy'}</span>
                        <button type="button" title="Send a test SMS" style={{ ...smallBtn, padding: '0.15rem 0.5rem', fontSize: '0.7rem' }} disabled={busy === `sms-${phone}`} onClick={() => void testSms(phone)}>
                          {busy === `sms-${phone}` ? 'Sending…' : 'Test'}
                        </button>
                        {extra && (
                          <button type="button" title="Remove" aria-label={`Remove ${phone}`} style={{ border: 'none', background: 'transparent', color: '#EF4444', fontWeight: 800, cursor: 'pointer', padding: '0 0.3rem' }} onClick={() => removeNumber(phone)}>
                            ✕
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Email */}
          <section style={{ borderTop: '1px solid #F1F5F9', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E3A4C', margin: 0 }}>Email alerts</h3>
              {modeBadge(data.emailMode, 'LIVE')}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '0.75rem' }}>
              Sent to admins: <strong>{data.adminEmails.join(', ') || 'no admin emails'}</strong>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#1E3A4C', fontWeight: 600, marginBottom: '0.9rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={data.emailDigestEnabled} onChange={toggleDigest} disabled={busy === 'save'} />
              Send a daily expiry email every morning (expired and soon-to-expire products)
            </label>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button type="button" style={smallBtn} disabled={busy === 'email' || !myEmail} onClick={() => void testEmail()}>
                {busy === 'email' ? 'Sending…' : `Send test email to ${myEmail || 'me'}`}
              </button>
              <button type="button" style={smallBtn} disabled={busy === 'digest'} onClick={() => void sendDigestNow()}>
                {busy === 'digest' ? 'Sending…' : 'Send today’s expiry email now'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
