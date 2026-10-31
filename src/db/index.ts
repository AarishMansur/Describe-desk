import Database from 'better-sqlite3';
import type { AppSettings, ChannelContext, Description } from '../types.js';

export class DeskDb {
  private readonly db: Database.Database;
  constructor(filename = 'data/describe-desk.db') {
    this.db = new Database(filename);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS descriptions (id INTEGER PRIMARY KEY, author TEXT NOT NULL, original TEXT NOT NULL, text TEXT NOT NULL, created_at INTEGER NOT NULL, visible INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS votes (description_id INTEGER NOT NULL, fingerprint TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(description_id, fingerprint));
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS markers (id INTEGER PRIMARY KEY, description TEXT NOT NULL, created_at INTEGER NOT NULL);
    `);
  }
  latest(limit = 10): Description[] {
    return (this.db.prepare(`SELECT d.*, (SELECT count(*) FROM votes v WHERE v.description_id=d.id) thumbs FROM descriptions d WHERE visible=1 ORDER BY created_at DESC LIMIT ?`).all(limit) as Record<string, unknown>[]).map(toDescription);
  }
  all(limit = 50): Description[] { return (this.db.prepare(`SELECT d.*, (SELECT count(*) FROM votes v WHERE v.description_id=d.id) thumbs FROM descriptions d ORDER BY created_at DESC LIMIT ?`).all(limit) as Record<string, unknown>[]).map(toDescription); }
  insert(author: string, original: string, text: string): Description {
    const createdAt = Date.now(); const result = this.db.prepare('INSERT INTO descriptions (author,original,text,created_at) VALUES (?,?,?,?)').run(author, original, text, createdAt);
    return { id: Number(result.lastInsertRowid), author, original, text, createdAt, visible: true, thumbs: 0 };
  }
  setVisible(id: number, visible: boolean): void { this.db.prepare('UPDATE descriptions SET visible=? WHERE id=?').run(Number(visible), id); }
  vote(id: number, fingerprint: string): boolean { return this.db.prepare('INSERT OR IGNORE INTO votes (description_id,fingerprint,created_at) VALUES (?,?,?)').run(id, fingerprint, Date.now()).changes === 1; }
  reset(): void { this.db.exec('DELETE FROM descriptions; DELETE FROM votes; DELETE FROM markers'); }
  getSettings(): AppSettings { return { mode: this.get('mode', 'open') as AppSettings['mode'], shiftUser: this.get('shiftUser', '') || null, shiftExpiresAt: Number(this.get('shiftExpiresAt', '0')) || null, noSpoil: this.get('noSpoil', 'false') === 'true', spoilerWords: JSON.parse(this.get('spoilerWords', '[]')) as string[] }; }
  saveSettings(settings: AppSettings): void { for (const [key, value] of Object.entries({ ...settings, spoilerWords: JSON.stringify(settings.spoilerWords) })) this.db.prepare('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, String(value ?? '')); }
  private get(key: string, fallback: string): string { return (this.db.prepare('SELECT value FROM settings WHERE key=?').get(key) as { value?: string } | undefined)?.value ?? fallback; }
}
function toDescription(row: Record<string, unknown>): Description { return { id: Number(row.id), author: String(row.author), original: String(row.original), text: String(row.text), createdAt: Number(row.created_at), visible: Boolean(row.visible), thumbs: Number(row.thumbs) }; }
export const initialContext: ChannelContext = { title: 'Describe Desk demo stream', category: 'Just Chatting' };
