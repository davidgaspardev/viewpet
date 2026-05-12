/**
 * In-memory implementation of the KVS provider interface.
 *
 * Stores pet data in a Map for testing and local development without Redis.
 *
 * Features:
 * - No external dependencies
 * - Same three-state interface as Redis
 * - Useful for tests and local development
 * - Data resets on restart (no persistence)
 */

import type { IKVSProvider, Pet, PetEntry } from "./interface";

export class MemoryKVSProvider implements IKVSProvider {
  /**
   * In-memory store where:
   *   - Missing key → "missing" status
   *   - null value → "empty" status (reserved)
   *   - Pet object → "filled" status
   */
  private store: Map<string, Pet | null> = new Map();

  async getPetEntry(hashId: string): Promise<PetEntry> {
    if (!this.store.has(hashId)) {
      return { status: "missing" };
    }

    const value = this.store.get(hashId);

    if (value === null) {
      return { status: "empty" };
    }

    // TypeScript knows value is Pet here (not null or undefined)
    return { status: "filled", pet: value as Pet };
  }

  async setPet(hashId: string, pet: Pet): Promise<void> {
    this.store.set(hashId, pet);
  }

  async reservePetId(hashId: string): Promise<void> {
    if (!this.store.has(hashId)) {
      this.store.set(hashId, null);
    }
  }

  async listPetIds(): Promise<string[]> {
    return Array.from(this.store.keys());
  }

  async listPetEntries(): Promise<
    Array<{ id: string; status: PetEntry["status"]; name?: string }>
  > {
    const entries: Array<{
      id: string;
      status: PetEntry["status"];
      name?: string;
    }> = [];

    for (const [id, value] of this.store.entries()) {
      if (value === null) {
        entries.push({ id, status: "empty" });
      } else {
        entries.push({ id, status: "filled", name: value.name });
      }
    }

    return entries;
  }

  /**
   * Clear all data from the store.
   * Useful for test cleanup.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get the current size of the store.
   * Useful for testing.
   */
  size(): number {
    return this.store.size;
  }
}
