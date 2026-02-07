class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs ?? 60_000;
    this.maxRequests = options.maxRequests ?? 120;
    this.bucketStore = new Map();
  }

  consume(identifier) {
    const key = identifier || 'unknown';
    const now = Date.now();

    const entry = this.bucketStore.get(key) ?? {
      startedAt: now,
      count: 0
    };

    if (now - entry.startedAt >= this.windowMs) {
      entry.startedAt = now;
      entry.count = 0;
    }

    entry.count += 1;
    this.bucketStore.set(key, entry);

    const remaining = Math.max(0, this.maxRequests - entry.count);
    const resetAt = entry.startedAt + this.windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

    return {
      allowed: entry.count <= this.maxRequests,
      remaining,
      resetAt,
      retryAfterSeconds,
      limit: this.maxRequests,
      windowMs: this.windowMs
    };
  }
}

module.exports = {
  RateLimiter
};