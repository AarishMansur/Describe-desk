import { describe, expect, it } from 'vitest';
import { rewriteDescription } from '../src/rewrite/index.js';
describe('rewrite fallback', () => it('uses local rule cleaner when no key exists', async () => expect(await rewriteDescription('I think the AMAZING host really waves at the camera', '')).toBe('the host waves at the camera')));
