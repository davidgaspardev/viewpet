/**
 * Backward-compatible facade for KVS operations.
 *
 * This file maintains the original public API while delegating to the
 * appropriate KVS provider (Redis, Memory, etc.) via the factory pattern.
 *
 * Three states are exposed via `getPetEntry`:
 *   - "missing": key not registered                  (→ 404)
 *   - "empty"  : key registered with a `null` value  (→ render form)
 *   - "filled" : key registered with full PetPublicProfile data   (→ render profile)
 *
 * The public surface remains identical to the original implementation,
 * maintaining backward compatibility with existing code.
 */

import type { PetPublicProfile, PetEntry } from "@/types/pet";
import { getDatabaseProvider } from "./database";

/**
 * Get pet entry by hash ID.
 *
 * @param hashId - Unique identifier for this pet
 * @returns PetPublicProfile entry with status discriminator
 */
export async function getPetEntry(hashId: string): Promise<PetEntry> {
  const provider = getDatabaseProvider();
  return provider.getPetEntry(hashId);
}

/**
 * Save a complete pet record.
 *
 * @param hashId - Unique identifier for this pet
 * @param pet - Complete pet data to persist
 */
export async function setPet(hashId: string, pet: PetPublicProfile): Promise<void> {
  const provider = getDatabaseProvider();
  return provider.setPet(hashId, pet);
}

/**
 * Reserve a hashId without data — useful to demo/test the "empty" state.
 *
 * @param hashId - Unique identifier to reserve
 */
export async function reservePetId(hashId: string): Promise<void> {
  const provider = getDatabaseProvider();
  return provider.reservePetId(hashId);
}

/**
 * List all registered pet IDs.
 *
 * @returns Array of hash IDs (both empty and filled)
 */
export async function listPetIds(): Promise<string[]> {
  const provider = getDatabaseProvider();
  return provider.listPetIds();
}

/**
 * Lightweight summary for the landing list.
 *
 * @returns Array of pet summaries with ID, status, and name (if filled)
 */
export async function listPetEntries(): Promise<
  Array<{ id: string; status: PetEntry["status"]; name?: string }>
> {
  const provider = getDatabaseProvider();
  return provider.listPetEntries();
}
