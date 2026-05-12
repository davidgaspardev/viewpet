/**
 * Factory for KVS provider selection with auto-detection.
 *
 * Provider selection logic:
 * 1. If KVS_PROVIDER env var is set, use that explicitly
 * 2. Otherwise, auto-detect based on environment:
 *    - "test" → Memory (no external dependencies)
 *    - REDIS_URL configured → Redis
 *    - default → Memory (safe fallback)
 *
 * The instance is cached as a singleton, so subsequent calls return the
 * same provider instance.
 */

import type { IKVSProvider } from "./interface";
import { RedisKVSProvider } from "./redis";
import { MemoryKVSProvider } from "./memory";

/**
 * Singleton instance cache.
 * Ensures we only create one KVS provider instance per process.
 */
let kvsProviderInstance: IKVSProvider | null = null;

/**
 * KVS provider types supported by the factory.
 */
export type DatabaseProviderType = "redis" | "memory";

/**
 * Factory function to get the appropriate KVS provider.
 *
 * @returns The configured KVS provider instance
 */
export function getKVSProvider(): IKVSProvider {
  if (kvsProviderInstance) {
    return kvsProviderInstance;
  }

  const providerType = determineProviderType();

  switch (providerType) {
    case "redis":
      kvsProviderInstance = new RedisKVSProvider();
      break;

    case "memory":
    default:
      kvsProviderInstance = new MemoryKVSProvider();
      break;
  }

  // Log which provider is being used (helpful for debugging)
  if (process.env.NODE_ENV !== "test") {
    console.log(`[KVS] Using ${providerType} provider`);
  }

  return kvsProviderInstance;
}

/**
 * Determine which KVS provider to use based on environment variables.
 */
function determineProviderType(): DatabaseProviderType {
  // Explicit provider selection via KVS_PROVIDER env var
  const explicitProvider = process.env.KVS_PROVIDER?.toLowerCase();
  if (explicitProvider === "memory" || explicitProvider === "redis") {
    return explicitProvider;
  }

  // Auto-detect based on NODE_ENV and configuration
  const nodeEnv = process.env.NODE_ENV;

  // In test environment, always use memory (fast, no setup required)
  if (nodeEnv === "test") {
    return "memory";
  }

  // If Redis URL is configured, use Redis
  if (process.env.REDIS_URL) {
    return "redis";
  }

  // Default to memory for safety (works without external dependencies)
  if (process.env.NODE_ENV !== "test") {
    console.warn(
      "[KVS] No Redis configuration found. Falling back to in-memory storage (data will not persist).",
    );
  }

  return "memory";
}

/**
 * Reset the singleton instance (useful for testing).
 * @internal
 */
export function resetKVSProvider(): void {
  kvsProviderInstance = null;
}

// Re-export the interface and types for convenience
export type { IKVSProvider } from "./interface";
export type { Pet, PetEntry } from "./interface";
