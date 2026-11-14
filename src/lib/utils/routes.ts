/**
 * Where a pet's public page lives. Everything that builds or revalidates that
 * URL goes through here, so renaming the route again is a one-line change.
 */
export const TAG_ROUTE = "/tag";

export const tagPath = (id: string) => `${TAG_ROUTE}/${id}`;

/**
 * The legal documents (Portuguese only). Neither can be a 12-character
 * segment, or the QR middleware's matcher would take it for a tag id.
 */
export const TERMS_PATH = "/terms";
export const PRIVACY_PATH = "/privacy";
