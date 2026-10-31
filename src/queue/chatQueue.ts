import { TokenBucket } from './tokenBucket.js';
export class ChatQueue {
  private readonly minute = new TokenBucket(5, 5 / 60_000);
  private readonly hour = new TokenBucket(50, 50 / 3_600_000);
  private items: string[] = [];
  constructor(private readonly send: (message: string) => Promise<void>) {}
  enqueue(message: string): void { this.items.push(message); void this.flush(); }
  async flush(): Promise<void> { while (this.items.length && this.minute.take() && this.hour.take()) await this.send(this.items.shift()!); }
}
