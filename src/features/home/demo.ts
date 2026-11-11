import { getPetEntry } from "@/features/pet-profile/get-entry";
import { isHashId } from "@/lib/utils/id-format";
import { tagPath } from "@/lib/utils/routes";

/**
 * Link to the example pet page the home points at, or `undefined` when there is
 * none (the home then leaves its "see an example" buttons out rather than link
 * to a page that does not work).
 *
 * `id` is the configured `DEMO_TAG_ID`; it is passed in so that an unset
 * variable stays "no id". It has to name a published pet (active or lost): a
 * malformed id, an unknown one or one still reserved (whose page is the public
 * registration form) gets no link, and neither does a failed lookup. Point it
 * at a dedicated example pet, not at a real customer's.
 */
export async function demoTagHref(id: string | undefined): Promise<string | undefined> {
  const trimmed = id?.trim();
  if (!trimmed || !isHashId(trimmed)) return undefined;

  try {
    const entry = await getPetEntry(trimmed);
    return entry.status === "missing" || entry.status === "reserved" ? undefined : tagPath(trimmed);
  } catch (error) {
    console.warn("DEMO_TAG_ID could not be checked; the home has no example link.", error);
    return undefined;
  }
}
