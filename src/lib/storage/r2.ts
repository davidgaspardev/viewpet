import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import type { StorageProvider } from "./interface";
import { validateImageUpload } from "./interface";

/** Route that proxies reads through our own server — see `getImage()` below. */
const IMAGE_PROXY_PATH = "/api/images";

/**
 * Cloudflare R2 storage provider.
 *
 * R2 implements the S3 API, so this reuses `@aws-sdk/client-s3` pointed at
 * the R2 account endpoint instead of AWS — same upload path as
 * `S3StorageProvider`, different credentials and read path.
 *
 * Environment variables required:
 * - R2_ACCOUNT_ID: Cloudflare account id (builds the R2 endpoint)
 * - R2_ACCESS_KEY_ID: R2 API token access key
 * - R2_SECRET_ACCESS_KEY: R2 API token secret
 * - R2_BUCKET: R2 bucket name
 *
 * R2 buckets are private by default — there's no bucket-policy equivalent
 * to S3's public-read JSON, and enabling public access is an explicit,
 * easy-to-get-wrong Cloudflare dashboard step. So the bucket just always
 * stays private: `saveImage()` always returns a URL under our own
 * `/api/images/<key>` proxy route (`src/app/api/images/`), which holds
 * these same credentials and fetches the object server-side via
 * `getImage()`. The browser never touches R2 directly.
 *
 * Suitable for:
 * - Public, immutable assets served at scale (zero egress fees on the
 *   R2 side — the proxy response is cached for a year, so repeat views
 *   hit the platform's edge cache, not this provider)
 * - Production deployments already comfortable with the S3 API
 */
export class R2StorageProvider implements StorageProvider {
  private client: S3Client;
  private readonly bucketName: string;
  /** Public so the `/api/images` proxy route can derive its key-matching regex from it. */
  readonly basePath: string;

  constructor(bucketName?: string, basePath: string = "uploads") {
    this.bucketName = bucketName || process.env.R2_BUCKET || "";
    this.basePath = basePath;

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!this.bucketName) {
      throw new Error("R2 bucket not configured. Set R2_BUCKET environment variable.");
    }
    if (!accountId) {
      throw new Error("R2 account not configured. Set R2_ACCOUNT_ID environment variable.");
    }
    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        "R2 credentials not configured. Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY environment variables.",
      );
    }

    const clientConfig: S3ClientConfig = {
      // R2 ignores the region value but the S3 SDK requires one — "auto"
      // is Cloudflare's documented placeholder.
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      // R2's S3 API is path-style only (no per-bucket virtual-hosted DNS).
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    };

    this.client = new S3Client(clientConfig);
  }

  /**
   * Save an uploaded image to R2.
   *
   * @param hashId - Unique identifier for this pet
   * @param file - The uploaded File object
   * @returns A URL under our own `/api/images/<key>` proxy route.
   */
  async saveImage(hashId: string, file: File): Promise<string> {
    const ext = validateImageUpload(hashId, file);

    try {
      const buffer = Buffer.from(await file.arrayBuffer());

      const filename = `${hashId}.${ext}`;
      const key = `${this.basePath}/${filename}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        // Cache for 1 year (immutable content)
        CacheControl: "public, max-age=31536000, immutable",
      });

      await this.client.send(command);

      return `${IMAGE_PROXY_PATH}/${key}`;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`R2 upload failed: ${err.message}`);
      }
      throw new Error(`R2 upload failed: ${String(err)}`);
    }
  }

  /**
   * Fetch an object's bytes directly from R2 using our own credentials.
   * Used by the `/api/images/[...key]` route to serve images — the bucket
   * stays private, so this is the only way to read them.
   *
   * @throws Error with `.name === "NoSuchKey"` when the object doesn't exist
   *   (same shape the AWS SDK throws, so callers can branch on it the same way).
   */
  async getImage(key: string): Promise<{ body: Uint8Array; contentType: string }> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
    if (!result.Body) {
      throw new Error(`R2 object "${key}" has no body`);
    }
    const body = await result.Body.transformToByteArray();
    return { body, contentType: result.ContentType ?? "application/octet-stream" };
  }
}
