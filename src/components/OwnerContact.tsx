import type { Owner } from "@/types/pet";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";
import { SocialLinks } from "./SocialLinks";

type OwnerContactProps = {
  owner: Owner;
  locale: Locale;
};

export function OwnerContact({ owner, locale }: OwnerContactProps) {
  const dict = getDictionary(locale);
  const hasSocial =
    !!owner.social &&
    Object.values(owner.social).some((value) => value?.trim());

  return (
    <section
      aria-labelledby="owner-contact-heading"
      className="rounded-xl bg-surface px-6 py-6"
    >
      <h2
        id="owner-contact-heading"
        className="border-b border-black/10 pb-3 text-lg font-bold tracking-tight text-ink"
      >
        {dict.ownerContact}
      </h2>

      <dl className="mt-4 space-y-4">
        <Field label={dict.name} value={owner.name} />
        <Field
          label={dict.email}
          value={owner.email}
          href={`mailto:${owner.email}`}
        />
        <Field
          label={dict.cellphone}
          value={owner.phone}
          href={`tel:${owner.phone.replace(/\D/g, "")}`}
        />
      </dl>

      {hasSocial && (
        <div className="mt-5 border-t border-black/10 pt-4">
          <p className="mb-3 text-xs font-medium text-muted">{dict.social}</p>
          <SocialLinks social={owner.social} />
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold text-ink">
        {href ? (
          <a href={href} className="hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
