import { describe, expect, it } from 'vitest';
import { TokenBucket } from '../src/queue/tokenBucket.js';
describe('token bucket', () => it('refills predictably', () => { const bucket = new TokenBucket(2, 1 / 1_000, 0); expect(bucket.take(0)).toBe(true); expect(bucket.take(0)).toBe(true); expect(bucket.take(0)).toBe(false); expect(bucket.take(1_000)).toBe(true); }));
