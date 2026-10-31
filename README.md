# PlayRoom 5.1 — Local SQLite Admin History

## Requirements
- Node.js 18+ (Node 20 LTS recommended)
- npm

## Setup
1. Extract this folder.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Run `npm run setup:admin` and enter an admin password of at least 12 characters. Put the printed bcrypt hash in `.env` as `ADMIN_PASSWORD_HASH=...`.
5. Generate a long random `SESSION_SECRET` and add it to `.env`.
6. Run `npm start` and open `http://localhost:3000`.
7. Admin login: `http://localhost:3000/admin`.

## Local database
Match and player history is stored in `data/playroom.db`, outside the public directory. The directory is created automatically. SQLite WAL files may also appear beside the database. Do not delete them while the server is running.

## Two-calendar-day retention
The server uses Asia/Kolkata calendar dates. On startup and every hour, it deletes matches older than yesterday, retaining today and yesterday. Associated player rows no longer referenced by retained matches are also removed. CSV exports contain only records still retained in SQLite.

## Privacy
Players are shown a notice that names, game names, results and timestamps are stored for up to two calendar days and visible only to the administrator. Admin APIs require an authenticated session. The database is not served as a static file. Keep `.env` and `data/` private and out of source control.

## Deployment note
For a live host, configure a persistent disk/volume and set `PLAYROOM_DATA_DIR` to a directory on that disk. Ephemeral hosting filesystems can be erased during redeploys or restarts. This is a local-file design; it does not sync history between multiple server instances.

## Removed
PostgreSQL, Cloudflare R2/S3 recording storage and audio recording upload endpoints have been removed. Normal peer-to-peer voice chat remains if supported by the existing game client.


## Security features (location consent and voice recordings)
- Multiplayer room creation/join requires explicit browser location permission over HTTPS. Coordinates and consent timestamp are stored in SQLite for up to two calendar days.
- Voice recording starts only after both room participants consent. The recording indicator is shown to participants. The X-side browser mixes its local and remote WebRTC audio and uploads WebM to a private server-side folder.
- Admin security page: `/admin/security` (requires admin login). It provides recording playback/download/delete and location-consent record review.
- Recordings are stored under `PLAYROOM_DATA_DIR/recordings`, never in the public directory. Configure a persistent Render disk and set `PLAYROOM_DATA_DIR` to its mount path.
- Retention cleanup follows the existing Asia/Kolkata two-calendar-day policy.
- Browser geolocation requires HTTPS (Render provides HTTPS).


## Troubleshooting: data not appearing in admin
- Start the app from any working directory; relative `PLAYROOM_DATA_DIR` values are now resolved from the application root. Run `npm run check:storage` to verify SQLite insert/read/delete access and print the active database path.
- On startup, the terminal prints the exact SQLite database path and persistent data directory.
- After admin login, the Overview page shows live SQLite record counts and the database path.
- Location rows are written immediately after successful browser permission and server acknowledgment; room association is updated by the exact inserted record ID.
- Match history rows are created when a game is selected after two players join. A lobby alone does not create a match-history row.
- Voice recording rows are created only after both players consent, the WebRTC audio is mixed, recording stops, and the upload succeeds. Keep the browser tab open until the upload-success message appears.
- On Render, mount a persistent disk and set `PLAYROOM_DATA_DIR` to its absolute mount path (for example `/var/data`). Without a persistent disk, data can disappear on redeploy/restart.
