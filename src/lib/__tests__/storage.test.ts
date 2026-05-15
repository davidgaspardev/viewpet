/**
 * Test file to verify Storage provider abstraction and implementations
 * Run with: bun test src/lib/__tests__/storage.test.ts
 */

import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import {
  getStorageProvider,
  resetStorageProvider,
  SaveImageException,
  SUPPORTED_IMAGE_MIMES,
  MAX_IMAGE_BYTES,
} from "../storage";
import { LocalStorageProvider } from "../storage/local";
import { S3StorageProvider } from "../storage/s3";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PutObjectCommand } from "@aws-sdk/client-s3";

// Test utilities
const TEST_UPLOADS_DIR = path.join(process.cwd(), "test-uploads");
const TEST_PUBLIC_PREFIX = "/test-uploads";

/**
 * Create a mock File object for testing
 */
function createMockFile(
  size: number,
  type: string,
  filename: string = "test.jpg",
): File {
  const buffer = new ArrayBuffer(size);
  const blob = new Blob([buffer], { type });
  return new File([blob], filename, { type });
}

/**
 * Create a valid test image (1x1 PNG)
 */
function createTestImage(): File {
  // 1x1 PNG image (67 bytes)
  const pngData = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  const blob = new Blob([pngData], { type: "image/png" });
  return new File([blob], "test.png", { type: "image/png" });
}

/**
 * Clean up test files
 */
async function cleanupTestFiles(): Promise<void> {
  try {
    await fs.rm(TEST_UPLOADS_DIR, { recursive: true, force: true });
  } catch {
    // Ignore if directory doesn't exist
  }
}

/**
 * Valid test hashId (12 characters from the alphabet, no vowels or ambiguous chars)
 */
const TEST_HASH_ID = "abc23456defg";

