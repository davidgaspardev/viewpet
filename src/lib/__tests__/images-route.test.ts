/**
 * Tests for the /api/images/[...key] proxy route — serves private R2
 * objects server-side so the browser never needs R2 credentials.
 * Run with: bun test src/lib/__tests__/images-route.test.ts
 */

import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { GET } from "@/app/api/images/[...key]/route";
import { StorageProviderFactory } from "@/lib/storage";

const VALID_HASH_ID = "abc23456defg"; // 12 chars, all in the hashId alphabet

function makeRequest(...keySegments: string[]): Promise<Response> {
  const request = new Request(`http://localhost/api/images/${keySegments.join("/")}`);
  return GET(request, { params: Promise.resolve({ key: keySegments }) }) as unknown as Promise<Response>;
}

describe("GET /api/images/[...key]", () => {
  beforeEach(() => {
    StorageProviderFactory.reset();
    delete process.env.STORAGE_PROVIDER;
    delete process.env.R2_BUCKET;
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
  });

  afterEach(() => {
    StorageProviderFactory.reset();
    delete process.env.STORAGE_PROVIDER;
    delete process.env.R2_BUCKET;
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
  });

  test("returns 404 when the active provider isn't R2", async () => {
    process.env.STORAGE_PROVIDER = "local";

    const res = await makeRequest("uploads", `${VALID_HASH_ID}.png`);

    expect(res.status).toBe(404);
  });

  function setUpR2(): void {
    process.env.STORAGE_PROVIDER = "r2";
    process.env.R2_BUCKET = "test-bucket";
    process.env.R2_ACCOUNT_ID = "test-account";
    process.env.R2_ACCESS_KEY_ID = "test-key";
    process.env.R2_SECRET_ACCESS_KEY = "test-secret";
  }

  test("returns 404 for a key that doesn't match uploads/<hashId>.<ext>", async () => {
    setUpR2();

    const res = await makeRequest("uploads", "not-a-valid-hash-id.png");

    expect(res.status).toBe(404);
  });

  test("returns 404 for a key outside the configured basePath", async () => {
    setUpR2();

    const res = await makeRequest("other", `${VALID_HASH_ID}.png`);

    expect(res.status).toBe(404);
  });

  test("serves the image bytes with correct headers when found", async () => {
    setUpR2();
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const provider = StorageProviderFactory.getInstance();
    (provider as any).client.send = mock(() =>
      Promise.resolve({
        ContentType: "image/png",
        Body: { transformToByteArray: () => Promise.resolve(bytes) },
      }),
    );

    const res = await makeRequest("uploads", `${VALID_HASH_ID}.png`);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
  });

  test("returns 404 when R2 reports the object missing by error name", async () => {
    setUpR2();
    const provider = StorageProviderFactory.getInstance();
    (provider as any).client.send = mock(() => {
      const err = new Error("not found");
      err.name = "NoSuchKey";
      return Promise.reject(err);
    });

    const res = await makeRequest("uploads", `${VALID_HASH_ID}.png`);

    expect(res.status).toBe(404);
  });

  test("returns 404 when R2 reports the object missing by HTTP status", async () => {
    setUpR2();
    const provider = StorageProviderFactory.getInstance();
    (provider as any).client.send = mock(() => {
      const err = new Error("missing") as Error & { $metadata: { httpStatusCode: number } };
      err.$metadata = { httpStatusCode: 404 };
      return Promise.reject(err);
    });

    const res = await makeRequest("uploads", `${VALID_HASH_ID}.png`);

    expect(res.status).toBe(404);
  });

  test("returns 500 for unexpected R2 errors", async () => {
    setUpR2();
    const provider = StorageProviderFactory.getInstance();
    (provider as any).client.send = mock(() => Promise.reject(new Error("network down")));

    const res = await makeRequest("uploads", `${VALID_HASH_ID}.png`);

    expect(res.status).toBe(500);
  });
});
