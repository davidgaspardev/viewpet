"use server";

import { headers } from "next/headers";

import { PetRepositoryFactory } from "@/lib/repository";
import { LOGO_DATA_URI } from "@/lib/qrcode/logo";
import { renderQrSvg } from "@/lib/qrcode/render";
import { generateHashId } from "@/lib/utils/ids";

import { isAdminAuthorized } from "./auth";
import { resolveOrigin } from "./origin";
import { reserveFreshId } from "./reserve";

export type GeneratedQr = {
  id: string;
  url: string;
  svg: string;
};

export type GenerateQrResult =
  | { status: "success"; qr: GeneratedQr }
  | { status: "error"; message: "unauthorized" | "invalid_site_url" | "generation_failed" };

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

  // Resolve (and validate) the origin before touching the database so a bad
  // SITE_URL can't leave reserved ids behind with no QR.
  const origin = resolveOrigin(process.env.SITE_URL, await headers());
  if (!origin) return { status: "error", message: "invalid_site_url" };

  const id = await reserveFreshId(PetRepositoryFactory.getInstance(), generateHashId);
  if (!id) return { status: "error", message: "generation_failed" };

  const url = `${origin}/view/${id}`;
  const svg = renderQrSvg(url, { logoHref: LOGO_DATA_URI, label: id });
  return { status: "success", qr: { id, url, svg } };
}
