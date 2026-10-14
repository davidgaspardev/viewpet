import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { handleQrRedirect } from "../handler";

const env = { SITE_URL: "https://viewpet.info", QR_BASE_URL: "https://qr.viewpet.info" };
const id = "abcd2345efgh";

const request = (path: string, headers: Record<string, string> = { host: "qr.viewpet.info" }) =>
  new NextRequest(`https://qr.viewpet.info${path}`, { headers });

describe("handleQrRedirect", () => {
  test("redirects the QR host to the tag page with a 307", () => {
    const response = handleQrRedirect(request(`/${id}`), env);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`https://viewpet.info/tag/${id}`);
  });

  test("keeps the query string and lowercases the id", () => {
    const response = handleQrRedirect(request(`/${id.toUpperCase()}?lang=en`), env);
    expect(response.headers.get("location")).toBe(`https://viewpet.info/tag/${id}?lang=en`);
  });

  test("marks the visit with the qr_scan cookie: 60s, HttpOnly, Lax, Secure, scoped to the tag", () => {
    const cookie = handleQrRedirect(request(`/${id}`), env).headers.get("set-cookie") ?? "";
    expect(cookie).toContain("qr_scan=1");
    expect(cookie).toContain("Max-Age=60");
    expect(cookie).toContain("Domain=viewpet.info");
    expect(cookie).toContain(`Path=/tag/${id}`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie.toLowerCase()).toContain("samesite=lax");
  });

  test("redirects without a cookie when the hosts share no parent domain", () => {
    const response = handleQrRedirect(request(`/${id}`), { SITE_URL: "https://example.com", QR_BASE_URL: "https://qr.viewpet.info" });
    expect(response.status).toBe(307);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  test("honours X-Forwarded-Host over Host", () => {
    const response = handleQrRedirect(request(`/${id}`, { host: "internal:3000", "x-forwarded-host": "qr.viewpet.info" }), env);
    expect(response.status).toBe(307);
  });

  test("passes everything else through untouched", () => {
    for (const [path, headers] of [
      [`/${id}`, { host: "viewpet.info" }], // the main host
      ["/abcd2345efg0", { host: "qr.viewpet.info" }], // ambiguous character
      ["/", { host: "qr.viewpet.info" }],
    ] as const) {
      const response = handleQrRedirect(request(path, { ...headers }), env);
      expect(response.status).toBe(200);
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("set-cookie")).toBeNull();
    }
  });

  test("passes through when QR_BASE_URL / SITE_URL are not configured", () => {
    expect(handleQrRedirect(request(`/${id}`), {}).headers.get("x-middleware-next")).toBe("1");
  });

  test("never throws: a failure is logged and the request carries on", () => {
    const broken = {
      get QR_BASE_URL(): string {
        throw new Error("boom");
      },
      SITE_URL: env.SITE_URL,
    };
    const original = console.error;
    console.error = () => {};
    try {
      const response = handleQrRedirect(request(`/${id}`), broken);
      expect(response.status).toBe(200);
      expect(response.headers.get("x-middleware-next")).toBe("1");
    } finally {
      console.error = original;
    }
  });
});
