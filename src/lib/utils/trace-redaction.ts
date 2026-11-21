import { ALPHABET, HASH_ID_PATTERN } from "./id-format";
import { TAG_ROUTE } from "./routes";

/**
 * Keeps pet ids out of request traces.
 *
 * `/tag/<hashId>` is a capability URL: whoever has the id sees the tutor's
 * contact data, and spans record the request path (`http.target`), outgoing
 * URLs (`http.url`), span names and error messages. Everything a span carries
 * goes through here before it is exported to a third-party backend. Pure, so
 * it is unit-tested; the OpenTelemetry glue is in `lib/tracing`.
 */

/** What replaces a hashId in a recorded string. */
export const REDACTED_ID = "[id]";

/** Attributes that hold a URL or a request target: their query string and fragment are cut. */
const URL_KEYS = new Set(["http.target", "http.url", "url.full", "url.path", "http.path", "next.span_name"]);
/** Attributes that hold only a query string: dropped to empty. */
const QUERY_KEYS = new Set(["url.query"]);

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The segment right after `/tag`, whatever it is (a mistyped id on a 404 can still be almost a real one). */
const TAG_SEGMENT = new RegExp(`(${escapeRegExp(TAG_ROUTE)}/)(?!\\[)[^/\\s?#"'\`]+`, "gi");
/** An id-shaped token anywhere (the short QR host serves `/<hashId>`), in any case, not inside a longer word. */
const ID_TOKEN = new RegExp(`(?<![${ALPHABET}A-Z0-9])${HASH_ID_PATTERN.replaceAll(ALPHABET, `${ALPHABET}A-Z`)}(?![${ALPHABET}A-Z0-9])`, "g");

/** The text with every pet id replaced by `[id]`. */
export function redactIds(text: string): string {
  return text.replace(TAG_SEGMENT, `$1${REDACTED_ID}`).replace(ID_TOKEN, REDACTED_ID);
}

const cutQuery = (value: string) => value.replace(/[?#].*$/s, "");

/**
 * The redacted value of one span attribute, or the same value when there is
 * nothing to change. Strings (and arrays of strings) lose their ids; URL-like
 * attributes also lose the query string and the fragment.
 */
export function redactAttributeValue(key: string, value: unknown): unknown {
  if (typeof value === "string") {
    if (QUERY_KEYS.has(key)) return "";
    return redactIds(URL_KEYS.has(key) ? cutQuery(value) : value);
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value.map((item) => redactAttributeValue(key, item));
  }
  return value;
}

/** Only the attributes whose value changes, with the new value. Empty when nothing needs redacting. */
export function redactAttributes(attributes: Record<string, unknown>): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attributes)) {
    const next = redactAttributeValue(key, value);
    const same = Array.isArray(value) ? JSON.stringify(next) === JSON.stringify(value) : next === value;
    if (!same) changes[key] = next;
  }
  return changes;
}
