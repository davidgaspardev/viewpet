/**
 * Public API of the repository module — pure barrel, no logic.
 * Provider selection and the singleton live in `./factory`.
 */

export { PetRepositoryFactory } from "./factory";
export type { DatabaseProviderType } from "./factory";

export type { PetRepository, Seedable, Pet, PetEntry, PetEntrySummary } from "./interface";
