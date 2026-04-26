import { promises as fs } from "node:fs";
import path from "node:path";

import type { Pet, PetEntry, PetStore } from "@/types/pet";

/**
 * Mock KVS access layer.
 *
 * For the MVP the "store" is a JSON file on disk read at request time so
 * that writes (e.g. from a form submission) are visible on the next read,
 * mirroring how a real KVS (Redis, DynamoDB, Cloudflare KV) would behave.
 *
 * Three states are exposed via `getPetEntry`:
 *   - "missing": key not registered                  (→ 404)
 *   - "empty"  : key registered with a `null` value  (→ render form)
 *   - "filled" : key registered with full Pet data   (→ render profile)
 *
 * Swap the `readStore` / `writeStore` implementations to plug a real KVS
 * later; the public surface stays identical.
 */

const STORE_PATH = path.join(process.cwd(), "src/data/pets.json");

async function readStore(): Promise<PetStore> {
  const raw = await fs.readFile(STORE_PATH, "utf8");
  return JSON.parse(raw) as PetStore;
}

async function writeStore(store: PetStore): Promise<void> {
  const serialized = JSON.stringify(store, null, 2) + "\n";
  await fs.writeFile(STORE_PATH, serialized, "utf8");
}

export async function getPetEntry(hashId: string): Promise<PetEntry> {
  const store = await readStore();
  if (!Object.prototype.hasOwnProperty.call(store, hashId)) {
    return { status: "missing" };
  }
  const value = store[hashId];
  if (value === null || value === undefined) {
    return { status: "empty" };
  }
  return { status: "filled", pet: value };
}

export async function setPet(hashId: string, pet: Pet): Promise<void> {
  const store = await readStore();
  store[hashId] = pet;
  await writeStore(store);
}

/** Reserve a hashId without data — useful to demo/test the "empty" state. */
export async function reservePetId(hashId: string): Promise<void> {
  const store = await readStore();
  if (!Object.prototype.hasOwnProperty.call(store, hashId)) {
    store[hashId] = null;
    await writeStore(store);
  }
}

export async function listPetIds(): Promise<string[]> {
  const store = await readStore();
  return Object.keys(store);
}

/** Lightweight summary for the landing list. */
export async function listPetEntries(): Promise<
  Array<{ id: string; status: PetEntry["status"]; name?: string }>
> {
  const store = await readStore();
  return Object.entries(store).map(([id, value]) => {
    if (value === null || value === undefined) {
      return { id, status: "empty" as const };
    }
    return { id, status: "filled" as const, name: value.name };
  });
}
