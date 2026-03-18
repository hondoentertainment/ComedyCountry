/**
 * Rate limiter for API routes.
 * Uses Vercel KV (Upstash Redis) when KV_REST_API_URL and KV_REST_API_TOKEN
 * are set; otherwise falls back to in-memory (not shared across serverless instances).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes (in-memory only)
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (entry.resetAt < now) store.delete(key);
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

function hasKvConfig(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/**
 * Fixed-window rate limit using Vercel KV.
 * Key format: rl:{identifier}:{windowIndex} where windowIndex = floor(now / windowSeconds).
 */
async function checkRateLimitKV(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const { kv } = await import("@vercel/kv");
  const nowSec = Math.floor(Date.now() / 1000);
  const windowIndex = Math.floor(nowSec / config.windowSeconds);
  const redisKey = `rl:${key}:${windowIndex}`;

  const count = await kv.incr(redisKey);
  if (count === 1) {
    await kv.expire(redisKey, config.windowSeconds);
  }

  const resetAt = (windowIndex + 1) * config.windowSeconds * 1000;

  if (count > config.limit) {
    return { success: false, remaining: 0, resetAt };
  }

  return {
    success: true,
    remaining: config.limit - count,
    resetAt,
  };
}

/**
 * In-memory rate limit (fixed-window style for consistency).
 */
function checkRateLimitMemory(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const windowIndex = Math.floor(now / 1000 / config.windowSeconds);
  const memoryKey = `${key}:${windowIndex}`;
  const entry = store.get(memoryKey);

  const resetAt = (windowIndex + 1) * config.windowSeconds * 1000;

  if (!entry) {
    store.set(memoryKey, { count: 1, resetAt });
    return { success: true, remaining: config.limit - 1, resetAt };
  }

  entry.count += 1;
  if (entry.count > config.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Check rate limit for a given key (e.g. IP or userId).
 * Returns { success, remaining, resetAt }.
 * Uses KV when KV_REST_API_URL and KV_REST_API_TOKEN are set; otherwise in-memory.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig = { limit: 60, windowSeconds: 60 },
): Promise<RateLimitResult> {
  if (hasKvConfig()) {
    return checkRateLimitKV(key, config);
  }
  return checkRateLimitMemory(key, config);
}

/**
 * Extract a rate-limit key from the request (IP-based).
 */
export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `rl:${ip}`;
}
