type Bucket = { count: number; resetAt: number };
const globalBuckets = globalThis as typeof globalThis & { __openResumeLabRateLimits?: Map<string, Bucket> };
const buckets = globalBuckets.__openResumeLabRateLimits ?? new Map<string, Bucket>();
globalBuckets.__openResumeLabRateLimits = buckets;

export function rateLimit(request: Request, scope: string, limit = 30, windowMs = 60_000) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const identity = forwarded || request.headers.get("x-real-ip") || "local";
  const key = `${scope}:${identity}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }
  bucket.count += 1;
  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
}
