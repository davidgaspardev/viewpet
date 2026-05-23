"use server";

import { revalidatePath } from "next/cache";

import { savePetImage, SaveImageException } from "@/lib/blobs";
import { setPet } from "@/lib/kvs";
import type { PetPublicProfile, Phone, PhoneChannel, SocialPlatform } from "@/types/pet";

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "instagram",
  "x",
  "facebook",
  "tiktok",
];

const PHONE_CHANNELS: PhoneChannel[] = ["call", "whatsapp", "sms"];

export type SubmitState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function readString(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function toE164Brazil(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

function readPhone(form: FormData): Phone | null {
  const display = readString(form, "guardianPhone");
  if (!display) return null;
  const e164 = toE164Brazil(display);
  const channels = PHONE_CHANNELS.filter(
    (ch) => form.get(`guardianPhone_${ch}`) === "on",
  );
  return { e164, display, channels };
}

function readSocial(form: FormData) {
  const social: Partial<Record<SocialPlatform, string>> = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const raw = readString(form, `social_${platform}`);
    if (!raw) continue;
    social[platform] = raw.replace(/^@+/, "");
  }
  return social;
}

export async function submitPet(
  hashId: string,
  _prev: SubmitState,
  form: FormData,
): Promise<SubmitState> {
  const name = readString(form, "name");
  const birthdate = readString(form, "birthdate");
  const guardianName = readString(form, "guardianName");
  const guardianEmail = readString(form, "guardianEmail");
  const phone = readPhone(form);
  const pictureField = form.get("picture");

  if (!name || !birthdate || !guardianName || !phone) {
    return { status: "error", message: "missing_fields" };
  }
  if (!(pictureField instanceof File) || pictureField.size === 0) {
    return { status: "error", message: "invalid_picture" };
  }
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

  const pet: PetPublicProfile = {
    name,
    pictureUrl,
    birthdate: parsed.toISOString(),
    status: "active",
    guardians: [
      {
        name: guardianName,
        ...(guardianEmail ? { email: guardianEmail } : {}),
        phones: [phone],
        social: readSocial(form),
      },
    ],
  };

  await setPet(hashId, pet);
  revalidatePath(`/view/${hashId}`);

  return { status: "success" };
}
