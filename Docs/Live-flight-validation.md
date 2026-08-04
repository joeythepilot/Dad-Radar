# Dad Radar Live Flight Validation

This workflow checks the real Calendar-to-FlightAware path without exposing credentials or requiring browser developer tools.

## Prerequisites

- Project dependencies installed with `npm install`
- Google Calendar authorization completed and `token.json` present locally
- A valid `FLIGHTAWARE_AEROAPI_KEY` in the local `.env` file
- At least one active or upcoming flight in the Pilot Schedule Calendar during the next 14 days

Credentials, tokens, and API keys must never be pasted into the diagnostic output or committed to GitHub.

## Run the Diagnostic

From the Dad Radar project directory:

```powershell
npm.cmd run diagnose:live
```

The command selects the active Calendar flight. If no flight is currently active, it selects the next upcoming flight. It then performs the same normalized FlightAware lookup and live-state reconciliation used by the display.

For structured output:

```powershell
npm.cmd run diagnose:live -- --json
```

## Reading the Result

### `FlightAware: MATCHED`

The provider found a flight with the expected route and scheduled time, and the reconciliation model accepted the snapshot. The report shows the provider phase, delays, available position data, and the final Dad Radar display state.

Position and telemetry may be blank before departure. A scheduled-flight match without airborne position data is still a useful successful check.

### `No confident match`

Calendar worked, but FlightAware did not return a flight that passed the backend route and scheduled-time checks. This may be normal if the flight is too far in the future or has not yet appeared in the provider data. Dad Radar continues using Calendar state.

### `Snapshot rejected`

FlightAware returned data, but the reconciliation layer rejected it because it was stale or did not match the Calendar route. Dad Radar continues using Calendar state.

### `No active or upcoming Calendar flight`

The Calendar request worked, but there was no usable flight event in the 14-day diagnostic window. Add or verify an upcoming flight in the Pilot Schedule Calendar and run the command again.

## Complete Field Test

Run the diagnostic at several points during a real trip:

1. Before departure: confirm the Calendar flight, lookup candidates, route, and scheduled match.
2. After takeoff: confirm En Route phase, position, altitude, groundspeed, heading, and FlightAware display source.
3. During descent: confirm Approach when the aircraft is descending through or below 10,000 feet.
4. After landing: confirm Landed or Arrived and the final ETA, delay, and gate values when available.
5. With the display open: confirm the moving-map marker, speed gauge, heading, altitude, status board, and Calendar fallback behavior.

Record any provider mismatch or missing field without including `.env`, `token.json`, or API-key contents.
