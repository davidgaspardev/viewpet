import type { Metadata } from "next";

import { PAGE_META } from "@/features/home/content";
import { demoTagHref } from "@/features/home/demo";
import { FinalCta } from "@/features/home/components/FinalCta";
import { Hero } from "@/features/home/components/Hero";
import { HomeFooter } from "@/features/home/components/HomeFooter";
import { HomeHeader } from "@/features/home/components/HomeHeader";
import { HowItWorksSection } from "@/features/home/components/HowItWorksSection";
import { PetPageSection } from "@/features/home/components/PetPageSection";
import { TagSection } from "@/features/home/components/TagSection";
import { OG_LOCALE, SITE_NAME } from "@/features/pet-profile/metadata";
import { parseBaseUrl } from "@/lib/utils/base-url";

// Built once and regenerated at most hourly: the example link, the QR target
// and the copyright year follow the environment without waiting for a deploy.
export const revalidate = 3600;

// The QR host (qr.viewpet.info) is served by the same app, so say which URL is
// the page's own. Left out when `SITE_URL` is not set.
const siteUrl = parseBaseUrl(process.env.SITE_URL) || undefined;

export const metadata: Metadata = {
  title: PAGE_META.title,
  description: PAGE_META.description,
  ...(siteUrl && { alternates: { canonical: siteUrl } }),
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: OG_LOCALE["pt-BR"],
    title: PAGE_META.title,
    description: PAGE_META.description,
  },
  twitter: { card: "summary", title: PAGE_META.title, description: PAGE_META.description },
};

/** Marketing home: what ViewPet is, how the tag works, and what the pet page shows. */
export default async function HomePage() {
  const demoHref = await demoTagHref(process.env.DEMO_TAG_ID);

  return (
    <>
      <HomeHeader demoHref={demoHref} />
      <main data-smooth-scroll>
        <Hero demoHref={demoHref} />
        <HowItWorksSection />
        <PetPageSection />
        <TagSection />
        <FinalCta demoHref={demoHref} />
      </main>
      <HomeFooter />
    </>
  );
}
