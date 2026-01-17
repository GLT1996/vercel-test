type Bucket = { count: number; resetAtMs: number };

const buckets = new Map<string, Bucket>();

export type RateLimitOptions = {
  windowMs: number;
  max: number;
};

export function rateLimit(key: string, opts: RateLimitOptions) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAtMs <= now) {
    const b: Bucket = { count: 1, resetAtMs: now + opts.windowMs };
    buckets.set(key, b);
    return { ok: true, remaining: opts.max - 1, resetAtMs: b.resetAtMs } as const;
  }

  if (existing.count >= opts.max) {
    return { ok: false, remaining: 0, resetAtMs: existing.resetAtMs } as const;
  }

  existing.count += 1;
  return { ok: true, remaining: opts.max - existing.count, resetAtMs: existing.resetAtMs } as const;
}

