export class CooldownGuard {
  private readonly last = new Map<string, number>();
  constructor(private readonly cooldownMs = 8_000) {}
  allow(user: string, now = Date.now()): boolean {
    const previous = this.last.get(user.toLowerCase());
    if (previous !== undefined && now - previous < this.cooldownMs) return false;
    this.last.set(user.toLowerCase(), now); return true;
  }
}

export class DedupeGuard {
  private readonly entries: Array<{ text: string; at: number }> = [];
  constructor(private readonly windowMs = 20_000) {}
  isDuplicate(text: string, now = Date.now()): boolean {
    while (this.entries[0] && now - this.entries[0].at > this.windowMs) this.entries.shift();
    const normalized = text.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const duplicate = this.entries.some((entry) => similarity(normalized, entry.text) >= 0.9);
    if (!duplicate) this.entries.push({ text: normalized, at: now });
    return duplicate;
  }
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const longest = Math.max(a.length, b.length);
  if (!longest) return 1;
  let changes = 0; for (let i = 0; i < longest; i++) if (a[i] !== b[i]) changes++;
  return 1 - changes / longest;
}
