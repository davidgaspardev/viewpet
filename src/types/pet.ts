export type SocialPlatform = "instagram" | "facebook" | "x" | "tiktok";
export type PhoneChannel = "call" | "whatsapp" | "sms";
export type PetStatus = "active" | "lost";

export interface Phone {
  /** Digits-only E.164 without "+" (e.g. "5548985596882") */
  e164: string;
  /** Formatted string as the guardian typed (e.g. "(48) 98559-6882") */
  display?: string;
  channels: PhoneChannel[];
}

export interface Guardian {
  name: string;
  email?: string;
  phones: Phone[];
  social: Partial<Record<SocialPlatform, string>>;
}

export interface LostInfo {
  /** ISO-8601 */
  since: string;
  lastSeenLocation?: string;
  /** ISO-8601 */
  lastSeenAt?: string;
  /** max 3, validated at runtime */
  alerts?: string[];
}

/**
 * Public view of a pet, assembled by the database layer.
 *
 * `guardians` is an ordered array — index 0 is the primary contact. Multiple
 * guardians model the real-world case of pets shared by couples / families.
 * Persistence-wise, guardians live in a separate collection and are joined
 * in by the provider on read.
 */
export interface PetPublicProfile {
  name: string;
  pictureUrl: string;
  /** ISO-8601 */
  birthdate: string;
  status: PetStatus;
  /** only populated when status === "lost" */
  lostInfo?: LostInfo;
  /** ordered: [0] is the primary guardian */
  guardians: Guardian[];
}

/**
 * Shape of the JSON seed file (`src/data/pets.json`).
 *
 *  - hashId not present   → key never registered (→ 404)
 *  - hashId present, null → key reserved but no data yet (→ render form)
 *  - hashId present, PetPublicProfile → fully filled record
 */
export type PetStore = Record<string, PetPublicProfile | null>;

/** Discriminated union returned by the KVS lookup so callers can branch UX. */
export type PetEntry =
  | { status: "missing" }
  | { status: "empty" }
  | { status: "filled"; pet: PetPublicProfile };
