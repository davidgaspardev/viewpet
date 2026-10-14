import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { guardAdmin } from "../guard";

const basic = (pass: string) => `Basic ${btoa(`admin:${pass}`)}`;
const adminRequest = (authorization?: string) =>
  new NextRequest("https://viewpet.info/admin", { headers: authorization ? { authorization } : {} });

describe("guardAdmin", () => {
  const original = process.env.ADMIN_PASSWORD;
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "s3cret";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = original;
  });

  test("lets the right password through", async () => {
    const response = await guardAdmin(adminRequest(basic("s3cret")));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  test("challenges a missing or wrong password with 401 and no-store", async () => {
    for (const auth of [undefined, basic("nope")]) {
      const response = await guardAdmin(adminRequest(auth));
      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toContain("Basic");
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });

  test("is disabled (503) when ADMIN_PASSWORD is not set", async () => {
    delete process.env.ADMIN_PASSWORD;
    const response = await guardAdmin(adminRequest(basic("anything")));
    expect(response.status).toBe(503);
    expect(response.headers.get("www-authenticate")).toBeNull();
  });
});
