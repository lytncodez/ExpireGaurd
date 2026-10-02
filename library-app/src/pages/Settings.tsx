import { useState, useEffect } from 'react';
import { useAuth } from '../api/useAuth';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'dispenser';
  status: 'active' | 'inactive';
  lastActive: string;
}

interface ThresholdSettings {
  criticalDays: number;
  actionDays: number;
  monitorDays: number;
  safeDays: number;
  enable90d: boolean;
  enable60d: boolean;
  enable30d: boolean;
  enable7d: boolean;
  enable0d: boolean;
}

const DEFAULT_THRESHOLDS: ThresholdSettings = {
  criticalDays: 7,
  actionDays: 30,
  monitorDays: 60,
  safeDays: 90,
  enable90d: true,
  enable60d: true,
  enable30d: true,
  enable7d: true,
  enable0d: true,
};

const INITIAL_USERS: UserRecord[] = [
  {
    id: 'u1',
    name: 'Admin User',
    email: 'admin@expireguard.com',
    role: 'admin',
    status: 'active',
    lastActive: 'Just now',
  },
  {
    id: 'u2',
    name: 'Jane Dispenser',
    email: 'dispenser@expireguard.com',
    role: 'dispenser',
    status: 'active',
    lastActive: '2 hours ago',
  },
  {
    id: 'u3',
    name: 'Kofi Boateng',
    email: 'kofi.b@pharma.com',
    role: 'dispenser',
    status: 'active',
    lastActive: 'Yesterday',
  },
  {
    id: 'u4',
    name: 'Abena Owusu',
    email: 'abena.o@pharma.com',
    role: 'dispenser',
    status: 'inactive',
    lastActive: '5 days ago',
  },
];

