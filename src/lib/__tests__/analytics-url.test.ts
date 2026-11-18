import { describe, expect, test } from "bun:test";

import { redactAnalyticsEvent, redactAnalyticsUrl, redactPath } from "../utils/analytics-url";
import { HASH_ID_LENGTH } from "../utils/id-format";

const ID = "nuxw4d83wraa";

describe("redactAnalyticsUrl", () => {
  test("replaces the id of a pet page", () => {
    expect(redactAnalyticsUrl(`https://viewpet.info/tag/${ID}`)).toBe("https://viewpet.info/tag/[id]");
  });

  test("replaces whatever follows /tag, even when it is not a valid id", () => {
    expect(redactAnalyticsUrl("https://viewpet.info/tag/nuxw4d83wrab1")).toBe("https://viewpet.info/tag/[id]");
    expect(redactAnalyticsUrl("https://viewpet.info/tag/abc")).toBe("https://viewpet.info/tag/[id]");
  });

  test("replaces an id at the root, as on the short QR host, in any case", () => {
    expect(redactAnalyticsUrl(`https://qr.viewpet.info/${ID}`)).toBe("https://qr.viewpet.info/[id]");
    expect(redactAnalyticsUrl(`https://qr.viewpet.info/${ID.toUpperCase()}`)).toBe("https://qr.viewpet.info/[id]");
  });

  test("follows the configured id length", () => {
    const id = "a".repeat(HASH_ID_LENGTH);
    expect(redactAnalyticsUrl(`https://viewpet.info/${id}`)).toBe("https://viewpet.info/[id]");
  });

  test("keeps the id out of the query and the fragment", () => {
    const out = redactAnalyticsUrl(`https://viewpet.info/tag/${ID}?id=${ID}&token=secret&x=1#${ID}`);
    expect(out).toBe("https://viewpet.info/tag/[id]");
    expect(out).not.toContain(ID);
  });

  test("keeps only campaign parameters, and not when they carry an id", () => {
    expect(redactAnalyticsUrl("https://viewpet.info/?utm_source=insta&utm_medium=bio&email=a@b.c")).toBe(
      "https://viewpet.info/?utm_source=insta&utm_medium=bio",
    );
    expect(redactAnalyticsUrl(`https://viewpet.info/?utm_source=${ID}`)).toBe("https://viewpet.info/");
    expect(redactAnalyticsUrl(`https://viewpet.info/?utm_campaign=x-${ID}-y`)).toBe("https://viewpet.info/");
  });

  test("leaves the other pages alone", () => {
    for (const path of ["/", "/privacy", "/terms"]) {
      expect(redactAnalyticsUrl(`https://viewpet.info${path}`)).toBe(`https://viewpet.info${path}`);
    }
  });

  test("drops /admin and anything under it", () => {
    expect(redactAnalyticsUrl("https://viewpet.info/admin")).toBeNull();
    expect(redactAnalyticsUrl("https://viewpet.info/admin/")).toBeNull();
    expect(redactAnalyticsUrl("https://viewpet.info/Admin/qr?x=1")).toBeNull();
    expect(redactAnalyticsUrl("https://viewpet.info/administrator")).toBe("https://viewpet.info/administrator");
  });

  test("handles relative URLs and returns a relative one", () => {
    expect(redactAnalyticsUrl(`/tag/${ID}?a=b`)).toBe("/tag/[id]");
  });

  test("drops what it cannot parse", () => {
    expect(redactAnalyticsUrl("http://")).toBeNull();
  });
});

describe("redactPath", () => {
  test("only touches id-shaped segments and the one after /tag", () => {
    expect(redactPath(`/tag/${ID}`)).toBe("/tag/[id]");
    expect(redactPath("/tag/[id]")).toBe("/tag/[id]");
    expect(redactPath("/terms")).toBe("/terms");
    expect(redactPath("/")).toBe("/");
    expect(redactPath("/tag")).toBe("/tag");
  });
});

describe("redactAnalyticsEvent", () => {
  test("redacts a page view and keeps its other fields", () => {
    expect(redactAnalyticsEvent({ type: "pageview", url: `https://viewpet.info/tag/${ID}` })).toEqual({
      type: "pageview",
      url: "https://viewpet.info/tag/[id]",
    });
  });

  test("redacts the route of a Speed Insights event too", () => {
    expect(
      redactAnalyticsEvent({ type: "vital", url: `https://viewpet.info/tag/${ID}`, route: `/tag/${ID}` }),
    ).toEqual({ type: "vital", url: "https://viewpet.info/tag/[id]", route: "/tag/[id]" });
  });

  test("does not mutate its input", () => {
    const event = { type: "vital", url: `https://viewpet.info/tag/${ID}` };
    redactAnalyticsEvent(event);
    expect(event.url).toContain(ID);
  });

  test("drops admin events, by url or by route", () => {
    expect(redactAnalyticsEvent({ type: "pageview", url: "https://viewpet.info/admin" })).toBeNull();
    expect(redactAnalyticsEvent({ type: "vital", url: "https://viewpet.info/x", route: "/admin" })).toBeNull();
  });
});
