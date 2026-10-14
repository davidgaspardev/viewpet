import type { Pet, PetEntry, PetStatus } from "@/types/pet";

type PetEntrySummary = Array<{
  id: string;
  status: PetStatus;
  /** Only present once a pet has been registered. */
  name?: string;
  /** ISO-8601. Absent in providers that don't track timestamps (local JSON). */
  createdAt?: string;
  updatedAt?: string;
}>;

/** Production interface — the three operations the request path actually needs. */
export interface PetRepository {
  getPetEntry(hashId: string): Promise<PetEntry>;
  setPet(hashId: string, pet: Pet): Promise<void>;
  listPetEntries(): Promise<PetEntrySummary>;
}

/** Extends PetRepository with operations only needed by seed scripts and admin tooling. */
export interface Seedable extends PetRepository {
  /** Reserves an empty slot. Resolves `true` when newly reserved, `false` if the id already existed (left untouched). */
  reservePetId(hashId: string): Promise<boolean>;
  listPetIds(): Promise<string[]>;
}

export type { Pet, PetEntry, PetEntrySummary };
