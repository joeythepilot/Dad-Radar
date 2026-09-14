# Active-sequence history, descent camera and map shutters

September 13, 2026 cumulative follow-up to the server-master and flight-leg association repairs.

## Active work sequence

The home server now owns one persistent active-work-sequence history in the existing private `runtime/master-state.json`. Every home and mobile viewer receives the same history through `/api/state`; viewers do not create their own mileage or provider traffic.

- Operating and deadhead legs are included.
- Ordinary personal commute legs and cancelled plans are excluded.
- Mileage is calculated only from observed aircraft breadcrumb positions. Direct/fallback planned arcs never count as flown miles.
- Reassigning the route/time of a Calendar event produces a distinct leg identity even if Google keeps the same event id.
- Completed observed tracks remain available through layovers and overnights while the sequence is active.
- The sequence expires after 48 hours without work-flight activity.
- Persistence is bounded to 16 legs and 2,400 observed points per leg.
- The current leg is not drawn twice: the normal solid live track owns the active leg while the sequence overlay shows earlier observed legs.

The primary display shows an `ACTIVE SEQUENCE` mileage plate. Mobile shows a compact trip-mileage/leg count without changing the accepted four-row flight board and Today’s Duty layout.

## Descent-aware arrival camera

The existing regional route camera remains the baseline. A separate descent controller observes the real aircraft altitude trend for each flight:

- Normal flights begin tightening below 18,000 feet only after descent is established.
- Climb noise does not trigger the arrival zoom.
- A short flight that never reaches 18,000 feet uses its own observed peak altitude, so it still tightens naturally on descent.
- Approach/Landing phases establish descent immediately.
- The camera moves progressively toward the airplane and never widens a route that is already tighter than the surface target.
- The existing airport ground chart still takes over when qualified surface telemetry is available.

## Physical map shutters

The primary physical-console display now uses a two-leaf dark-enamel/brass shutter when changing between the regional flight map and the airport ground chart. The leaves cover the map before the underlying view swaps and retract afterward, preventing a digital-looking hard cut. The transition is tied to map-mode changes only, not ordinary position updates.

The shutter artwork is repository-native scalable SVG under `assets/ui/` and does not require a separate generated bitmap bundle. Mobile intentionally does not use the physical shutter overlay; it remains a companion surface rather than a simulation of the hardware faceplate.

## Verification

New regression coverage is included in the normal `npm test` command for:

- active sequence grouping, deadheads, commute/cancellation exclusion, reassignment and 48-hour reset;
- normal and short-flight descent camera behavior;
- shutter surface-mode selection and stale/non-ADS-B rejection.

The development session could execute the isolated sequence model successfully, but did not have a network-capable repository checkout for the complete project suite. The home PC must run the full `npm.cmd test` before restarting the installed service.

## Installation

On the Dad Radar PC:

```bat
cd /d C:\Users\cfijo\Dad-Radar
git fetch origin agent/mobile-companion
git merge --ff-only FETCH_HEAD
npm.cmd test
npm.cmd run beta:autostart:restart
npm.cmd run display:restart
```

If the test command fails, do not restart the service. Preserve the output for diagnosis. Reload the mobile page after a successful server/display restart.
