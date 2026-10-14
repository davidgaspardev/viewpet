import { describe, expect, test } from "bun:test";
import { QR_SCAN_COOKIE, QR_SCAN_TTL_SECONDS, qrScanCookie, scanSourceFrom, sharedCookieDomain } from "../utils/qr-scan";

describe("scanSourceFrom", () => {
  test("only the exact cookie value counts as a QR scan", () => {
    expect(scanSourceFrom("1")).toBe("qr");
    for (const other of [undefined, "", "0", "true", "yes", "11", " 1"]) {
      expect(scanSourceFrom(other)).toBe("direct");
    }
  });
});

describe("sharedCookieDomain", () => {
  test("a subdomain and its parent share the parent", () => {
    expect(sharedCookieDomain("qr.viewpet.info", "viewpet.info")).toBe("viewpet.info");
    expect(sharedCookieDomain("viewpet.info", "qr.viewpet.info")).toBe("viewpet.info");
  });

  test("two sibling subdomains share the parent", () => {
    expect(sharedCookieDomain("qr.viewpet.info", "www.viewpet.info")).toBe("viewpet.info");
    expect(sharedCookieDomain("QR.ViewPet.Info", "www.viewpet.info")).toBe("viewpet.info");
  });

  test("deeper hosts share their longest common suffix", () => {
    expect(sharedCookieDomain("a.qr.viewpet.info", "b.www.viewpet.info")).toBe("viewpet.info");
    expect(sharedCookieDomain("qr.test.local", "site.test.local")).toBe("test.local");
  });

  test("different domains, or only a top-level label in common, share nothing", () => {
    expect(sharedCookieDomain("qr.viewpet.info", "example.com")).toBeUndefined();
    expect(sharedCookieDomain("qr.viewpet.info", "other.info")).toBeUndefined();
    expect(sharedCookieDomain("qr.localhost", "site.localhost")).toBeUndefined();
    expect(sharedCookieDomain("localhost", "localhost")).toBeUndefined();
  });

  test("IPs and empty hosts are never given a Domain", () => {
    expect(sharedCookieDomain("10.0.0.1", "10.0.0.1")).toBeUndefined();
    expect(sharedCookieDomain("[::1]", "[::1]")).toBeUndefined();
    expect(sharedCookieDomain("", "viewpet.info")).toBeUndefined();
  });
});

describe("qrScanCookie", () => {
  const destination = "https://viewpet.info/tag/abcd2345efgh";

  test("is short-lived, HttpOnly, SameSite=Lax and scoped to the tag page", () => {
    expect(qrScanCookie({ qrHostname: "qr.viewpet.info", destination })).toEqual({
      name: QR_SCAN_COOKIE,
      value: "1",
      domain: "viewpet.info",
      path: "/tag/abcd2345efgh",
      maxAge: QR_SCAN_TTL_SECONDS,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });
    expect(QR_SCAN_TTL_SECONDS).toBe(60);
  });

  test("is Secure only when the site is https", () => {
    expect(qrScanCookie({ qrHostname: "qr.test.local", destination: "http://site.test.local:3000/tag/abcd2345efgh" })?.secure).toBe(false);
  });

  test("the path follows a base path on the site, without the query string", () => {
    const cookie = qrScanCookie({
      qrHostname: "qr.viewpet.info",
      destination: "https://viewpet.info/app/tag/abcd2345efgh?lang=en",
    });
    expect(cookie?.path).toBe("/app/tag/abcd2345efgh");
  });

  test("is skipped when the page could never receive it", () => {
    expect(qrScanCookie({ qrHostname: "qr.other.com", destination })).toBeNull();
    expect(qrScanCookie({ qrHostname: "qr.localhost", destination: "http://localhost:3000/tag/abcd2345efgh" })).toBeNull();
  });
});
