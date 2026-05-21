import type { Guardian, Phone } from "@/types/pet";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";
import { ActionButton } from "./ActionButton";
import { SocialLinks } from "./SocialLinks";
import { MailIcon, PhoneIcon, WhatsAppIcon } from "@/ui/icons";

type GuardianContactProps = {
  guardian: Guardian;
  locale: Locale;
};

function PhoneRow({ phone, dict }: { phone: Phone; dict: ReturnType<typeof getDictionary> }) {
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
          <ActionButton
            href={`tel:+${phone.e164}`}
            ariaLabel={dict.actionCall}
            variant="filled"
          >
            <PhoneIcon className="h-[18px] w-[18px]" />
          </ActionButton>
        )}
      </div>
    </div>
  );
}

export function GuardianContact({ guardian, locale }: GuardianContactProps) {
  const dict = getDictionary(locale);
  const hasSocial = Object.values(guardian.social).some((v) => v?.trim());

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

      <dl className="px-4 py-5 space-y-5">
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
