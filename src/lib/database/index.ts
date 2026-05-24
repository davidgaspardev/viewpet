import type { IPetRepository, ISeedable, PetPublicProfile, PetEntry } from "./interface";
import { LocalRepository } from "./local";
import { MongoDBRepository } from "./mongodb";

export type DatabaseProviderType = "local" | "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _petRepository: IPetRepository | undefined;
}

function getRepository(): IPetRepository {
  if (!globalThis._petRepository) {
    // DATABASE_PROVIDER is read once at first call. Changing the env var after
    // the singleton is initialised has no effect — call resetDatabaseProvider()
    // to force re-initialisation (tests do this between cases via beforeEach).
    const type = (process.env.DATABASE_PROVIDER ?? "local") as DatabaseProviderType;
    globalThis._petRepository =
      type === "mongodb" ? new MongoDBRepository() : new LocalRepository();
    if (process.env.NODE_ENV !== "test") {
      console.log(`[Database] Using ${type} provider`);
    }
  }
  return globalThis._petRepository;
}

/** Clears the singleton — used by tests between cases. */
export function resetDatabaseProvider(): void {
  globalThis._petRepository = undefined;
}

/** Returns the active repository instance — used by tests for instanceof checks. */
export function getDatabaseProvider(): IPetRepository {
  return getRepository();
}

export async function getPetEntry(hashId: string): Promise<PetEntry> {
  return getRepository().getPetEntry(hashId);
}

export async function setPet(hashId: string, pet: PetPublicProfile): Promise<void> {
  return getRepository().setPet(hashId, pet);
}

export async function listPetEntries(): Promise<
  Array<{ id: string; status: PetEntry["status"]; name?: string }>
> {
  return getRepository().listPetEntries();
}

// Seed / admin operations — not part of IPetRepository but available for scripts.
// Both concrete repositories implement ISeedable so the cast is always safe.
export async function reservePetId(hashId: string): Promise<void> {
  return (getRepository() as ISeedable).reservePetId(hashId);
}

export async function listPetIds(): Promise<string[]> {
  return (getRepository() as ISeedable).listPetIds();
}

export type { IPetRepository, ISeedable } from "./interface";
export type { PetPublicProfile, PetEntry } from "./interface";
