import { isHashId } from "./id-format";
import { TAG_ROUTE } from "./routes";

/**
 * What Vercel Web Analytics and Speed Insights may record about a URL.
 *
 * `/tag/<hashId>` is a capability URL: whoever has the id sees the tutor's
 * contact data, so the id must never reach a third-party dashboard. Both
 * components run every event through `redactAnalyticsEvent` (their
 * `beforeSend`) before it leaves the browser. Pure, so it is unit-tested.
 */

/** What replaces a hashId in the recorded path. */
export const REDACTED_ID = "[id]";

/** Query parameters worth keeping (campaign tracking). Everything else is dropped. */
const ALLOWED_QUERY_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

const ADMIN_PATH = /^\/admin(\/|$)/i;

/** Only used to parse relative URLs; never ends up in the result. */
const PARSE_BASE = "http://localhost";

/**
 * Redacts the ids in a path. The segment right after `/tag` is always
 * replaced (a mistyped id on a 404 can still be a real one with one typo);
 * any other segment shaped like an id is too, which covers the short QR host
 * serving `/<hashId>` at its root. Ids are compared in lowercase because the
 * short host accepts them in any case.
 */
export function redactPath(pathname: string): string {
  const segments = pathname.split("/");
  const tag = TAG_ROUTE.replace(/^\//, "");
  return segments
    .map((segment, i) => {
      if (i === 2 &&segments[1].toLowerCase() === tag && segment !== "") return REDACTED_ID;
      return isHashId(segment.toLowerCase()) ? REDACTED_ID : segment;
    })
    .join("/");
}

/**
 * The URL to record, or `null` when the event must not be recorded at all:
 * `/admin`, or something that does not parse as a URL. Keeps the origin and
 * the redacted path, keeps only the `utm_*` query parameters and never the
 * fragment. Accepts absolute and relative URLs and returns the same kind.
 */
export function redactAnalyticsUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw, PARSE_BASE);
  } catch {
    return null;
  }
  if (ADMIN_PATH.test(url.pathname)) return null;

  const kept = new URLSearchParams();
  for (const name of ALLOWED_QUERY_PARAMS) {
    const value = url.searchParams.get(name);
    if (value !== null && !containsHashId(value)) kept.set(name, value);
  }
  const query = kept.size > 0 ? `?${kept.toString()}` : "";
  const path = `${redactPath(url.pathname)}${query}`;

  const isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(raw);
  return isAbsolute ? `${url.origin}${path}` : path;
}

/** True when any word-like chunk of the text is a hashId (utm values are free text). */
function containsHashId(text: string): boolean {
  return text.split(/[^a-z0-9]+/i).some((chunk) => isHashId(chunk.toLowerCase()));
}

/**
 * The `beforeSend` of both components: the event with a redacted `url` (and
 * `route`, which Speed Insights sends and which Next already writes as
 * `/tag/[id]`), or `null` to drop it. Any other field is left untouched.
 */
export function redactAnalyticsEvent<T extends { url: string; route?: string }>(event: T): T | null {
  const url = redactAnalyticsUrl(event.url);
  if (url === null) return null;
  const next: T = { ...event, url };
  if (typeof event.route === "string") {
    if (ADMIN_PATH.test(event.route)) return null;
    next.route = redactPath(event.route);
  }
  return next;
}
