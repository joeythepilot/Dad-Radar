# Dad Radar

Maxwell Family Flight Tracker — a handcrafted flight operations display for airline families.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Complete the Google Calendar authorization flow documented by the server utilities.
4. Add a FlightAware AeroAPI key to `FLIGHTAWARE_AEROAPI_KEY` when live-flight lookup is needed.
5. Start Dad Radar with `npm start` and open `http://127.0.0.1:4173`.

Run all deterministic tests with `npm test`.

## Live-flight validation

Run a sanitized end-to-end diagnostic against the active or next Pilot Schedule flight:

```powershell
npm.cmd run diagnose:live
```

Use `npm.cmd run diagnose:live -- --json` for structured output. See `Docs/Live-flight-validation.md` for prerequisites, result meanings, and the complete field-test checklist.

Credentials, Google tokens, and `.env` are intentionally excluded from Git.
