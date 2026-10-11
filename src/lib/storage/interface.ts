import { isHashId } from "../utils/ids";

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
export interface StorageProvider {
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

/**
 * Shared validation every `StorageProvider.saveImage()` implementation needs
 * before touching its backend — hashId shape, and the file's
 * presence/type/size. Factored out so Local/S3/R2 can't silently diverge on
 * these rules.
 *
 * @returns The resolved file extension (e.g. `"jpg"`) on success.
 * @throws {Error} For an invalid hashId format.
 * @throws {SaveImageException} For client-correctable file problems.
 */
export function validateImageUpload(hashId: string, file: File): string {
  // Validate hashId to prevent path traversal and key manipulation
  if (!isHashId(hashId)) {
    throw new Error("Invalid hashId format");
  }

  if (!file || file.size === 0) {
    throw new SaveImageException("empty");
  }

  const ext = getExtensionFromMime(file.type);
  if (!ext) {
    throw new SaveImageException("invalid_type");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new SaveImageException("too_large");
  }

  return ext;
}

/**
 * Join a configured base URL (CloudFront domain, S3/R2 public URL base,
 * etc.) with an object key, tolerating an optional trailing slash on the
 * base. Shared so Local/S3/R2's `buildPublicUrl()` can't drift on this.
 */
export function joinUrl(base: string, key: string): string {
  return `${base.replace(/\/$/, "")}/${key}`;
}

/**
 * Cache-Control for uploaded images — 1 year, immutable. Pet photos never
 * change in place (re-uploads get a fresh hashId-based key), so this is
 * safe to set unconditionally on both the upload (`PutObjectCommand`) and,
 * for providers proxying reads through our own server, the response that
 * serves them back. Shared so the two can't drift apart — the "repeat
 * views hit the edge cache" guarantee this project's READMEs/ADRs document
 * depends on both sides agreeing on the same value.
 */
export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

/**
 * Wrap a caught upload error with provider context and rethrow. Shared so
 * S3/R2's `saveImage()` catch blocks can't drift on the wrapping format.
 *
 * @param providerLabel - e.g. `"S3"` or `"R2"`, used in the thrown message.
 */
export function wrapUploadError(providerLabel: string, err: unknown): never {
  const reason = err instanceof Error ? err.message : String(err);
  throw new Error(`${providerLabel} upload failed: ${reason}`);
}
