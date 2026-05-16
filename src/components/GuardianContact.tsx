import type { Guardian } from "@/types/pet";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";
import { ActionButton } from "./ActionButton";
import { SocialLinks } from "./SocialLinks";
import { MailIcon, PhoneIcon, WhatsAppIcon } from "./icons";

type GuardianContactProps = {
  guardian: Guardian;
  locale: Locale;
};

/**
 * Normalize a Brazilian-style phone string to digits-only E.164 (no plus
 * sign). Accepts inputs like "(48) 98559-6882" or "+55 48 985596882".
 * Prepends the BR country code (55) when missing.
 */
function toE164Brazil(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

export function GuardianContact({ guardian, locale }: GuardianContactProps) {
  const dict = getDictionary(locale);
  const hasSocial =
    !!guardian.social &&
    Object.values(guardian.social).some((value) => value?.trim());

  const phoneE164 = toE164Brazil(guardian.phone);

  return (
    <section
      aria-labelledby="guardian-contact-heading"
      className="rounded-xl bg-surface"
    >
      <header
        id="guardian-contact-heading"
        className="h-16 py-4 mx-2 border-b border-black/10 pb-3 flex items-center"
      >
        <h2 className="text-lg pl-2 font-bold tracking-tight text-ink">
          {dict.guardianContact}
        </h2>
      </header>

      <dl className="p-4 space-y-5">
        {/* Name — info only */}
        <div>
          <dt className="text-xs font-medium text-muted">{dict.name}</dt>
          <dd className="mt-0.5 text-base font-semibold text-ink">
            {guardian.name}
          </dd>
        </div>

        {/* Email — info + send-email button */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <dt className="text-xs font-medium text-muted">{dict.email}</dt>
            <dd className="mt-0.5 truncate text-base font-semibold text-ink">
              {guardian.email}
            </dd>
          </div>
          <ActionButton
            href={`mailto:${guardian.email}`}
            ariaLabel={dict.actionEmail}
            variant="outline"
          >
            <MailIcon className="h-[18px] w-[18px]" />
          </ActionButton>
        </div>

        {/* Phone — info + WhatsApp + Call buttons */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <dt className="text-xs font-medium text-muted">{dict.cellphone}</dt>
            <dd className="mt-0.5 text-base font-semibold text-ink">
              {guardian.phone}
            </dd>
          </div>
          <div className="flex gap-2">
            <ActionButton
              href={`https://wa.me/${phoneE164}`}
              ariaLabel={dict.actionWhatsApp}
              variant="outline"
              external
            >
              <WhatsAppIcon className="h-[18px] w-[18px]" />
            </ActionButton>
            <ActionButton
              href={`tel:+${phoneE164}`}
              ariaLabel={dict.actionCall}
              variant="filled"
            >
              <PhoneIcon className="h-[18px] w-[18px]" />
            </ActionButton>
          </div>
        </div>
      </dl>

      {hasSocial && (
        <div className="py-4 px-2 mx-2 border-t border-black/10 pt-4">
          <p className="mb-3 text-xs font-medium text-muted">{dict.social}</p>
          <SocialLinks social={guardian.social} />
        </div>
      )}
    </section>
  );
}
