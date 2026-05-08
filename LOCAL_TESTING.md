# Local Testing Guide - ViewPet Storage

Complete guide for testing image storage locally.

## 🎯 Quick Comparison

| Option | Setup Time | Internet | Cost | Like Production |
|--------|-----------|----------|------|-----------------|
| **Local Files** | 0 min | ❌ No | Free | ❌ No |
| **Real S3** | 5 min | ✅ Yes | ~$0.01 | ✅ Yes |
| **LocalStack** | 2 min | ❌ No | Free | ⚠️ Similar |

---

## Option 1: Local Filesystem ⭐ EASIEST

**Best for:** Daily development, offline work, quick testing

### Setup (30 seconds)

```bash
# .env.local
REDIS_URL=redis://localhost:6379
STORAGE_PROVIDER=local
```

### Start

```bash
# Terminal 1: Start Redis
docker-compose up redis
# or
brew services start redis

# Terminal 2: Start app
bun run dev
```

### Test

1. Open http://localhost:3000
2. Go to `/view/vcjv2sx3s5bd` (empty pet)
3. Upload a pet image
4. Image saved to `public/uploads/abc123.jpg`
5. URL: `/uploads/abc123.jpg`

### Verify

```bash
# Check uploaded files
ls -lh public/uploads/

# Example output:
# -rw-r--r-- 1 user staff 245K vcjv2sx3s5bd.jpg
# -rw-r--r-- 1 user staff 189K 6pb46abtj58e.png
```

### Pros & Cons

✅ **Pros:**
- Zero configuration
- Instant - no network latency
- Works offline
- Easy debugging
- Free

❌ **Cons:**
- Different from production
- Files not globally accessible
- Need to re-upload when deploying

---

## Option 2: Real AWS S3 🌐 PRODUCTION-LIKE

**Best for:** Pre-deployment testing, production verification

### Prerequisites

1. **Fix Bucket Policy** (see main guide)
2. **Test credentials:**

```bash
bun run test-s3.ts
# Should show: ✅ All tests passed!
```

### Setup (1 minute)

```bash
# .env.local
REDIS_URL=redis://localhost:6379
STORAGE_PROVIDER=s3

AWS_REGION=sa-east-1
AWS_S3_BUCKET=view-pet-storage
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

### Start

```bash
# Terminal 1: Start Redis
docker-compose up redis

# Terminal 2: Start app
bun run dev

# Watch for:
# [Storage] Using s3 storage provider
```

### Test

1. Open http://localhost:3000
2. Go to `/view/vcjv2sx3s5bd`
3. Upload a pet image
4. Watch console:
   ```
   [Storage] Using s3 storage provider
   ```
5. Image uploads to S3!
6. URL: `https://view-pet-storage.s3.sa-east-1.amazonaws.com/uploads/abc123.jpg`

### Verify in AWS Console

