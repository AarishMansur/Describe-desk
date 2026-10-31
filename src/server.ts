import 'dotenv/config';
import express from 'express';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DeskDb, initialContext } from './db/index.js';
import { filterDescription } from './filter/index.js';
import { CooldownGuard, DedupeGuard } from './filter/guard.js';
import { rewriteDescription } from './rewrite/index.js';
import { SseHub } from './sse/hub.js';
import { EventSubSocket, type ChatEvent } from './twitch/eventsub.js';
import { TwitchClient } from './twitch/client.js';
import { startMockChat } from './mock.js';
import { dashboardPage, listenPage, overlayPage } from './pages.js';
import type { ChannelContext } from './types.js';

mkdirSync('data', { recursive: true });
const app = express(); const db = new DeskDb(); const sse = new SseHub(); const twitch = new TwitchClient();
const cooldown = new CooldownGuard(); const dedupe = new DedupeGuard(); let context: ChannelContext = initialContext;
const blocklist = ['slur', 'kill yourself'];
app.use(express.urlencoded({ extended: false })); app.use(express.json()); app.use(express.static('public'));
app.get('/', (_req, res) => res.redirect('/listen'));
app.get('/listen', (_req, res) => res.send(listenPage(context, db.latest())));
app.get('/overlay', (_req, res) => res.send(overlayPage(context, leaders())));
app.get('/dashboard', (_req, res) => res.send(dashboardPage(db.getSettings(), db.all())));
app.get('/events', (_req, res) => { sse.add(res); res.write(`event: context\ndata: ${JSON.stringify(context)}\n\n`); broadcastStats(); });
app.post('/api/vote/:id', (req, res) => { const fingerprint = `${req.ip}:${req.get('user-agent') ?? ''}`.slice(0, 180); db.vote(Number(req.params.id), fingerprint); broadcastStats(); res.sendStatus(204); });
app.post('/api/ask', (_req, res) => { twitch.chat.enqueue('Describe Desk: viewers asked what is happening — describers, please add a concise !d description.'); res.sendStatus(204); });
app.post('/api/settings', (req, res) => { const previous = db.getSettings(); db.saveSettings({ ...previous, mode: req.body.mode === 'shift' ? 'shift' : 'open', noSpoil: req.body.noSpoil === 'on', spoilerWords: String(req.body.spoilerWords ?? '').split(',').map((word) => word.trim().toLowerCase()).filter(Boolean) }); res.sendStatus(204); });
app.post('/api/visibility/:id', (req, res) => { db.setVisible(Number(req.params.id), req.body.visible === true || req.body.visible === 'true'); res.sendStatus(204); });
app.post('/api/reset', (_req, res) => { db.reset(); broadcastStats(); res.sendStatus(204); });
app.post('/api/marker', async (_req, res) => { await twitch.marker('Describe Desk key moment'); res.sendStatus(204); });
app.get('/auth', (_req, res) => { const clientId = process.env.TWITCH_CLIENT_ID; const redirect = process.env.TWITCH_REDIRECT_URI; if (!clientId || !redirect) return res.status(400).send('Set TWITCH_CLIENT_ID and TWITCH_REDIRECT_URI in .env.'); const scopes = ['user:read:chat', 'user:write:chat', 'channel:manage:broadcast']; res.redirect(`https://id.twitch.tv/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}`); });
app.get('/auth/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : ''; const clientId = process.env.TWITCH_CLIENT_ID; const secret = process.env.TWITCH_CLIENT_SECRET; const redirect = process.env.TWITCH_REDIRECT_URI;
  if (!code || !clientId || !secret || !redirect) return res.status(400).send('Missing code or Twitch OAuth environment settings.');
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId, client_secret: secret, code, grant_type: 'authorization_code', redirect_uri: redirect }) });
    if (!response.ok) throw new Error(`Twitch returned ${response.status}`);
    const tokens = await response.json() as { access_token: string; refresh_token: string };
    persistTokens(tokens); res.send('Connected. Access and refresh tokens were saved to your local .env file; restart Describe Desk to use them.');
  } catch (error) { res.status(502).send(`OAuth exchange failed: ${error instanceof Error ? error.message : 'unknown error'}`); }
});

async function receiveChat(event: ChatEvent): Promise<void> {
  if (event.text.startsWith('!shift ') && event.isModerator) { const match = /^!shift\s+@(\w+)\s+(\d+)m$/i.exec(event.text); if (match) { const settings = db.getSettings(); db.saveSettings({ ...settings, mode: 'shift', shiftUser: match[1]!, shiftExpiresAt: Date.now() + Number(match[2]) * 60_000 }); } return; }
  if (event.text === '!nospoil' && event.isModerator) { const settings = db.getSettings(); db.saveSettings({ ...settings, noSpoil: !settings.noSpoil }); return; }
  if (!event.text.startsWith('!d ')) return;
  const settings = db.getSettings(); const raw = event.text.slice(3);
  if (settings.mode === 'shift' && (settings.shiftUser?.toLowerCase() !== event.user.toLowerCase() || (settings.shiftExpiresAt ?? 0) < Date.now())) return;
  if (!cooldown.allow(event.user)) return;
  const filtered = filterDescription(raw, blocklist, settings.noSpoil, settings.spoilerWords); if (!filtered.ok || dedupe.isDuplicate(filtered.text!)) return;
  const description = db.insert(event.user, raw, await rewriteDescription(filtered.text!)); sse.broadcast('description', description); broadcastStats();
}
async function refreshContext(): Promise<void> { const next = await twitch.channelInfo(); if (next) { context = next; sse.broadcast('context', context); } }
function leaders(): Array<{ author: string; thumbs: number }> { const totals = new Map<string, number>(); for (const line of db.all(500)) totals.set(line.author, (totals.get(line.author) ?? 0) + line.thumbs); return [...totals].map(([author, thumbs]) => ({ author, thumbs })).sort((a, b) => b.thumbs - a.thumbs).slice(0, 3); }
function broadcastStats(): void { sse.broadcast('stats', { listeners: sse.count(), leaders: leaders() }); }
function persistTokens(tokens: { access_token: string; refresh_token: string }): void {
  const path = '.env'; let content = existsSync(path) ? readFileSync(path, 'utf8') : '';
  for (const [key, value] of [['TWITCH_ACCESS_TOKEN', tokens.access_token], ['TWITCH_REFRESH_TOKEN', tokens.refresh_token]] as const) {
    const line = `${key}=${value}`; content = new RegExp(`^${key}=.*$`, 'm').test(content) ? content.replace(new RegExp(`^${key}=.*$`, 'm'), line) : `${content.replace(/\s*$/, '\n')}${line}\n`;
  }
  writeFileSync(path, content, { mode: 0o600 });
}
if (process.env.MOCK_MODE === '1') startMockChat(receiveChat); else new EventSubSocket(receiveChat, () => void refreshContext()).connect();
void refreshContext(); setInterval(broadcastStats, 10_000);
const port = Number(process.env.PORT ?? 3000); app.listen(port, () => console.info(`Describe Desk on http://localhost:${port}`));
