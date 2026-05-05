import { createClient } from "redis";

/**
 * Redis client singleton with connection pooling and error handling.
 *
 * Ensures only one Redis connection is created and reused across the app.
 * Handles connection errors gracefully with retry logic.
 */

export type RedisClientType = ReturnType<typeof createClient>;

let redisClient: RedisClientType | null = null;
let isConnecting = false;
let connectionPromise: Promise<RedisClientType> | null = null;

/**
 * Get or create the Redis client singleton.
 * Handles concurrent calls gracefully by returning the same connection promise.
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient?.isOpen) {
    return redisClient;
  }

  // If already connecting, return the existing promise
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  isConnecting = true;
  connectionPromise = connectRedis();

  try {
    redisClient = await connectionPromise;
    return redisClient;
  } finally {
    isConnecting = false;
    connectionPromise = null;
  }
}

/**
 * Create and connect a new Redis client with error handling.
 */
async function connectRedis(): Promise<RedisClientType> {
  const client = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
    socket: {
      reconnectStrategy: (retries) => {
        // During build, fail fast after 2 attempts
        const maxRetries = process.env.NODE_ENV === "production" ? 2 : 10;
        if (retries > maxRetries) {
          console.error("Redis: Max reconnection attempts reached. Giving up.");
          return new Error("Max reconnection attempts reached");
        }
        // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms, max 3s
        const delay = Math.min(50 * Math.pow(2, retries), 3000);
        console.log(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
        return delay;
      },
    },
  });

  // Error handling
  client.on("error", (err) => {
    console.error("Redis Client Error:", err.message);
  });

  client.on("connect", () => {
    console.log("Redis: Connected successfully");
  });

  client.on("reconnecting", () => {
    console.log("Redis: Reconnecting...");
  });

  client.on("ready", () => {
    console.log("Redis: Ready to accept commands");
  });

  try {
    await client.connect();
    return client;
  } catch (err) {
    console.error("Redis: Failed to connect:", err);
    throw err;
  }
}

/**
 * Gracefully close the Redis connection.
 * Useful for cleanup in scripts or tests.
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient?.isOpen) {
    await redisClient.quit();
    console.log("Redis: Connection closed");
    redisClient = null;
  }
}

/**
 * Check if Redis is connected.
 */
export function isRedisConnected(): boolean {
  return redisClient?.isOpen ?? false;
}
