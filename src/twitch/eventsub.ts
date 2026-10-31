import WebSocket from 'ws';

export interface ChatEvent { user: string; text: string; isModerator: boolean; }
export class EventSubSocket {
  private socket?: WebSocket;
  constructor(private readonly onChat: (event: ChatEvent) => void, private readonly onChannelUpdate: () => void) {}
  connect(): void {
    if (process.env.MOCK_MODE === '1' || !process.env.TWITCH_ACCESS_TOKEN) return;
    this.socket = new WebSocket('wss://eventsub.wss.twitch.tv/ws');
    this.socket.on('message', (raw: WebSocket.RawData) => this.handle(JSON.parse(raw.toString()) as { metadata: { message_type: string }; payload: { session?: { id: string }; event?: Record<string, unknown> } }));
    this.socket.on('close', () => setTimeout(() => this.connect(), 2_000));
  }
  private async handle(message: { metadata: { message_type: string }; payload: { session?: { id: string }; event?: Record<string, unknown> } }): Promise<void> {
    if (message.metadata.message_type === 'session_welcome' && message.payload.session?.id) await this.subscribe(message.payload.session.id);
    if (message.metadata.message_type !== 'notification') return;
    const event = message.payload.event ?? {};
    if ('message' in event) this.onChat({ user: String(event.chatter_user_login), text: String((event.message as { text?: string }).text ?? ''), isModerator: Boolean(event.chatter_is_moderator) });
    else this.onChannelUpdate();
  }
  private async subscribe(sessionId: string): Promise<void> {
    const broadcaster = process.env.TWITCH_BROADCASTER_ID; const token = process.env.TWITCH_ACCESS_TOKEN; const clientId = process.env.TWITCH_CLIENT_ID;
    if (!broadcaster || !token || !clientId) return;
    for (const type of ['channel.chat.message', 'channel.update']) await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Client-Id': clientId, 'content-type': 'application/json' }, body: JSON.stringify({ type, version: '1', condition: type === 'channel.chat.message' ? { broadcaster_user_id: broadcaster, user_id: broadcaster } : { broadcaster_user_id: broadcaster }, transport: { method: 'websocket', session_id: sessionId } }) });
  }
}
