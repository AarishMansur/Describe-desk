import { ChatQueue } from '../queue/chatQueue.js';
import type { ChannelContext } from '../types.js';

export class TwitchClient {
  readonly chat: ChatQueue;
  constructor(private readonly token = process.env.TWITCH_ACCESS_TOKEN, private readonly broadcasterId = process.env.TWITCH_BROADCASTER_ID, private readonly senderId = process.env.TWITCH_BOT_USER_ID) { this.chat = new ChatQueue((message) => this.sendMessage(message)); }
  configured(): boolean { return Boolean(this.token && this.broadcasterId && this.senderId); }
  async channelInfo(): Promise<ChannelContext | null> { if (!this.configured()) return null; const response = await this.helix('/channels?broadcaster_id=' + this.broadcasterId); const data = await response.json() as { data?: Array<{ title: string; game_name: string }> }; const item = data.data?.[0]; return item ? { title: item.title, category: item.game_name } : null; }
  async marker(description: string): Promise<void> { if (!this.configured()) return; await this.helix('/streams/markers', 'POST', { user_id: this.broadcasterId, description }); }
  async sendMessage(message: string): Promise<void> { if (!this.configured()) { console.info('[mock twitch]', message); return; } await this.helix('/chat/messages', 'POST', { broadcaster_id: this.broadcasterId, sender_id: this.senderId, message }); }
  private async helix(path: string, method = 'GET', body?: unknown): Promise<Response> { return fetch('https://api.twitch.tv/helix' + path, { method, headers: { Authorization: `Bearer ${this.token}`, 'Client-Id': process.env.TWITCH_CLIENT_ID ?? '', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); }
}
