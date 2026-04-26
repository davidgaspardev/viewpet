import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getPetEntry } from "@/lib/kvs";
import { formatAge } from "@/lib/age";
import { resolveLocale } from "@/lib/i18n.server";
import { PetHero } from "@/components/PetHero";
import { OwnerContact } from "@/components/OwnerContact";
import { Logo } from "@/components/Logo";

import { PetForm } from "./PetForm";

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

export default async function ViewPetPage({ params, searchParams }: PageProps) {
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
      <PetHero name={pet.name} picture={pet.picture} ageLabel={ageLabel} />

      <div className="px-6 pt-8">
        <OwnerContact owner={pet.owner} locale={locale} />
      </div>

      <div className="mt-auto flex justify-center py-14 text-muted/30">
        <Logo className="h-28 w-28" />
      </div>
    </main>
  );
}
