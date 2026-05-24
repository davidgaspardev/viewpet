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

/**
 * A discrete "the pet went missing" event.
 *
 * Open events have `endedAt: null`; resolved ones carry the ISO-8601 instant
 * when the pet was found. Past events are preserved as history — a pet that
 * has been lost twice has two LostEvents, the older one resolved.
 *
 * Persistence-wise LostEvents live in their own collection (Mongo) and are
 * looked up by `(petId, endedAt: null)` for the current open event. They're
 * exposed through the `Pet.lostEvent` field as a single embedded object,
 * never as an array — at most one is open per pet at any time.
 */
export interface LostEvent {
  /** ISO-8601 — when the pet was declared missing. */
  startedAt: string;
  /** ISO-8601 when the pet was found, or `null` while still missing. */
  endedAt: string | null;
  lastSeenLocation?: string;
  /** ISO-8601 */
  lastSeenAt?: string;
  /** max 3, validated at runtime */
  alerts?: string[];
}

/**
 * The pet, as exposed by the repository layer to the rest of the app.
 *
 * `guardians` is an ordered array — index 0 is the primary contact. Multiple
 * guardians model the real-world case of pets shared by couples / families.
 * Persistence-wise, guardians live in a separate Mongo collection and are
 * joined in by the provider on read.
 *
 * `lostEvent` carries the *currently open* lost event when `status === "lost"`.
 * It's joined in by the provider — the storage layer holds it in its own
 * collection (Mongo) or embedded for simplicity (local JSON). Past resolved
 * events are not exposed through this field; query the repository directly
 * for history.
 */
export interface Pet {
  name: string;
  pictureUrl: string;
  /** ISO-8601 */
  birthdate: string;
  status: PetStatus;
  /** only populated when status === "lost" */
  lostEvent?: LostEvent;
  /** ordered: [0] is the primary guardian */
  guardians: Guardian[];
}

/**
 * Shape of the JSON seed file (`src/data/pets.json`).
 *
 *  - hashId not present   → key never registered (→ 404)
 *  - hashId present, null → key reserved but no data yet (→ render form)
 *  - hashId present, Pet  → fully filled record
 */
export type PetStore = Record<string, Pet | null>;

/** Discriminated union returned by the KVS lookup so callers can branch UX. */
export type PetEntry =
  | { status: "missing" }
  | { status: "empty" }
  | { status: "filled"; pet: Pet };
