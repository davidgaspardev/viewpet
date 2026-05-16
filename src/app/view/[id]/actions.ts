"use server";

import { revalidatePath } from "next/cache";

import { savePetImage, SaveImageException } from "@/lib/blobs";
import { setPet } from "@/lib/kvs";
import type { Pet, SocialHandles, SocialPlatform } from "@/types/pet";

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

function readString(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function pruneSocial(form: FormData): SocialHandles | undefined {
  const social: SocialHandles = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const raw = readString(form, `social_${platform}`);
    if (!raw) continue;
    social[platform] = raw.replace(/^@+/, "");
  }
  return Object.keys(social).length ? social : undefined;
}

/**
 * Server Action invoked by PetForm. Validates the payload, persists the
 * uploaded image to blob storage, writes the pet record to the mock KVS
 * and revalidates the path so the page re-renders into the "filled"
 * state on the very next request.
 */
export async function submitPet(
  hashId: string,
  _prev: SubmitState,
  form: FormData,
): Promise<SubmitState> {
  const name = readString(form, "name");
  const birthdate = readString(form, "birthdate");
  const guardianName = readString(form, "guardianName");
  const guardianEmail = readString(form, "guardianEmail");
  const guardianPhone = readString(form, "guardianPhone");
  const pictureField = form.get("picture");

  if (!name || !birthdate || !guardianName || !guardianEmail || !guardianPhone) {
    return { status: "error", message: "missing_fields" };
  }
  if (!(pictureField instanceof File) || pictureField.size === 0) {
    return { status: "error", message: "invalid_picture" };
  }
  // Accept date inputs (YYYY-MM-DD) and full ISO strings.
  const parsed = new Date(birthdate);
  if (Number.isNaN(parsed.getTime())) {
    return { status: "error", message: "invalid_birthdate" };
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
    picture: pictureUrl,
    birthdate: parsed.toISOString(),
    guardian: {
      name: guardianName,
      email: guardianEmail,
      phone: guardianPhone,
      social: pruneSocial(form),
    },
  };

  await setPet(hashId, pet);
  revalidatePath(`/view/${hashId}`);

  return { status: "success" };
}
