/**
 * Redis implementation of the KVS provider interface.
 *
 * Uses Redis as the key-value store with the following pattern:
 *   - Keys: `pet:{hashId}`
 *   - Values: JSON-stringified Pet objects or "null" for empty reservations
 *
 * Three states:
 *   - "missing": key not registered                  (→ 404)
 *   - "empty"  : key registered with a `null` value  (→ render form)
 *   - "filled" : key registered with full Pet data   (→ render profile)
 */

import type { IKVSProvider, Pet, PetEntry } from "./interface";
import { getRedisClient } from "../redis";

export class RedisKVSProvider implements IKVSProvider {
  /** Generate Redis key for a pet hashId */
  private getPetKey(hashId: string): string {
    return `pet:${hashId}`;
  }

  async getPetEntry(hashId: string): Promise<PetEntry> {
    const redis = await getRedisClient();
    const key = this.getPetKey(hashId);
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

  async setPet(hashId: string, pet: Pet): Promise<void> {
    const redis = await getRedisClient();
    const key = this.getPetKey(hashId);
    const value = JSON.stringify(pet);
    await redis.set(key, value);
  }

  async reservePetId(hashId: string): Promise<void> {
    const redis = await getRedisClient();
    const key = this.getPetKey(hashId);
    const exists = await redis.exists(key);
    if (!exists) {
      await redis.set(key, "null");
    }
  }

  async listPetIds(): Promise<string[]> {
    const redis = await getRedisClient();
    const keys = await redis.keys("pet:*");
    // Extract hashId from "pet:{hashId}" pattern
    return keys.map((key) => key.slice(4));
  }

  async listPetEntries(): Promise<
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
}
