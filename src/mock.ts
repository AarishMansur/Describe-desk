import type { ChatEvent } from './twitch/eventsub.js';
const fake = [
  ['ada', 'The host holds up a blue map toward the camera.'], ['river', 'A small dog naps beside the desk.'], ['mika', 'The host points to a highlighted trail on the map.'], ['jo', 'The chat poll shows hiking as the top choice.']
] as const;
export function startMockChat(receive: (event: ChatEvent) => void): void { let i = 0; setInterval(() => { const [user, text] = fake[i++ % fake.length]!; receive({ user, text, isModerator: user === 'ada' }); }, 14_000); }
