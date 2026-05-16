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
  since: string;             // ISO-8601
  lastSeenLocation?: string;
  lastSeenAt?: string;       // ISO-8601
  alerts?: string[];         // max 3, validated at runtime
}

export interface PetPublicProfile {
  name: string;
  pictureUrl: string;
  birthdate: string;         // ISO-8601
  status: PetStatus;
  lostInfo?: LostInfo;       // only populated when status === "lost"
  guardian: Guardian;
}

/**
 * Raw KVS shape:
 *  - hashId not present  → key never registered (404)
 *  - hashId present, null → key reserved but no data yet (renders form)
 *  - hashId present, PetPublicProfile → fully filled record
 */
export type PetStore = Record<string, PetPublicProfile | null>;

/** Discriminated union returned by the KVS lookup so callers can branch UX. */
export type PetEntry =
  | { status: "missing" }
  | { status: "empty" }
  | { status: "filled"; pet: PetPublicProfile };
