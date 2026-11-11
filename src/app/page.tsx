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

export const metadata: Metadata = {
  title: PAGE_META.title,
  description: PAGE_META.description,
  openGraph: {
    type: "website",
    siteName: "ViewPet",
    locale: "pt_BR",
    title: PAGE_META.title,
    description: PAGE_META.description,
  },
};

/** Marketing home: what ViewPet is, how the tag works, and what the pet page shows. */
export default function HomePage() {
  const demoHref = demoTagHref();

  return (
    <>
      <HomeHeader demoHref={demoHref} />
      <main>
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
