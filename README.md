# Dad Radar

Maxwell Family Flight Tracker — a handcrafted flight operations display for airline families.

## Current build

The family-beta source is `agent/mobile-companion`. `main` remains an older release. Read the [current handoff](Docs/Current-build-handoff.md), [source map](Docs/Application-structure.md) and [documentation index](Docs/README.md) before editing. Dated repair notes are historical evidence, not instructions to restore superseded designs.

The installed MAXWELLHOUSE instance is updated through the existing [remote-control workflow](ops/home-control/README.md). Ordinary releases use an exact pushed SHA, Windows tests, a managed restart, and post-restart SHA/instance verification. Do not reinstall startup tasks for an ordinary update.

Current Chrome/Edge and Safari/WebKit are the supported browser families. Run `npm test` for deterministic tests and `npm run test:browser` for the browser suites with Playwright installed. See the [repository cleanup record](Docs/Repository-cleanup-2026-09-19.md).

## New installation


1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Complete the Google Calendar authorization flow documented by the server utilities.
4. Live positions use adsb.lol first. Add a Flightradar24 API token to `FR24_API_TOKEN` for automatic backup coverage. Dad Radar uses the separate Flightradar24 API subscription, not a consumer Gold or Business subscription.
5. Optionally add a FlightAware Personal AeroAPI key to `FLIGHTAWARE_AEROAPI_KEY` to draw the actual filed route. Without it, the map retains the direct dashed planned curve.
6. Run `npm.cmd run beta:check` to verify the family-beta installation without printing credential values.
7. On the Windows family-beta PC, run `npm.cmd run beta:autostart:install` once and approve the Windows permission prompt. Dad Radar then starts invisibly after every reboot without a terminal.
8. Run `npm.cmd run beta:autostart:status` to verify the startup task, background server, and Google Calendar authorization, then run `npm.cmd run beta:address` to print the private home-network address for an iPad.

If Google reports that its refresh token expired or was revoked, run `npm.cmd run calendar:reauthorize` and complete the browser flow. The command preserves the old token as a timestamped backup and does not print credential values.

For temporary development use, `npm.cmd run beta:start` remains available as a manual fallback.

Run all deterministic tests with `npm test`.

The complete Windows desktop and iPad setup, safety notes, poster behavior, and field-test checklist are in `Docs/Family-beta-guide.md`.

## Live-flight validation

Run a sanitized end-to-end diagnostic against the active or next Pilot Schedule flight:

```powershell
npm.cmd run diagnose:live
```

Use `npm.cmd run diagnose:live -- --json` for structured output. See `Docs/Live-flight-validation.md` for prerequisites, result meanings, and the complete field-test checklist.

Credentials, Google tokens, and `.env` are intentionally excluded from Git.