export default function Settings() {
  const { user, updateUserRole } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Configurable thresholds stored in localStorage
  const [thresholds, setThresholds] = useState<ThresholdSettings>(() => {
    const saved = localStorage.getItem('expireguard_thresholds');
    if (saved) {
      try {
        return { ...DEFAULT_THRESHOLDS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_THRESHOLDS;
      }
    }
    return DEFAULT_THRESHOLDS;
  });

  // Users state
  const [users, setUsers] = useState<UserRecord[]>(() => {
    const saved = localStorage.getItem('expireguard_users');
    if (saved) {
      try {
        const savedUsers = JSON.parse(saved) as UserRecord[];
        return savedUsers.map(savedUser => ({ ...savedUser, role: savedUser.role === 'admin' ? 'admin' : 'dispenser' }));
      } catch {
        return INITIAL_USERS;
      }
    }
    return INITIAL_USERS;
  });

  // New user form modal/inline state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'dispenser'>('dispenser');

  // Facility info state
  const [facilityName, setFacilityName] = useState('Accra Central Pharmacy - Dispensary Unit');
  const [licenseNumber, setLicenseNumber] = useState('GHA-FDA-PH-2024-8891');
  const [currency, setCurrency] = useState('GHS');

  // Save feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('expireguard_thresholds', JSON.stringify(thresholds));
  }, [thresholds]);

  useEffect(() => {
    localStorage.setItem('expireguard_users', JSON.stringify(users));
  }, [users]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('expireguard_thresholds', JSON.stringify(thresholds));
    showToast('Alert thresholds & risk-band parameters updated successfully!');
  };

  const handleResetThresholds = () => {
    setThresholds(DEFAULT_THRESHOLDS);
    localStorage.setItem('expireguard_thresholds', JSON.stringify(DEFAULT_THRESHOLDS));
    showToast('Thresholds reset to default FDA pharmaceutical standards.');
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const newUser: UserRecord = {
      id: `u-${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      status: 'active',
      lastActive: 'Never',
    };

    setUsers(prev => [newUser, ...prev]);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('dispenser');
    setShowAddUser(false);
    showToast(`Staff member ${newUser.name} added successfully.`);
  };

  const handleRoleChange = (id: string, newRole: 'admin' | 'dispenser') => {
    const target = users.find(u => u.id === id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
    if (target) updateUserRole(target.email, newRole);
    showToast('User role updated.');
  };

  const handleToggleStatus = (id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === 'active' ? 'inactive' : 'active';
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (confirm(`Remove user ${name}?`)) {
      setUsers(prev => prev.filter(u => u.id !== id));
      showToast(`User ${name} removed.`);
    }
  };

  // If user is not admin, show guard view with demo unlock option
  if (!isAdmin) {
    return (
      <div className="page-body">
        <div className="card-container" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', maxWidth: '600px', margin: '2rem auto' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1E3A4C', marginBottom: '0.5rem' }}>
            Administrator Access Restricted
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Settings and risk-band threshold configurations are protected. Only administrators can alter pharmacy inventory rules and user permission assignments.
          </p>
          <div style={{ display: 'inline-block', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.75rem 1.25rem', borderRadius: '10px', fontSize: '0.85rem', color: '#334155' }}>
            Logged in as: <strong>{user?.name || 'Dispenser'}</strong> ({user?.role === 'admin' ? 'Admin' : 'Dispenser'})
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-body">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: '#1E3A4C',
          color: '#FFFFFF',
          padding: '0.85rem 1.4rem',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(30, 58, 76, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          borderLeft: '4px solid #10B981',
          animation: 'fadeIn 0.3s ease',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toastMessage}
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E3A4C' }}>
              Administration &amp; Rules Configuration
            </h1>
            <span style={{ background: '#EEF2FF', color: '#3B3593', fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid #C7D2FE' }}>
              ADMIN ONLY
            </span>
          </div>
          <p style={{ fontSize: '0.86rem', color: '#64748B' }}>
            Configure pharmaceutical expiry thresholds, alert schedules, user access permissions, and dispensary metadata.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* SECTION 1: Configurable Risk-Band Days Thresholds */}
        <div className="card-container" style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E3A4C', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B3593" strokeWidth="2.2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Configurable Risk-Band Thresholds
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
                Define cutoff days for each risk band across the app.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetThresholds}
              style={{ fontSize: '0.76rem', color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Reset Defaults
            </button>
          </div>

          <form onSubmit={handleSaveThresholds}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginBottom: '1.5rem' }}>
              
              {/* Critical */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FEF2F2', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #FCA5A5' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#991B1B' }}>Critical Risk</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#B91C1C' }}>Immediate quarantine or 50% discount</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748B' }}>≤</span>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={thresholds.criticalDays}
                    onChange={e => setThresholds({ ...thresholds, criticalDays: Number(e.target.value) })}
                    style={{ width: '60px', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #EF4444', fontWeight: 700, textAlign: 'center', color: '#991B1B' }}
                  />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>days</span>
                </div>
              </div>

              {/* Action Required */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFF7ED', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #FDBA74' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F97316' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#9A3412' }}>Action Required</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#C2410C' }}>FEFO front-shelf priority placement</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748B' }}>≤</span>
                  <input
                    type="number"
                    min="8"
                    max="60"
                    value={thresholds.actionDays}
                    onChange={e => setThresholds({ ...thresholds, actionDays: Number(e.target.value) })}
                    style={{ width: '60px', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #F97316', fontWeight: 700, textAlign: 'center', color: '#9A3412' }}
                  />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>days</span>
                </div>
              </div>

              {/* Monitor */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFBEB', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #FDE68A' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#92400E' }}>Monitor</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#B45309' }}>Halt reordering and track sales velocity</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748B' }}>≤</span>
                  <input
                    type="number"
                    min="31"
                    max="120"
                    value={thresholds.monitorDays}
                    onChange={e => setThresholds({ ...thresholds, monitorDays: Number(e.target.value) })}
                    style={{ width: '60px', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #F59E0B', fontWeight: 700, textAlign: 'center', color: '#92400E' }}
                  />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>days</span>
                </div>
              </div>

              {/* Safe */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ECFDF5', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#065F46' }}>Safe Stock</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#047857' }}>Standard inventory, no urgent intervention</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748B' }}>&gt;</span>
                  <input
                    type="number"
                    min="61"
                    max="365"
                    value={thresholds.safeDays}
                    onChange={e => setThresholds({ ...thresholds, safeDays: Number(e.target.value) })}
                    style={{ width: '60px', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #10B981', fontWeight: 700, textAlign: 'center', color: '#065F46' }}
                  />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>days</span>
                </div>
              </div>

            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '0.65rem 1rem', fontSize: '0.88rem', background: '#3B3593' }}
            >
              Save Threshold Configuration
            </button>
          </form>
        </div>

        {/* SECTION 2: Configurable Alert Triggers (90/60/30/7 and On-Expiry) */}
        <div className="card-container" style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E3A4C', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E3A4C" strokeWidth="2.2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              Configurable Alert Triggers
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
              Specify which day horizons generate in-app alerts and dashboard notification badges.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
            
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1E3A4C' }}>90 Days Before Expiry</div>
                <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Early warning: flag for supplier return or promotion review</div>
              </div>
              <input
                type="checkbox"
                checked={thresholds.enable90d}
                onChange={e => setThresholds({ ...thresholds, enable90d: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#3B3593', cursor: 'pointer' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1E3A4C' }}>60 Days Before Expiry</div>
                <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Medium risk trigger: evaluate sales pace and stock reorders</div>
              </div>
              <input
                type="checkbox"
                checked={thresholds.enable60d}
                onChange={e => setThresholds({ ...thresholds, enable60d: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#3B3593', cursor: 'pointer' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1E3A4C' }}>30 Days Before Expiry</div>
                <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Action Required trigger: initiate FEFO priority dispensing</div>
              </div>
              <input
                type="checkbox"
                checked={thresholds.enable30d}
                onChange={e => setThresholds({ ...thresholds, enable30d: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#3B3593', cursor: 'pointer' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1E3A4C' }}>7 Days Before Expiry</div>
                <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Critical alert: discount heavily or mark for vendor recall</div>
              </div>
              <input
                type="checkbox"
                checked={thresholds.enable7d}
                onChange={e => setThresholds({ ...thresholds, enable7d: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#EF4444', cursor: 'pointer' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1E3A4C' }}>On-Expiry (Day 0)</div>
                <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Quarantine alert: immediate removal from active dispensing bay</div>
              </div>
              <input
                type="checkbox"
                checked={thresholds.enable0d}
                onChange={e => setThresholds({ ...thresholds, enable0d: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#64748B', cursor: 'pointer' }}
              />
            </label>

          </div>

          <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '0.85rem 1rem', borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div style={{ fontSize: '0.76rem', color: '#0369A1', lineHeight: 1.4 }}>
              <strong>In-App Delivery Note:</strong> Alerts appear directly inside your ExpiryGuard dashboard &amp; Alerts center. Push notification channels (SMS &amp; WhatsApp) will become available in the next release.
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 3: User & Role Management Table */}
      <div className="card-container" style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.85rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1E3A4C', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B3593" strokeWidth="2.2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              User &amp; Role Management
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.15rem' }}>
              Manage dispensers and assign administrator privileges.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddUser(!showAddUser)}
            className="btn-primary"
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', background: '#1E3A4C' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {showAddUser ? 'Cancel' : 'Add New User'}
          </button>
        </div>

        {/* Inline Add User Form */}
        {showAddUser && (
          <form onSubmit={handleAddUser} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E3A4C', marginBottom: '1rem' }}>
              Invite Pharmacy Staff Member
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Yaw Asante"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>Email Address</label>
                <input
                  type="email"
                  placeholder="yaw.asante@pharma.com"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>System Role</label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as any)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', background: '#FFFFFF' }}
                >
                  <option value="dispenser">Dispenser (Front-of-shop stock &amp; alerts)</option>
                  <option value="admin">Admin (Full system access &amp; settings)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowAddUser(false)}
                style={{ padding: '0.45rem 0.9rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: '0.45rem 1rem', borderRadius: '8px', border: 'none', background: '#3B3593', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Create User
              </button>
            </div>
          </form>
        )}

        {/* Users Table */}
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Active</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#1E3A4C' }}>{u.name}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B' }}>{u.email}</div>
                  </td>
                  <td>
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value as any)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        border: '1px solid #E2E8F0',
                        background: u.role === 'admin' ? '#EEF2FF' : '#ECFDF5',
                        color: u.role === 'admin' ? '#3B3593' : '#065F46',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="admin">Admin ⭐</option>
                      <option value="dispenser">Dispenser 💊</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: u.status === 'active' ? '#DCFCE7' : '#F1F5F9',
                        color: u.status === 'active' ? '#15803D' : '#64748B',
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: u.status === 'active' ? '#16A34A' : '#94A3B8' }} />
                      {u.status === 'active' ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: '#64748B' }}>
                    {u.lastActive}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="row-action-button"
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      title="Remove user"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: Pharmacy Facility Profile */}
      <div className="card-container" style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1E3A4C', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E3A4C" strokeWidth="2.2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Facility Profile &amp; Regulatory Metadata
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '1.25rem' }}>
          These details are included in compliance logs and official stock-at-risk export reports.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>Dispensary Facility Name</label>
            <input
              type="text"
              value={facilityName}
              onChange={e => setFacilityName(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>Pharmacy Council License No.</label>
            <input
              type="text"
              value={licenseNumber}
              onChange={e => setLicenseNumber(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>Currency Symbol</label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', background: '#FFFFFF' }}
            >
              <option value="GHS">Ghanaian Cedi (GH&#8373;)</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => showToast('Facility profile details updated.')}
          className="btn-secondary"
          style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem', fontWeight: 600 }}
        >
          Update Facility Profile
        </button>
      </div>

    </div>
  );
}
