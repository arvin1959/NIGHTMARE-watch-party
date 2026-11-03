# NIGHTMARE Watch Party

A Node.js + Express + Socket.IO + SQLite starter for a horror-themed watch-party site.

## Run locally
1. Install Node.js 20 or newer.
2. In this folder run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000`.

## Deploy
Deploy as a **persistent Node.js web service**, not static hosting. Set the start command to `npm start`, use Node 20+, and attach persistent storage mounted at `/data`. Set `DB_PATH=/data/nightmare.sqlite`. The platform must support WebSockets and HTTPS. The service listens on `0.0.0.0` and uses the platform-provided `PORT`.

## Current scope and important limitations
- Room creation/joining, Socket.IO chat, member presence, reactions, and SQLite message/room persistence are implemented.
- The first participant in a room is host. Host identity is currently in-memory and is not authenticated.
- Video URL is displayed in an iframe. Many video sites block iframe embedding; use an embed URL from a provider that explicitly permits it.
- Generic third-party iframe playback cannot be controlled or synchronized reliably due to browser cross-origin security. This starter does **not** yet implement synchronized play/pause/seek or provider-specific player APIs.
- The URL is set when the room is created; there is no in-room video URL editor yet.
- The interface is Persian-first. English language switching, full PWA/offline support, invite links, room expiry/cleanup, rate limiting, and production-grade authentication are not implemented.
- Do not expose this service publicly until you configure HTTPS at the hosting layer, persistent disk, rate limiting, and appropriate abuse protections.

## Health check
`GET /health` returns a small JSON health response.
