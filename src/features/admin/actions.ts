"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";

import { PetRepositoryFactory } from "@/lib/repository";
import { renderQrSvg } from "@/lib/qrcode/render";
import { generateHashId } from "@/lib/utils/ids";

import { isAdminAuthorized } from "./auth";

export type GeneratedQr = {
  id: string;
  url: string;
  svg: string;
};

export type GenerateQrResult =
  | { status: "success"; qr: GeneratedQr }
  | { status: "error"; message: "unauthorized" | "generation_failed" };

const MAX_ID_ATTEMPTS = 5;

/** Public origin used inside the QR: `SITE_URL` when set, else the request's own origin. */
async function resolveOrigin(): Promise<string> {
  const configured = process.env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function loadLogoHref(): Promise<string> {
  const svg = await readFile(path.join(process.cwd(), "public", "logo.svg"));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

/**
 * Reserve a fresh pet id and return its QR code. The id is stored as an
 * empty entry, so scanning the printed code lands on the registration form.
 */
export async function generateQr(): Promise<GenerateQrResult> {
  // The middleware already guards /admin; re-check here since server actions
  // are plain POST endpoints.
  if (!(await isAdminAuthorized((await headers()).get("authorization")))) {
    return { status: "error", message: "unauthorized" };
  }

  const repository = PetRepositoryFactory.getInstance();

  let id: string | undefined;
  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS && !id; attempt++) {
    const candidate = generateHashId();
    // reservePetId is an idempotent upsert, so look first to never "reserve"
    // an id that already belongs to someone.
    if ((await repository.getPetEntry(candidate)).status === "missing") id = candidate;
  }
  if (!id) return { status: "error", message: "generation_failed" };

  await repository.reservePetId(id);

  const url = `${await resolveOrigin()}/view/${id}`;
  const svg = renderQrSvg(url, { logoHref: await loadLogoHref() });
  return { status: "success", qr: { id, url, svg } };
}
