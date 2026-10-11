import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { isAdminAuthorized } from "../auth";

const basic = (user: string, pass: string) => `Basic ${btoa(`${user}:${pass}`)}`;

describe("isAdminAuthorized", () => {
  const original = process.env.ADMIN_PASSWORD;
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "s3cret";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = original;
  });

  test("accepts the right password with any username", async () => {
    expect(await isAdminAuthorized(basic("admin", "s3cret"))).toBe(true);
    expect(await isAdminAuthorized(basic("", "s3cret"))).toBe(true);
  });

  test("accepts passwords containing a colon", async () => {
    process.env.ADMIN_PASSWORD = "a:b";
    expect(await isAdminAuthorized(basic("u", "a:b"))).toBe(true);
  });

  test("rejects wrong, missing and malformed credentials", async () => {
    expect(await isAdminAuthorized(basic("admin", "nope"))).toBe(false);
    expect(await isAdminAuthorized(null)).toBe(false);
    expect(await isAdminAuthorized("Bearer s3cret")).toBe(false);
    expect(await isAdminAuthorized("Basic !!!")).toBe(false);
    expect(await isAdminAuthorized(`Basic ${btoa("nocolon")}`)).toBe(false);
  });

  test("fails closed when ADMIN_PASSWORD is unset or empty", async () => {
    delete process.env.ADMIN_PASSWORD;
    expect(await isAdminAuthorized(basic("admin", ""))).toBe(false);
    process.env.ADMIN_PASSWORD = "";
    expect(await isAdminAuthorized(basic("admin", ""))).toBe(false);
  });

  test("tolerates repeated spaces after the scheme and a case-insensitive scheme", async () => {
    expect(await isAdminAuthorized(`basic   ${btoa("u:s3cret")}`)).toBe(true);
  });
});
