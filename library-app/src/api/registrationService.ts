export type ApplicationStatus =
  | 'application_submitted'
  | 'awaiting_payment'
  | 'payment_under_verification'
  | 'pending_company_approval'
  | 'approved_active'
  | 'rejected_suspended';

export type CompanyType =
  | 'Pharmacy'
  | 'Chemical Shop'
  | 'Pharmaceutical Importer'
  | 'Other';

export interface LegalConsent {
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: string;
}

export interface CompanyApplication {
  reference: string;
  companyName: string;
  companyType: CompanyType;
  companyEmail: string;
  mobile: string;
  address: string;
  administratorName: string;
  administratorEmail: string;
  status: ApplicationStatus;
  submittedAt: string;
  legalConsent: LegalConsent;
  paymentReference?: string;
  decisionNote?: string;
}

export interface ApplicationSubmission {
  companyName: string;
  companyType: CompanyType;
  companyEmail: string;
  mobile: string;
  address: string;
  administratorName: string;
  administratorEmail: string;
  legalConsent: LegalConsent;
}

export interface StaffInvitation {
  id: string;
  emailOrMobile: string;
  role: 'dispenser';
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired';
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  expiryDays: number;
  expiredProducts: boolean;
  lowStock: boolean;
  stockUpdates: boolean;
  accountUpdates: boolean;
}

const APPLICATIONS_KEY = 'expireguard_company_applications';
const STAFF_KEY = 'expireguard_staff_invitations';
const NOTIFICATIONS_KEY = 'expireguard_notification_preferences';
const MOCK_DELAY_MS = 250;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email: true,
  sms: true,
  expiryDays: 30,
  expiredProducts: true,
  lowStock: true,
  stockUpdates: false,
  accountUpdates: true,
};

function requireDevelopmentMock(): void {
  if (!import.meta.env.DEV) {
    throw new Error('Company applications require the backend application service. The demo adapter is disabled in production.');
  }
}

function pause(): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, MOCK_DELAY_MS));
}

