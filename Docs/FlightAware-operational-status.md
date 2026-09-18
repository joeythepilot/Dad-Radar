# FlightAware Operational Status

Updated September 17, 2026.

## Purpose

DadRadar uses FlightAware AeroAPI as an optional operational-status layer for Unit 001. It is intentionally not the primary live-position provider.

The source boundaries are:

- Google Calendar = planned assignment and original schedule.
- FlightAware = revised airline operational times/status.
- ADSB.lol = physical aircraft movement and position.
- FR24 = optional telemetry fallback.
- DadRadar inference = fallback when operational truth is unavailable.

DadRadar never rewrites the user's Google Calendar event from FlightAware data.

## Configuration

Set this in the home PC `.env`:

```text
FLIGHTAWARE_AEROAPI_KEY=<AeroAPI key>
```

The same key is used for two separate optional capabilities:

1. operational status enrichment;
2. filed-route enrichment.

`GET /api/health` reports each capability separately. The API key itself must never appear in `/api/health`, `/api/state`, browser source, diagnostics, or logs.

If the key is blank, operational enrichment and filed-route enrichment are disabled and DadRadar continues with Calendar + ADSB.lol fallback behavior.

## Operational lookup

`server/flightaware-operational-service.js` calls AeroAPI `GET /flights/{ident}` using the Calendar parser's existing flight-number/callsign candidates.

A result is accepted only when:

- origin matches;
- destination matches;
- its scheduled departure is the closest plausible instance to the Calendar planned departure.

This protects against reused flight numbers and same-number return flights. The matched `fa_flight_id` is retained in the normalized operational record.

## Normalized event data

Near-term internal Calendar flight events may contain:

```js
{
  calendarPlan: {
    startUtc: "original Calendar start",
    endUtc: "original Calendar end"
  },
  operational: {
    provider: "flightaware",
    faFlightId: "...",
    ident: "AA3917",
    retrievedAt: "...",
    scheduledOut: "...",
    estimatedOut: "...",
    actualOut: "...",
    scheduledOff: "...",
    estimatedOff: "...",
    actualOff: "...",
    scheduledOn: "...",
    estimatedOn: "...",
    actualOn: "...",
    scheduledIn: "...",
    estimatedIn: "...",
    actualIn: "...",
    cancelled: false,
    diverted: false,
    status: "...",
    departureDelayMinutes: 0,
    arrivalDelayMinutes: 0,
    originGate: null,
    originTerminal: null,
    destinationGate: null,
    destinationTerminal: null
  }
}
```

Some extended gate/terminal fields may be absent depending on AeroAPI data availability/subscription. Their absence must not break status enrichment.

## State rules

Operational evidence has precedence over DadRadar's old wall-clock delay and arrival workarounds:

| Evidence | State |
| --- | --- |
| cancelled | CANCELLED |
| actual IN | ARRIVED |
| actual ON, no IN | TAXI IN |
| diverted | DIVERTED unless terminal arrival supersedes |
| actual OFF | EN ROUTE |
| actual OUT, no OFF | TAXI OUT |
| delayed status / revised OUT beyond grace | DELAYED |

An airline delay with no usable revised time may display `DELAYED` without a made-up minute count.

A matched FlightAware record reporting no delay prevents DadRadar from manufacturing delay minutes solely from the wall clock.

Airborne commute flights preserve their family-facing `COMMUTING TO BASE` or `COMMUTING HOME` identity rather than becoming ordinary work-flight EN ROUTE states.

## Today's Duty and ETA

Today's Duty flight-row time chooses:

`actual OUT -> estimated OUT -> original Calendar start`.

ETA chooses:

`actual IN -> estimated IN -> actual/estimated ON -> original Calendar end`.

The planned Calendar timestamps remain available in `calendarPlan`, so a current estimate does not erase what was originally scheduled.

### Today’s Duty operational stamp

When FlightAware reports a projected departure delay greater than the normal grace period and the flight has not yet pushed from the gate, Today’s Duty keeps the revised departure time in the row and adds a muted red dispatch-style stamp written for the family audience, for example `DELAYED / 37 MINUTES`. The revised clock time remains in the row itself so the stamp does not repeat dispatch shorthand.

The stamp is live data, not raster artwork, because its text changes with FlightAware. Its visual treatment deliberately resembles an imperfect rubber-stamp revision applied to the existing physical dispatch card. Once FlightAware reports actual OUT, the projected-delay stamp is removed; the row continues to follow actual/revised operational timing through the normal state model.

## Arrival precedence

FlightAware `actualIn` becomes the internal `confirmedArrivalAt` for the event.

The older saved confirmed-arrival checkpoint and terminal-coverage/taxi-silence logic remain fallback mechanisms. If they disagree with a later matched `actualIn`, the FlightAware gate-arrival time wins. The original Calendar `endUtc` is restored from `calendarPlan` in the published event rather than replaced by a fallback timestamp.

## Adaptive cache cadence

Operational calls are cached independently of Calendar refresh:

- more than 12 hours early: no lookup;
- 3–12 hours: 30 minutes;
- 1–3 hours: 10 minutes;
- within 1 hour before OUT: 2 minutes;
- after OUT before IN: 5 minutes;
- terminal result: 6 hours.

All displays consume the same home-server master state, so adding another family device does not multiply FlightAware requests.

## Failure behavior

- Missing key: return `null`, preserve legacy behavior.
- No matching flight: cache the no-match and retry on the normal cadence.
- Provider error: master state retains the prior good operational record if available.
- Stale/mismatched result: ignore it.
- Provider outage: never infer that the aircraft departed or arrived merely because the API failed.

## Files

- `server/flightaware-operational-service.js`: AeroAPI lookup, matching, normalization, cache.
- `server/master-state-service.js`: Calendar enrichment and plan preservation.
- `models/operational-schedule-state.js`: operational precedence layered over the base Calendar/fallback model.
- `server/index.js`: real adapter wiring and health metadata.
- `services/calendar-state-controller.js`: existing fallback continuity/reconciliation.

Regression coverage:

- `server/flightaware-operational-service-test.js`
- `server/master-operational-enrichment-test.js`
- `server/operational-arrival-precedence-test.js`
- `models/operational-schedule-state-test.js`

## Commercialization

Unit 001 uses FlightAware because the low request volume is practical for a personal build. Before customer sales, reassess provider commercial rights/pricing and potentially substitute another operational provider behind this adapter boundary. Do not redesign Calendar, ADS-B tracking, or UI around a specific commercial provider.
