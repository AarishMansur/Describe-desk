export type Mode = 'open' | 'shift';

export interface Description {
  id: number;
  author: string;
  original: string;
  text: string;
  createdAt: number;
  visible: boolean;
  thumbs: number;
}

export interface ChannelContext { title: string; category: string; }

export interface AppSettings { mode: Mode; shiftUser: string | null; shiftExpiresAt: number | null; noSpoil: boolean; spoilerWords: string[]; }
