import type { Guardian, Phone } from "@/types/pet";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";
import { maskPhoneDisplay, telegramUrl, telUrl, whatsappUrl } from "@/lib/utils/phone";
import { ActionButton } from "./ActionButton";
import { SocialLinks } from "./SocialLinks";
import { MailIcon, PhoneIcon, TelegramIcon, WhatsAppIcon } from "@/ui/icons";
import { Tooltip } from "@/ui/Tooltip";

type GuardianContactProps = {
  /** Ordered list — index 0 is the primary guardian, rendered prominently. */
  guardians: Guardian[];
  locale: Locale;
};

/** Label of the `index`-th of `count` numbers: plain when there is one, otherwise main / numbered. */
function phoneLabel(index: number, count: number, dict: ReturnType<typeof getDictionary>): string {
  if (count === 1) return dict.cellphone;
  return index === 0 ? dict.cellphoneMain : dict.cellphoneNumber(index + 1);
}

function PhoneRow({
  phone,
  label,
  showCallHint,
  dict,
}: {
  phone: Phone;
  label: string;
  /** Opens the "tap to call" hint on load — only for one call button per guardian. */
  showCallHint: boolean;
  dict: ReturnType<typeof getDictionary>;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium text-muted">{label}</dt>
        <dd className="mt-0.5 text-base font-semibold text-ink">
          {maskPhoneDisplay(phone.display ?? `+${phone.e164}`)}
        </dd>
      </div>
      <div className="flex gap-2">
        {phone.channels.includes("whatsapp") && (
          <ActionButton
            href={whatsappUrl(phone.e164)}
            ariaLabel={dict.actionWhatsApp}
            variant="outline"
            external
          >
            <WhatsAppIcon className="h-[18px] w-[18px]" />
          </ActionButton>
        )}
        {phone.channels.includes("telegram") && (
          <ActionButton
            href={telegramUrl(phone.e164)}
            ariaLabel={dict.actionTelegram}
            variant="outline"
            external
          >
            <TelegramIcon className="h-[18px] w-[18px]" />
          </ActionButton>
        )}
        {phone.channels.includes("call") && (
          <Tooltip
            label={dict.actionCallTooltip}
            defaultOpen={showCallHint}
            orientation="bottom-left"
            // Only the hint that opens on load can be dismissed; on the others it
            // is a hover/focus tooltip, and a close button there would be unreachable.
            closable={showCallHint}
            closeLabel={dict.close}
          >
            <ActionButton
              href={telUrl(phone.e164)}
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
  const firstCallIndex = guardian.phones.findIndex((p) => p.channels.includes("call"));

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

      {/* Phones — in registration order, so the first one is the primary */}
      {guardian.phones.map((phone, i) => (
        // The index is part of the key: stored data can repeat a number
        // (e.g. a hand-edited document), and duplicate keys drop rows.
        <PhoneRow
          key={`${phone.e164}-${i}`}
          phone={phone}
          label={phoneLabel(i, guardian.phones.length, dict)}
          showCallHint={i === firstCallIndex}
          dict={dict}
        />
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
      id="guardians"
      aria-labelledby="guardian-contact-heading"
      className="scroll-mt-4 rounded-card bg-surface"
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
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">
              {dict.guardianOther}
            </p>
            <GuardianBlock guardian={g} dict={dict} isPrimary={false} />
          </div>
        ))}
      </dl>
    </section>
  );
}
