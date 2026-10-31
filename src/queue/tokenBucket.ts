export class TokenBucket {
  private tokens: number;
  private updatedAt: number;
  constructor(private readonly capacity: number, private readonly refillPerMs: number, now = Date.now()) { this.tokens = capacity; this.updatedAt = now; }
  take(now = Date.now()): boolean {
    this.tokens = Math.min(this.capacity, this.tokens + (now - this.updatedAt) * this.refillPerMs);
    this.updatedAt = now;
    if (this.tokens < 1) return false;
    this.tokens--; return true;
  }
}
