# Dad Radar

Maxwell Family Flight Tracker — a handcrafted flight operations display for airline families.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Complete the Google Calendar authorization flow documented by the server utilities.
4. Add a FlightAware AeroAPI key to `FLIGHTAWARE_AEROAPI_KEY` when live-flight lookup is needed.
5. Start Dad Radar with `npm start` and open `http://127.0.0.1:4173`.

Run all deterministic tests with `npm test`.

Credentials, Google tokens, and `.env` are intentionally excluded from Git.
