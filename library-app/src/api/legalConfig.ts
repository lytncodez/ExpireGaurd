export interface ApprovedLegalDocument {
  url: string;
  version: string;
}

export interface LegalConfiguration {
  terms: ApprovedLegalDocument | null;
  privacy: ApprovedLegalDocument | null;
  approved: boolean;
}

const termsUrl = import.meta.env.VITE_LEGAL_TERMS_URL?.trim();
const termsVersion = import.meta.env.VITE_LEGAL_TERMS_VERSION?.trim();
const privacyUrl = import.meta.env.VITE_LEGAL_PRIVACY_URL?.trim();
const privacyVersion = import.meta.env.VITE_LEGAL_PRIVACY_VERSION?.trim();
const approvalsConfigured = import.meta.env.VITE_LEGAL_DOCUMENTS_APPROVED === 'true';

function approvedHttpsUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

const approvedTermsUrl = approvedHttpsUrl(termsUrl);
const approvedPrivacyUrl = approvedHttpsUrl(privacyUrl);

export const legalConfiguration: LegalConfiguration = {
  terms: approvedTermsUrl && termsVersion ? { url: approvedTermsUrl, version: termsVersion } : null,
  privacy: approvedPrivacyUrl && privacyVersion ? { url: approvedPrivacyUrl, version: privacyVersion } : null,
  approved: approvalsConfigured && Boolean(approvedTermsUrl && termsVersion && approvedPrivacyUrl && privacyVersion),
};
