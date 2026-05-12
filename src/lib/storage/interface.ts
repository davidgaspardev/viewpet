/**
 * Storage provider interface for image persistence.
 *
 * Enables dependency inversion: high-level code depends on this interface
 * rather than concrete implementations (local filesystem, Firebase, S3, etc.)
 */

/** Accepted MIME types and the extension we'll persist them under. */
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const SUPPORTED_IMAGE_MIMES = Object.keys(MIME_TO_EXT);

/** 5 MB. Same number is enforced client-side. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Client-correctable error codes for image save operations.
 */
export type SaveImageError = "invalid_type" | "too_large" | "empty";

/**
 * Exception thrown for validation errors during image save.
 */
export class SaveImageException extends Error {
  constructor(public code: SaveImageError) {
    super(`save_pet_image:${code}`);
  }
}

/**
 * Interface for image storage providers.
 *
 * All implementations must support:
 * - Validating file type and size
 * - Persisting images with a unique identifier
 * - Returning a publicly accessible URL
 * - Handling re-uploads (replacing previous images with same hashId)
 */
export interface IStorageProvider {
  /**
   * Save an uploaded image and return the public URL.
   *
   * @param hashId - Unique identifier for this pet (used as filename base)
   * @param file - The uploaded File object
   * @returns Public URL where the image can be accessed
   * @throws {SaveImageException} For client-correctable problems (validation)
   * @throws {Error} For system errors (network, permissions, etc.)
   */
  saveImage(hashId: string, file: File): Promise<string>;
}

/**
 * Helper to get file extension from MIME type.
 */
export function getExtensionFromMime(mimeType: string): string | undefined {
  return MIME_TO_EXT[mimeType];
}
