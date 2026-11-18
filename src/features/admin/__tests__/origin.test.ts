import { describe, expect, test } from "bun:test";
import QRCode from "qrcode";
import { qrPayload, qrUrl, resolveQrBase } from "../origin";

const headers = (h: Record<string, string>) => ({
  get: (name: string) => h[name.toLowerCase()] ?? null,
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

describe("qrPayload", () => {
  test("upper-cases the short host's URL (scheme, host and id are not case-sensitive there)", () => {
    expect(qrPayload("https://qr.viewpet.info", "abc23456defg")).toBe("HTTPS://QR.VIEWPET.INFO/ABC23456DEFG");
  });

  test("leaves a base with a path alone: the /tag route is case-sensitive", () => {
    expect(qrPayload("https://viewpet.info/tag", "abc23456defg")).toBe("https://viewpet.info/tag/abc23456defg");
    expect(qrPayload("http://localhost:3000/tag", "abc23456defg")).toBe("http://localhost:3000/tag/abc23456defg");
  });

  test("a payload on the short host is a smaller QR code than the lowercase URL", () => {
    const base = "https://qr.viewpet.info";
    const id = "abc23456defg";
    const size = (text: string) => QRCode.create(text, { errorCorrectionLevel: "H" }).modules.size;
    expect(size(qrUrl(base, id))).toBe(37); // version 5, byte mode
    expect(size(qrPayload(base, id))).toBe(33); // version 4, alphanumeric mode
  });

  test("every id the generator can produce stays in the alphanumeric set once upper-cased", () => {
    // 0-9, A-Z, space, $ % * + - . / : — a character outside it would drop the whole code back to byte mode.
    expect(qrPayload("https://qr.viewpet.info", "23456789abcd")).toMatch(/^[0-9A-Z $%*+\-./:]+$/);
  });
});
