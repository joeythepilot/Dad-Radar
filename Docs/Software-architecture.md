# Dad Radar Software Architecture

## Core model

DadRadar is an event-driven family flight display built around one authoritative home-server master state.

The local Windows server performs schedule retrieval, provider acquisition, operational enrichment, state resolution, history persistence, and diagnostics. Every viewer consumes the same resolved state instead of independently polling external services.

That single-master rule is architectural, not merely an optimization. It prevents two family devices from selecting different aircraft, multiplying paid provider calls, or disagreeing about whether a flight has departed or arrived.

## Source-of-truth boundaries

DadRadar intentionally assigns different facts to different sources:

| Fact | Authority |
| --- | --- |
| Planned assignment, flight identity, role, original start/end | Google Calendar |
| Airline operational timing/status, revised OUT/OFF/ON/IN, cancel/divert | FlightAware AeroAPI when configured |
| Aircraft position, altitude, groundspeed, heading, actual track | ADSB.lol primary, FR24 optional telemetry fallback |
| Filed flight-plan fixes | FlightAware optional filed-route enrichment |
| Weather radar | NOAA/NWS |
| Delay/arrival inference | DadRadar fallback only when operational truth is unavailable |

Google Calendar is never rewritten by FlightAware enrichment. DadRadar preserves the original Calendar plan and attaches operational data separately.

## Major server systems

### Calendar service

`server/calendar-service.js` reads Google Calendar. `server/pilot-schedule-parser.js` converts calendar events into normalized DadRadar events with flight identity, route, times, commute/deadhead role, and provider lookup candidates.

### FlightAware operational status service

`server/flightaware-operational-service.js` retrieves airline operational data through AeroAPI `GET /flights/{ident}`. It route-matches and time-matches the correct flight instance and normalizes scheduled, estimated, and actual OUT/OFF/ON/IN data, cancellation/diversion, delay minutes, and optional gate/terminal metadata.

It uses adaptive server-side caching so the once-per-minute Calendar refresh does not imply once-per-minute paid FlightAware traffic.

### Live aircraft provider service

`server/live-flight-provider-service.js` owns movement-provider selection. ADSB.lol is primary. Flightradar24 remains optional fallback telemetry. FlightAware is not used as the primary aircraft-position provider.

`server/flight-leg-guard.js` protects against wrong same-number aircraft, reverse-direction legs, and stale reassignment.

### FlightAware filed-route service

`server/flightaware-route-service.js` is separate from operational status even though both share `FLIGHTAWARE_AEROAPI_KEY`. It supplies decoded filed-route fixes for the map when available.

### Master state service

`server/master-state-service.js` is the server-side coordinator.

It:

1. retrieves Calendar schedule data;
2. enriches near-term flight events with FlightAware operational data;
3. preserves the original Calendar plan alongside that enrichment;
4. runs schedule-state and live-flight reconciliation;
5. maintains work-sequence tracks and mileage;
6. persists server state needed across restarts;
7. publishes one `/api/state` envelope for every client.

Operational provider failures retain the last good operational record where possible and never become evidence of departure or arrival.

### Schedule state

`models/schedule-state.js` remains the base Calendar/fallback model.

`models/operational-schedule-state.js` composes that model with FlightAware operational precedence. This preserves the established fallback behavior while making real operational evidence authoritative when present.

The composed model owns rules such as:

- estimated OUT later than planned -> real `DELAYED` timing;
- actual OUT -> `TAXI_OUT`;
- actual OFF -> `EN_ROUTE`;
- actual ON -> `TAXI_IN`;
- actual IN -> `ARRIVED`;
- cancellation -> `CANCELLED`;
- diversion -> `DIVERTED`;
- matched provider with no delay -> do not manufacture a wall-clock delay.

The original Calendar start/end remains the planned identity even when an operational estimate moves the active leg beyond its planned end.

### Live reconciliation controller

`services/calendar-state-controller.js` reconciles schedule state with fresh movement telemetry, controls provider polling cadence, maintains current-leg track points, and preserves fallback arrival continuity.

Its older saved-arrival and silence-based logic remains a fallback. Real FlightAware arrival evidence is carried separately so a previously inferred completion cannot override a matched `actualIn`.

### Sequence history

`server/sequence-history-service.js` persists the active work sequence, completed work-leg tracks, and mileage. `App/sequence-history-map.js` renders previous actual tracks while the normal route map owns the current leg.

Commute legs do not count toward the work-sequence trail/mileage total.

## Client architecture

### Main/local display

The physical cabinet display is served from port 4173. It reads `/api/state` and reacts to state revisions.

### Mobile Full

`/mobile/full` renders the same primary hardware UI inside the family-access boundary. It does not perform separate upstream flight-provider queries.

### Compact mobile

The compact family view also consumes the home server's shared state and exposes a mobile-specific presentation rather than a separate flight-tracking engine.

## UI systems

### Split-flap board

The split-flap board is animated DOM, not baked artwork. State changes are projected into fixed Flight, From, To, and Status tile groups. Audio uses one shared playback span for an entire board update.

### Today's Duty

Today's Duty is a raster physical card with live data overlays. The daily timeline comes from the shared state. Flight rows may display the current operational departure time while the original planned Calendar time remains preserved internally.

### Map system

The map displays planned route, actual current track, previous sequence tracks, aircraft position, airport surface mode, weather, and hardware overlays. Map transitions use the continuous vertical roll transport rather than shutters.

### Audio engine

Audio includes startup/shutdown behavior, split-flap movement, map transport, and the 10,000-foot altitude crossing chime. Audio is presentation-only and does not own flight state.

### Poster engine

Destination artwork is selected from the approved poster catalog. Missing artwork uses a family-safe fallback rather than substituting an unrelated city.

## Health and diagnostics

`/api/health` reports provider configuration without exposing credentials. FlightAware operational status and FlightAware filed-route enrichment are reported as separate capabilities.

The diagnostic log records sanitized provider attempts, errors, map/weather failures, and other runtime evidence. No API key, Google token, or family secret is sent to the browser.

## Failure philosophy

DadRadar degrades in layers:

1. lose FlightAware operational status -> retain last good operational record, then fall back to Calendar/ADS-B inference;
2. lose ADS-B -> retain last confirmed movement state and use operational/Calendar context;
3. lose optional FR24 -> continue with ADSB.lol;
4. lose filed-route enrichment -> draw the direct planned route;
5. lose weather -> continue flight tracking;
6. lose Calendar authorization -> report the Calendar problem rather than silently inventing a schedule.

An outage is never interpreted as evidence that an aircraft departed, landed, or arrived.
