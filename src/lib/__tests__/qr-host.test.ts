import { describe, expect, test } from "bun:test";
import { parseBaseUrl } from "../utils/base-url";
import { generateHashId, HASH_ID_PATTERN, isHashId } from "../utils/ids";
import { buildQrRedirects } from "../utils/qr-redirects";
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

describe("buildQrRedirects", () => {
  const env = { SITE_URL: "https://viewpet.info", QR_BASE_URL: "https://qr.viewpet.info" };

  test("redirects <qr host>/<id> to <site>/tag/<id> with a temporary redirect", () => {
    expect(buildQrRedirects(env)).toEqual([
      {
        source: `/:id(${HASH_ID_PATTERN})`,
        has: [{ type: "host", value: "qr.viewpet.info" }],
        destination: "https://viewpet.info/tag/:id",
        permanent: false,
      },
    ]);
  });

  test("keeps a path prefix on the QR base and a base path on the site", () => {
    const [redirect] = buildQrRedirects({ SITE_URL: "https://viewpet.info/app/", QR_BASE_URL: "https://viewpet.info/q/" });
    expect(redirect.source).toBe(`/q/:id(${HASH_ID_PATTERN})`);
    expect(redirect.destination).toBe("https://viewpet.info/app/tag/:id");
  });

  test("matches only the host's port-less name", () => {
    const [redirect] = buildQrRedirects({ SITE_URL: "http://localhost:3000", QR_BASE_URL: "http://qr.localhost:3000" });
    expect(redirect.has[0].value).toBe("qr.localhost");
  });

  test("is a no-op unless both URLs are set and valid (local dev)", () => {
    expect(buildQrRedirects({})).toEqual([]);
    expect(buildQrRedirects({ SITE_URL: "https://viewpet.info" })).toEqual([]);
    expect(buildQrRedirects({ QR_BASE_URL: "https://qr.viewpet.info" })).toEqual([]);
    expect(buildQrRedirects({ SITE_URL: "viewpet.info", QR_BASE_URL: "https://qr.viewpet.info" })).toEqual([]);
    expect(buildQrRedirects({ SITE_URL: "https://viewpet.info", QR_BASE_URL: "nope" })).toEqual([]);
  });

  test("the source pattern only matches well-formed ids", () => {
    const [redirect] = buildQrRedirects(env);
    const re = new RegExp(`^/(${HASH_ID_PATTERN})$`);
    expect(re.test("/abcd2345efgh")).toBe(true);
    expect(re.test("/tag")).toBe(false);
    expect(re.test("/admin")).toBe(false);
    expect(redirect.source.startsWith("/:id(")).toBe(true);
  });
});
