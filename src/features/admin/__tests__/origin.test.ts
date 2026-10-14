import { describe, expect, test } from "bun:test";
import { qrUrl, resolveOrigin, resolveQrBase } from "../origin";

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

describe("resolveQrBase", () => {
  test("QR_BASE_URL wins: a QR encodes <QR_BASE_URL>/<id>", () => {
    expect(
      resolveQrBase({ QR_BASE_URL: "https://qr.viewpet.info/", SITE_URL: "https://viewpet.info" }, headers({})),
    ).toEqual({ ok: true, base: "https://qr.viewpet.info" });
  });

  test("without QR_BASE_URL the QR points straight at the tag page", () => {
    expect(resolveQrBase({ SITE_URL: "https://viewpet.info" }, headers({}))).toEqual({
      ok: true,
      base: "https://viewpet.info/tag",
    });
    expect(resolveQrBase({}, headers({ host: "localhost:3000" }))).toEqual({
      ok: true,
      base: "http://localhost:3000/tag",
    });
  });

  test("QR_BASE_URL also needs a valid SITE_URL: the redirect can't exist without a destination", () => {
    const qr = "https://qr.viewpet.info";
    for (const site of [undefined, "", "oops", "ftp://viewpet.info"]) {
      expect(resolveQrBase({ QR_BASE_URL: qr, SITE_URL: site }, headers({ host: "viewpet.info" }))).toEqual({
        ok: false,
        error: "invalid_site_url",
      });
    }
  });

  test("QR_BASE_URL must be a bare origin: a path could never be redirected", () => {
    expect(
      resolveQrBase({ QR_BASE_URL: "https://viewpet.info/q", SITE_URL: "https://viewpet.info" }, headers({})),
    ).toEqual({ ok: false, error: "invalid_qr_base_url" });
  });

  test("a set-but-invalid value is an error, never silently ignored", () => {
    expect(resolveQrBase({ QR_BASE_URL: "qr.viewpet.info" }, headers({}))).toEqual({
      ok: false,
      error: "invalid_qr_base_url",
    });
    expect(resolveQrBase({ SITE_URL: "viewpet.info" }, headers({}))).toEqual({
      ok: false,
      error: "invalid_site_url",
    });
  });
});

describe("qrUrl", () => {
  test("joins the QR base and the id", () => {
    expect(qrUrl("https://qr.viewpet.info", "abc123")).toBe("https://qr.viewpet.info/abc123");
    expect(qrUrl("https://viewpet.info/tag", "abc123")).toBe("https://viewpet.info/tag/abc123");
  });
});
