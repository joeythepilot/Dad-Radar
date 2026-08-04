# Dad Radar Project Decisions

This document records important design and engineering decisions.

It exists so future work always builds on previous decisions instead of repeating old discussions.

---

## 2026-07-24

### Project Organization

✓ Documentation-first workflow adopted.

✓ Major design decisions must be documented before implementation.

---

### Product Identity

✓ Dad Radar is a physical product first.

✓ Software exists to power the physical console.

✓ Vintage airline operations console selected as the permanent design direction.

---

### User Interface

✓ Generic dashboard concept retired.

✓ Modular console layout adopted.

✓ UI mirrors the physical hardware modules.

---

### Design Language

✓ Mid-century modern aesthetic selected.

✓ Walnut, brass, leather, and matte black established as core materials.

✓ Split-flap display becomes the primary information display.

✓ Vintage destination posters become a permanent feature.

✓ Analog flight instruments included as decorative information modules.

---

### Development Process

✓ Documentation precedes coding whenever practical.

✓ Architecture decisions recorded before implementation.

✓ Design Canon established as the project's primary design reference.

---

## 2026-08-04

### Calendar Schedule Integration

✓ Google Calendar is the source of truth for the planned pilot schedule.

✓ Google authentication remains on the local backend. OAuth credentials and tokens are never committed to GitHub.

✓ Calendar events are normalized into flights, commutes, layovers, duty-free periods, and other events before they reach the interface.

✓ Airport-local roster times are converted to UTC for comparison and Eastern Time for the family display.

✓ A dedicated schedule-state model translates normalized events into Dad Radar display modes.

✓ Calendar-only operation may estimate route progress from scheduled time, but it must not invent airspeed, altitude, heading, or other live telemetry.

✓ The mock flight service remains available only as an explicit development data source.


### Live Flight Data Foundation

✓ FlightAware AeroAPI v4 selected as the first live-flight provider for Prototype 001.

✓ The FlightAware API key remains on the local backend and is loaded only from `FLIGHTAWARE_AEROAPI_KEY`.

✓ Provider responses are normalized before reaching the rest of Dad Radar so another provider can be substituted later.

✓ Flight lookup prefers ICAO identifiers, then validates route and scheduled departure time before accepting a match.

✓ FlightAware altitude is converted from hundreds of feet to feet. Groundspeed remains a distinct data field. Because no indicated-airspeed source is available, groundspeed may drive the existing speed gauge only when its digital readout is labeled Ground Speed.

✓ Calendar data remains the fallback plan when FlightAware is unavailable or cannot find a confident match.


### Live Flight State Reconciliation

✓ The browser requests live data only for a Calendar-selected flight in a trackable mode. Home, Layover, and Offline modes do not generate FlightAware polling.

✓ The default live polling interval is 60 seconds. A live snapshot older than three minutes is stale and cannot override Calendar state.

✓ A live snapshot must still match the Calendar origin and destination before it can refine the display, even though the backend already performs route validation.

✓ Calendar owns the planned event identity. FlightAware may refine operational phase, status, ETA, delays, gates, progress, and position, but a live failure never erases the plan.

✓ Live En Route and Approach phases preserve the family meaning of Commute to Base or Commute Home for commute events.

✓ Cancellation is represented as a live status on the Calendar-selected flight until a dedicated cancellation mode is designed.

✓ Real coordinates and heading drive the moving-map aircraft marker when available and within map bounds. Calendar progress remains the route-marker fallback.


### Live Flight Field Validation

✓ A one-command diagnostic exercises the production Calendar selection, FlightAware lookup, and reconciliation model without printing credentials.

✓ The diagnostic checks the active flight first and otherwise checks the next scheduled flight within the Calendar look-ahead window.

✓ A provider response is reported as Matched only when the reconciliation model accepts it as fresh and route-correct. Rejected or missing live data leaves the Calendar fallback visible in the report.
