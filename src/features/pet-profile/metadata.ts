import type { Metadata } from "next";

import { getDictionary, type Locale } from "@/lib/i18n";
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
 * Search engines stay out (`noindex`; link previews ignore it). Only the pet's
 * name and photo appear — nothing about the guardian. Unknown and still-reserved
 * tags get a generic preview with no pet data.
 */
export function petMetadata(entry: PetEntry, locale: Locale): Metadata {
  const robots = { index: false, follow: false } as const;
  const ogLocale = OG_LOCALE[locale];

  if (entry.status === "missing" || entry.status === "reserved") {
    return {
      title: SITE_NAME,
      robots,
      openGraph: { type: "website", siteName: SITE_NAME, locale: ogLocale, title: SITE_NAME },
    };
  }

  const { pet } = entry;
  const title = `${pet.name} · ${SITE_NAME}`;
  const description = getDictionary(locale).ogDescription(pet.name);
  const image = ogImagePath(pet.pictureUrl);

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
      images: [{ url: image, alt: pet.name }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
