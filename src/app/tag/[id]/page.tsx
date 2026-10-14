import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PetRepositoryFactory } from "@/lib/repository";
import { formatAge } from "@/lib/utils/age";
import { resolveOrigin } from "@/lib/utils/origin";
import { QR_SCAN_COOKIE, scanSourceFrom } from "@/lib/utils/qr-scan";
import { resolveLocale } from "@/lib/i18n.server";
import { petMetadata } from "@/features/pet-profile/metadata";
import { PetHero } from "@/features/pet-profile/components/PetHero";
import { GuardianContact } from "@/features/pet-profile/components/GuardianContact";
import { LostBanner } from "@/features/pet-profile/components/LostBanner";
import { Logo } from "@/ui/Logo";

import { PetForm } from "@/features/pet-registration/components/PetForm";

// Force dynamic rendering — every page render hits the database
export const dynamic = "force-dynamic";

type Params = { id: string };
type SearchParams = { lang?: string };

type PageProps = {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { lang } = await searchParams;
  const [entry, locale, requestHeaders] = await Promise.all([
    PetRepositoryFactory.getInstance().getPetEntry(id),
    resolveLocale(lang),
    headers(),
  ]);

  // The preview image is a relative path; link previews need it absolute.
  const origin = resolveOrigin(process.env.SITE_URL, requestHeaders);

  return {
    ...petMetadata(entry, locale),
    ...(origin && { metadataBase: new URL(origin) }),
  };
}

/**
 * View a pet's details.
 *
 * @param props
 * @returns
 */
export default async function ViewPetPage(props: PageProps) {
  const { params, searchParams } = props;
  const { id } = await params;
  const { lang } = await searchParams;

  const entry = await PetRepositoryFactory.getInstance().getPetEntry(id);
  if (entry.status === "missing") notFound();

  const locale = await resolveLocale(lang);

  if (entry.status === "reserved") {
    return <PetForm hashId={id} locale={locale} />;
  }

  const pet = entry.pet;
  const ageLabel = formatAge(pet.birthdate, locale);

  // "qr" when this visit just came through the short QR host (see the
  // `qr_scan` cookie set by its redirect), "direct" otherwise. Exposed as a
  // data attribute for now; the lost-pet location report will build on it.
  const scanSource = scanSourceFrom((await cookies()).get(QR_SCAN_COOKIE)?.value);

  return (
    <main data-scan-source={scanSource} className="mx-auto flex min-h-screen max-w-md flex-col bg-white">
      {pet.status === "lost" && <LostBanner pet={pet} locale={locale} />}

      <PetHero name={pet.name} pictureUrl={pet.pictureUrl} ageLabel={ageLabel} gender={pet.gender ?? undefined} />

      <div className="px-4 pt-8">
        <GuardianContact guardians={pet.guardians} locale={locale} />
      </div>

      <div className="mt-auto flex justify-center py-14 text-muted/30">
        <Logo className="h-28 w-28" />
      </div>
    </main>
  );
}
