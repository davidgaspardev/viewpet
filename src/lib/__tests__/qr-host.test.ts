import { describe, expect, test } from "bun:test";
import { config as middlewareConfig } from "../../middleware";
import { parseBaseUrl, parseOrigin } from "../utils/base-url";
import { generateHashId, HASH_ID_LENGTH, HASH_ID_PATTERN, isHashId } from "../utils/ids";
import { hostnameOf, resolveQrRedirect } from "../utils/qr-redirect";
import { tagPath } from "../utils/routes";

describe("parseBaseUrl", () => {
  test("unset or blank is undefined", () => {
    expect(parseBaseUrl(undefined)).toBeUndefined();
    expect(parseBaseUrl("")).toBeUndefined();
    expect(parseBaseUrl("   ")).toBeUndefined();
  });

  test("normalises an absolute http(s) URL", () => {
    expect(parseBaseUrl("https://qr.viewpet.info")).toBe("https://qr.viewpet.info");
    expect(parseBaseUrl("  https://qr.viewpet.info/  ")).toBe("https://qr.viewpet.info");
    expect(parseBaseUrl("https://viewpet.info/base//")).toBe("https://viewpet.info/base");
    expect(parseBaseUrl("http://localhost:3000")).toBe("http://localhost:3000");
  });

  test("drops credentials, query and hash", () => {
    expect(parseBaseUrl("https://user:pw@viewpet.info/q?a=1#x")).toBe("https://viewpet.info/q");
  });

  test("a set-but-invalid value is null, not silently ignored", () => {
    for (const bad of ["viewpet.info", "ftp://viewpet.info", "javascript:alert(1)", "//viewpet.info", "https://"]) {
      expect(parseBaseUrl(bad)).toBeNull();
    }
  });
});

describe("tagPath / HASH_ID_PATTERN", () => {
  test("tagPath builds the public page path", () => {
    expect(tagPath("abcd2345efgh")).toBe("/tag/abcd2345efgh");
  });

  test("the route pattern matches exactly what generateHashId and isHashId accept", () => {
    const re = new RegExp(`^${HASH_ID_PATTERN}$`);
    for (let i = 0; i < 200; i++) {
      const id = generateHashId();
      expect(re.test(id)).toBe(true);
      expect(isHashId(id)).toBe(true);
    }
    for (const bad of ["", "abcd2345efg", "abcd2345efghj", "ABCD2345EFGH", "abcd2345efg0", "abcd2345efgl", "abcd2345efg/"]) {
      expect(re.test(bad)).toBe(false);
      expect(isHashId(bad)).toBe(false);
    }
  });
});

describe("parseOrigin", () => {
  test("unset or blank is undefined", () => {
    expect(parseOrigin(undefined)).toBeUndefined();
    expect(parseOrigin("  ")).toBeUndefined();
  });

  test("accepts a bare http(s) origin, with or without a trailing slash", () => {
    expect(parseOrigin("https://qr.viewpet.info")).toBe("https://qr.viewpet.info");
    expect(parseOrigin(" https://qr.viewpet.info/ ")).toBe("https://qr.viewpet.info");
    expect(parseOrigin("http://qr.localhost:3000")).toBe("http://qr.localhost:3000");
  });

  test("rejects anything that is not just an origin", () => {
    for (const bad of ["qr.viewpet.info", "ftp://qr.viewpet.info", "https://viewpet.info/q", "https://viewpet.info/?a=1", "https://viewpet.info/#x", "https://"]) {
      expect(parseOrigin(bad)).toBeNull();
    }
  });
});

describe("hostnameOf", () => {
  test("strips the port, lowercases and takes the first of a list", () => {
    expect(hostnameOf("QR.viewpet.info")).toBe("qr.viewpet.info");
    expect(hostnameOf("qr.viewpet.info:443")).toBe("qr.viewpet.info");
    expect(hostnameOf("qr.localhost:3000")).toBe("qr.localhost");
    expect(hostnameOf("qr.viewpet.info, viewpet.info")).toBe("qr.viewpet.info");
    expect(hostnameOf("[::1]:3000")).toBe("[::1]");
  });

  test("missing header is the empty string (never matches a host)", () => {
    expect(hostnameOf(null)).toBe("");
    expect(hostnameOf(undefined)).toBe("");
  });
});

describe("resolveQrRedirect", () => {
  const env = { SITE_URL: "https://viewpet.info", QR_BASE_URL: "https://qr.viewpet.info" };
  const id = "abcd2345efgh";
  const req = (over: Partial<{ hostname: string; pathname: string; search: string }> = {}) => ({
    hostname: "qr.viewpet.info",
    pathname: `/${id}`,
    search: "",
    ...over,
  });

  test("redirects <qr host>/<id> to <site>/tag/<id>", () => {
    expect(resolveQrRedirect(req(), env)).toBe(`https://viewpet.info/tag/${id}`);
  });

  test("keeps the query string and a base path on the site", () => {
    expect(resolveQrRedirect(req({ search: "?lang=en" }), env)).toBe(`https://viewpet.info/tag/${id}?lang=en`);
    expect(resolveQrRedirect(req(), { ...env, SITE_URL: "https://viewpet.info/app/" })).toBe(
      `https://viewpet.info/app/tag/${id}`,
    );
  });

  test("lowercases the id and tolerates a trailing slash", () => {
    expect(resolveQrRedirect(req({ pathname: `/${id.toUpperCase()}` }), env)).toBe(`https://viewpet.info/tag/${id}`);
    expect(resolveQrRedirect(req({ pathname: `/${id}/` }), env)).toBe(`https://viewpet.info/tag/${id}`);
  });

  test("only the QR host redirects", () => {
    expect(resolveQrRedirect(req({ hostname: "viewpet.info" }), env)).toBeNull();
    expect(resolveQrRedirect(req({ hostname: "" }), env)).toBeNull();
    expect(resolveQrRedirect(req({ hostname: "evil-qr.viewpet.info" }), env)).toBeNull();
  });

  test("only well-formed ids redirect", () => {
    for (const pathname of ["/", "/admin", "/tag", `/${id}x`, "/abcd2345efg", "/abcd2345efg0", "/abcd2345efgl", `/tag/${id}`, `//${id}/x`]) {
      expect(resolveQrRedirect(req({ pathname }), env)).toBeNull();
    }
  });

  test("is a no-op unless both URLs are set and valid, and reads them on every call", () => {
    expect(resolveQrRedirect(req(), {})).toBeNull();
    expect(resolveQrRedirect(req(), { SITE_URL: env.SITE_URL })).toBeNull();
    expect(resolveQrRedirect(req(), { QR_BASE_URL: env.QR_BASE_URL })).toBeNull();
    expect(resolveQrRedirect(req(), { ...env, SITE_URL: "viewpet.info" })).toBeNull();
    expect(resolveQrRedirect(req(), { ...env, QR_BASE_URL: "https://qr.viewpet.info/q" })).toBeNull();
    // no module-level caching: a different env gives a different answer
    expect(resolveQrRedirect(req({ hostname: "go.example.com" }), { ...env, QR_BASE_URL: "https://go.example.com" })).toBe(
      `https://viewpet.info/tag/${id}`,
    );
  });
});

describe("middleware matcher", () => {
  test("covers /admin and any single segment of exactly HASH_ID_LENGTH characters", () => {
    expect(middlewareConfig.matcher).toEqual(["/admin/:path*", `/:id([A-Za-z0-9]{${HASH_ID_LENGTH}})`]);
  });
});
