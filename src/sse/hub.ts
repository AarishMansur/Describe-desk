import type { Response } from 'express';
export class SseHub {
  private clients = new Set<Response>();
  add(response: Response): void { response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' }); response.write(': connected\n\n'); this.clients.add(response); response.on('close', () => this.clients.delete(response)); }
  broadcast(type: string, payload: unknown): void { const message = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`; for (const client of this.clients) client.write(message); }
  count(): number { return this.clients.size; }
}
