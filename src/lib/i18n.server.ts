import "server-only";

import { headers } from "next/headers";

import { DEFAULT_LOCALE, isLocale, type Locale } from "./i18n";

/**
 * Resolve locale from (in order): explicit override (e.g. ?lang=pt),
 * Accept-Language header, then default. Server-only because it touches
 * request headers — Client Components should import dictionary helpers
 * from `./i18n` instead.
 */
export async function resolveLocale(override?: string): Promise<Locale> {
  if (override && isLocale(override)) return override;

  try {
    const h = await headers();
    const accept = h.get("accept-language") ?? "";
    const preferred = accept
      .split(",")
      .map((part) => part.trim().split(";")[0].toLowerCase())
      .map((tag) => tag.split("-")[0])
      .find((tag): tag is Locale => isLocale(tag));
    if (preferred) return preferred;
  } catch {
    // headers() can throw in non-request contexts; ignore.
  }

  return DEFAULT_LOCALE;
}
