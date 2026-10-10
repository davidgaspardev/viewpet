/**
 * Composition root for the storage layer — a singleton factory that picks
 * the concrete StorageProvider implementation on first use and hands back
 * the same instance on every subsequent call.
 *
 * Kept separate from `index.ts` so the barrel stays a pure re-export list
 * (see PATTERN.md — Barrel pattern).
 */

import type { StorageProvider } from "./interface";
import { LocalStorageProvider } from "./local";
import { S3StorageProvider } from "./s3";

export type StorageProviderType = "local" | "s3";

declare global {
  // eslint-disable-next-line no-var
  var _storageProviderFactory: StorageProviderFactory | undefined;
}

const VALID_PROVIDERS: StorageProviderType[] = ["local", "s3"];

/**
 * Singleton — the constructor is private, so the only way to get one is
 * through `getInstance()`. It picks the concrete StorageProvider
 * implementation once, chosen via `STORAGE_PROVIDER`, and keeps it for the
 * life of the singleton.
 */
export class StorageProviderFactory {
  private readonly provider: StorageProvider;

  private constructor() {
    const type = StorageProviderFactory.resolveProviderType();
    this.provider = type === "s3" ? new S3StorageProvider() : new LocalStorageProvider();
    if (process.env.NODE_ENV !== "test") {
      console.log(`[Storage] Using ${type} provider`);
    }
  }

  private static resolveProviderType(): StorageProviderType {
    // STORAGE_PROVIDER is read once, when the singleton is first built.
    // Changing the env var afterwards has no effect — call reset() to force
    // re-initialisation (tests do this between cases via beforeEach).
    const raw = process.env.STORAGE_PROVIDER ?? "local";
    if (!VALID_PROVIDERS.includes(raw as StorageProviderType)) {
      console.warn(
        `[Storage] Unknown STORAGE_PROVIDER "${raw}" — falling back to "local". Valid values: ${VALID_PROVIDERS.join(", ")}.`,
      );
    }
    return VALID_PROVIDERS.includes(raw as StorageProviderType)
      ? (raw as StorageProviderType)
      : "local";
  }

  /** Returns the active storage provider, creating the singleton on first call. */
  static getInstance(): StorageProvider {
    if (!globalThis._storageProviderFactory) {
      globalThis._storageProviderFactory = new StorageProviderFactory();
    }
    return globalThis._storageProviderFactory.provider;
  }

  /** Clears the singleton — used by tests between cases. */
  static reset(): void {
    globalThis._storageProviderFactory = undefined;
  }
}
