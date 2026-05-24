import type { PetRepository, Seedable, PetPublicProfile, PetEntry, PetEntrySummary } from "./interface";
import { LocalPetRepository } from "./local";
import { MongoPetRepository } from "./mongodb";

export type DatabaseProviderType = "local" | "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _petRepository: PetRepository | undefined;
}

const VALID_PROVIDERS: DatabaseProviderType[] = ["local", "mongodb"];

function getRepository(): PetRepository {
  if (!globalThis._petRepository) {
    // DATABASE_PROVIDER is read once at first call. Changing the env var after
    // the singleton is initialised has no effect — call resetRepositoryProvider()
    // to force re-initialisation (tests do this between cases via beforeEach).
    const raw = process.env.DATABASE_PROVIDER ?? "local";
    if (!VALID_PROVIDERS.includes(raw as DatabaseProviderType)) {
      console.warn(
        `[Repository] Unknown DATABASE_PROVIDER "${raw}" — falling back to "local". Valid values: ${VALID_PROVIDERS.join(", ")}.`,
      );
    }
    const type = (VALID_PROVIDERS.includes(raw as DatabaseProviderType) ? raw : "local") as DatabaseProviderType;
    globalThis._petRepository =
      type === "mongodb" ? new MongoPetRepository() : new LocalPetRepository();
    if (process.env.NODE_ENV !== "test") {
      console.log(`[Repository] Using ${type} provider`);
    }
  }
  return globalThis._petRepository;
}

/** Clears the singleton — used by tests between cases. */
export function resetRepositoryProvider(): void {
  globalThis._petRepository = undefined;
}

/** Returns the active repository instance — used by tests for instanceof checks. */
export function getRepositoryProvider(): PetRepository {
  return getRepository();
}

export async function getPetEntry(hashId: string): Promise<PetEntry> {
  return getRepositoryProvider().getPetEntry(hashId);
}

export async function setPet(hashId: string, pet: PetPublicProfile): Promise<void> {
  return getRepositoryProvider().setPet(hashId, pet);
}

export async function listPetEntries(): Promise<PetEntrySummary> {
  return getRepositoryProvider().listPetEntries();
}

// Seed / admin operations — not part of PetRepository but available for scripts.
// Both concrete repositories implement Seedable so the cast is always safe.
export async function reservePetId(hashId: string): Promise<void> {
  return (getRepositoryProvider() as Seedable).reservePetId(hashId);
}

export async function listPetIds(): Promise<string[]> {
  return (getRepositoryProvider() as Seedable).listPetIds();
}

export type { PetRepository, Seedable } from "./interface";
export type { PetPublicProfile, PetEntry } from "./interface";
