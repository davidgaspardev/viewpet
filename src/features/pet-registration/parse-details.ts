import {
  collapseWhitespace,
  normalizeAbout,
  normalizeAllergies,
  normalizeBreed,
} from "@/lib/utils/pet-details";

/** The pet fields that go beyond name / gender / picture / birthdate. */
export type PetDetails = {
  breed: string;
  allergies?: string[];
  about?: string;
};

export type ParsedPetDetails =
  | { ok: true; details: PetDetails }
  /** `missing_fields`: breed left empty. `invalid_details`: a value over its limit. */
  | { ok: false; error: "missing_fields" | "invalid_details" };

function strings(form: FormData, key: string): string[] {
  return form.getAll(key).filter((v): v is string => typeof v === "string");
}

/**
 * Reads breed (required), allergies (repeated `allergies` fields, optional)
 * and about (optional) from the registration form. Not part of `actions.ts`
 * because a `"use server"` module may only export async functions.
 */
export function parsePetDetails(form: FormData): ParsedPetDetails {
  const [breedRaw = ""] = strings(form, "breed");
  if (!collapseWhitespace(breedRaw)) return { ok: false, error: "missing_fields" };
  const breed = normalizeBreed(breedRaw);
  if (!breed) return { ok: false, error: "invalid_details" };

  const allergies = normalizeAllergies(strings(form, "allergies"));
  if (!allergies.ok) return { ok: false, error: "invalid_details" };

  const [aboutRaw = ""] = strings(form, "about");
  const about = normalizeAbout(aboutRaw);
  if (!about.ok) return { ok: false, error: "invalid_details" };

  return {
    ok: true,
    details: {
      breed,
      ...(allergies.allergies.length > 0 ? { allergies: allergies.allergies } : {}),
      ...(about.about ? { about: about.about } : {}),
    },
  };
}
