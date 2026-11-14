"use server";

import { revalidatePath } from "next/cache";

import { parseConsent } from "@/features/legal/consent";
import { savePetImage, SaveImageException } from "@/lib/blobs";
import { PetRepositoryFactory } from "@/lib/repository";
import { tomorrowUtcIso, validateBirthdateIso } from "@/lib/utils/birthdate";
import { isValidEmail } from "@/lib/utils/email";
import { tagPath } from "@/lib/utils/routes";
import { readString } from "./form-data";
import { parsePetDetails } from "./parse-details";
import { parsePhones } from "./parse-phones";
import { MAX_GUARDIANS } from "@/types/pet";
import type { Pet, Guardian, SocialPlatform, PetGender } from "@/types/pet";

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "instagram",
  "x",
  "facebook",
  "tiktok",
];

export type SubmitState = {
  status: "idle" | "success" | "error";
  message?: string;
};

type GuardianResult =
  | { ok: true; guardian: Guardian }
  | {
      ok: false;
      error: "missing_fields" | "invalid_phone" | "invalid_phone_channels" | "invalid_email";
    };

function readGuardian(form: FormData, i: number): GuardianResult {
  const p = `g${i}_`;
  // Caller is responsible for checking name presence before calling this.
  // Fails when the guardian has no usable phone (partial fill).
  const phones = parsePhones(form, p);
  if (!phones.ok) return phones;

  const name = readString(form, `${p}name`);

  const social: Partial<Record<SocialPlatform, string>> = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const raw = readString(form, `${p}social_${platform}`);
    if (raw) social[platform] = raw.replace(/^@+/, "");
  }

  const email = readString(form, `${p}email`);
  // The primary guardian is the contact whoever finds the pet reaches, so their
  // e-mail is required; the second guardian may leave it out. Anyone who does
  // type one gets it checked, required or not.
  if (i === 0 && !email) return { ok: false, error: "missing_fields" };
  if (email && !isValidEmail(email)) return { ok: false, error: "invalid_email" };

  return {
    ok: true,
    guardian: {
      name,
      ...(email ? { email } : {}),
      phones: phones.phones,
      social,
    },
  };
}

export async function submitPet(
  hashId: string,
  _prev: SubmitState,
  form: FormData,
): Promise<SubmitState> {
  // Without the tutor's agreement nothing is processed: not even the picture is saved.
  const consent = parseConsent(form);
  if (!consent) return { status: "error", message: "consent_required" };

  const name = readString(form, "name");
  const birthdate = readString(form, "birthdate");
  const genderRaw = readString(form, "gender");
  const gender: PetGender | undefined =
    genderRaw === "male" || genderRaw === "female" ? genderRaw : undefined;
  const pictureField = form.get("picture");

  if (!name || !birthdate || !gender) {
    return { status: "error", message: "missing_fields" };
  }
  if (!(pictureField instanceof File) || pictureField.size === 0) {
    return { status: "error", message: "invalid_picture" };
  }
  // The form submits a validated `YYYY-MM-DD`; re-check it strictly here. The
  // upper bound is tomorrow (UTC) so a user ahead of UTC can still pick today.
  if (!validateBirthdateIso(birthdate, tomorrowUtcIso()).ok) {
    return { status: "error", message: "invalid_birthdate" };
  }
  const parsed = new Date(birthdate);

  const details = parsePetDetails(form);
  if (!details.ok) return { status: "error", message: details.error };

  const guardians: Guardian[] = [];
  for (let i = 0; i < MAX_GUARDIANS; i++) {
    const name = readString(form, `g${i}_name`);
    if (!name) {
      if (i === 0) return { status: "error", message: "missing_fields" };
      // A secondary guardian with a phone but no name is a partial fill, not an
      // empty card: dropping it would publish without the contact they typed.
      const phones = parsePhones(form, `g${i}_`);
      if (phones.ok || phones.error !== "missing_fields") {
        return { status: "error", message: "missing_fields" };
      }
      break; // secondary guardian completely empty — stop here
    }
    // name present but phone missing → partial fill → validation error
    const guardian = readGuardian(form, i);
    if (!guardian.ok) return { status: "error", message: guardian.error };
    guardians.push(guardian.guardian);
  }

  let pictureUrl: string;
  try {
    pictureUrl = await savePetImage(hashId, pictureField);
  } catch (err) {
    if (err instanceof SaveImageException) {
      const map: Record<string, string> = {
        empty: "invalid_picture",
        invalid_type: "invalid_picture_type",
        too_large: "invalid_picture_size",
      };
      return { status: "error", message: map[err.code] ?? "invalid_picture" };
    }
    throw err;
  }

  const pet: Pet = {
    name,
    pictureUrl,
    birthdate: parsed.toISOString(),
    status: "active",
    gender,
    ...details.details,
    consent,
    guardians,
  };

  await PetRepositoryFactory.getInstance().setPet(hashId, pet);
  revalidatePath(tagPath(hashId));

  return { status: "success" };
}
