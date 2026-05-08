import type { IStorageProvider } from "./interface";
import { LocalStorageProvider } from "./local";
import { S3StorageProvider } from "./s3";

/**
 * Singleton instance cache.
 * Ensures we only create one storage provider instance per process.
 */
let storageProviderInstance: IStorageProvider | null = null;

/**
 * Storage provider types supported by the factory.
 */
export type StorageProviderType = "local" | "s3";

/**
 * Factory function to get the appropriate storage provider.
 *
 * Provider selection logic:
 * 1. If STORAGE_PROVIDER env var is set, use that explicitly
 * 2. Otherwise, auto-detect based on NODE_ENV:
 *    - "production" → S3 (if AWS_S3_BUCKET + AWS_ACCESS_KEY_ID configured)
 *                  → Local filesystem (fallback)
 *    - "development" or "test" → Local filesystem
 *    - default → Local filesystem
 *
 * The instance is cached as a singleton, so subsequent calls return the
 * same provider instance.
 *
 * @returns The configured storage provider instance
 * @throws {Error} If S3 is selected but not properly configured
 */
export function getStorageProvider(): IStorageProvider {
  if (storageProviderInstance) {
    return storageProviderInstance;
  }

  const providerType = determineProviderType();

  switch (providerType) {
    case "s3":
      storageProviderInstance = new S3StorageProvider();
      break;

    case "local":
    default:
      storageProviderInstance = new LocalStorageProvider();
      break;
  }

  // Log which provider is being used (helpful for debugging)
  if (process.env.NODE_ENV !== "test") {
    console.log(`[Storage] Using ${providerType} storage provider`);
  }

  return storageProviderInstance;
}

/**
 * Determine which storage provider to use based on environment variables.
 */
function determineProviderType(): StorageProviderType {
  // Explicit provider selection via STORAGE_PROVIDER env var
  const explicitProvider = process.env.STORAGE_PROVIDER?.toLowerCase();
  if (explicitProvider === "local" || explicitProvider === "s3") {
    return explicitProvider;
  }

  // Auto-detect based on NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === "production") {
    // In production, check for S3 configuration
    if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID) {
      return "s3";
    }
    // Fall back to local if no cloud storage configured (not recommended for prod)
    console.warn(
      "[Storage] Production environment detected but no cloud storage configured. Falling back to local storage.",
    );
    return "local";
  }

  // Default to local for development/test
  return "local";
}

/**
 * Reset the singleton instance (useful for testing).
 * @internal
 */
export function resetStorageProvider(): void {
  storageProviderInstance = null;
}

// Re-export the interface and common types for convenience
export type { IStorageProvider } from "./interface";
export {
  SUPPORTED_IMAGE_MIMES,
  MAX_IMAGE_BYTES,
  SaveImageException,
} from "./interface";
export type { SaveImageError } from "./interface";
