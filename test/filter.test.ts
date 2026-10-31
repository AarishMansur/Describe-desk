import { describe, expect, it } from 'vitest';
import { filterDescription, normalize } from '../src/filter/index.js';
describe('filter', () => { it('strips links, emotes and normalizes caps', () => expect(normalize('WOW https://a.test Kappa THE HOST WAVES')).toBe('wow the host waves')); it('drops blocklisted and spoiler content', () => { expect(filterDescription('a slur', ['slur'], false, [])).toMatchObject({ ok: false }); expect(filterDescription('the killer arrives', [], true, ['killer'])).toMatchObject({ ok: false }); }); });
