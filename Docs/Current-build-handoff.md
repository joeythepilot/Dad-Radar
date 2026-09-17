# Dad Radar authoritative build handoff

Updated September 17, 2026.

This file is intentionally a **current-state handoff**, not a running historical transcript. Older implementation history remains available in Git history and focused documents under `Docs/`.

## Source of truth

- Repository: `joeythepilot/Dad-Radar`
- Active development branch: `agent/mobile-companion`
- GitHub branch HEAD is authoritative. Do not trust a fixed SHA copied into an old chat or document; inspect the current branch before changing it.
- Home Windows checkout: `C:\Users\cfijo\Dad-Radar`
- Primary DadRadar server: port `4173`
- Family/private mobile gateway: port `4174` when configured
- The home server owns one authoritative master flight state. Clients do not independently poll external flight providers.

## Home remote-control channel

The home PC can be managed through the private repository `joeythepilot/dad-radar-home-control` and the self-hosted Windows runner named `dad-radar-home`.

The runner uses a fixed low-privilege allowlist and `C:\DadRadarOps\DadRadarRemote.ps1`. Supported remote actions are status, test, deploy, restart, logs, rollback, plus a fixed read-only state diagnostic. Do not replace this with arbitrary remote shell execution.

DadRadar itself is restarted through the fixed privileged restart broker. The runner remains `NETWORK SERVICE`. Protected DadRadar scheduled tasks may report `UNAVAILABLE` from the runner and this is expected.

A remote deploy must:

1. fetch the target exact SHA from `agent/mobile-companion`;
2. require a clean checkout;
3. run `npm ci` and the complete `npm test` suite;
4. mark the deployment;
5. restart through the broker;
6. verify the new server instance reports the exact deployed SHA;
7. roll back automatically on failure.

## Current provider architecture

The provider roles are now explicit and must remain separate.

### Google Calendar

Authoritative **planned schedule**: assignment identity, flight number, origin/destination, commute/deadhead role, and originally planned times.

FlightAware enrichment does **not** rewrite Google Calendar. Internally enriched events preserve the plan in `event.calendarPlan`.

### FlightAware AeroAPI

When `FLIGHTAWARE_AEROAPI_KEY` is configured, FlightAware has two separate optional jobs:

1. **Operational status enrichment**: scheduled/estimated/actual OUT/OFF/ON/IN, airline delay, cancellation/diversion, and optional gate/terminal data.
2. **Filed-route enrichment**: decoded route fixes for the planned dashed route.

`/api/health` reports those capabilities separately.

Read `Docs/FlightAware-operational-status.md` for the implementation contract.

### ADSB.lol

Primary live aircraft movement/position provider. It owns position, heading, altitude, groundspeed, actual track, and movement evidence.

### Flightradar24

Optional telemetry fallback only. Unit 001 must remain functional without an FR24 token/subscription.

### NOAA/NWS

Graphical weather-radar source. Weather failure never blocks flight tracking.

## FlightAware operational-status integration

The September 17 feature adds `server/flightaware-operational-service.js` and the composed `models/operational-schedule-state.js`.

Operational precedence when matched:

- cancellation -> `CANCELLED`
- actual IN -> `ARRIVED`
- actual ON -> `TAXI_IN`
- diversion -> `DIVERTED` when not superseded by terminal arrival
- actual OFF -> `EN_ROUTE`
- actual OUT -> `TAXI_OUT`
- provider delay / revised OUT beyond grace -> `DELAYED`
- matched record with no reported delay -> do not manufacture a numeric delay from the wall clock

Today's Duty uses `actual OUT -> estimated OUT -> Calendar plan` for flight-row time.

ETA uses `actual IN -> estimated IN -> ON estimate/evidence -> Calendar plan`.

The old Calendar-clock delay and ADS-B/proximity/silence arrival logic remains fallback-only when operational data is unavailable or incomplete.

A real FlightAware `actualIn` outranks an older saved inferred-arrival checkpoint. The published event restores the original Calendar end from `calendarPlan` rather than allowing the fallback cache to rewrite it.

Airborne commute legs must preserve the family-facing `COMMUTING TO BASE` / `COMMUTING HOME` identity even when FlightAware supplies actual OFF timing.

## Cost-control policy

FlightAware operational status is cached on the home server, never per client.

- >12 hours before: no request
- 3–12 hours: maximum every 30 minutes
- 1–3 hours: maximum every 10 minutes
- within 1 hour before OUT: maximum every 2 minutes
- after OUT before IN: maximum every 5 minutes
- terminal arrival/cancellation: retain for hours

This is a Unit 001/personal-beta strategy. Commercial provider rights and economics must be revisited before customer sales.

## Master-state architecture

`server/master-state-service.js` owns provider/schedule enrichment and publishes `/api/state`.

Clients read the shared master state. A viewer disconnect cannot infer an arrival by itself.

The master state also owns:

