import "server-only";

import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "./i18n";

/**
 * Resolve locale from (in order): explicit override (e.g. ?lang=pt or ?lang=pt-BR),
 * then the default (pt-BR). Server-only, so Client Components import dictionary
 * helpers from `./i18n` instead.
 *
 * TEMPORARY: the Accept-Language header is deliberately NOT consulted for now.
 * Some Portuguese-language phones were still getting the English page, so every
 * visitor gets Portuguese unless `?lang=en` asks otherwise. To bring detection
 * back, read `headers().get("accept-language")` and pass it through
 * `parseAcceptLanguage` + `localeFromLanguages` (both still in `./i18n`) before
 * falling back to DEFAULT_LOCALE.
 *
 * Supports both full locale codes (pt-BR, en-US) and legacy simplified codes (pt, en).
 */
export async function resolveLocale(override?: string): Promise<Locale> {
  // Try explicit override first (e.g., ?lang=pt or ?lang=pt-BR)
  if (override) {
    const normalized = normalizeLocale(override);
    if (normalized) return normalized;
  }

  return DEFAULT_LOCALE;
}