1. Go to [S3 Console](https://s3.console.aws.amazon.com/s3/buckets/view-pet-storage?region=sa-east-1&prefix=uploads/)
2. Navigate to **uploads/** folder
3. See your uploaded images!

### Verify Publicly Accessible

```bash
# Test image URL in browser
open "https://view-pet-storage.s3.sa-east-1.amazonaws.com/uploads/test-123.png"

# Or with curl
curl -I "https://view-pet-storage.s3.sa-east-1.amazonaws.com/uploads/test-123.png"
# Should return: HTTP/2 200
```

### Pros & Cons

✅ **Pros:**
- Identical to production
- Images globally accessible
- Test real AWS integration
- Images persist after restart

❌ **Cons:**
- Needs internet
- Costs money (very minimal)
- Slower than local (network latency)
- Uploads use your AWS quota

---

## Option 3: LocalStack 🐳 MOCK AWS

**Best for:** Testing S3 without AWS account, CI/CD, offline S3 testing

### Setup (2 minutes)

#### Step 1: Start LocalStack

```bash
# Start Redis + LocalStack
docker-compose up -d

# Check status
docker ps

# Should see:
# viewpet-redis       (running)
# viewpet-localstack  (running)
```

#### Step 2: Create Bucket

```bash
bun run setup-localstack.ts
```

Expected output:
```
🚀 Setting up LocalStack S3...

📦 Creating bucket: view-pet-storage...
✅ Bucket created!

🔓 Adding public read policy...
✅ Policy added!

🎉 LocalStack S3 setup complete!
```

#### Step 3: Configure Environment

```bash
# .env.local
REDIS_URL=redis://localhost:6379
STORAGE_PROVIDER=s3

# LocalStack Configuration
AWS_ENDPOINT=http://localhost:4566
AWS_REGION=sa-east-1
AWS_S3_BUCKET=view-pet-storage
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

### Start

```bash
bun run dev

# Watch for:
# [Storage] Using s3 storage provider
```

### Test

1. Open http://localhost:3000
2. Go to `/view/vcjv2sx3s5bd`
3. Upload a pet image
4. Image uploaded to LocalStack!
5. URL: `http://localhost:4566/view-pet-storage/uploads/abc123.jpg`

### Verify in LocalStack

```bash
# List files in bucket
docker exec viewpet-localstack awslocal s3 ls s3://view-pet-storage/uploads/

# Download a file
docker exec viewpet-localstack awslocal s3 cp s3://view-pet-storage/uploads/test-123.png /tmp/test.png

# Access via browser
open "http://localhost:4566/view-pet-storage/uploads/test-123.png"
```

### Pros & Cons

✅ **Pros:**
- No AWS account needed
- Free
- Works offline
- Similar to S3 (90% compatible)
- Good for CI/CD

❌ **Cons:**
- Extra Docker container
- Not 100% identical to AWS
- URLs different from production
- Need to recreate bucket after restart

---

## 🔄 Switching Between Options

You can switch easily by changing one environment variable:

### Switch to Local

```bash
# .env.local
STORAGE_PROVIDER=local
```

```bash
bun run dev
# [Storage] Using local storage provider
```

### Switch to S3

```bash
# .env.local
STORAGE_PROVIDER=s3
AWS_REGION=sa-east-1
AWS_S3_BUCKET=view-pet-storage
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

```bash
bun run dev
# [Storage] Using s3 storage provider
```

### Switch to LocalStack

```bash
# .env.local
STORAGE_PROVIDER=s3
AWS_ENDPOINT=http://localhost:4566
AWS_REGION=sa-east-1
AWS_S3_BUCKET=view-pet-storage
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

```bash
bun run dev
# [Storage] Using s3 storage provider
```

---

## 🧪 Complete Test Flow

### 1. Start Services

```bash
# For Local:
brew services start redis

# For S3 or LocalStack:
docker-compose up -d
```

### 2. Seed Database

```bash
bun run seed
```

### 3. Start App

```bash
bun run dev
```

### 4. Test Upload

```bash
# Open app
open http://localhost:3000

# Go to empty pet
open http://localhost:3000/view/vcjv2sx3s5bd
```

### 5. Upload Image

1. Click "choose from device" or drag & drop
2. Select an image (JPG, PNG, WEBP, or GIF)
3. Fill in pet details:
   - Name: "Test Pet"
   - Birthdate: Select date
   - Owner name: "Test Owner"
   - Email: "test@example.com"
   - Phone: "123456789"
4. Click "Publicar"

### 6. Verify Upload

**For Local:**
```bash
ls -lh public/uploads/
# Should see: vcjv2sx3s5bd.jpg
```

**For S3:**
```bash
# Check AWS Console
open "https://s3.console.aws.amazon.com/s3/buckets/view-pet-storage?region=sa-east-1&prefix=uploads/"
```

**For LocalStack:**
```bash
docker exec viewpet-localstack awslocal s3 ls s3://view-pet-storage/uploads/
```

### 7. View Pet Page

```bash
# Reload page
open http://localhost:3000/view/vcjv2sx3s5bd

# Should show:
# ✅ Pet image
# ✅ Pet name
# ✅ Age
# ✅ Owner contact
```

---

## 🆘 Troubleshooting

### Local Storage Issues

**Images not showing:**
```bash
# Check file exists
ls -lh public/uploads/

# Check permissions
chmod 644 public/uploads/*.{jpg,png,webp,gif}
```

### S3 Issues

**Upload fails with "AccessDenied":**
```bash
# Test credentials
bun run test-s3.ts

# Check IAM permissions (need s3:PutObject)
```

**Upload succeeds but can't view:**
```bash
# Check bucket policy
# Make sure it allows s3:GetObject for Principal: "*"
```

### LocalStack Issues

**Container not starting:**
```bash
# Check Docker
docker ps -a

# Restart LocalStack
docker-compose restart localstack

# Check logs
docker-compose logs localstack
```

**Bucket not found:**
```bash
# Recreate bucket
bun run setup-localstack.ts
```

---

## 📊 Recommendation

### For Daily Development
Use **Local Files** (Option 1)
- Fastest
- Zero config
- Works offline

### Before Deploying
Test with **Real S3** (Option 2)
- Verify production setup
- Test actual AWS integration
- Confirm bucket policies

### For CI/CD
Use **LocalStack** (Option 3)
- No AWS account needed
- Reproducible tests
- Fast builds

---

## 🎯 Summary Commands

```bash
# Local Files
echo "STORAGE_PROVIDER=local" >> .env.local
bun run dev

# Real S3
echo "STORAGE_PROVIDER=s3" >> .env.local
echo "AWS_REGION=sa-east-1" >> .env.local
echo "AWS_S3_BUCKET=view-pet-storage" >> .env.local
# Add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
bun run test-s3.ts  # Verify first
bun run dev

# LocalStack
docker-compose up -d
bun run setup-localstack.ts
echo "AWS_ENDPOINT=http://localhost:4566" >> .env.local
echo "AWS_ACCESS_KEY_ID=test" >> .env.local
echo "AWS_SECRET_ACCESS_KEY=test" >> .env.local
bun run dev
```

---

**Happy testing!** 🚀
