# Dad Radar Data Flow

## Source-of-truth model

DadRadar deliberately separates four kinds of truth instead of asking one provider to answer every question.

- **Google Calendar is planned schedule truth.** It identifies the pilot's planned assignment, flight number, origin, destination, commute/deadhead role, and original planned times. DadRadar does not rewrite the Google Calendar event when operations change.
- **FlightAware AeroAPI is operational timing/status truth when configured.** It enriches the Calendar leg with scheduled, estimated, and actual OUT/OFF/ON/IN times, cancellation/diversion state, provider status, delay minutes, and optional gate/terminal fields.
- **ADSB.lol is movement/position truth.** It remains the primary source for aircraft position, altitude, groundspeed, heading, actual track, and movement-derived flight phase. Flightradar24 remains an optional telemetry fallback only.
- **DadRadar inference is fallback truth.** The existing delay, terminal-coverage, taxi-silence, and arrival-continuity logic remains available when FlightAware is unconfigured, stale, unmatched, or incomplete. It must not override fresher matched FlightAware operational evidence.

## Home-server master state

The Windows home server owns one authoritative master flight state. Google Calendar, FlightAware operational enrichment, ADS-B telemetry, filed-route enrichment, sequence history, and fallback inference all run against that one server-side state. Displays do not independently poll external flight providers.

Clients read `/api/state` and receive the same resolved state. This includes the local cabinet, Mobile Full, and other family viewers. `/api/calendar/upcoming` exposes the server's parsed and internally enriched schedule for diagnostics and schedule-driven UI.

This architecture prevents separate displays from acquiring different aircraft, multiplying provider calls, or disagreeing about whether a leg has departed or arrived.

## Calendar acquisition and operational enrichment

Calendar refresh begins with the parsed Google Calendar schedule. For each near-term flight, the server may call `server/flightaware-operational-service.js` when `FLIGHTAWARE_AEROAPI_KEY` is configured.

The operational adapter uses the event's airline/flight-number lookup candidates, then accepts only a FlightAware record that matches the Calendar origin, destination, and closest plausible planned departure instance. The matched `fa_flight_id` and normalized operational data are attached to the internal event as `event.operational`.

The original Calendar values are retained separately as `event.calendarPlan.startUtc` and `event.calendarPlan.endUtc`. Operational estimates never become Calendar identity. If a saved fallback arrival checkpoint later conflicts with a real FlightAware `actualIn`, the real operational arrival wins and the planned Calendar end remains preserved.

The normalized operational record contains:

- scheduled / estimated / actual OUT;
- scheduled / estimated / actual OFF;
- scheduled / estimated / actual ON;
- scheduled / estimated / actual IN;
- provider status;
- cancellation and diversion flags;
- departure and arrival delay minutes;
- optional origin/destination gate and terminal fields;
- FlightAware flight-instance identity and retrieval timestamp.

## FlightAware cost control

Operational lookup is server-side and cached. Calendar refreshes can occur every minute without creating a paid FlightAware request every minute.

The operational cache cadence is deliberately conservative:

- more than 12 hours before a flight: no operational lookup;
- 3 to 12 hours before: at most one lookup every 30 minutes;
- 1 to 3 hours before: at most one every 10 minutes;
- within 1 hour before departure and before OUT: at most one every 2 minutes;
- after actual OUT and before actual IN: at most one every 5 minutes;
- after actual IN or cancellation: terminal data is retained for hours rather than polled continuously.

A provider failure never counts as departure or arrival evidence. The master state keeps the last good operational record when one exists and otherwise falls back to Calendar/ADS-B logic.

## State resolution precedence

For a matched FlightAware operational record, operational evidence is applied before wall-clock fallback inference:

1. cancellation -> `CANCELLED`;
2. actual IN -> `ARRIVED`;
3. actual ON without actual IN -> `TAXI_IN`;
4. diversion -> `DIVERTED` when not superseded by a terminal arrival;
5. actual OFF -> `EN_ROUTE`;
6. actual OUT without actual OFF -> `TAXI_OUT`;
7. provider delay / revised OUT later than planned beyond the grace period -> `DELAYED` using provider-derived delay minutes;
8. a provider-reported delay with no usable estimate -> `DELAYED` without inventing minutes;
9. a matched provider record reporting no delay prevents DadRadar from manufacturing a numeric delay merely because the planned departure has passed;
10. without usable operational evidence, the existing Calendar/ADS-B fallback behavior remains active.

The Calendar event ID and original planned time remain the leg identity even when estimates move substantially.

## ETA and Today's Duty

For a flight row in Today's Duty, the displayed departure time is:

`actual OUT -> estimated OUT -> planned Calendar start`.

The family-facing ETA is:

`actual IN -> estimated IN -> actual/estimated ON when appropriate -> planned Calendar end`.

The state can therefore show a real airline delay or revised arrival time while retaining the original planned schedule internally. DadRadar does not need to alter the user's Google Calendar to stay operationally current.

## Live aircraft telemetry

ADSB.lol remains the primary live-position source. If it is unavailable or has no match and FR24 is configured, FR24 may be used as a fallback. Provider association is guarded by route direction, flight-instance continuity, and destination evidence so a same-number return flight cannot replace the selected leg.

Fresh route-matched telemetry can refine phase, progress, heading, altitude, groundspeed, and position. The browser receives the server's master result rather than performing its own provider lookup.

Approach and Landing still use altitude, destination distance, route progress, groundspeed, vertical trend, and destination field elevation. These movement states complement airline operational timing rather than replacing it.

## Arrival behavior

FlightAware `actualOn` is authoritative evidence that the aircraft is on the destination surface. `actualIn` is authoritative gate-arrival evidence and becomes the internal `confirmedArrivalAt` for that Calendar event.

The older terminal-coverage and taxi-silence mechanisms remain as fallback for flights where operational arrival data is unavailable. A stale fallback checkpoint cannot overwrite a later real `actualIn`, and provider outages never create arrival evidence.

Once arrival is confirmed, provider polling winds down and the normal Arrived hold yields to Home, At Base, or Layover based on the schedule and confirmed location.

## Filed route and map presentation

FlightAware also remains an independent optional filed-route enrichment. Operational status and filed-route enrichment share the same AeroAPI key but are distinct capabilities in `/api/health`.

When a filed route is available, the dashed planned line follows decoded fixes. Without it, the direct origin-to-destination curve remains. ADS-B observations build the solid current-leg breadcrumb track.

For work sequences, the server persists previous work-leg tracks and mileage in master storage. Prior actual tracks remain drawn as muted sequence-history lines after the active leg advances; commute legs are excluded from the work-sequence total.

## Geography, weather, and diagnostics

The regional map uses local geographic data and airport metadata. NOAA/NWS composite reflectivity is fetched through the local server and cached; weather failure never blocks flight tracking.

The server retains sanitized provider diagnostics without credentials. `/api/health` reports FlightAware operational-status configuration separately from FlightAware filed-route configuration. API keys and Google credentials never enter browser-visible source code.

## Visual publication

The resolved master state publishes to the local cabinet and family clients. The UI updates split-flap tiles, Today's Duty, map, poster, instruments, sequence mileage, ticker, ETA, and audio from the same state revision.

Presentation interpolation may animate between consecutive telemetry positions, but interpolation never represents itself as a new provider observation and never changes operational OUT/OFF/ON/IN truth.