function readList<T>(key: string): T[] {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error('Stored demo data has an invalid format.');
    return parsed as T[];
  } catch (error) {
    throw new Error(`Unable to read demo data (${key}): ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

function writeList<T>(key: string, value: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    throw new Error(`Unable to save demo data (${key}): ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

export async function submitCompanyApplication(
  submission: ApplicationSubmission,
): Promise<CompanyApplication> {
  requireDevelopmentMock();
  await pause();
  const applications = readList<CompanyApplication>(APPLICATIONS_KEY);
  const duplicate = applications.find(application =>
    application.companyEmail.toLowerCase() === submission.companyEmail.toLowerCase()
    || application.administratorEmail.toLowerCase() === submission.administratorEmail.toLowerCase(),
  );
  if (duplicate) {
    throw new Error(`An application already exists. Use reference ${duplicate.reference} to check its status.`);
  }

  const application: CompanyApplication = {
    ...submission,
    reference: `EG-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    status: 'application_submitted',
    submittedAt: new Date().toISOString(),
  };
  writeList(APPLICATIONS_KEY, [application, ...applications]);
  return application;
}

export async function findApplication(reference: string, email: string): Promise<CompanyApplication | null> {
  requireDevelopmentMock();
  await pause();
  const normalizedReference = reference.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();
  return readList<CompanyApplication>(APPLICATIONS_KEY).find(application =>
    application.reference.toUpperCase() === normalizedReference
    && [application.companyEmail, application.administratorEmail].some(
      candidate => candidate.toLowerCase() === normalizedEmail,
    ),
  ) ?? null;
}

export async function listApplications(): Promise<CompanyApplication[]> {
  requireDevelopmentMock();
  await pause();
  return readList<CompanyApplication>(APPLICATIONS_KEY);
}

function updateApplication(
  reference: string,
  update: (application: CompanyApplication) => CompanyApplication,
): CompanyApplication {
  const applications = readList<CompanyApplication>(APPLICATIONS_KEY);
  const index = applications.findIndex(application => application.reference === reference);
  if (index < 0) throw new Error('Application was not found. Refresh the list and try again.');
  const updated = update(applications[index]);
  applications[index] = updated;
  writeList(APPLICATIONS_KEY, applications);
  return updated;
}

export async function moveApplicationToPayment(reference: string): Promise<CompanyApplication> {
  requireDevelopmentMock();
  await pause();
  return updateApplication(reference, application => {
    if (application.status !== 'application_submitted') {
      throw new Error('This application is not ready for the payment step.');
    }
    return { ...application, status: 'awaiting_payment' };
  });
}

export async function submitPaymentReference(
  reference: string,
  paymentReference: string,
): Promise<CompanyApplication> {
  requireDevelopmentMock();
  await pause();
  return updateApplication(reference, application => {
    if (application.status !== 'awaiting_payment') {
      throw new Error('This application is not awaiting payment.');
    }
    return {
      ...application,
      status: 'payment_under_verification',
      paymentReference: paymentReference.trim(),
    };
  });
}

const ALLOWED_REVIEW_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  application_submitted: ['awaiting_payment', 'rejected_suspended'],
  awaiting_payment: ['payment_under_verification', 'rejected_suspended'],
  payment_under_verification: ['pending_company_approval', 'rejected_suspended'],
  pending_company_approval: ['approved_active', 'rejected_suspended'],
  approved_active: ['rejected_suspended'],
  rejected_suspended: [],
};

export async function reviewApplication(
  reference: string,
  status: ApplicationStatus,
  decisionNote = '',
): Promise<CompanyApplication> {
  requireDevelopmentMock();
  await pause();
  return updateApplication(reference, application => {
    if (!ALLOWED_REVIEW_TRANSITIONS[application.status].includes(status)) {
      throw new Error(`Cannot move an application from ${application.status} to ${status}.`);
    }
    if (status === 'payment_under_verification' && !application.paymentReference) {
      throw new Error('A payment reference must be submitted before payment verification can begin.');
    }
    return { ...application, status, decisionNote: decisionNote.trim() || undefined };
  });
}

export async function listStaffInvitations(): Promise<StaffInvitation[]> {
  requireDevelopmentMock();
  await pause();
  return readList<StaffInvitation>(STAFF_KEY);
}

export async function inviteStaff(emailOrMobile: string): Promise<StaffInvitation> {
  requireDevelopmentMock();
  await pause();
  const invites = readList<StaffInvitation>(STAFF_KEY);
  const normalized = emailOrMobile.trim().toLowerCase();
  if (invites.some(invite => invite.emailOrMobile.toLowerCase() === normalized && invite.status === 'pending')) {
    throw new Error('A pending invitation already exists for this contact.');
  }
  const now = Date.now();
  const invitation: StaffInvitation = {
    id: crypto.randomUUID(),
    emailOrMobile: emailOrMobile.trim(),
    role: 'dispenser',
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
  };
  writeList(STAFF_KEY, [invitation, ...invites]);
  return invitation;
}

export async function acceptStaffInvitation(id: string): Promise<StaffInvitation> {
  requireDevelopmentMock();
  await pause();
  const invites = readList<StaffInvitation>(STAFF_KEY);
  const index = invites.findIndex(invitation => invitation.id === id);
  if (index < 0) throw new Error('This invitation was not found. Ask the company administrator to send a new invitation.');
  const invitation = invites[index];
  if (invitation.status !== 'pending') throw new Error('This invitation has already been used or is no longer active.');
  if (Date.now() > Date.parse(invitation.expiresAt)) {
    invites[index] = { ...invitation, status: 'expired' };
    writeList(STAFF_KEY, invites);
    throw new Error('This invitation has expired. Ask the company administrator to send a new invitation.');
  }
  invites[index] = { ...invitation, status: 'accepted' };
  writeList(STAFF_KEY, invites);
  return invites[index];
}

export function readNotificationPreferences(): NotificationPreferences {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    return stored
      ? { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(stored) as Partial<NotificationPreferences> }
      : DEFAULT_NOTIFICATION_PREFERENCES;
  } catch (error) {
    throw new Error(`Unable to read notification preferences: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

export function saveNotificationPreferences(preferences: NotificationPreferences): void {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(preferences));
  } catch (error) {
    throw new Error(`Unable to save notification preferences: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}
