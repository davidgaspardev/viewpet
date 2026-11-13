import Link from "next/link";

import { getDictionary, type Locale } from "@/lib/i18n";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/utils/routes";

/** Links to the Terms of Use and the Privacy Policy, for the footers of the home and of the pet page. */
export function LegalLinks({ locale, className = "" }: { locale: Locale; className?: string }) {
  const dict = getDictionary(locale);
  const linkClass = "underline-offset-2 hover:underline";

  return (
    <nav aria-label={dict.legalNavLabel} className={`flex flex-wrap gap-x-5 gap-y-1 ${className}`}>
      <Link href={TERMS_PATH} className={linkClass}>
        {dict.legalTerms}
      </Link>
      <Link href={PRIVACY_PATH} className={linkClass}>
        {dict.legalPrivacy}
      </Link>
    </nav>
  );
}
