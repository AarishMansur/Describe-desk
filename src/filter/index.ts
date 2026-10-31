const URL = /(?:https?:\/\/|www\.)\S+/gi;
const EMOTE = /(?:^|\s)(?:Kappa|PogChamp|LUL|KEKW|OMEGALUL|FeelsBadMan|FeelsGoodMan|[A-Za-z0-9_]+:)(?=\s|$)/gi;

export interface FilterResult { ok: boolean; text?: string; reason?: string; }

export function normalize(text: string): string {
  return text.replace(URL, ' ').replace(EMOTE, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function filterDescription(input: string, blocklist: string[], noSpoil: boolean, spoilerWords: string[]): FilterResult {
  const text = normalize(input).slice(0, 120);
  if (!text) return { ok: false, reason: 'empty after link/emote removal' };
  const lowered = text.toLowerCase();
  if (blocklist.some((word) => lowered.includes(word.toLowerCase()))) return { ok: false, reason: 'blocked word' };
  if (noSpoil && spoilerWords.some((word) => lowered.includes(word.toLowerCase()))) return { ok: false, reason: 'spoiler word' };
  return { ok: true, text };
}
