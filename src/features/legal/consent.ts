import type { ConsentRecord } from "@/types/pet";

import { PRIVACY_VERSION, TERMS_VERSION } from "./versions";

/** Form fields of the two checkboxes (a ticked checkbox submits `on`). */
export const CONSENT_TERMS_FIELD = "accept_terms";
export const CONSENT_PUBLIC_FIELD = "accept_public";

/**
 * The consent record for a submission, or `null` when either box is not
 * ticked. Both are required: the first accepts the Terms of Use and
 * acknowledges the Privacy Policy, the second is the specific authorization to
 * publish the tutors' data (LGPD art. 7, I and art. 8). The browser enforces
 * `required`, but this is what the server relies on.
 */
export function parseConsent(form: FormData, now: Date = new Date()): ConsentRecord | null {
  if (form.get(CONSENT_TERMS_FIELD) !== "on" || form.get(CONSENT_PUBLIC_FIELD) !== "on") return null;
  return {
    acceptedAt: now.toISOString(),
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
  };
}
