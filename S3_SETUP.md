# AWS S3 Storage Setup Guide

This guide walks you through setting up AWS S3 as the storage provider for ViewPet.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Create S3 Bucket](#create-s3-bucket)
3. [Configure Bucket for Public Access](#configure-bucket-for-public-access)
4. [Create IAM User](#create-iam-user)
5. [Configure CORS](#configure-cors)
6. [Environment Variables](#environment-variables)
7. [Optional: CloudFront CDN Setup](#optional-cloudfront-cdn-setup)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

- AWS Account
- AWS CLI (optional, but recommended)
- Access to AWS Console

## Create S3 Bucket

### Via AWS Console

1. Go to [S3 Console](https://console.aws.amazon.com/s3/)
2. Click **Create bucket**
3. Choose a unique bucket name (e.g., `viewpet-images-prod`)
4. Select your preferred AWS Region (e.g., `us-east-1`)
5. **Block Public Access settings**: 
   - ⚠️ **Uncheck** "Block all public access" (we need public read access for images)
   - Acknowledge the warning
6. Leave other settings as default
7. Click **Create bucket**

### Via AWS CLI

```bash
aws s3 mb s3://viewpet-images-prod --region us-east-1
```

## Configure Bucket for Public Access

You have two options for making images publicly accessible:

### Option A: Bucket Policy (Recommended)

This allows public read access to all objects in the bucket.

1. Go to your bucket → **Permissions** tab
2. Scroll to **Bucket policy**
3. Click **Edit** and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::viewpet-images-prod/*"
    }
  ]
}
```

4. Replace `viewpet-images-prod` with your bucket name
5. Click **Save changes**

### Option B: Public ACL per Object

The S3StorageProvider sets `ACL: "public-read"` on each upload. This requires:

1. Go to your bucket → **Permissions** tab
2. Scroll to **Object Ownership**
3. Click **Edit**
4. Select **ACLs enabled**
5. Select **Bucket owner preferred**
6. Click **Save changes**

**Note:** AWS recommends bucket policies over ACLs for new applications.

## Create IAM User

Create a dedicated IAM user with minimal permissions for uploading images.

### Via AWS Console

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users** → **Add users**
3. User name: `viewpet-uploader`
4. Select **Access key - Programmatic access**
5. Click **Next: Permissions**
6. Select **Attach existing policies directly**
7. Click **Create policy** (opens in new tab)

#### Create Custom IAM Policy

In the new tab:

1. Click **JSON** tab
2. Paste this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::viewpet-images-prod/*"
    }
  ]
}
```

3. Replace `viewpet-images-prod` with your bucket name
4. Click **Next: Tags** (optional)
5. Click **Next: Review**
6. Name: `ViewPetS3UploadPolicy`
7. Click **Create policy**

#### Attach Policy to User

Return to the user creation tab:

1. Click the refresh button
2. Search for `ViewPetS3UploadPolicy`
3. Check the box next to it
4. Click **Next: Tags** (optional)
5. Click **Next: Review**
6. Click **Create user**
7. **⚠️ Important:** Save the **Access key ID** and **Secret access key** (you won't see the secret again!)

### Via AWS CLI

Create policy:

```bash
cat > viewpet-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::viewpet-images-prod/*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name ViewPetS3UploadPolicy \
  --policy-document file://viewpet-policy.json
```

Create user and attach policy:

```bash
aws iam create-user --user-name viewpet-uploader

aws iam attach-user-policy \
  --user-name viewpet-uploader \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/ViewPetS3UploadPolicy

aws iam create-access-key --user-name viewpet-uploader
```

## Configure CORS

CORS is required if you upload directly from the browser (future feature).

1. Go to your bucket → **Permissions** tab
2. Scroll to **Cross-origin resource sharing (CORS)**
3. Click **Edit** and paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

4. Replace `https://yourdomain.com` with your actual domain
5. For development, you can add `http://localhost:3000`
6. Click **Save changes**

**Development CORS:**

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

## Environment Variables

Add these to your `.env.local` file:

### Required Variables

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_S3_BUCKET=viewpet-images-prod
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Explicitly use S3 storage
STORAGE_PROVIDER=s3
```

### Optional Variables

```bash
# Custom S3 public URL (if you prefer to specify it explicitly)
AWS_S3_PUBLIC_URL=https://viewpet-images-prod.s3.amazonaws.com

# Or use CloudFront (see next section)
AWS_CLOUDFRONT_DOMAIN=https://d123456789.cloudfront.net
```

### Auto-Detection

If you don't set `STORAGE_PROVIDER`, the system will auto-detect S3 in production when:
- `AWS_S3_BUCKET` is set
- `AWS_ACCESS_KEY_ID` is set
- `NODE_ENV=production`

## Optional: CloudFront CDN Setup

CloudFront provides global CDN distribution for faster image loading.

### Create CloudFront Distribution

1. Go to [CloudFront Console](https://console.aws.amazon.com/cloudfront/)
2. Click **Create Distribution**
3. **Origin Domain**: Select your S3 bucket
4. **Origin Path**: Leave empty (or `/uploads` if you want CDN only for uploads)
5. **Viewer Protocol Policy**: Redirect HTTP to HTTPS
6. **Cache Policy**: Select **CachingOptimized**
7. **Origin Request Policy**: None needed for public buckets
8. **Price Class**: Select based on your needs (Use All Edge Locations for best performance)
9. Click **Create Distribution**
10. Wait for deployment (Status: Deployed)
11. Copy the **Distribution domain name** (e.g., `d123456789.cloudfront.net`)

### Configure Environment Variable

Add to your `.env.local`:

```bash
AWS_CLOUDFRONT_DOMAIN=https://d123456789.cloudfront.net
```

### Benefits of CloudFront

- ✅ Global CDN edge locations (low latency worldwide)
- ✅ HTTPS by default
- ✅ Better cache control
- ✅ Optional custom domain (CNAME)
- ✅ DDoS protection

### Custom Domain with CloudFront (Optional)

1. In CloudFront distribution settings:
   - **Alternate domain names (CNAMEs)**: Add `cdn.yourdomain.com`
   - **Custom SSL certificate**: Request or import certificate via ACM
2. In your DNS (Route 53, Cloudflare, etc.):
   - Add CNAME: `cdn.yourdomain.com` → `d123456789.cloudfront.net`
3. Update environment variable:
   ```bash
   AWS_CLOUDFRONT_DOMAIN=https://cdn.yourdomain.com
   ```

## Testing

### Automated Test Script

A test script is provided to verify your S3 configuration:

```bash
bun run test-s3-upload.ts
```

This script will:
1. Initialize the S3 storage provider
2. Create a small test image (1x1 pixel PNG)
3. Upload it to your S3 bucket
4. Display the public URL
5. Provide troubleshooting tips if it fails

**Expected output:**
```
🧪 Testing S3 upload...

[Storage] Using s3 storage provider
✓ Storage provider initialized

📦 Created test file:
   Name: test.png
   Type: image/png
   Size: 68 bytes

🔑 Using hash ID: test-1234567890

⬆️  Uploading to storage...

✅ Upload successful!
📸 Image URL: https://viewpet-images-prod.s3.us-east-1.amazonaws.com/uploads/test-1234567890.png

🎉 Test completed successfully!

💡 You can now:
   1. Open the URL in your browser: https://...
   2. Verify the image appears correctly
   3. Check your S3 bucket to confirm the upload
```

### Manual Test

Create a test file to verify the setup:

```typescript
// test-s3-upload.ts
import { getStorageProvider } from "./src/lib/storage";

async function testUpload() {
  const storage = getStorageProvider();
  
  // Create a fake image File
  const buffer = Buffer.from("fake image data");
  const file = new File([buffer], "test.jpg", { type: "image/jpeg" });
  
  try {
    const url = await storage.saveImage("test-123", file);
    console.log("✅ Upload successful!");
    console.log("URL:", url);
  } catch (error) {
    console.error("❌ Upload failed:", error);
  }
}

testUpload();
```

Run it:

```bash
bun run test-s3-upload.ts
```

### Expected Output

```
[Storage] Using s3 storage provider
✅ Upload successful!
URL: https://viewpet-images-prod.s3.us-east-1.amazonaws.com/uploads/test-123.jpg
```

Or with CloudFront:

```
URL: https://d123456789.cloudfront.net/uploads/test-123.jpg
```

## Troubleshooting

### Error: "S3 bucket not configured"

**Cause:** `AWS_S3_BUCKET` environment variable not set.

**Solution:**
```bash
# Add to .env.local
AWS_S3_BUCKET=your-bucket-name
```

### Error: "Access Denied"

**Cause:** IAM user lacks required permissions.

**Solution:**
1. Check IAM policy includes `s3:PutObject` and `s3:PutObjectAcl`
2. Verify the Resource ARN matches your bucket
3. Check AWS credentials are correct

### Error: "Invalid credentials"

**Cause:** Wrong AWS access key or secret key.

**Solution:**
1. Double-check `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
2. Verify the IAM user exists and has access keys enabled
3. Consider creating a new access key if the old one is compromised

### Images Upload But Return 403

**Cause:** Bucket not configured for public access.

**Solution:**
1. Check bucket policy allows public `s3:GetObject`
2. Verify "Block Public Access" settings are correct
3. If using ACLs, ensure Object Ownership is set to "ACLs enabled"

### CloudFront Returns 403

**Cause:** CloudFront can't access S3 origin.

**Solution:**
1. Ensure bucket policy allows CloudFront to read objects
2. Check Origin Access settings in CloudFront
3. For public buckets, ensure the bucket policy allows `*` principal

### Wrong Region

**Cause:** S3 bucket in different region than `AWS_REGION`.

**Solution:**
```bash
# Set the correct region
AWS_REGION=us-west-2  # Match your bucket's region
```

### Images Not Caching

**Cause:** Cache-Control headers not working.

**Solution:**
1. Check S3 object metadata includes `Cache-Control`
2. If using CloudFront, check cache behaviors
3. Clear CloudFront cache: Distributions → Invalidations → Create

### Cost Optimization

**Tips:**

1. **Lifecycle Policies:** Auto-delete old test images
   ```json
   {
     "Rules": [
       {
         "Id": "DeleteTestImages",
         "Prefix": "uploads/test-",
         "Status": "Enabled",
         "Expiration": { "Days": 7 }
       }
     ]
   }
   ```

2. **S3 Storage Class:** Use S3 Standard-IA for infrequently accessed images
3. **CloudFront:** Use price class "Use Only North America and Europe" if most users are there
4. **Monitoring:** Set up AWS Budgets alerts for unexpected costs

## Security Best Practices

1. ✅ **Never commit AWS credentials to Git**
   - Use `.env.local` (already in `.gitignore`)
   
2. ✅ **Rotate access keys regularly**
   - Create new keys every 90 days
   - Delete old keys
   
3. ✅ **Use minimal IAM permissions**
   - Only `s3:PutObject`, not `s3:*`
   - Scope to specific bucket
   
4. ✅ **Enable CloudTrail**
   - Track all S3 API calls
   - Detect unauthorized access
   
5. ✅ **Enable S3 Versioning** (optional)
   - Protect against accidental deletions
   - Recover from unintended overwrites

## Next Steps

Once S3 is working:

1. ✅ Deploy to production with `STORAGE_PROVIDER=s3`
2. ✅ Set up CloudFront for better performance
3. ✅ Configure custom domain for branded URLs
4. ✅ Set up monitoring and alerting
5. ✅ Implement backup strategy (S3 versioning or cross-region replication)

## References

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [S3 Bucket Policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
