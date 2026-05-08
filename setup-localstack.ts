#!/usr/bin/env bun
/**
 * Setup LocalStack S3 bucket for local testing
 *
 * Usage: bun run setup-localstack.ts
 */

import { S3Client, CreateBucketCommand, PutBucketPolicyCommand } from "@aws-sdk/client-s3";

const BUCKET_NAME = "view-pet-storage";
const REGION = "sa-east-1";

async function setupLocalStack() {
  console.log("🚀 Setting up LocalStack S3...\n");

  // Create S3 client pointing to LocalStack
  const client = new S3Client({
    region: REGION,
    endpoint: "http://localhost:4566",
    credentials: {
      accessKeyId: "test",
      secretAccessKey: "test",
    },
    forcePathStyle: true, // Required for LocalStack
  });

  try {
    // Create bucket
    console.log(`📦 Creating bucket: ${BUCKET_NAME}...`);
    await client.send(
      new CreateBucketCommand({
        Bucket: BUCKET_NAME,
      })
    );
    console.log("✅ Bucket created!\n");

    // Add public read policy
    console.log("🔓 Adding public read policy...");
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "PublicReadGetObject",
          Effect: "Allow",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: `arn:aws:s3:::${BUCKET_NAME}/*`,
        },
      ],
    };

    await client.send(
      new PutBucketPolicyCommand({
        Bucket: BUCKET_NAME,
        Policy: JSON.stringify(policy),
      })
    );
    console.log("✅ Policy added!\n");

    console.log("🎉 LocalStack S3 setup complete!\n");
    console.log("📋 Configuration:");
    console.log(`   Bucket: ${BUCKET_NAME}`);
    console.log(`   Region: ${REGION}`);
    console.log(`   Endpoint: http://localhost:4566`);
    console.log(`   Access Key: test`);
    console.log(`   Secret Key: test\n`);

    console.log("💡 Add to your .env.local:");
    console.log("   AWS_ENDPOINT=http://localhost:4566");
    console.log(`   AWS_REGION=${REGION}`);
    console.log(`   AWS_S3_BUCKET=${BUCKET_NAME}`);
    console.log("   AWS_ACCESS_KEY_ID=test");
    console.log("   AWS_SECRET_ACCESS_KEY=test");
    console.log("   STORAGE_PROVIDER=s3\n");

  } catch (error: any) {
    if (error.name === "BucketAlreadyOwnedByYou") {
      console.log("✅ Bucket already exists!\n");
    } else {
      console.error("❌ Setup failed!");
      console.error(error.message);
      process.exit(1);
    }
  }
}

setupLocalStack().catch(console.error);
