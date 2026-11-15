"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { localeToSwitchTo, type Locale } from "@/lib/i18n";

type LocaleSyncProps = {
  /** The language the server rendered this page in. */
  locale: Locale;
  /** The URL already says which language to use (`?lang=`), so nothing is second-guessed. */
  explicit: boolean;
};

/**
 * Checks the page's language against the browser's own language list. The
 * server decides from the `Accept-Language` header, which some phones send in a
 * shape it can't read, so it can fall back to the wrong language; when the
 * browser says otherwise this reloads the page once with `?lang=`.
 */
export function LocaleSync({ locale, explicit }: LocaleSyncProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
    const next = localeToSwitchTo(locale, languages, explicit);
    if (!next) return;
    const params = new URLSearchParams(window.location.search);
    params.set("lang", next);
    router.replace(`${pathname}?${params}`, { scroll: false });
  }, [locale, explicit, pathname, router]);

  return null;
}