- flight-leg association protection;
- work-sequence persistence;
- cumulative mileage;
- prior-leg actual tracks;
- provider diagnostics;
- Calendar refresh/adoption;
- live provider refresh coordination.

## Work sequence and persistent tracks

`server/sequence-history-service.js` persists work-leg history in the server's master storage.

- Commutes are excluded from work-sequence totals.
- Operating/deadhead work legs are included.
- Actual observed track points are stored when available.
- Previous completed actual tracks render through `App/sequence-history-map.js` as muted map-ink paths.
- The current leg remains owned by the normal live route/track renderer.
- Calendar-only backfills may count an estimated leg/mileage but do not fabricate an actual track line.
- History is bounded and resets after the configured extended work-sequence gap.

## Flight-leg association protections

The server guards against same-number return flights, reverse-direction callsigns, aircraft reassignment, and stale leg handoff.

Never relax route/direction continuity merely to make acquisition faster. A false aircraft match is worse than temporary `TRACKING LOST`.

## Commute parsing and overdue commute retention

Calendar commute markers tolerate the common extra-M typo (`COMMMUTE`) as well as normal `COMMUTE`.

An unconfirmed delayed commute remains active/trackable within the bounded leg safety window rather than disappearing shortly after its original planned arrival time. This is separate from FlightAware operational enrichment and remains an important fallback.

## Moving map

The current regional map includes:

- geographic shoreline/country/state detail;
- permanent major-city references;
- terrain/printed-map treatment;
- planned route;
- actual current-leg track;
- prior work-sequence tracks;
- aircraft marker;
- NOAA radar;
- airport surface view near ground operations;
- continuous vertical map-roll transport between regional and airport views.

The current map transport canon uses the continuous map roll. Do not reintroduce shutters.

## Today's Duty

The primary/Full view uses a physical raster dispatch card with live overlays.

Mobile Full uses the same card with mobile-specific live-ink sizing. It shows the full five-row physical capacity, suppresses all-day DAY OFF placeholders when real flying exists, and auto-fits the Current Status text to the actual printed window so long family-facing sentences do not clip.

Desktop physical-card geometry remains separate from Mobile Full scaling.

## Split-flap

The split-flap display is dynamic animated DOM with per-character mechanical movement and shared audio. It is not baked artwork.

Permanent groups are Flight, From, To, and Status. Do not replace them with full-width generic text overlays.

## Mobile / family access

`/mobile/full` reuses the primary display inside the family authentication boundary. The compact mobile view is separate presentation but consumes the same master state.

Family password authentication and gateway isolation are implemented. Secrets, provider API keys, Calendar tokens, and diagnostic/configuration endpoints must remain inaccessible from unauthenticated remote paths.

## Diagnostics

Useful endpoints/scripts:

- `/api/health`: version/instance/provider configuration, no secrets
- `/api/state`: read-only authoritative master state
- `/api/calendar/upcoming`: internally parsed/enriched schedule
- `/api/diagnostics/recent`: sanitized local diagnostics
- `npm.cmd run diagnose:recent`
- `npm.cmd run diagnose:live`

Remote `[DADRADAR] state` is a fixed read-only home-control diagnostic and may be extended only with other fixed local read-only fields. Do not turn it into generic remote command execution.

## Testing rules

All feature/bug work is test-first.

The full `npm test` suite includes parser, schedule-state, master state, operational enrichment, provider adapters, association guards, map, split-flap, audio, mobile access, startup, and security contracts.

`.github/workflows/map-hardware-beta.yml` now triggers for backend state/provider paths as well as UI paths. For a release/deploy checkpoint, require both:

1. exact-head application regression success;
2. exact-head macOS browser geometry/transport success when UI/browser-affecting changes are present.

Then run the home Windows deployment gate and verify the running SHA after restart.

Do not claim a feature is live merely because GitHub CI is green. Home installation and post-restart status are separate evidence.

## Internal docs for current architecture

Read these before changing provider/state behavior:

- `Docs/Dataflow.md`
- `Docs/Software-architecture.md`
- `Docs/States.md`
- `Docs/Data-provider-cost-analysis.md`
- `Docs/FlightAware-operational-status.md`
- `Docs/Flight-leg-association-repair.md`
- `Docs/Airport-surface-view.md`
- `docs/superpowers/specs/2026-09-17-flightaware-operational-status-design.md`

## Immediate verification after the FlightAware feature lands

After final deployment to `MAXWELLHOUSE`:

1. verify `/api/health` reports whether FlightAware operational status is configured;
2. if configured, inspect `/api/calendar/upcoming` for a matched near-term flight and its `operational` object;
3. verify a real revised OUT changes delay/time without rewriting `calendarPlan`;
4. verify actual OUT/OFF advances phase;
5. verify estimated IN changes ETA;
6. verify actual ON/IN produces Taxi In/Arrived and wins over fallback arrival inference;
7. verify ADSB.lol still owns aircraft position/track;
8. verify missing/failed FlightAware falls back cleanly without generating false departure/arrival evidence.
