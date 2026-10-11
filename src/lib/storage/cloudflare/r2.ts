import { S3Client, PutObjectCommand, type S3ClientConfig } from "@aws-sdk/client-s3";
import type { StorageProvider } from "../interface";
import { validateImageUpload, joinUrl, IMMUTABLE_CACHE_CONTROL, wrapUploadError } from "../interface";

/**
 * Cloudflare R2 storage provider.
 *
 * R2 implements the S3 API, so this reuses `@aws-sdk/client-s3` pointed at
 * the R2 account endpoint instead of AWS — same upload path as
 * `S3StorageProvider`, different credentials and public URL.
 *
 * Environment variables required:
 * - R2_ACCOUNT_ID: Cloudflare account id (builds the R2 endpoint)
 * - R2_ACCESS_KEY_ID: R2 API token access key
 * - R2_SECRET_ACCESS_KEY: R2 API token secret
 * - R2_BUCKET: R2 bucket name
 * - R2_ACCESS_SUBDOMAIN: base URL images are served from — the bucket's
 *   `pub-<hash>.r2.dev` access subdomain, or a custom domain, once public
 *   access is enabled in the Cloudflare dashboard (bucket → Settings →
 *   Public access). Unlike S3, R2 has no bucket-policy equivalent and no
 *   canonical default URL derivable from account id + bucket name, so
 *   there's nothing to fall back to — this is required.
 *
 * Suitable for:
 * - Public, immutable assets served at scale (zero egress fees)
 * - Production deployments already comfortable with the S3 API
 */
export class R2StorageProvider implements StorageProvider {
  private client: S3Client;
  private readonly bucketName: string;
  private readonly basePath: string;
  private readonly accessSubdomain: string;

  constructor(bucketName?: string, basePath: string = "uploads", accessSubdomain?: string) {
    this.bucketName = bucketName || process.env.R2_BUCKET || "";
    this.basePath = basePath;
    this.accessSubdomain = accessSubdomain || process.env.R2_ACCESS_SUBDOMAIN || "";

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
    if (!this.accessSubdomain) {
      throw new Error(
        "R2 public access not configured. Set R2_ACCESS_SUBDOMAIN to the bucket's pub-<hash>.r2.dev subdomain or custom domain.",
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
   * @returns Public URL under `R2_ACCESS_SUBDOMAIN`.
   */
  async saveImage(hashId: string, file: File): Promise<string> {
    const { basePath, bucketName, accessSubdomain } = this;
    const ext = validateImageUpload(hashId, file);

    try {
      const buffer = Buffer.from(await file.arrayBuffer());

      const filename = `${hashId}.${ext}`;
      const key = `${basePath}/${filename}`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        CacheControl: IMMUTABLE_CACHE_CONTROL,
        // Note: public access is controlled by the bucket's public-access
        // setting in the Cloudflare dashboard, not by an object ACL.
      });

      await this.client.send(command);

      return joinUrl(accessSubdomain, key);
    } catch (err) {
      wrapUploadError("R2", err);
    }
  }
}
