# Home server is the flight-state authority

The home Node server now owns Calendar selection, aircraft lookups, flight-state
decisions, arrival evidence and the current flight's actual track. Primary,
compact mobile and full family displays read the same `/api/state` result.
Opening or refreshing a display does not query the aircraft providers.

The controller runs even with no displays open. It checks Calendar every minute,
and uses the existing active/idle aircraft cadence (30/60 seconds). Overlapping
checks share a request; a Calendar refresh cannot duplicate the same aircraft
lookup inside 30 seconds. Changing the scheduled route starts a new acquisition.
Provider order and paid-provider configuration are unchanged. Ground-arrival
follow-up remains adsb.lol-only.

Viewers read shared state every five seconds. Refresh means "read the home
server now." Calendar edits are picked up by the server's next minute check.
Viewer disconnection preserves its last received state and marks mobile data
stale; the viewer does not independently infer arrival.

## Arrival and restart behavior

- Pending and completed arrival evidence survives a home-server restart in
  ignored `runtime/master-state.json`. Never commit or publish this private file.
- A new viewer receives the server's saved arrival, rather than starting its own
  timer or returning to No Track.
- Current-flight actual points survive refresh/restart. The old rolling 180-point
  limit is increased to 12,000 points. This is current-flight persistence, not
  the still-pending multi-leg work-sequence history/counter.
- The original close-in arrival fallback remains. Descent reports within six
  nautical miles of the destination and at/below 2,500 feet above field elevation
  can also qualify. Route, freshness, speed and position-quality checks still apply.
- Ten minutes of continuous healthy tracking absence after qualifying approach
  evidence yields **Arrival Estimated**, not a confirmed parking time.
- Fresh ground reports mean Taxi-In; five minutes of healthy absence after
  taxi-in yields Arrived. Outages/rate limits reset the absence timer.
- A restart resets pending silence timers; offline time cannot count as healthy
  provider checks. Later live reports can supersede an estimate.
- State persists only for the same scheduled flight identity. Cancellation or
  reassignment retires that flight's active state.

There is no recovery of observations lost before installing this update. A fresh
server with no landing evidence must still distinguish No Track from Arrived.

## Installation

On the home Windows PC:

```bat
cd /d C:\Users\cfijo\Dad-Radar
git fetch origin agent/mobile-companion
git merge --ff-only FETCH_HEAD
npm.cmd test
npm.cmd run beta:autostart:restart
npm.cmd run display:restart
```

Close and reopen the family apps after the server restart. Old client code's
`POST /api/flights/lookup` is retired (410) so it cannot keep making additional
provider calls. The public family gateway remains on 4174 with its existing
password protection; do not point the tunnel at 4173.

## Verification and outstanding work

Fixture tests cover concurrent readers, one provider request across overlapping
checks, server restart, preserved track, shared estimated arrival, outage handling,
same-event reassignment, HTTP read-only behavior and password protection. Real
provider credentials/live-aircraft tests are not available in the development
environment.

Still pending for the cumulative feature update: multi-leg observed work history
and its 48-hour reset; one work-leg/mileage counter including deadheads and
excluding commutes; generated physical shutter image assets and map transition;
descent-aware arrival zoom beginning below 18,000 feet, including shorter flights
that never reach that altitude. None of those unfinished features should be
described as delivered by this server-master checkpoint.
