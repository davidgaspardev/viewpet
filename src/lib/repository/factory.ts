/**
 * Composition root for the repository layer — a singleton factory that
 * picks the concrete PetRepository implementation on first use and hands
 * back the same instance on every subsequent call.
 *
 * Kept separate from `index.ts` so the barrel stays a pure re-export list
 * (see PATTERN.md — Barrel pattern).
 */

import type { Seedable } from "./interface";
import { LocalPetRepository } from "./local";
import { MongoPetRepository } from "./mongodb/mongodb";

export type DatabaseProviderType = "local" | "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _petRepositoryFactory: PetRepositoryFactory | undefined;
}

const VALID_PROVIDERS: DatabaseProviderType[] = ["local", "mongodb"];

/**
 * Singleton — the constructor is private, so the only way to get one is
 * through `getInstance()`. It picks the concrete PetRepository implementation
 * once, chosen via `DATABASE_PROVIDER`, and keeps it for the life of the
 * singleton. Both concrete repositories implement `Seedable`, so the instance
 * handed back always supports the seed/admin operations too — no per-call cast.
 */
export class PetRepositoryFactory {
  private readonly repository: Seedable;

  private constructor() {
    const type = PetRepositoryFactory.resolveProviderType();
    this.repository =
      type === "mongodb" ? new MongoPetRepository() : new LocalPetRepository();
    if (process.env.NODE_ENV !== "test") {
      console.log(`[Repository] Using ${type} provider`);
    }
  }

  private static resolveProviderType(): DatabaseProviderType {
    // DATABASE_PROVIDER is read once, when the singleton is first built.
    // Changing the env var afterwards has no effect — call reset() to force
    // re-initialisation (tests do this between cases via beforeEach).
    const raw = process.env.DATABASE_PROVIDER ?? "local";
    if (!VALID_PROVIDERS.includes(raw as DatabaseProviderType)) {
      console.warn(
        `[Repository] Unknown DATABASE_PROVIDER "${raw}" — falling back to "local". Valid values: ${VALID_PROVIDERS.join(", ")}.`,
      );
    }
    return VALID_PROVIDERS.includes(raw as DatabaseProviderType)
      ? (raw as DatabaseProviderType)
      : "local";
  }

  /** Returns the active repository instance, creating the singleton on first call. */
  static getInstance(): Seedable {
    if (!globalThis._petRepositoryFactory) {
      globalThis._petRepositoryFactory = new PetRepositoryFactory();
    }
    return globalThis._petRepositoryFactory.repository;
  }

  /** Clears the singleton — used by tests between cases. */
  static reset(): void {
    globalThis._petRepositoryFactory = undefined;
  }
}
