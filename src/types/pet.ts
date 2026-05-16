export type SocialPlatform = "instagram" | "x" | "facebook" | "tiktok";

/** Handles (nicknames) for each supported social network. Every field is optional. */
export type SocialHandles = Partial<Record<SocialPlatform, string>>;

export interface Guardian {
  name: string;
  email: string;
  phone: string;
  social?: SocialHandles;
}

export interface Pet {
  name: string;
  picture: string;
  /** ISO-8601 date string (e.g. "2018-04-21T18:21:09.372Z") */
  birthdate: string;
  guardian: Guardian;
}

/**
 * Raw KVS shape:
 *  - hashId not present  → key never registered (404)
 *  - hashId present, null → key reserved but no data yet (renders form)
 *  - hashId present, Pet  → fully filled record
 *
 * Mirrors a Redis pattern where the key exists with a sentinel `null`/empty
 * value before the data is filled in.
 */
export type PetStore = Record<string, Pet | null>;

/** Discriminated union returned by the KVS lookup so callers can branch UX. */
export type PetEntry =
  | { status: "missing" }
  | { status: "empty" }
  | { status: "filled"; pet: Pet };
