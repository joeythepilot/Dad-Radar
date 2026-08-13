# Dad Radar

Maxwell Family Flight Tracker — a handcrafted flight operations display for airline families.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Complete the Google Calendar authorization flow documented by the server utilities.
4. Add a Flightradar24 API token to `FR24_API_TOKEN` when live-flight lookup is needed. Dad Radar uses the separate Flightradar24 API subscription, not a consumer Gold or Business subscription.
5. Run `npm.cmd run beta:check` to verify the family-beta installation without printing credential values.
6. Start Dad Radar with `npm.cmd run beta:start`. Open `http://127.0.0.1:4173` on the desktop.
7. Run `npm.cmd run beta:address` in a second terminal to print the private home-network address for an iPad.

Run all deterministic tests with `npm test`.

The complete Windows desktop and iPad setup, safety notes, poster behavior, and field-test checklist are in `Docs/Family-beta-guide.md`.

## Live-flight validation

Run a sanitized end-to-end diagnostic against the active or next Pilot Schedule flight:

```powershell
npm.cmd run diagnose:live
```

Use `npm.cmd run diagnose:live -- --json` for structured output. See `Docs/Live-flight-validation.md` for prerequisites, result meanings, and the complete field-test checklist.

Credentials, Google tokens, and `.env` are intentionally excluded from Git.
