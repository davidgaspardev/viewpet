import { isHashId } from "@/lib/utils/id-format";
import { tagPath } from "@/lib/utils/routes";

/**
 * Link to the example pet page the home points at, or `undefined` when none is
 * configured (the home then leaves its "see an example" buttons out rather
 * than link to a page that may not exist). Set `DEMO_TAG_ID` to the id of a
 * registered pet; it is read when the home is built.
 */
export function demoTagHref(id: string | undefined = process.env.DEMO_TAG_ID): string | undefined {
  const trimmed = id?.trim();
  return trimmed && isHashId(trimmed) ? tagPath(trimmed) : undefined;
}
