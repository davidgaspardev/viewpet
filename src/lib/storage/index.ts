import type { IStorageProvider } from "./interface";
import { LocalStorageProvider } from "./local";
import { FirebaseStorageProvider } from "./firebase";

/**
 * Singleton instance cache.
 * Ensures we only create one storage provider instance per process.
 */
let storageProviderInstance: IStorageProvider | null = null;

/**
 * Storage provider types supported by the factory.
 */
export type StorageProviderType = "local" | "firebase";

/**
 * Factory function to get the appropriate storage provider.
 *
 * Provider selection logic:
 * 1. If STORAGE_PROVIDER env var is set, use that explicitly
 * 2. Otherwise, auto-detect based on NODE_ENV:
 *    - "production" → Firebase (requires FIREBASE_STORAGE_BUCKET)
 *    - "development" or "test" → Local filesystem
 *    - default → Local filesystem
 *
 * The instance is cached as a singleton, so subsequent calls return the
 * same provider instance.
 *
 * @returns The configured storage provider instance
 * @throws {Error} If Firebase is selected but not properly configured
 */
export function getStorageProvider(): IStorageProvider {
  if (storageProviderInstance) {
    return storageProviderInstance;
  }

  const providerType = determineProviderType();

  switch (providerType) {
    case "firebase":
      storageProviderInstance = new FirebaseStorageProvider();
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
  if (explicitProvider === "firebase" || explicitProvider === "local") {
    return explicitProvider;
  }

  // Auto-detect based on NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === "production") {
    // In production, check if Firebase is configured
    if (process.env.FIREBASE_STORAGE_BUCKET) {
      return "firebase";
    }
    // Fall back to local if Firebase not configured (not recommended for prod)
    console.warn(
      "[Storage] Production environment detected but Firebase not configured. Falling back to local storage.",
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
