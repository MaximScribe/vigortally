/**
 * Small in-memory limiter for failed attempts (logins, pairing codes). Enough for a
 * single self-hosted instance; counts reset when the window passes.
 */
export class AttemptLimiter {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number,
  ) {}

  /** True while `key` still has attempts left. */
  allowed(key: string, now = Date.now()): boolean {
    const entry = this.attempts.get(key);
    if (!entry || entry.resetAt <= now) return true;
    return entry.count < this.maxAttempts;
  }

  fail(key: string, now = Date.now()): void {
    const entry = this.attempts.get(key);
    if (!entry || entry.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
    } else {
      entry.count += 1;
    }
    if (this.attempts.size > 10_000) this.prune(now);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  private prune(now: number) {
    for (const [key, entry] of this.attempts) if (entry.resetAt <= now) this.attempts.delete(key);
  }
}
