/**
 * Public API of the storage module — pure barrel, no logic.
 * Provider selection and the singleton live in `./factory`.
 */

export { StorageProviderFactory } from "./factory";
export type { StorageProviderType } from "./factory";

export type { StorageProvider } from "./interface";
export { SUPPORTED_IMAGE_MIMES, MAX_IMAGE_BYTES, SaveImageException } from "./interface";
export type { SaveImageError } from "./interface";
