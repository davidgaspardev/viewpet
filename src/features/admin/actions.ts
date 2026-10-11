"use server";

import { headers } from "next/headers";

import { PetRepositoryFactory } from "@/lib/repository";
import { LOGO_DATA_URI } from "@/lib/qrcode/logo";
import { renderQrSvg } from "@/lib/qrcode/render";
import { generateHashId } from "@/lib/utils/ids";

import { isAdminAuthorized } from "./auth";
import { reserveFreshId } from "./reserve";

export type GeneratedQr = {
  id: string;
  url: string;
  svg: string;
};

export type GenerateQrResult =
  | { status: "success"; qr: GeneratedQr }
  | { status: "error"; message: "unauthorized" | "generation_failed" };

/** Public origin used inside the QR: `SITE_URL` when set, else the request's own origin. */
async function resolveOrigin(): Promise<string> {
  const configured = process.env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
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

  const id = await reserveFreshId(PetRepositoryFactory.getInstance(), generateHashId);
  if (!id) return { status: "error", message: "generation_failed" };

  const url = `${await resolveOrigin()}/view/${id}`;
  const svg = renderQrSvg(url, { logoHref: LOGO_DATA_URI });
  return { status: "success", qr: { id, url, svg } };
}
