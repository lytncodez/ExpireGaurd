import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { legalConfiguration } from '../api/legalConfig';
import { submitCompanyApplication, type CompanyType } from '../api/registrationService';
import AuthPhotoPanel from '../components/AuthPhotoPanel';
import '../styles/landing.css';
import '../styles/registration.css';

interface RegistrationForm {
  companyName: string;
  companyType: CompanyType | '';
  companyEmail: string;
  mobile: string;
  address: string;
  administratorName: string;
  administratorEmail: string;
  password: string;
  passwordConfirmation: string;
  acceptedLegal: boolean;
}

const INITIAL_FORM: RegistrationForm = {
  companyName: '',
  companyType: '',
  companyEmail: '',
  mobile: '',
  address: '',
  administratorName: '',
  administratorEmail: '',
  password: '',
  passwordConfirmation: '',
  acceptedLegal: false,
};

const COMPANY_TYPES: CompanyType[] = [
  'Pharmacy',
  'Chemical Shop',
  'Pharmaceutical Importer',
  'Other',
];

function normalizeMobile(value: string): string {
  const compact = value.trim().replace(/[\s()-]/g, '');
  if (compact.startsWith('0')) return `+233${compact.slice(1)}`;
  if (compact.startsWith('233')) return `+${compact}`;
  return compact;
}

