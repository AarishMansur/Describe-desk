# Describe Desk

An accessible Twitch companion where chat writes concise, live audio descriptions for blind and low-vision viewers.

## Quick start (mock demo)

1. Install Node 20+, then run `npm install`.
2. Copy `.env.example` to `.env` and leave `MOCK_MODE=1`.
3. Run `npm run dev` and open `http://localhost:3000/listen`.
4. Open `/overlay` in OBS as a Browser Source at **1920 × 1080** with a transparent background. Open `/dashboard` in another tab to manage the demo.

Mock mode simulates four describers. Add a description with `!d A yellow mug sits beside the keyboard` only through Twitch in connected mode; mock descriptions arrive automatically.

## Twitch setup

Create a free app in the [Twitch Developer Console](https://dev.twitch.tv/console/apps), configure the OAuth redirect URI as `http://localhost:3000/auth/callback`, then place its client ID and secret in `.env`. Visit `/auth` and authorize with:

- `user:read:chat` for EventSub chat messages
- `user:write:chat` to send “Ask what’s happening” requests
- `channel:manage:broadcast` to create stream markers

Store the returned access and refresh tokens in `.env` as `TWITCH_ACCESS_TOKEN` and `TWITCH_REFRESH_TOKEN`; `.env` is ignored by Git. Set `TWITCH_BROADCASTER_ID`, `TWITCH_BOT_USER_ID`, and `MOCK_MODE=0`. The app opens an EventSub WebSocket subscription for `channel.chat.message` and `channel.update`, then reads Helix channel information after an update. The send queue limits requests with independent 5/minute and 50/hour buckets.

## Pages and controls

- `/listen` provides a polite ARIA live region, large high-contrast text, browser speech controls, and Space/R/T shortcuts for pause/repeat/timeline.
- `/overlay` is an OBS-ready transparent lower third with listeners, Golden Eyes, and a 60-second silence nudge.
- `/dashboard` manages mode, spoiler words, visibility, markers, and reset. Moderators can use `!shift @user 10m` and `!nospoil` in chat.

Descriptions are capped at 120 characters, normalised, link/emote stripped, blocklisted, deduplicated for 20 seconds, and limited to one per author every 8 seconds. With `GEMINI_API_KEY`, Gemini Flash-Lite can rewrite a line; otherwise a rule-based cleaner keeps the tool useful with no paid service or local model. The author is always credited.

## Verification
