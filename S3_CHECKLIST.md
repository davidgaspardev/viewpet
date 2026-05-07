# AWS S3 Storage - Quick Start Checklist

Use this checklist to quickly set up AWS S3 storage for ViewPet.

## Prerequisites
- [ ] AWS Account created
- [ ] Bun.js installed
- [ ] Project cloned and dependencies installed (`bun install`)

## Setup Steps

### 1. Install AWS SDK ✅
```bash
bun add @aws-sdk/client-s3
```
**Status:** ✅ Already installed in this project

### 2. Create S3 Bucket
- [ ] Go to [S3 Console](https://console.aws.amazon.com/s3/)
- [ ] Create bucket (e.g., `viewpet-images-prod`)
- [ ] Select region (e.g., `us-east-1`)
- [ ] **Uncheck** "Block all public access"
- [ ] Acknowledge warning
- [ ] Create bucket

### 3. Configure Bucket for Public Access
Choose **one** option:

**Option A: Bucket Policy (Recommended)**
- [ ] Go to bucket → Permissions → Bucket policy
- [ ] Add policy from `S3_SETUP.md` section "Bucket Policy"
- [ ] Replace bucket name with yours
- [ ] Save changes

**Option B: ACLs**
- [ ] Go to bucket → Permissions → Object Ownership
- [ ] Enable ACLs
- [ ] Select "Bucket owner preferred"
- [ ] Save changes

### 4. Create IAM User
- [ ] Go to [IAM Console](https://console.aws.amazon.com/iam/)
- [ ] Create user: `viewpet-uploader`
- [ ] Select "Access key - Programmatic access"
- [ ] Create policy (see `S3_SETUP.md` for JSON)
- [ ] Attach policy to user
- [ ] Save Access Key ID
- [ ] Save Secret Access Key (⚠️ you won't see it again!)

### 5. Configure Environment Variables
- [ ] Create/edit `.env.local` in project root
- [ ] Add required variables:
```env
AWS_REGION=us-east-1
AWS_S3_BUCKET=viewpet-images-prod
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
STORAGE_PROVIDER=s3
```

### 6. (Optional) Set Up CloudFront CDN
- [ ] Go to [CloudFront Console](https://console.aws.amazon.com/cloudfront/)
- [ ] Create distribution
- [ ] Select S3 bucket as origin
- [ ] Copy distribution domain (e.g., `d123456789.cloudfront.net`)
- [ ] Add to `.env.local`:
```env
AWS_CLOUDFRONT_DOMAIN=https://d123456789.cloudfront.net
```

### 7. Configure CORS (Optional, for browser uploads)
- [ ] Go to bucket → Permissions → CORS
- [ ] Add CORS configuration from `S3_SETUP.md`
- [ ] Replace domain with yours
- [ ] Save changes

### 8. Test Configuration
- [ ] Run test script:
```bash
bun run test-s3-upload.ts
```
- [ ] Verify output shows "✅ Upload successful!"
- [ ] Open returned URL in browser
- [ ] Verify image loads

### 9. Test in Development
- [ ] Start dev server:
```bash
bun dev
```
- [ ] Go to http://localhost:3000
- [ ] Find an empty pet ID
- [ ] Fill out form with pet image
- [ ] Submit form
- [ ] Verify image URL starts with S3 or CloudFront domain
- [ ] Verify image displays correctly

### 10. Deploy to Production
- [ ] Set environment variables in production environment
- [ ] Deploy application
- [ ] Test upload in production
- [ ] Verify images are publicly accessible
- [ ] Set up AWS Budgets for cost monitoring

## Quick Troubleshooting

### "S3 bucket not configured"
```bash
# Check environment variable
echo $AWS_S3_BUCKET
# Should output: your-bucket-name
```

### "Access Denied"
- Check IAM policy includes `s3:PutObject` and `s3:PutObjectAcl`
- Verify AWS credentials are correct
- Check bucket name matches

### Images upload but 403 error
- Verify bucket policy allows public read
- Or check ACL settings are enabled

### Wrong URL format
- Check `AWS_CLOUDFRONT_DOMAIN` if using CloudFront
- Verify `AWS_REGION` matches bucket region

## Documentation Quick Links

- **Full Setup Guide:** [`S3_SETUP.md`](./S3_SETUP.md)
- **Architecture:** [`STORAGE_ARCHITECTURE.md`](./STORAGE_ARCHITECTURE.md)
- **Quick Reference:** [`STORAGE_QUICK_REFERENCE.md`](./STORAGE_QUICK_REFERENCE.md)
- **Implementation Summary:** [`S3_IMPLEMENTATION_SUMMARY.md`](./S3_IMPLEMENTATION_SUMMARY.md)

## Environment Variables Template

Copy this to your `.env.local`:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_S3_BUCKET=viewpet-images-prod
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Force S3 storage provider
STORAGE_PROVIDER=s3

# Optional: CloudFront CDN
AWS_CLOUDFRONT_DOMAIN=https://d123456789.cloudfront.net

# Optional: Custom public URL
# AWS_S3_PUBLIC_URL=https://cdn.yourdomain.com
```

## Estimated Time
- **Basic Setup:** 15-30 minutes
- **With CloudFront:** 30-45 minutes (includes deployment wait time)
- **With Custom Domain:** 45-60 minutes

## Cost Estimate
For 1000 pets with moderate traffic:
- **Storage:** ~$0.01/month
- **CloudFront:** ~$0.43/month
- **Requests:** ~$0.01/month
- **Total:** ~$0.45/month

First year CloudFront includes 10 TB free data transfer!

## Next Steps After Setup

1. ✅ Test uploads work correctly
2. ✅ Monitor AWS costs in Billing dashboard
3. ✅ Set up AWS Budgets alerts
4. ✅ Configure lifecycle policies (optional)
5. ✅ Enable S3 versioning (optional backup)
6. ✅ Set up CloudWatch monitoring (optional)

## Support

If you encounter issues:
1. Check [`S3_SETUP.md`](./S3_SETUP.md) troubleshooting section
2. Verify all checkboxes above are completed
3. Run test script with verbose output
4. Check AWS CloudWatch logs
5. Review IAM policy and permissions

---

**Status Legend:**
- ✅ Already done / Working
- [ ] Todo
- ⚠️ Important / Caution
