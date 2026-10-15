import { describe, expect, test } from "bun:test";
import { resolveOrigin } from "../utils/origin";

const headers = (h: Record<string, string>) => ({
  get: (name: string) => h[name.toLowerCase()] ?? null,
});

describe("resolveOrigin", () => {
  test("prefers SITE_URL and strips trailing slashes", () => {
    expect(resolveOrigin("https://viewpet.app/", headers({}))).toBe("https://viewpet.app");
    expect(resolveOrigin("  https://viewpet.app/base//  ", headers({}))).toBe("https://viewpet.app/base");
  });

  test("rejects a SITE_URL that is not an absolute http(s) URL", () => {
    expect(resolveOrigin("viewpet.app", headers({}))).toBeNull();
    expect(resolveOrigin("ftp://viewpet.app", headers({}))).toBeNull();
    expect(resolveOrigin("javascript:alert(1)", headers({}))).toBeNull();
  });

  test("treats a blank SITE_URL as unset", () => {
    expect(resolveOrigin("   ", headers({ host: "example.com" }))).toBe("https://example.com");
  });

  test("falls back to forwarded headers, taking the first of a list", () => {
    expect(
      resolveOrigin(undefined, headers({ "x-forwarded-host": "a.com, b.com", "x-forwarded-proto": "https,http" })),
    ).toBe("https://a.com");
    expect(resolveOrigin(undefined, headers({ host: "192.168.0.5:3000", "x-forwarded-proto": "http" }))).toBe(
      "http://192.168.0.5:3000",
    );
  });

  test("ignores a bogus forwarded proto and defaults by host", () => {
    expect(resolveOrigin(undefined, headers({ host: "localhost:3000", "x-forwarded-proto": "javascript" }))).toBe(
      "http://localhost:3000",
    );
    expect(resolveOrigin(undefined, headers({ host: "example.com" }))).toBe("https://example.com");
  });
});

describe("resolveOrigin with malformed or hostile headers", () => {
  test("returns null instead of an unparsable origin", () => {
    for (const host of ["bad host", "evil.com/path", "user@evil.com", "a b.com:80"]) {
      expect(resolveOrigin(undefined, headers({ "x-forwarded-host": host }))).toBeNull();
      expect(resolveOrigin(undefined, headers({ host }))).toBeNull();
    }
  });

  test("a clean host (with or without port) still resolves", () => {
    expect(resolveOrigin(undefined, headers({ host: "viewpet.info:8443", "x-forwarded-proto": "https" }))).toBe(
      "https://viewpet.info:8443",
    );
  });
});

