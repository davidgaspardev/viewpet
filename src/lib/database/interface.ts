import type { PetPublicProfile, PetEntry } from "@/types/pet";

type PetEntrySummary = Array<{
  id: string;
  status: PetEntry["status"];
  name?: string;
}>;

/** Production interface — the three operations the request path actually needs. */
export interface IPetRepository {
  getPetEntry(hashId: string): Promise<PetEntry>;
  setPet(hashId: string, pet: PetPublicProfile): Promise<void>;
  listPetEntries(): Promise<PetEntrySummary>;
}

/** Extends IPetRepository with operations only needed by seed scripts and admin tooling. */
export interface ISeedable extends IPetRepository {
  reservePetId(hashId: string): Promise<void>;
  listPetIds(): Promise<string[]>;
}

export type { PetPublicProfile, PetEntry, PetEntrySummary };
