import type { IStorageProvider } from "./interface";
import { LocalStorageProvider } from "./local";
import { S3StorageProvider } from "./s3";

export type StorageProviderType = "local" | "s3";

let instance: IStorageProvider | null = null;

export function getStorageProvider(): IStorageProvider {
  if (!instance) {
    const type = (process.env.STORAGE_PROVIDER ?? "local") as StorageProviderType;
    instance = type === "s3" ? new S3StorageProvider() : new LocalStorageProvider();
    if (process.env.NODE_ENV !== "test") {
      console.log(`[Storage] Using ${type} provider`);
    }
  }
  return instance;
}

export function resetStorageProvider(): void {
  instance = null;
}

export type { IStorageProvider } from "./interface";
export { SUPPORTED_IMAGE_MIMES, MAX_IMAGE_BYTES, SaveImageException } from "./interface";
export type { SaveImageError } from "./interface";
