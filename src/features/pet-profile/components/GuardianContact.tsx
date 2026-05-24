import type { Guardian, Phone } from "@/types/pet";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";
import { ActionButton } from "./ActionButton";
import { SocialLinks } from "./SocialLinks";
import { MailIcon, PhoneIcon, WhatsAppIcon } from "@/ui/icons";
import { Tooltip } from "@/ui/Tooltip";

type GuardianContactProps = {
  /** Ordered list — index 0 is the primary guardian, rendered prominently. */
  guardians: Guardian[];
  locale: Locale;
};

function PhoneRow({
  phone,
  dict,
}: {
  phone: Phone;
  dict: ReturnType<typeof getDictionary>;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium text-muted">{dict.cellphone}</dt>
        <dd className="mt-0.5 text-base font-semibold text-ink">
          {phone.display ?? `+${phone.e164}`}
        </dd>
      </div>
      <div className="flex gap-2">
        {phone.channels.includes("whatsapp") && (
          <ActionButton
            href={`https://wa.me/${phone.e164}`}
            ariaLabel={dict.actionWhatsApp}
            variant="outline"
            external
          >
            <WhatsAppIcon className="h-[18px] w-[18px]" />
          </ActionButton>
        )}
        {phone.channels.includes("call") && (
          <Tooltip
            label={dict.actionCallTooltip}
            defaultOpen
            orientation="bottom-left"
            closable
            closeLabel={dict.close}
          >
            <ActionButton
              href={`tel:+${phone.e164}`}
              ariaLabel={dict.actionCall}
              variant="filled"
            >
              <PhoneIcon className="h-[18px] w-[18px]" />
            </ActionButton>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function GuardianBlock({
  guardian,
  dict,
  isPrimary,
}: {
  guardian: Guardian;
  dict: ReturnType<typeof getDictionary>;
  isPrimary: boolean;
}) {
  const hasSocial = Object.values(guardian.social).some((v) => v?.trim());

  return (
    <div className="space-y-5">
      {/* Name — info only */}
      <div>
        <dt className="text-xs font-medium text-muted">{dict.name}</dt>
        <dd className="mt-0.5 text-base font-semibold text-ink">
          {guardian.name}
        </dd>
      </div>

      {/* Email — optional */}
      {guardian.email && (
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
      )}

      {/* Phones */}
      {guardian.phones.map((phone) => (
        <PhoneRow key={phone.e164} phone={phone} dict={dict} />
      ))}

      {/* Social — only on the primary guardian. No top border so the section
          stays visually anchored to the primary block instead of floating
          between the primary and the "outro tutor" divider below. */}
      {isPrimary && hasSocial && (
        <div>
          <p className="mb-3 text-xs font-medium text-muted">{dict.social}</p>
          <SocialLinks social={guardian.social} />
        </div>
      )}
    </div>
  );
}

export function GuardianContact({ guardians, locale }: GuardianContactProps) {
  const dict = getDictionary(locale);
  if (guardians.length === 0) return null;

  const [primary, ...others] = guardians;

  return (
    <section
      aria-labelledby="guardian-contact-heading"
      className="rounded-xl bg-surface"
    >
      <header
        id="guardian-contact-heading"
        className="mx-2 flex h-16 items-center border-b border-black/10 py-4 pb-3"
      >
        <h2 className="pl-2 text-lg font-bold tracking-tight text-ink">
          {dict.guardianContact}
        </h2>
      </header>

      <dl className="space-y-6 px-4 py-5">
        <GuardianBlock guardian={primary} dict={dict} isPrimary />

        {others.map((g, i) => (
          <div
            key={`${g.email ?? g.name}-${i}`}
            className="border-t border-black/10 pt-5"
          >
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted">
              {dict.guardianOther}
            </p>
            <GuardianBlock guardian={g} dict={dict} isPrimary={false} />
          </div>
        ))}
      </dl>
    </section>
  );
}
