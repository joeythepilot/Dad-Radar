# Dad Radar Live Flight Validation

This workflow checks the real Calendar-to-Flightradar24 path without exposing credentials or requiring browser developer tools.

## Prerequisites

- Project dependencies installed with `npm install`
- Google Calendar authorization completed and `token.json` present locally
- A Flightradar24 API Explorer subscription and valid `FR24_API_TOKEN` in the local `.env` file
- At least one active or upcoming flight in the Pilot Schedule Calendar during the next 14 days

The API subscription is separate from Flightradar24 consumer Gold or Business subscriptions. Credentials and tokens must never be pasted into diagnostic output or committed to GitHub.

## Run the Diagnostic

From the Dad Radar project directory:

```powershell
npm.cmd run diagnose:live
```

The command selects the active Calendar flight. If no flight is currently active, it selects the next upcoming flight. It performs the same normalized FR24 lookup and live-state reconciliation used by the display.

For structured output:

```powershell
npm.cmd run diagnose:live -- --json
```

## Reading the Result

### `Flightradar24: MATCHED`

FR24 found a currently tracked aircraft with the expected identity and route, and the reconciliation model accepted the snapshot. The report shows phase, ETA, position, telemetry, and final Dad Radar display state.

### `Flightradar24: No live aircraft match`

Calendar worked, but FR24 does not currently see the scheduled aircraft. This is expected before pushback or takeoff. Dad Radar remains in its Calendar-derived Boarding or Delayed state without treating the result as an error.

### `Snapshot rejected`

FR24 returned data, but the reconciliation layer rejected it because it was stale or did not match the Calendar route. Dad Radar continues using Calendar state.

### `No active or upcoming Calendar flight`

The Calendar request worked, but there was no usable flight event in the 14-day diagnostic window. Add or verify an upcoming flight in the Pilot Schedule Calendar and run the command again.

## Complete Field Test

Run the diagnostic and watch the display at several points during a real trip:

1. Before acquisition: confirm the Calendar flight and lookup candidates, plus the expected `No live aircraft match` fallback.
2. At taxi or takeoff: confirm FR24 acquisition, the correct origin and destination, and the correct commercial flight number.
3. In flight: confirm position, altitude, groundspeed, heading, vertical-speed trend, smooth instruments, and a growing actual breadcrumb track.
4. During descent: confirm Approach when the aircraft is descending toward the destination. A temporary level segment must not return the display to En Route.
5. After landing: confirm Arrived near the destination and verify that provider polling stops while Calendar maintains the Arrived hold.

Record any provider mismatch or missing field without including `.env`, `token.json`, or API-token contents.
