/**
 * Blob storage facade for pet pictures.
 *
 * This module provides a backward-compatible API while implementing
 * dependency inversion. The actual storage implementation is determined
 * by `StorageProviderFactory` in `./storage/factory.ts`, which selects between:
 *
 * - LocalStorageProvider: writes to `public/uploads/` (development)
 * - S3StorageProvider: uploads to AWS S3 (production)
 * - Future providers: Cloudinary, R2, etc.
 *
 * High-level code (Server Actions, KVS) depends on this stable interface,
 * not on concrete storage implementations. This enables:
 *
 * - Easy swapping between storage backends
 * - Testing with mock providers
 * - Environment-specific configuration
 * - Zero changes to consuming code
 *
 * The KVS still stores only a string URL — image bytes never end up in
 * pets.json. Mirrors the production split: blobs in object storage, the
 * pointer in the KVS.
 */

import {
  StorageProviderFactory,
  SUPPORTED_IMAGE_MIMES,
  MAX_IMAGE_BYTES,
  SaveImageException,
} from "./storage";
import type { SaveImageError } from "./storage";

// Re-export types and constants for backward compatibility
export { SUPPORTED_IMAGE_MIMES, MAX_IMAGE_BYTES, SaveImageException };
export type { SaveImageError };

/**
 * Persist an uploaded image and return the public URL to use in pets.json.
 * Throws `SaveImageException` for client-correctable problems.
 *
 * This is now a thin wrapper that delegates to the configured storage provider.
 * The provider is selected automatically based on environment variables.
 */
export async function savePetImage(
  hashId: string,
  file: File,
): Promise<string> {
  const provider = StorageProviderFactory.getInstance();
  return provider.saveImage(hashId, file);
}