describe("Storage Provider Abstraction", () => {
  beforeEach(async () => {
    // Reset singleton before each test
    resetStorageProvider();
    // Clear environment variables
    delete process.env.STORAGE_PROVIDER;
    delete process.env.AWS_S3_BUCKET;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_REGION;
    delete process.env.AWS_S3_PUBLIC_URL;
    delete process.env.AWS_CLOUDFRONT_DOMAIN;
    delete process.env.AWS_ENDPOINT;
    // Clean up test files
    await cleanupTestFiles();
  });

  afterEach(async () => {
    resetStorageProvider();
    await cleanupTestFiles();
  });

  describe("Factory", () => {
    test("returns singleton instance", () => {
      const provider1 = getStorageProvider();
      const provider2 = getStorageProvider();
      expect(provider1).toBe(provider2);
    });

    test("uses local provider in development", () => {
      (process.env as any).NODE_ENV = "development";
      const provider = getStorageProvider();
      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });

    test("uses local provider in test environment", () => {
      (process.env as any).NODE_ENV = "test";
      const provider = getStorageProvider();
      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });

    test("uses S3 provider when AWS credentials set in production", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.AWS_S3_BUCKET = "test-bucket";
      process.env.AWS_ACCESS_KEY_ID = "test-key";
      const provider = getStorageProvider();
      expect(provider).toBeInstanceOf(S3StorageProvider);
    });

    test("falls back to local provider in production without AWS credentials", () => {
      (process.env as any).NODE_ENV = "production";
      // No AWS credentials set
      const provider = getStorageProvider();
      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });

    test("respects STORAGE_PROVIDER environment variable for local", () => {
      resetStorageProvider();
      process.env.STORAGE_PROVIDER = "local";
      const provider = getStorageProvider();
      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });

    test("respects STORAGE_PROVIDER environment variable for S3", () => {
      resetStorageProvider();
      process.env.STORAGE_PROVIDER = "s3";
      process.env.AWS_S3_BUCKET = "test-bucket";
      const provider = getStorageProvider();
      expect(provider).toBeInstanceOf(S3StorageProvider);
    });

    test("resets singleton with resetStorageProvider", () => {
      const provider1 = getStorageProvider();
      resetStorageProvider();
      process.env.STORAGE_PROVIDER = "local";
      const provider2 = getStorageProvider();
      expect(provider1).not.toBe(provider2);
    });
  });

  describe("LocalStorageProvider", () => {
    let provider: LocalStorageProvider;

    beforeEach(async () => {
      provider = new LocalStorageProvider(TEST_UPLOADS_DIR, TEST_PUBLIC_PREFIX);
      await cleanupTestFiles();
    });

    afterEach(async () => {
      await cleanupTestFiles();
    });

    test("saveImage creates file in uploads directory", async () => {
      const file = createTestImage();
      await provider.saveImage(TEST_HASH_ID, file);

      const filePath = path.join(TEST_UPLOADS_DIR, `${TEST_HASH_ID}.png`);
      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    test("saveImage returns local URL with correct format", async () => {
      const file = createTestImage();
      const url = await provider.saveImage(TEST_HASH_ID, file);
      expect(url).toBe(`${TEST_PUBLIC_PREFIX}/${TEST_HASH_ID}.png`);
    });

    test("saveImage validates file type and throws SaveImageException", async () => {
      const invalidFile = createMockFile(1024, "application/pdf", "test.pdf");
      await expect(
        provider.saveImage(TEST_HASH_ID, invalidFile),
      ).rejects.toThrow(SaveImageException);
      try {
        await provider.saveImage(TEST_HASH_ID, invalidFile);
      } catch (err) {
        if (err instanceof SaveImageException) {
          expect(err.code).toBe("invalid_type");
        }
      }
    });

    test("saveImage validates file size and throws SaveImageException", async () => {
      const tooLargeFile = createMockFile(
        MAX_IMAGE_BYTES + 1,
        "image/jpeg",
        "large.jpg",
      );
      await expect(
        provider.saveImage(TEST_HASH_ID, tooLargeFile),
      ).rejects.toThrow(SaveImageException);
      try {
        await provider.saveImage(TEST_HASH_ID, tooLargeFile);
      } catch (err) {
        if (err instanceof SaveImageException) {
          expect(err.code).toBe("too_large");
        }
      }
    });

    test("saveImage handles empty files", async () => {
      const emptyFile = createMockFile(0, "image/jpeg", "empty.jpg");
      await expect(provider.saveImage(TEST_HASH_ID, emptyFile)).rejects.toThrow(
        SaveImageException,
      );
      try {
        await provider.saveImage(TEST_HASH_ID, emptyFile);
      } catch (err) {
        if (err instanceof SaveImageException) {
          expect(err.code).toBe("empty");
        }
      }
    });

    test("saveImage overwrites existing files with same hashId", async () => {
      const file1 = createTestImage();
      const file2 = createMockFile(2048, "image/jpeg", "test2.jpg");

      // Save first file (PNG)
      const url1 = await provider.saveImage(TEST_HASH_ID, file1);
      expect(url1).toBe(`${TEST_PUBLIC_PREFIX}/${TEST_HASH_ID}.png`);

      // Save second file (JPEG) - should replace the PNG
      const url2 = await provider.saveImage(TEST_HASH_ID, file2);
      expect(url2).toBe(`${TEST_PUBLIC_PREFIX}/${TEST_HASH_ID}.jpg`);

      // PNG file should be removed
      const pngPath = path.join(TEST_UPLOADS_DIR, `${TEST_HASH_ID}.png`);
      const pngExists = await fs
        .access(pngPath)
        .then(() => true)
        .catch(() => false);
      expect(pngExists).toBe(false);

      // JPEG file should exist
      const jpgPath = path.join(TEST_UPLOADS_DIR, `${TEST_HASH_ID}.jpg`);
      const jpgExists = await fs
        .access(jpgPath)
        .then(() => true)
        .catch(() => false);
      expect(jpgExists).toBe(true);
    });

    test("saveImage uses correct file extension based on MIME type", async () => {
      const testCases = [
        { mime: "image/jpeg", ext: "jpg" },
        { mime: "image/png", ext: "png" },
        { mime: "image/webp", ext: "webp" },
        { mime: "image/gif", ext: "gif" },
      ];

      for (const { mime, ext } of testCases) {
        await cleanupTestFiles();
        const file = createMockFile(1024, mime, `test.${ext}`);
        const url = await provider.saveImage(TEST_HASH_ID, file);
        expect(url).toBe(`${TEST_PUBLIC_PREFIX}/${TEST_HASH_ID}.${ext}`);
      }
    });

    test("saveImage rejects invalid hashId format", async () => {
      const file = createTestImage();
      const invalidHashIds = [
        "../evil",
        "too-short",
        "has spaces",
        "has/slash",
        "toolongstring",
      ];

      for (const invalidId of invalidHashIds) {
        await expect(provider.saveImage(invalidId, file)).rejects.toThrow(
          "Invalid hashId format",
        );
      }
    });

    test("saveImage creates directory if it doesn't exist", async () => {
      // Ensure directory doesn't exist
      await cleanupTestFiles();

      const file = createTestImage();
      await provider.saveImage(TEST_HASH_ID, file);

      const dirExists = await fs
        .access(TEST_UPLOADS_DIR)
        .then(() => true)
        .catch(() => false);
      expect(dirExists).toBe(true);
    });
  });

  describe("S3StorageProvider", () => {
    let mockSend: any;

    beforeEach(() => {
      // Set required environment variables
      process.env.AWS_S3_BUCKET = "test-bucket";
      process.env.AWS_REGION = "us-east-1";
      process.env.AWS_ACCESS_KEY_ID = "test-key";
      process.env.AWS_SECRET_ACCESS_KEY = "test-secret";

      // Mock S3Client send method
      mockSend = mock(() => Promise.resolve({}));
    });

    afterEach(() => {
      mockSend?.mockRestore?.();
    });

    test("constructor throws error without bucket configuration", () => {
      delete process.env.AWS_S3_BUCKET;
      expect(() => new S3StorageProvider()).toThrow("S3 bucket not configured");
    });

    test("saveImage uploads to S3", async () => {
      // Create a mock S3 provider that uses our mocked send
      const provider = new S3StorageProvider();
      // Override the client's send method
      (provider as any).client.send = mockSend;

      const file = createTestImage();

      await provider.saveImage(TEST_HASH_ID, file);

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    test("saveImage uses correct bucket and key", async () => {
      const provider = new S3StorageProvider();
      (provider as any).client.send = mockSend;
      const file = createTestImage();

      await provider.saveImage(TEST_HASH_ID, file);

      const call = mockSend.mock.calls[0][0];
      expect(call).toBeInstanceOf(PutObjectCommand);
      expect(call.input.Bucket).toBe("test-bucket");
      expect(call.input.Key).toBe(`uploads/${TEST_HASH_ID}.png`);
    });

    test("saveImage sets proper ContentType", async () => {
      const provider = new S3StorageProvider();
      (provider as any).client.send = mockSend;
      const file = createTestImage();

      await provider.saveImage(TEST_HASH_ID, file);

      const call = mockSend.mock.calls[0][0];
      expect(call.input.ContentType).toBe("image/png");
    });

    test("saveImage sets CacheControl headers", async () => {
      const provider = new S3StorageProvider();
      (provider as any).client.send = mockSend;
      const file = createTestImage();

      await provider.saveImage(TEST_HASH_ID, file);

      const call = mockSend.mock.calls[0][0];
      expect(call.input.CacheControl).toBe(
        "public, max-age=31536000, immutable",
      );
    });

    test("saveImage validates file type", async () => {
      const provider = new S3StorageProvider();
      (provider as any).client.send = mockSend;
      const invalidFile = createMockFile(1024, "application/pdf", "test.pdf");

      await expect(
        provider.saveImage(TEST_HASH_ID, invalidFile),
      ).rejects.toThrow(SaveImageException);
    });

    test("saveImage validates file size", async () => {
      const provider = new S3StorageProvider();
      (provider as any).client.send = mockSend;
      const tooLargeFile = createMockFile(
        MAX_IMAGE_BYTES + 1,
        "image/jpeg",
        "large.jpg",
      );

      await expect(
        provider.saveImage(TEST_HASH_ID, tooLargeFile),
      ).rejects.toThrow(SaveImageException);
    });

    test("saveImage handles AWS errors gracefully", async () => {
      const mockSendError = mock(() =>
        Promise.reject(new Error("Network error")),
      );
      const provider = new S3StorageProvider();
      (provider as any).client.send = mockSendError;

      const file = createTestImage();

      await expect(provider.saveImage(TEST_HASH_ID, file)).rejects.toThrow(
        "S3 upload failed: Network error",
      );
    });

    test("buildPublicUrl returns standard S3 URL by default", async () => {
      const provider = new S3StorageProvider();
      (provider as any).client.send = mockSend;
      const file = createTestImage();

      const url = await provider.saveImage(TEST_HASH_ID, file);

      expect(url).toBe(
        `https://test-bucket.s3.us-east-1.amazonaws.com/uploads/${TEST_HASH_ID}.png`,
      );
    });

    test("buildPublicUrl uses CloudFront URL when configured", async () => {
      process.env.AWS_CLOUDFRONT_DOMAIN = "https://d123456789.cloudfront.net";

      const provider = new S3StorageProvider();
      (provider as any).client.send = mockSend;
      const file = createTestImage();

      const url = await provider.saveImage(TEST_HASH_ID, file);

      expect(url).toBe(
        `https://d123456789.cloudfront.net/uploads/${TEST_HASH_ID}.png`,
      );
    });

    test("buildPublicUrl uses custom domain when configured", async () => {
      process.env.AWS_S3_PUBLIC_URL = "https://cdn.example.com";

      const provider = new S3StorageProvider();
      (provider as any).client.send = mockSend;
      const file = createTestImage();

      const url = await provider.saveImage(TEST_HASH_ID, file);

      expect(url).toBe(`https://cdn.example.com/uploads/${TEST_HASH_ID}.png`);
    });

    test("buildPublicUrl prefers CloudFront over custom domain", async () => {
      process.env.AWS_CLOUDFRONT_DOMAIN = "https://d123456789.cloudfront.net";
      process.env.AWS_S3_PUBLIC_URL = "https://cdn.example.com";

      const provider = new S3StorageProvider();
      (provider as any).client.send = mockSend;
      const file = createTestImage();

      const url = await provider.saveImage(TEST_HASH_ID, file);

      expect(url).toBe(
        `https://d123456789.cloudfront.net/uploads/${TEST_HASH_ID}.png`,
      );
    });

    test("supports LocalStack endpoint configuration", () => {
      process.env.AWS_ENDPOINT = "http://localhost:4566";

      // Just verify it doesn't throw - mocking deeper would be complex
      expect(() => new S3StorageProvider()).not.toThrow();
    });

    test("saveImage rejects invalid hashId format", async () => {
      const provider = new S3StorageProvider();
      (provider as any).client.send = mockSend;
      const file = createTestImage();

      await expect(provider.saveImage("../evil", file)).rejects.toThrow(
        "Invalid hashId format",
      );
    });
  });

  describe("Error Handling", () => {
    test("SaveImageException with invalid_type", () => {
      const error = new SaveImageException("invalid_type");
      expect(error.code).toBe("invalid_type");
      expect(error.message).toBe("save_pet_image:invalid_type");
    });

    test("SaveImageException with too_large", () => {
      const error = new SaveImageException("too_large");
      expect(error.code).toBe("too_large");
      expect(error.message).toBe("save_pet_image:too_large");
    });

    test("SaveImageException with empty", () => {
      const error = new SaveImageException("empty");
      expect(error.code).toBe("empty");
      expect(error.message).toBe("save_pet_image:empty");
    });

    test("SaveImageException is instanceof Error", () => {
      const error = new SaveImageException("invalid_type");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SaveImageException);
    });

    test("error codes are type-safe", () => {
      // This test verifies compile-time type safety
      const validCodes: Array<"invalid_type" | "too_large" | "empty"> = [
        "invalid_type",
        "too_large",
        "empty",
      ];

      for (const code of validCodes) {
        const error = new SaveImageException(code);
        expect(error.code).toBe(code);
      }
    });
  });

  describe("Constants", () => {
    test("SUPPORTED_IMAGE_MIMES includes all expected types", () => {
      expect(SUPPORTED_IMAGE_MIMES).toContain("image/jpeg");
      expect(SUPPORTED_IMAGE_MIMES).toContain("image/jpg");
      expect(SUPPORTED_IMAGE_MIMES).toContain("image/png");
      expect(SUPPORTED_IMAGE_MIMES).toContain("image/webp");
      expect(SUPPORTED_IMAGE_MIMES).toContain("image/gif");
    });

    test("MAX_IMAGE_BYTES is 5MB", () => {
      expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);
    });
  });

  describe("Backward Compatibility (blobs.ts facade)", () => {
    test("savePetImage works with factory", async () => {
      const { savePetImage } = await import("../blobs");

      // Set up environment to use local provider
      process.env.STORAGE_PROVIDER = "local";
      resetStorageProvider();

      const file = createTestImage();
      const url = await savePetImage(TEST_HASH_ID, file);

      expect(url).toMatch(new RegExp(`/${TEST_HASH_ID}\\.png$`));
    });

    test("savePetImage re-exports SUPPORTED_IMAGE_MIMES", async () => {
      const blobs = await import("../blobs");
      expect(blobs.SUPPORTED_IMAGE_MIMES).toBeDefined();
      expect(blobs.SUPPORTED_IMAGE_MIMES.length).toBeGreaterThan(0);
    });

    test("savePetImage re-exports MAX_IMAGE_BYTES", async () => {
      const blobs = await import("../blobs");
      expect(blobs.MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);
    });

    test("savePetImage re-exports SaveImageException", async () => {
      const blobs = await import("../blobs");
      expect(blobs.SaveImageException).toBeDefined();
      const error = new blobs.SaveImageException("invalid_type");
      expect(error).toBeInstanceOf(blobs.SaveImageException);
    });
  });
});
