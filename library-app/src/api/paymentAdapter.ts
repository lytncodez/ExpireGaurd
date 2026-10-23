import {
  moveApplicationToPayment,
  submitPaymentReference,
  type CompanyApplication,
} from './registrationService';

export function configuredRegistrationFeeGhs(): number | null {
  const rawFee = import.meta.env.VITE_REGISTRATION_FEE_GHS?.trim();
  if (!rawFee) return null;
  const fee = Number(rawFee);
  return Number.isFinite(fee) && fee > 0 ? fee : null;
}

export async function openPaymentStep(reference: string): Promise<CompanyApplication> {
  if (!import.meta.env.DEV) {
    throw new Error('The payment application backend is not connected. The demo payment adapter is disabled in production.');
  }
  return moveApplicationToPayment(reference);
}

export async function submitManualPaymentReference(
  reference: string,
  providerReference: string,
): Promise<CompanyApplication> {
  if (!import.meta.env.DEV) {
    throw new Error('A payment provider and backend verification endpoint are required in production.');
  }
  return submitPaymentReference(reference, providerReference);
}
