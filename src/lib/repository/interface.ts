import type { Pet, PetEntry, PetStatus } from "@/types/pet";

type PetEntrySummaryItem = {
  id: string;
  status: PetStatus;
  /** Only present once a pet has been registered. */
  name?: string;
};

type PetEntrySummary = PetEntrySummaryItem[];

/** Production interface — the three operations the request path actually needs. */
export interface PetRepository {
  getPetEntry(hashId: string): Promise<PetEntry>;
  setPet(hashId: string, pet: Pet): Promise<void>;
  /** Every id with its status, newest first. Ids stored with an unrecognised status are left out. */
  listPetEntries(): Promise<PetEntrySummary>;
}

/** Extends PetRepository with operations only needed by seed scripts and admin tooling. */
export interface Seedable extends PetRepository {
  /** Reserves an empty slot. Resolves `true` when newly reserved, `false` if the id already existed (left untouched). */
  reservePetId(hashId: string): Promise<boolean>;
  listPetIds(): Promise<string[]>;
}

export type { Pet, PetEntry, PetEntrySummary, PetEntrySummaryItem };
