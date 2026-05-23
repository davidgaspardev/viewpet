/**
 * KVS provider interface for pet data persistence.
 *
 * Enables dependency inversion: high-level code depends on this interface
 * rather than concrete implementations (MongoDB, local JSON, etc.)
 */

import type { PetPublicProfile, PetEntry } from "@/types/pet";

/**
 * Interface for key-value store providers.
 *
 * All implementations must support:
 * - Three-state system: missing, empty (reserved), filled
 * - Atomic get/set operations
 * - PetPublicProfile ID reservation without data
 * - Listing operations for admin/debugging
 */
export interface IKVSProvider {
  /**
   * Get pet entry by hash ID.
   *
   * @param hashId - Unique identifier for this pet
   * @returns PetPublicProfile entry with status discriminator:
   *   - "missing": key not registered (→ 404)
   *   - "empty": key registered with null value (→ render form)
   *   - "filled": key registered with full PetPublicProfile data (→ render profile)
   */
  getPetEntry(hashId: string): Promise<PetEntry>;

  /**
   * Save a complete pet record.
   *
   * @param hashId - Unique identifier for this pet
   * @param pet - Complete pet data to persist
   */
  setPet(hashId: string, pet: PetPublicProfile): Promise<void>;

  /**
   * Reserve a hash ID without data.
   * Useful for demo/test scenarios with the "empty" state.
   *
   * @param hashId - Unique identifier to reserve
   */
  reservePetId(hashId: string): Promise<void>;

  /**
   * List all registered pet IDs.
   *
   * @returns Array of hash IDs (both empty and filled)
   */
  listPetIds(): Promise<string[]>;

  /**
   * Get lightweight summaries of all pets.
   * Useful for landing page lists.
   *
   * @returns Array of pet summaries with ID, status, and name (if filled)
   */
  listPetEntries(): Promise<
    Array<{ id: string; status: PetEntry["status"]; name?: string }>
  >;
}

// Re-export types for convenience
export type { PetPublicProfile, PetEntry } from "@/types/pet";
