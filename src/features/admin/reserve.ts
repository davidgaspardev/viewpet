import type { PetRepository, Seedable } from "@/lib/repository";

const MAX_ATTEMPTS = 5;

/**
 * Pick an id nobody holds yet and reserve it. `reservePetId` is an idempotent
 * upsert, so ids already in use are skipped up front rather than "re-reserved".
 * Returns `null` if every attempt collided.
 */
export async function reserveFreshId(
  repository: Pick<PetRepository, "getPetEntry"> & Pick<Seedable, "reservePetId">,
  generate: () => string,
): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = generate();
    if ((await repository.getPetEntry(candidate)).status === "missing") {
      await repository.reservePetId(candidate);
      return candidate;
    }
  }
  return null;
}
