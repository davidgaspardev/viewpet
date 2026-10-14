import type { Metadata } from "next";

import { getDictionary, type Locale } from "@/lib/i18n";
import { resolveOrigin, type HeaderReader } from "@/lib/utils/origin";
import type { PetEntry } from "@/types/pet";

const SITE_NAME = "View Pet";

const OG_LOCALE: Record<Locale, string> = { "pt-BR": "pt_BR", "en-US": "en_US" };

/** Width, in px, of the preview image: well above the ~300px link previews need, still small. */
export const OG_IMAGE_WIDTH = 640;
export const OG_IMAGE_QUALITY = 75;

/**
 * URL for the preview image of a pet photo. Uploads can be several MB and link
 * previews (WhatsApp in particular) tend to drop big images, so the photo goes
 * through Next's image optimizer, which hands back a small JPEG. The optimizer
 * only accepts site-relative paths and https URLs; anything else (e.g. a local
 * http storage emulator) is returned unchanged.
 */
export function ogImagePath(pictureUrl: string): string {
  const optimizable =
    (pictureUrl.startsWith("/") && !pictureUrl.startsWith("//")) || pictureUrl.startsWith("https://");
  if (!optimizable) return pictureUrl;
  return `/_next/image?url=${encodeURIComponent(pictureUrl)}&w=${OG_IMAGE_WIDTH}&q=${OG_IMAGE_QUALITY}`;
}

/**
 * `<head>` metadata for a tag page: title, description, Open Graph and Twitter
 * card (what link previews are built from). `metadataBase` is added by the
 * caller, since turning the relative image path absolute needs the request.
 *
 * Search engines stay out of every state (`noindex`; link previews ignore it,
 * so previews still work). The page is meant to be reached through the QR on
 * the tag, not surfaced by a generic search, and the guardian's phone/email
 * must not be discoverable that way. Only the pet's name and photo appear in
 * the tags — nothing about the guardian. Unknown and still-reserved tags get a
 * generic preview with no pet data.
 */
export function petMetadata(entry: PetEntry, locale: Locale): Metadata {
  const robots = { index: false, follow: false } as const;
  const ogLocale = OG_LOCALE[locale];

  const dict = getDictionary(locale);

  if (entry.status === "missing" || entry.status === "reserved") {
    const description = dict.ogGenericDescription;
    return {
      title: SITE_NAME,
      description,
      robots,
      openGraph: { type: "website", siteName: SITE_NAME, locale: ogLocale, title: SITE_NAME, description },
      twitter: { card: "summary", title: SITE_NAME, description },
    };
  }

  const { pet } = entry;
  const title = `${pet.name} · ${SITE_NAME}`;
  const description = dict.ogDescription(pet.name);
  // No photo (legacy or seeded data): no image tags and a plain summary card,
  // instead of a large card with nothing in it.
  const image = pet.pictureUrl ? ogImagePath(pet.pictureUrl) : undefined;

  return {
    title,
    description,
    robots,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: ogLocale,
      title,
      description,
      ...(image && { images: [{ url: image, alt: pet.name }] }),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image && { images: [image] }),
    },
  };
}

/**
 * `metadataBase` for the tag page: what turns the relative preview-image path
 * into an absolute URL. `SITE_URL` wins; if it is missing or invalid, or the
 * request headers give nothing usable, fall back to the request's own origin
 * rather than leaving Next to default to localhost. Never throws, because a
 * metadata failure would take the whole page down.
 */
export function metadataBaseFor(siteUrl: string | undefined, headers: HeaderReader): URL | undefined {
  const origin = resolveOrigin(siteUrl, headers) ?? resolveOrigin(undefined, headers);
  return origin ? new URL(origin) : undefined;
}
