import type { Pet, PetEntry } from "@/types/pet";
import { getRedisClient } from "./redis";

/**
 * Redis KVS access layer.
 *
 * Uses Redis as the key-value store with the following pattern:
 *   - Keys: `pet:{hashId}`
 *   - Values: JSON-stringified Pet objects or "null" for empty reservations
 *
 * Three states are exposed via `getPetEntry`:
 *   - "missing": key not registered                  (→ 404)
 *   - "empty"  : key registered with a `null` value  (→ render form)
 *   - "filled" : key registered with full Pet data   (→ render profile)
 *
 * The public surface remains identical to the original file-based implementation,
 * maintaining backward compatibility with existing code.
 */

/** Generate Redis key for a pet hashId */
function getPetKey(hashId: string): string {
  return `pet:${hashId}`;
}

export async function getPetEntry(hashId: string): Promise<PetEntry> {
  const redis = await getRedisClient();
  const key = getPetKey(hashId);
  const value = await redis.get(key);

  if (value === null) {
    return { status: "missing" };
  }

  if (value === "null") {
    return { status: "empty" };
  }

  try {
    const pet = JSON.parse(value) as Pet;
    return { status: "filled", pet };
  } catch (err) {
    console.error(`Failed to parse pet data for ${hashId}:`, err);
    throw new Error(`Invalid pet data for ${hashId}`);
  }
}

export async function setPet(hashId: string, pet: Pet): Promise<void> {
  const redis = await getRedisClient();
  const key = getPetKey(hashId);
  const value = JSON.stringify(pet);
  await redis.set(key, value);
}

/** Reserve a hashId without data — useful to demo/test the "empty" state. */
export async function reservePetId(hashId: string): Promise<void> {
  const redis = await getRedisClient();
  const key = getPetKey(hashId);
  const exists = await redis.exists(key);
  if (!exists) {
    await redis.set(key, "null");
  }
}

export async function listPetIds(): Promise<string[]> {
  const redis = await getRedisClient();
  const keys = await redis.keys("pet:*");
  // Extract hashId from "pet:{hashId}" pattern
  return keys.map((key) => key.slice(4));
}

/** Lightweight summary for the landing list. */
export async function listPetEntries(): Promise<
  Array<{ id: string; status: PetEntry["status"]; name?: string }>
> {
  const redis = await getRedisClient();
  const keys = await redis.keys("pet:*");
  const entries = await Promise.all(
    keys.map(async (key) => {
      const id = key.slice(4); // Extract hashId from "pet:{hashId}"
      const value = await redis.get(key);

      if (value === "null") {
        return { id, status: "empty" as const };
      }

      try {
        const pet = JSON.parse(value!) as Pet;
        return { id, status: "filled" as const, name: pet.name };
      } catch (err) {
        console.error(`Failed to parse pet data for ${id}:`, err);
        return { id, status: "empty" as const };
      }
    }),
  );

  return entries;
}