function validate(form: RegistrationForm): string | null {
  if (form.companyName.trim().length < 2) return 'Enter the company or business name (at least 2 characters).';
  if (!form.companyType) return 'Choose the type of company.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.companyEmail.trim())) return 'Enter a valid company email address.';
  if (!/^\+[1-9]\d{7,14}$/.test(normalizeMobile(form.mobile))) {
    return 'Enter a valid active mobile number. Ghanaian numbers may use +233 or a local 0-prefixed format.';
  }
  if (form.address.trim().length < 5) return 'Enter the business location or address.';
  if (form.administratorName.trim().length < 2) return 'Enter the administrator’s full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.administratorEmail.trim())) return 'Enter a valid administrator email address.';
  if (form.password.length < 8 || form.password.length > 128) return 'Choose a password between 8 and 128 characters.';
  if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) return 'Your password must include at least one letter and one number.';
  if (form.password !== form.passwordConfirmation) return 'The password confirmation does not match.';
  if (!legalConfiguration.approved) return 'Registration is unavailable because approved legal documents have not been configured.';
  if (!form.acceptedLegal) return 'You must accept the approved Terms of Service and Privacy Notice to continue.';
  return null;
}

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const submitting = useRef(false);
  const demoAvailable = import.meta.env.DEV;

  const update = <K extends keyof RegistrationForm>(key: K, value: RegistrationForm[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!demoAvailable) {
      setError('The company application backend is not connected. Registration cannot be completed in production.');
      return;
    }

    submitting.current = true;
    setIsLoading(true);
    setError('');
    try {
      const application = await submitCompanyApplication({
        companyName: form.companyName.trim(),
        companyType: form.companyType as CompanyType,
        companyEmail: form.companyEmail.trim().toLowerCase(),
        mobile: normalizeMobile(form.mobile),
        address: form.address.trim(),
        administratorName: form.administratorName.trim(),
        administratorEmail: form.administratorEmail.trim().toLowerCase(),
        legalConsent: {
          termsVersion: legalConfiguration.terms!.version,
          privacyVersion: legalConfiguration.privacy!.version,
          acceptedAt: new Date().toISOString(),
        },
      });
      navigate(`/application-status?reference=${encodeURIComponent(application.reference)}&email=${encodeURIComponent(application.administratorEmail)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Application could not be submitted. Please try again.');
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-split-wrapper registration-page">
      <AuthPhotoPanel
        headline={<>Set up your<br />company safely.</>}
        subheading="Apply to protect your stock, monitor expiry risk, and keep your team informed."
      />
      <main className="auth-form-side registration-form-side">
        <div className="auth-form-card registration-card">
          <Link to="/" className="auth-mobile-brand">
            <div className="sky-brand-icon"><ShieldCheck size={20} aria-hidden="true" /></div>
            <span className="sky-brand-name">ExpiryGuard</span>
          </Link>
          <header className="auth-form-header">
            <p className="registration-eyebrow">Company registration</p>
            <h1 className="auth-form-title">Create a company application</h1>
            <p className="auth-form-sub">Your account will not be activated until the company approval workflow is complete.</p>
          </header>

          {!legalConfiguration.approved && (
            <div className="registration-warning" role="status">
              <AlertCircle size={18} aria-hidden="true" />
              <p>
                Registration is blocked until approved Terms of Service and Privacy Notice links and versions are
                configured. Draft or unapproved documents are not shown as approved.
              </p>
            </div>
          )}
          {!demoAvailable && (
            <div className="registration-warning" role="status">
              <AlertCircle size={18} aria-hidden="true" />
              <p>The production application API is not connected. This development-only mock cannot create production accounts.</p>
            </div>
          )}
          {error && <div className="auth-error-box" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} noValidate className="registration-form">
            <fieldset className="registration-fieldset">
              <legend>Company details</legend>
              <div className="registration-grid">
                <div className="auth-form-group">
                  <label htmlFor="company-name" className="auth-label">Company / business name</label>
                  <input id="company-name" className="auth-input" value={form.companyName} onChange={event => update('companyName', event.target.value)} autoComplete="organization" required />
                </div>
                <div className="auth-form-group">
                  <label htmlFor="company-type" className="auth-label">Company type</label>
                  <select id="company-type" className="auth-input registration-select" value={form.companyType} onChange={event => update('companyType', event.target.value as CompanyType | '')} required>
                    <option value="">Select company type</option>
                    {COMPANY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div className="auth-form-group">
                  <label htmlFor="company-email" className="auth-label">Company email address</label>
                  <input id="company-email" className="auth-input" type="email" value={form.companyEmail} onChange={event => update('companyEmail', event.target.value)} autoComplete="email" required />
                </div>
                <div className="auth-form-group">
                  <label htmlFor="company-mobile" className="auth-label">Active mobile number for SMS</label>
                  <input id="company-mobile" className="auth-input" type="tel" value={form.mobile} onChange={event => update('mobile', event.target.value)} autoComplete="tel" placeholder="+233 24 123 4567" aria-describedby="mobile-help" required />
                  <span className="registration-help" id="mobile-help">Ghanaian numbers may be entered as +233 or a local 0-prefixed number.</span>
                </div>
                <div className="auth-form-group registration-grid-full">
                  <label htmlFor="company-address" className="auth-label">Business location / address</label>
                  <textarea id="company-address" className="auth-input registration-textarea" value={form.address} onChange={event => update('address', event.target.value)} autoComplete="street-address" rows={2} required />
                </div>
              </div>
            </fieldset>

            <fieldset className="registration-fieldset">
              <legend>Company administrator</legend>
              <div className="registration-grid">
                <div className="auth-form-group">
                  <label htmlFor="administrator-name" className="auth-label">Administrator’s full name</label>
                  <input id="administrator-name" className="auth-input" value={form.administratorName} onChange={event => update('administratorName', event.target.value)} autoComplete="name" required />
                </div>
                <div className="auth-form-group">
                  <label htmlFor="administrator-email" className="auth-label">Administrator’s email address</label>
                  <input id="administrator-email" className="auth-input" type="email" value={form.administratorEmail} onChange={event => update('administratorEmail', event.target.value)} autoComplete="email" required />
                </div>
                <div className="auth-form-group">
                  <label htmlFor="registration-password" className="auth-label">Password (at least 8 characters)</label>
                  <input id="registration-password" className="auth-input" type="password" value={form.password} onChange={event => update('password', event.target.value)} autoComplete="new-password" required />
                </div>
                <div className="auth-form-group">
                  <label htmlFor="password-confirmation" className="auth-label">Confirm password</label>
                  <input id="password-confirmation" className="auth-input" type="password" value={form.passwordConfirmation} onChange={event => update('passwordConfirmation', event.target.value)} autoComplete="new-password" required />
                </div>
              </div>
              <p className="registration-help">The development mock does not store your password. Production credential creation must be handled by the approved backend after review.</p>
            </fieldset>

            {legalConfiguration.approved && (
              <label className="registration-consent">
                <input type="checkbox" checked={form.acceptedLegal} onChange={event => update('acceptedLegal', event.target.checked)} />
                <span>
                  I accept the approved{' '}
                  <a href={legalConfiguration.terms!.url} target="_blank" rel="noreferrer">Terms of Service (v{legalConfiguration.terms!.version})</a>
                  {' '}and{' '}
                  <a href={legalConfiguration.privacy!.url} target="_blank" rel="noreferrer">Privacy Notice (v{legalConfiguration.privacy!.version})</a>.
                </span>
              </label>
            )}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading || !legalConfiguration.approved || !demoAvailable}
              aria-describedby="registration-submit-help"
            >
              {isLoading
                ? 'Submitting application…'
                : !legalConfiguration.approved
                  ? 'Registration unavailable — approved legal documents required'
                  : !demoAvailable
                    ? 'Registration unavailable — application backend required'
                    : 'Submit company application'}
            </button>
            <p className="registration-help" id="registration-submit-help">
              {!legalConfiguration.approved
                ? 'The approved Terms of Service and Privacy Notice URL and version are not configured. Ask the platform administrator to configure approved documents before applying.'
                : !demoAvailable
                  ? 'Production registration requires a pending-application backend; the existing signup endpoint activates accounts immediately and is not used here.'
                  : 'Submitting creates a development-only application in this browser. It does not create a company account or send SMS.'}
            </p>
          </form>
          {demoAvailable ? (
            <p className="registration-demo-note">
              <CheckCircle2 size={15} aria-hidden="true" /> Development mock only: the application is stored in this browser and does not create an account.
            </p>
          ) : (
            <p className="registration-demo-note">
              <AlertCircle size={15} aria-hidden="true" /> Production registration is disabled until a pending-application backend is connected.
            </p>
          )}
          <div className="auth-switch-link">
            Already have a company account? <Link to="/signin">Sign in</Link>
          </div>
          <div className="registration-link-row"><Link to="/application-status">Already applied? Check your application status</Link></div>
          {import.meta.env.DEV && <div className="registration-link-row"><Link to="/platform-review">Open development review prototype</Link></div>}
        </div>
      </main>
    </div>
  );
}
