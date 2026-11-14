import { CONSENT_PUBLIC_FIELD, CONSENT_TERMS_FIELD } from "@/features/legal/consent";
import { getDictionary, type Locale } from "@/lib/i18n";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/utils/routes";

import { RequiredMark } from "./FieldMarks";

const LINK_CLASS = "font-semibold text-ink underline underline-offset-2";

function ConsentCheckbox({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-ink">
      {/* Never pre-ticked: consent has to be an act of the tutor (LGPD art. 8). */}
      <input
        type="checkbox"
        name={name}
        required
        className="mt-0.5 h-5 w-5 flex-none cursor-pointer accent-ink"
      />
      <span>
        {children}
        <RequiredMark />
      </span>
    </label>
  );
}

/**
 * The two boxes that stand in for the tutor's agreement, right above the
 * submit button: the Terms of Use and Privacy Policy (opened in a new tab so
 * the form keeps what was typed), and the specific authorization to publish
 * the tutors' data. Both are required, in the browser and on the server (see
 * `parseConsent`).
 */
export function ConsentFields({ locale }: { locale: Locale }) {
  const { consentLegend, consentTerms, consentPublic, consentRevokeHint } = getDictionary(locale);

  return (
    <fieldset className="mx-auto mt-8 max-w-2xl space-y-3 rounded-card border border-black/10 bg-surface px-4 py-4 text-left">
      <legend className="sr-only">{consentLegend}</legend>

      <ConsentCheckbox name={CONSENT_TERMS_FIELD}>
        {consentTerms.before}
        <a href={TERMS_PATH} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          {consentTerms.terms}
        </a>
        {consentTerms.between}
        <a href={PRIVACY_PATH} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          {consentTerms.privacy}
        </a>
        {consentTerms.after}
      </ConsentCheckbox>

      <ConsentCheckbox name={CONSENT_PUBLIC_FIELD}>{consentPublic}</ConsentCheckbox>

      <p className="text-xs text-ink/70">{consentRevokeHint}</p>
    </fieldset>
  );
}
