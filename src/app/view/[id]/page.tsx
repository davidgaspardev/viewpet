import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getPetEntry } from "@/lib/repository";
import { formatAge } from "@/lib/utils/age";
import { resolveLocale } from "@/lib/i18n.server";
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
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const entry = await getPetEntry(id);
  if (entry.status !== "filled") return { title: "View Pet" };
  return {
    title: `${entry.pet.name} · View Pet`,
    description: `Página pública de ${entry.pet.name}.`,
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

  const entry = await getPetEntry(id);
  if (entry.status === "missing") notFound();

  const locale = await resolveLocale(lang);

  if (entry.status === "empty") {
    return <PetForm hashId={id} locale={locale} />;
  }

  const pet = entry.pet;
  const ageLabel = formatAge(pet.birthdate, locale);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-white">
      {pet.status === "lost" && <LostBanner pet={pet} locale={locale} />}

      <PetHero name={pet.name} pictureUrl={pet.pictureUrl} ageLabel={ageLabel} />

      <div className="px-4 pt-8">
        <GuardianContact guardians={pet.guardians} locale={locale} />
      </div>

      <div className="mt-auto flex justify-center py-14 text-muted/30">
        <Logo className="h-28 w-28" />
      </div>
    </main>
  );
}
