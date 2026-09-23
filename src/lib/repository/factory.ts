/**
 * Composition root for the repository layer — a factory class that picks
 * the concrete PetRepository implementation and hands back a singleton.
 *
 * Kept separate from `index.ts` so the barrel stays a pure re-export list
 * (see PATTERN.md — Barrel pattern).
 */

import type { Seedable } from "./interface";
import { LocalPetRepository } from "./local";
import { MongoPetRepository } from "./mongodb";

export type DatabaseProviderType = "local" | "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _petRepository: Seedable | undefined;
}

const VALID_PROVIDERS: DatabaseProviderType[] = ["local", "mongodb"];

/**
 * Builds and caches the active PetRepository, chosen via `DATABASE_PROVIDER`.
 * Both concrete repositories implement `Seedable`, so the instance handed
 * back always supports the seed/admin operations too — no per-call cast.
 */
export class PetRepositoryFactory {
  /** Returns the active repository instance, creating it on first call. */
  static getInstance(): Seedable {
    if (!globalThis._petRepository) {
      // DATABASE_PROVIDER is read once at first call. Changing the env var
      // after the singleton is initialised has no effect — call reset() to
      // force re-initialisation (tests do this between cases via beforeEach).
      const raw = process.env.DATABASE_PROVIDER ?? "local";
      if (!VALID_PROVIDERS.includes(raw as DatabaseProviderType)) {
        console.warn(
          `[Repository] Unknown DATABASE_PROVIDER "${raw}" — falling back to "local". Valid values: ${VALID_PROVIDERS.join(", ")}.`,
        );
      }
      const type = (
        VALID_PROVIDERS.includes(raw as DatabaseProviderType) ? raw : "local"
      ) as DatabaseProviderType;
      globalThis._petRepository =
        type === "mongodb" ? new MongoPetRepository() : new LocalPetRepository();
      if (process.env.NODE_ENV !== "test") {
        console.log(`[Repository] Using ${type} provider`);
      }
    }
    return globalThis._petRepository;
  }

  /** Clears the singleton — used by tests between cases. */
  static reset(): void {
    globalThis._petRepository = undefined;
  }
}
