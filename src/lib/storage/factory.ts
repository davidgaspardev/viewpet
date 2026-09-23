/**
 * Composition root for the storage layer — picks the concrete
 * IStorageProvider implementation.
 *
 * Kept separate from `index.ts` so the barrel stays a pure re-export list
 * (see PATTERN.md — Barrel pattern).
 */

import { BlobStorageProvider } from "./blob";
import type { IStorageProvider } from "./interface";
import { LocalStorageProvider } from "./local";
import { S3StorageProvider } from "./s3";

export type StorageProviderType = "local" | "s3" | "blob";

let instance: IStorageProvider | null = null;

export function getStorageProvider(): IStorageProvider {
  if (!instance) {
    const type = (process.env.STORAGE_PROVIDER ?? "local") as StorageProviderType;

    switch (type) {
      case "local":
        instance = new LocalStorageProvider();
        break;
      case "s3":
        instance = new S3StorageProvider();
        break;
      case "blob":
        instance = new BlobStorageProvider();
        break;
    }
    if (process.env.NODE_ENV !== "test") {
      console.log(`[Storage] Using ${type} provider`);
    }
  }
  return instance;
}

export function resetStorageProvider(): void {
  instance = null;
}
