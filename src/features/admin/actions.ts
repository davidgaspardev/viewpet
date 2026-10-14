"use server";

import { headers } from "next/headers";

import { PetRepositoryFactory, type PetEntrySummaryItem } from "@/lib/repository";
import { generateHashId } from "@/lib/utils/ids";

import { isAdminAuthorized } from "./auth";
import { reserveFreshId } from "./reserve";

export type ReserveIdResult =
  | { status: "success"; entry: PetEntrySummaryItem }
  | { status: "error"; message: "unauthorized" | "generation_failed" };

/**
 * Reserve a fresh pet id. The id is stored as a `reserved` entry, so scanning
 * the printed code lands on the registration form. The QR itself is rendered
 * by the client from the id — nothing but the entry is returned.
 */
export async function reserveId(): Promise<ReserveIdResult> {
  // The middleware already guards /admin; re-check here since server actions
  // are plain POST endpoints.
  if (!(await isAdminAuthorized((await headers()).get("authorization")))) {
    return { status: "error", message: "unauthorized" };
  }

  const id = await reserveFreshId(PetRepositoryFactory.getInstance(), generateHashId);
  if (!id) return { status: "error", message: "generation_failed" };

  const now = new Date().toISOString();
  return { status: "success", entry: { id, status: "reserved", createdAt: now, updatedAt: now } };
}
