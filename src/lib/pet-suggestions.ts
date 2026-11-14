/**
 * Suggestion lists for the free-text pet fields (breed, allergies). They only
 * feed the registration form's dropdown — the stored value is whatever the
 * user typed, so a breed or allergy missing here is still accepted.
 *
 * Pure data, client-safe (like `i18n.ts`).
 */

import type { PetSpecies } from "@/types/pet";
import type { Locale } from "./i18n";

type Entry = Readonly<Record<Locale, string>>;

/** Entry whose name is the same in every locale unless `en` says otherwise. */
const e = (ptBR: string, enUS: string = ptBR): Entry => ({ "pt-BR": ptBR, "en-US": enUS });

/** Shown first and not subject to the alphabetical order — the safe default for a rescue pet. */
const MIXED_BREED: Entry = e("SRD (sem raça definida)", "Mixed breed");

/**
 * Breeds per kind of pet. A `Record` over `PetSpecies` on purpose: adding a
 * species to `PET_SPECIES` fails to compile until it has a list here (an empty
 * one is fine — the dropdown then offers only the mixed-breed option).
 */
const BREEDS: Record<PetSpecies, readonly Entry[]> = {
  dog: [
    e("Akita"),
    e("Basset Hound"),
    e("Beagle"),
    e("Boiadeiro de Berna", "Bernese Mountain Dog"),
    e("Border Collie"),
    e("Boxer"),
    e("Bulldog Francês", "French Bulldog"),
    e("Bulldog Inglês", "English Bulldog"),
    e("Chihuahua"),
    e("Chow Chow"),
    e("Cocker Spaniel"),
    e("Dachshund (Salsicha)", "Dachshund"),
    e("Dálmata", "Dalmatian"),
    e("Dobermann"),
    e("Golden Retriever"),
    e("Husky Siberiano", "Siberian Husky"),
    e("Jack Russell Terrier"),
    e("Labrador Retriever"),
    e("Lhasa Apso"),
    e("Maltês", "Maltese"),
    e("Pastor Alemão", "German Shepherd"),
    e("Pastor Australiano", "Australian Shepherd"),
    e("Pastor Belga", "Belgian Shepherd"),
    e("Pastor de Shetland", "Shetland Sheepdog"),
    e("Pinscher", "Miniature Pinscher"),
    e("Pit Bull"),
    e("Poodle"),
    e("Pug"),
    e("Rottweiler"),
    e("Samoieda", "Samoyed"),
    e("Schnauzer"),
    e("Shar-pei"),
    e("Shih Tzu"),
    e("Spitz Alemão (Lulu da Pomerânia)", "Pomeranian (German Spitz)"),
    e("Yorkshire Terrier"),
  ],
  cat: [
    e("Abissínio", "Abyssinian"),
    e("Angorá", "Angora"),
    e("Azul Russo", "Russian Blue"),
    e("Bengal"),
    e("Birmanês", "Birman"),
    e("British Shorthair"),
    e("Maine Coon"),
    e("Norueguês da Floresta", "Norwegian Forest Cat"),
    e("Persa", "Persian"),
    e("Ragdoll"),
    e("Scottish Fold"),
    e("Siamês", "Siamese"),
    e("Sphynx"),
  ],
};

const ALLERGIES: readonly Entry[] = [
  // Food
  e("Frango", "Chicken"),
  e("Carne bovina", "Beef"),
  e("Carne de porco", "Pork"),
  e("Cordeiro", "Lamb"),
  e("Peixe", "Fish"),
  e("Ovo", "Egg"),
  e("Laticínios", "Dairy"),
  e("Trigo", "Wheat"),
  e("Milho", "Corn"),
  e("Soja", "Soy"),
  // Environment
  e("Pólen", "Pollen"),
  e("Ácaros", "Dust mites"),
  e("Poeira", "Dust"),
  e("Mofo", "Mold"),
  e("Grama", "Grass"),
  // Parasites and stings
  e("Picada de pulga (DAPP)", "Flea bites"),
  e("Picada de inseto", "Insect stings"),
  // Medication and products
  e("Penicilina", "Penicillin"),
  e("Anti-inflamatórios", "Anti-inflammatories"),
  e("Produtos de limpeza", "Cleaning products"),
  e("Shampoo"),
];

function sorted(entries: readonly Entry[], locale: Locale): string[] {
  return entries.map((entry) => entry[locale]).sort((a, b) => a.localeCompare(b, locale));
}

/**
 * Breed suggestions in `locale`: the mixed-breed option first, then A–Z.
 * With a `species`, only that kind's breeds; without one (the tutor hasn't
 * picked yet) every kind's, so the dropdown is never empty.
 */
export function getBreedSuggestions(locale: Locale, species?: PetSpecies): string[] {
  const entries = species ? BREEDS[species] : Object.values(BREEDS).flat();
  return [MIXED_BREED[locale], ...sorted(entries, locale)];
}

/** Allergy suggestions in `locale`, A–Z. */
export function getAllergySuggestions(locale: Locale): string[] {
  return sorted(ALLERGIES, locale);
}
