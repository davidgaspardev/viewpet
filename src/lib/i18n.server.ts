import "server-only";

import { headers } from "next/headers";

import { DEFAULT_LOCALE, localeFromLanguages, normalizeLocale, parseAcceptLanguage, type Locale } from "./i18n";

/**
 * Resolve locale from (in order): explicit override (e.g. ?lang=pt or ?lang=pt-BR),
 * Accept-Language header, then default. Server-only because it touches
 * request headers — Client Components should import dictionary helpers
 * from `./i18n` instead.
 *
 * Supports both full locale codes (pt-BR, en-US) and legacy simplified codes (pt, en).
 */
export async function resolveLocale(override?: string): Promise<Locale> {
  // Try explicit override first (e.g., ?lang=pt or ?lang=pt-BR)
  if (override) {
    const normalized = normalizeLocale(override);
    if (normalized) return normalized;
  }

  try {
    const h = await headers();
    // "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7" → the first supported tag, by preference.
    const preferred = localeFromLanguages(parseAcceptLanguage(h.get("accept-language") ?? ""));
    if (preferred) return preferred;
  } catch {
    // headers() can throw in non-request contexts; ignore.
  }

  return DEFAULT_LOCALE;
}
