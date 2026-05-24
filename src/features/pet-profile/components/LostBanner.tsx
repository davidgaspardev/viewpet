import type {
  Guardian,
  PetPublicProfile,
  Phone,
  PhoneChannel,
} from "@/types/pet";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";
import {
  AlertTriangleIcon,
  PhoneIcon,
  UsersIcon,
  WhatsAppIcon,
} from "@/ui/icons";

type LostBannerProps = {
  /** Must already have status === "lost"; the parent decides when to render. */
  pet: PetPublicProfile;
  locale: Locale;
};

function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  return trimmed.split(/\s+/)[0] || trimmed;
}

function findPhone(
  guardian: Guardian,
  channel: PhoneChannel,
): Phone | undefined {
  return guardian.phones.find((p) => p.channels.includes(channel));
}

/**
 * Top-of-page banner shown on a lost pet's public profile. Designed for the
 * finder ("achador") who just scanned the QR — strong visual alert and a
 * single, unmissable call CTA. WhatsApp and "outro tutor" are deliberately
 * secondary so they don't compete for attention with the call.
 *
 * Sticky so it stays accessible while the finder scrolls to confirm the
 * pet's appearance.
 */
export function LostBanner({ pet, locale }: LostBannerProps) {
  const dict = getDictionary(locale);
  const primary = pet.guardians[0];
  if (!primary) return null;

  const callPhone = findPhone(primary, "call");
  const whatsappPhone = findPhone(primary, "whatsapp");
  const hasOthers = pet.guardians.length > 1;

  return (
    <div className="sticky top-0 z-30 bg-red-700 text-white shadow-[0_4px_12px_rgba(0,0,0,0.12)]">
      <div className="px-5 pb-6 pt-5">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
          <AlertTriangleIcon className="h-3.5 w-3.5" />
          {dict.lostBadge}
        </div>

        <h2 className="text-xl font-bold leading-tight">
          {dict.lostHeadline(pet.name)}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-white/85">
          {dict.lostBody}
        </p>

        {callPhone && (
          <a
            href={`tel:+${callPhone.e164}`}
            className="mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-white text-base font-semibold text-red-900 transition active:scale-[0.98]"
          >
            <PhoneIcon className="h-5 w-5" />
            {dict.lostCallPrimary(firstName(primary.name))}
          </a>
        )}

        {(whatsappPhone || hasOthers) && (
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            {whatsappPhone && (
              <a
                href={`https://wa.me/${whatsappPhone.e164}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-white/90 transition hover:text-white"
              >
                <WhatsAppIcon className="h-4 w-4" />
                {dict.lostWhatsApp}
              </a>
            )}
            {whatsappPhone && hasOthers && (
              <span className="text-white/30">·</span>
            )}
            {hasOthers && (
              <a
                href="#guardians"
                className="inline-flex items-center gap-1.5 text-white/90 transition hover:text-white"
              >
                <UsersIcon className="h-4 w-4" />
                {dict.lostOtherGuardian}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
