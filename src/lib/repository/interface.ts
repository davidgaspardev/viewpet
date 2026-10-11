import type { Pet, PetEntry } from "@/types/pet";

type PetEntrySummary = Array<{
  id: string;
  status: PetEntry["status"];
  name?: string;
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
