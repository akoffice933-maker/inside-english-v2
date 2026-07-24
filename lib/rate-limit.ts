/**
 * Production-Ready Sliding Window Rate Limiter for Next.js App Router.
 * 
 * Design:
 * - Uses a high-performance in-memory Map with active garbage collection to prevent memory leaks.
 * - Structured modularly: uses local memory for single-instance container deploys,
 *   and includes clear instructions to easily plug in Upstash Redis (@upstash/ratelimit) 
 *   for serverless/multi-instance (Vercel) deployments in production.
 */

interface RateLimitRecord {
  timestamps: number[];
}

// In-memory store (active for single-node deployments like Docker or PM2)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodic garbage collection to keep memory footprint close to zero
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((record, key) => {
      // Filter out timestamps older than 1 hour
      const activeTimestamps = record.timestamps.filter(time => now - time < 3600000);
      if (activeTimestamps.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, { timestamps: activeTimestamps });
      }
    });
  }, 300000); // Clean up memory every 5 minutes
}

/**
 * Checks if a specific key has exceeded its request threshold within a given window.
 * 
 * @param key Unique key to rate limit (e.g. "ip_127.0.0.1" or "user_uuid")
 * @param limit Maximum allowed requests in the time window
 * @param windowMs Time window in milliseconds (e.g. 60000 for 1 minute)
 * @returns Object indicating if the user is rate limited and remaining requests
 */
export async function isRateLimited(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ limited: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  
  // =========================================================================
  // PRODUCTION SCALE NOTE:
  // If deploying to Serverless hosts like Vercel or Netlify, in-memory state is isolated
  // per serverless function instance. To sync limits across all nodes, replace the code 
  // below with an Upstash Redis call:
  //
  // import { Ratelimit } from "@upstash/ratelimit";
  // import { Redis } from "@upstash/redis";
  // const ratelimit = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`) });
  // const result = await ratelimit.limit(key);
  // return { limited: !result.success, remaining: result.remaining, resetTime: result.reset };
  // =========================================================================

  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
  }

  // Filter out timestamps outside the active window
  const activeTimestamps = record.timestamps.filter(time => now - time < windowMs);

  if (activeTimestamps.length >= limit) {
    const oldestTimestamp = activeTimestamps[0];
    const resetTime = oldestTimestamp + windowMs;
    return {
      limited: true,
      remaining: 0,
      resetTime
    };
  }

  // Record the new request
  activeTimestamps.push(now);
  rateLimitStore.set(key, { timestamps: activeTimestamps });

  return {
    limited: false,
    remaining: limit - activeTimestamps.length,
    resetTime: now + windowMs
  };
}

/**
 * Extracts the client IP address safely from Next.js request headers.
 */
export function getClientIP(request: Request): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return '127.0.0.1';
}
