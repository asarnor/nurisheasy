import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient: ReturnType<typeof createClient> | null = null;
let redisConnectPromise: Promise<ReturnType<typeof createClient>> | null = null;

export async function getRedisClient() {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  if (redisConnectPromise) {
    return redisConnectPromise;
  }

  redisClient = createClient({
    url: REDIS_URL,
    socket: {
      connectTimeout: 1500,
      reconnectStrategy: (retries) => {
        // Fail fast so health/debug endpoints don't hang for extended retry loops.
        if (retries >= 2) {
          return new Error('Redis connection failed');
        }
        return 150 * (retries + 1);
      },
    },
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));

  redisConnectPromise = redisClient
    .connect()
    .then(() => redisClient as ReturnType<typeof createClient>)
    .catch((error) => {
      redisClient = null;
      throw error;
    })
    .finally(() => {
      redisConnectPromise = null;
    });

  return redisConnectPromise;
}

/**
 * Atomic lock for preventing double-ordering
 * @param orgId - Organization ID
 * @param ttl - Time to live in seconds (default: 30)
 * @returns true if lock acquired, false if already locked
 */
export async function acquireOrderLock(orgId: string, ttl: number = 30): Promise<boolean> {
  const client = await getRedisClient();
  const lockKey = `lock:org:${orgId}`;
  
  // SET NX (set if not exists) with expiration
  const result = await client.setNX(lockKey, '1');
  
  if (result) {
    await client.expire(lockKey, ttl);
  }
  
  return result;
}

/**
 * Release order lock
 */
export async function releaseOrderLock(orgId: string): Promise<void> {
  const client = await getRedisClient();
  const lockKey = `lock:org:${orgId}`;
  await client.del(lockKey);
}

/**
 * Set session data in Redis
 */
export async function setSession(key: string, value: any, ttl: number = 3600): Promise<void> {
  const client = await getRedisClient();
  await client.setEx(key, ttl, JSON.stringify(value));
}

/**
 * Get session data from Redis
 */
export async function getSession<T>(key: string): Promise<T | null> {
  const client = await getRedisClient();
  const value = await client.get(key);
  return value ? JSON.parse(value) : null;
}
