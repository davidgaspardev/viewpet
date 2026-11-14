import {
  collapseWhitespace,
  normalizeAbout,
  normalizeAllergies,
  normalizeBreed,
  normalizeWeight,
  parseNeutered,
} from "@/lib/utils/pet-details";
import { isPetSpecies, type PetSpecies } from "@/types/pet";

/** The pet fields that go beyond name / gender / picture / birthdate. */
export type PetDetails = {
  species: PetSpecies;
  breed?: string;
  weightKg?: number;
  neutered?: boolean;
  allergies?: string[];
  about?: string;
};

export type ParsedPetDetails =
  | { ok: true; details: PetDetails }
  /** `missing_fields`: species left empty. `invalid_details`: a value over its limit. */
  | { ok: false; error: "missing_fields" | "invalid_details" };

function strings(form: FormData, key: string): string[] {
  return form.getAll(key).filter((v): v is string => typeof v === "string");
}

/**
 * Reads species (required), breed, weight, neutered, allergies (repeated
 * `allergies` fields) and about (all optional) from the registration form.
 * Not part of `actions.ts` because a `"use server"` module may only export
 * async functions.
 */
export function parsePetDetails(form: FormData): ParsedPetDetails {
  // An unknown species is a tampered request: the form only offers `PET_SPECIES`.
  const [speciesRaw = ""] = strings(form, "species");
  if (!isPetSpecies(speciesRaw)) return { ok: false, error: "missing_fields" };

  const [breedRaw = ""] = strings(form, "breed");
  // Blank is "not provided"; only a non-blank value over the limit is an error.
  const breed = collapseWhitespace(breedRaw) ? normalizeBreed(breedRaw) : undefined;
  if (collapseWhitespace(breedRaw) && !breed) return { ok: false, error: "invalid_details" };

  const [weightRaw = ""] = strings(form, "weight");
  const weight = normalizeWeight(weightRaw);
  if (!weight.ok) return { ok: false, error: "invalid_details" };

  const [neuteredRaw = ""] = strings(form, "neutered");
  const neutered = parseNeutered(neuteredRaw);

  const allergies = normalizeAllergies(strings(form, "allergies"));
  if (!allergies.ok) return { ok: false, error: "invalid_details" };

  const [aboutRaw = ""] = strings(form, "about");
  const about = normalizeAbout(aboutRaw);
  if (!about.ok) return { ok: false, error: "invalid_details" };

  return {
    ok: true,
    details: {
      species: speciesRaw,
      ...(breed ? { breed } : {}),
      ...(weight.weightKg !== undefined ? { weightKg: weight.weightKg } : {}),
      // `false` is a real answer ("not neutered"); only `undefined` is left out.
      ...(neutered !== undefined ? { neutered } : {}),
      ...(allergies.allergies.length > 0 ? { allergies: allergies.allergies } : {}),
      ...(about.about ? { about: about.about } : {}),
    },
  };
}
