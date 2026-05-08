import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { IStorageProvider } from "./interface";
import {
  MAX_IMAGE_BYTES,
  SaveImageException,
  getExtensionFromMime,
} from "./interface";

/**
 * AWS S3 storage provider.
 *
 * Uploads images to Amazon S3 and returns public URLs.
 *
 * Environment variables required:
 * - AWS_REGION: AWS region (e.g., "us-east-1")
 * - AWS_S3_BUCKET: Your S3 bucket name
 * - AWS_ACCESS_KEY_ID: AWS access key
 * - AWS_SECRET_ACCESS_KEY: AWS secret key
 *
 * Optional environment variables:
 * - AWS_S3_PUBLIC_URL: Base URL for direct S3 access (e.g., "https://bucket.s3.amazonaws.com")
 * - AWS_CLOUDFRONT_DOMAIN: CloudFront distribution URL (e.g., "https://d123456789.cloudfront.net")
 *
 * Features:
 * - Supports direct S3 URLs and CloudFront CDN URLs
 * - Automatic re-upload handling (overwrites existing files)
 * - Proper content-type and cache-control headers
 *
 * Suitable for:
 * - Production deployments
 * - Multi-server/serverless environments
 * - Global CDN distribution via CloudFront
 * - High-scale applications
 * - Cost-effective storage
 */
export class S3StorageProvider implements IStorageProvider {
  private client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly basePath: string;
  private readonly publicUrl?: string;
  private readonly cloudfrontDomain?: string;

  constructor(
    bucketName?: string,
    region?: string,
    basePath: string = "uploads",
  ) {
    this.bucketName = bucketName || process.env.AWS_S3_BUCKET || "";
    this.region = region || process.env.AWS_REGION || "us-east-1";
    this.basePath = basePath;
    this.publicUrl = process.env.AWS_S3_PUBLIC_URL;
    this.cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

    if (!this.bucketName) {
      throw new Error(
        "S3 bucket not configured. Set AWS_S3_BUCKET environment variable.",
      );
    }

    // Initialize S3 client and only set explicit credentials when both values are provided.
    // Otherwise, allow the AWS SDK default credential provider chain to resolve credentials.
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const clientConfig: any = {
      region: this.region,
    };

    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }

    // Support for LocalStack (local AWS emulation)
    if (process.env.AWS_ENDPOINT) {
      clientConfig.endpoint = process.env.AWS_ENDPOINT;
      clientConfig.forcePathStyle = true; // Required for LocalStack
    }

    this.client = new S3Client(clientConfig);
  }

  /**
   * Save an uploaded image to S3.
   *
   * @param hashId - Unique identifier for this pet
   * @param file - The uploaded File object
   * @returns Public S3 or CloudFront URL
   */
  async saveImage(hashId: string, file: File): Promise<string> {
    // Validate file
    if (!file || file.size === 0) {
      throw new SaveImageException("empty");
    }

    const ext = getExtensionFromMime(file.type);
    if (!ext) {
      throw new SaveImageException("invalid_type");
    }

    if (file.size > MAX_IMAGE_BYTES) {
      throw new SaveImageException("too_large");
    }

    try {
      // Convert File to Buffer
      const buffer = Buffer.from(await file.arrayBuffer());

      // Create S3 key (path)
      const filename = `${hashId}.${ext}`;
      const key = `${this.basePath}/${filename}`;

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        // Cache for 1 year (immutable content)
        CacheControl: "public, max-age=31536000, immutable",
        // Note: Public access is controlled by bucket policy, not ACL
      });

      await this.client.send(command);

      // Build and return the public URL
      return this.buildPublicUrl(key);
    } catch (err) {
      // Wrap AWS errors with more context
      if (err instanceof Error) {
        throw new Error(`S3 upload failed: ${err.message}`);
      }
      throw new Error(`S3 upload failed: ${String(err)}`);
    }
  }

  /**
   * Build the public URL for the uploaded file.
   * Priority:
   * 1. CloudFront domain (if configured)
   * 2. Custom public URL (if configured)
   * 3. Standard S3 URL
   */
  private buildPublicUrl(key: string): string {
    // CloudFront takes precedence
    if (this.cloudfrontDomain) {
      const domain = this.cloudfrontDomain.replace(/\/$/, "");
      return `${domain}/${key}`;
    }

    // Custom public URL (e.g., for custom domains)
    if (this.publicUrl) {
      const baseUrl = this.publicUrl.replace(/\/$/, "");
      return `${baseUrl}/${key}`;
    }

    // Standard S3 URL
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
