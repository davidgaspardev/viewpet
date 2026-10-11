import type { Seedable } from "@/lib/repository";

const MAX_ATTEMPTS = 5;

/**
 * Reserve a pet id nobody holds yet. `reservePetId` is atomic and reports
 * whether it actually inserted, so a collision with an existing id (filled or
 * already reserved) just triggers another draw. Returns `null` if every
 * attempt collided.
 */
export async function reserveFreshId(
  repository: Pick<Seedable, "reservePetId">,
  generate: () => string,
): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = generate();
    if (await repository.reservePetId(candidate)) return candidate;
  }
  return null;
}
