# FlightAware Operational Status Enrichment Design

## Purpose

DadRadar currently has three information problems that have partially overlapped:

1. Google Calendar says what flight is planned and when it was originally scheduled.
2. ADSB.lol says where the aircraft is and what it is physically doing when coverage is available.
3. DadRadar infers delay and arrival states when neither source provides airline operational truth.

This design adds FlightAware AeroAPI as a fourth input with one narrow responsibility: airline operational status and revised times. The goal is to stop manufacturing delays and arrivals when FlightAware can provide authoritative operational evidence.

## Source-of-truth boundaries

- **Google Calendar = planned schedule truth.** Calendar remains authoritative for assignment identity, origin, destination, and originally planned times.
- **FlightAware = operational timing/status truth.** FlightAware supplies revised/estimated/actual OUT, OFF, ON, and IN times, cancellation/diversion state, and gate/terminal metadata when available.
- **ADSB.lol = movement/position truth.** ADSB.lol remains primary for aircraft position, altitude, groundspeed, actual track, and movement-derived phase.
- **Existing inference = fallback only.** Current fake-delay and arrival inference may run only when operational evidence is unavailable, unmatched, stale, or incomplete. It must never override fresher matched FlightAware evidence.
- **Flightradar24 remains optional fallback telemetry.** This feature must not make FR24 required.

The implementation must not rewrite Google Calendar events. Live operational data enriches DadRadar's internal schedule and shared master state only.

## Normalized operational record

A matched FlightAware flight is normalized to:

```js
{
  provider: "flightaware",
  faFlightId: "...",
  ident: "AA1234",
  retrievedAt: "ISO-8601",
  scheduledOut: "ISO-8601|null",
  estimatedOut: "ISO-8601|null",
  actualOut: "ISO-8601|null",
  scheduledOff: "ISO-8601|null",
  estimatedOff: "ISO-8601|null",
  actualOff: "ISO-8601|null",
  scheduledOn: "ISO-8601|null",
  estimatedOn: "ISO-8601|null",
  actualOn: "ISO-8601|null",
  scheduledIn: "ISO-8601|null",
  estimatedIn: "ISO-8601|null",
  actualIn: "ISO-8601|null",
  cancelled: false,
  diverted: false,
  status: "Scheduled|Delayed|En Route|Arrived|Cancelled|Diverted|...",
  departureDelayMinutes: 0,
  arrivalDelayMinutes: 0,
  originGate: null,
  originTerminal: null,
  destinationGate: null,
  destinationTerminal: null
}
```

Gate/terminal fields are optional because AeroAPI block-time/terminal extended data can depend on subscription level and `include_ex_data=true`.

## Matching rules

Operational status lookup must use the same flight identity candidates already produced by the Calendar parser. A candidate is accepted only when:

- the FlightAware result origin matches the Calendar origin,
- the destination matches the Calendar destination,
- and the scheduled OUT time is the closest plausible instance to the Calendar planned start.

The FlightAware `fa_flight_id` is stored once matched so later polls stay attached to the same flight instance and do not drift to a same-number return flight.

## Adaptive polling and cost control

Calendar refresh may run every minute, but AeroAPI network requests must be cached independently.

- more than 12 hours before planned departure: do not poll
- 3 to 12 hours before: poll no more often than every 30 minutes
- 1 to 3 hours before: poll no more often than every 10 minutes
- within 1 hour before departure, while delayed, or until actual OUT: poll no more often than every 2 minutes
- after actual OUT and before actual IN: poll no more often than every 5 minutes
- after actual IN or cancellation: retain the record and stop frequent polling

Only near-term flight events are candidates. Ordinary calendar refreshes should normally be cache hits rather than paid FlightAware calls.

## State precedence

When a matched operational record exists, schedule-state behavior is:

1. `cancelled` -> CANCELLED
2. `actualIn` -> ARRIVED
3. `actualOn` without `actualIn` -> TAXI_IN
4. `actualOff` without `actualOn` -> EN_ROUTE
5. `actualOut` without `actualOff` -> TAXI_OUT
6. `diverted` -> DIVERTED when not superseded by a terminal arrival state
7. `estimatedOut` later than planned OUT by more than the grace period -> DELAYED, using the provider-derived delay minutes
8. a matched provider status explicitly reporting delay without a usable estimate -> DELAYED without invented minutes
9. if matched FlightAware data exists but does not report a delay, DadRadar does not manufacture a numeric delay from the wall clock
10. if no usable operational record exists, the current Calendar/ADS-B inference remains as fallback

Live ADS-B may still refine/advance the physical phase when it has fresher movement evidence. Operational arrival evidence (`actualOn`, `actualIn`) is authoritative for landing/gate arrival and may terminate fallback arrival inference.

## Time presentation

The planned Calendar timestamps remain preserved on the event. Operational timestamps are attached separately.

- Today's Duty displays the best current departure time (`actualOut`, then `estimatedOut`, then planned start).
- ETA uses `actualIn`, then `estimatedIn`, then the Calendar planned end.
- The master flight state exposes planned and operational timestamps together so later UI can show both scheduled and revised values without losing history.
- Sequence/event identity continues to anchor to the planned Calendar event, not a changing estimated time.

## Arrival fallback demotion

Existing terminal-coverage inference, taxi-silence timers, and confirmed-arrival storage remain in place for provider outages and unmatched flights. When `actualOn` or `actualIn` is available from FlightAware, those heuristics must not fabricate a competing arrival time.

An `actualIn` timestamp is written into the effective internal schedule as `confirmedArrivalAt`, allowing the existing handoff and next-leg logic to use a real gate-arrival confirmation instead of the old timeout workaround.

## Failure behavior

- Missing `FLIGHTAWARE_AEROAPI_KEY`: operational enrichment is disabled; DadRadar behaves exactly as before.
- 404/no match: keep Calendar data and retry according to cache policy.
- provider error/rate limit: retain the last good operational record and fall back to existing logic; never treat an API outage as evidence of departure or arrival.
- stale or mismatched result: ignore it.

## Diagnostics and health

`/api/health` should report FlightAware operational enrichment separately from FlightAware filed-route enrichment. Provider attempts and errors should be available in diagnostics without exposing the API key.

## Documentation updates

The implementation must update at least:

- `Docs/Dataflow.md`
- `Docs/Software-architecture.md`
- `Docs/States.md`
- `Docs/Data-provider-cost-analysis.md`
- `Docs/Current-build-handoff.md`
- `.env.example` comments if configuration semantics change

These documents must reflect the source-of-truth boundaries and the fact that fake delay/arrival behavior is fallback-only once FlightAware operational data is available.
