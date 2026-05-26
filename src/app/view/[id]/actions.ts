"use server";

import { revalidatePath } from "next/cache";

import { savePetImage, SaveImageException } from "@/lib/blobs";
import { setPet } from "@/lib/repository";
import type { Pet, Guardian, Phone, PhoneChannel, SocialPlatform } from "@/types/pet";

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "instagram",
  "x",
  "facebook",
  "tiktok",
];

const PHONE_CHANNELS: PhoneChannel[] = ["call", "whatsapp"];

const MAX_GUARDIANS = 4;

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

function readGuardian(form: FormData, i: number): Guardian | null {
  const p = `g${i}_`;
  const name = readString(form, `${p}name`);
  if (!name) return null;

  const display = readString(form, `${p}phone`);
  if (!display) return null;

  const phone: Phone = {
    e164: toE164Brazil(display),
    display,
    channels: PHONE_CHANNELS.filter((ch) => form.get(`${p}phone_${ch}`) === "on"),
  };

  const social: Partial<Record<SocialPlatform, string>> = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const raw = readString(form, `${p}social_${platform}`);
    if (raw) social[platform] = raw.replace(/^@+/, "");
  }

  const email = readString(form, `${p}email`);

  return {
    name,
    ...(email ? { email } : {}),
    phones: [phone],
    social,
  };
}

export async function submitPet(
  hashId: string,
  _prev: SubmitState,
  form: FormData,
): Promise<SubmitState> {
  const name = readString(form, "name");
  const birthdate = readString(form, "birthdate");
  const pictureField = form.get("picture");

  if (!name || !birthdate) {
    return { status: "error", message: "missing_fields" };
  }
  if (!(pictureField instanceof File) || pictureField.size === 0) {
    return { status: "error", message: "invalid_picture" };
  }
  const parsed = new Date(birthdate);
  if (Number.isNaN(parsed.getTime())) {
    return { status: "error", message: "invalid_birthdate" };
  }

  const guardians: Guardian[] = [];
  for (let i = 0; i < MAX_GUARDIANS; i++) {
    const guardian = readGuardian(form, i);
    if (!guardian) {
      if (i === 0) return { status: "error", message: "missing_fields" };
      break;
    }
    guardians.push(guardian);
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
    guardians,
  };

  await setPet(hashId, pet);
  revalidatePath(`/view/${hashId}`);

  return { status: "success" };
}
