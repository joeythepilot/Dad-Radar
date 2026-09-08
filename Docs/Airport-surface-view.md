# Airport ground view — September 8, 2026

This update extends the accepted four-row mobile companion and the home console's shared map. It is based on `7c74fd5` on `agent/mobile-companion`.

## What changes

- A matched adsb.lol aircraft broadcasting a fresh ground position within four nautical miles of departure shows TAXI OUT, including zero speed and taxi holds. This follows Joey's stated transponder practice. Calendar lateness cannot override this evidence. Missing or stale positions cannot initiate Taxi-Out.
- The adapter now supplies the canonical speed, heading, altitude and vertical-speed fields expected by the live-state model. It retains the ADS-B ground flag and actual position age instead of treating an unknown timestamp as current.
- Usable ADS-B ground positions activate an airport chart at either endpoint. Runways, taxiways, aprons and terminal outlines come from OpenStreetMap, using one bounded Overpass query per field. No airport artwork needs to be manually installed.
- Maps are downloaded through the local server, shared across displays, and saved under `runtime/airport-maps`. First-use requests are asynchronous; the regular map remains visible while data loads. Maps refresh after 30 days when used. Failures retain complete cached maps and back off for a day; requests are serialized and spaced apart.
- Airport geometry uses a local projection in meters with equal scale in both axes. The regional map's projection is not stretched into an airport chart. The airport camera fits the field; the icon uses reported coordinates and heading independently of the regional animation.
- A positive airborne report returns to the regional camera. Regional departure/approach zoom uses height above the nearby airport, fixing high-elevation field behavior, and unknown altitude no longer becomes zero feet.
- At destination, the display retains its existing ARRIVED status and follows continuing ground reports through taxi-in. Those follow-up requests use adsb.lol only: no FR24 or FlightAware calls, including on errors. After five minutes without a usable ground report, the normal confirmed-arrival handoff resumes. A ground arrival first received through FR24 can enter this same adsb.lol-only follow-up; no additional FR24 arrival queries are made. Other FR24 arrivals still stop polling immediately.

## Coverage and freshness

A close-up requires a position at most 90 seconds old, ground evidence, and an ADS-B source. adsb.lol supplies an explicit ground flag. For already-received FR24 ADSB fallback reports, surface evidence is inferred from zero reported altitude, known speed between 0 and 65 knots, no reported climb/descent, and proximity to a route endpoint. This is an inference, not a provider-supplied ground flag; speed and heading alone are insufficient. Missing timestamps, estimated positions, or MLAT-only reports cannot activate this fallback close-up. Known low-integrity reports (NACp below 7 or containment radius above 200 meters) and MLAT-only reports use the regional fallback. Missing quality indicators do not establish a particular accuracy; this remains a family display.

Once shown, an airport position is held exactly where last received during a brief gap. After 90 seconds it is dimmed and labeled LAST POSITION; after five minutes the airport view closes. A new flight identity clears the previous airport position. HOME and layover states retain the regional location map.

The normal telemetry intervals remain 30 seconds in active phases and 60 seconds in idle/arrival phases. This is not a continuous surveillance feed. Airport coverage and geometry completeness vary, and aircraft reception may disappear behind buildings. No taxi route is synthesized and no runway-crossing or navigation guidance is provided.

The arrival-time overlays, regional filed route, weather, accumulated actual flight track, posters and accepted mobile layout remain in place. Airport ground views show chart detail instead of the regional weather image; returning to regional view restores the existing weather layer.

## Validation

- Full `npm test` passes, including the ES5 browser build, provider HTTP integration, Calendar controller, map, mobile, and Access authorization tests.
- New tests replay the ORD–BIL FR24 ADSB fallback report at zero and two knots through adapter, live-state model and airport selection, including stale/estimated/missing-data rejection. The arrival controller also checks that FR24 ground arrival switches to free follow-up only.
- New tests replay stationary/moving Taxi-Out, stale or missing coordinates, takeoff, destination ground reports, extended taxi-in, transponder silence, flight replacement, unknown altitude and DEN field elevation.
- SVG replay verifies local projection scale, geometry rendering, unfilled centerlines, raw-position placement despite regional animation, stale-position hold and endpoint transitions.
- Cache tests cover concurrent clients, persistence across restart, expiration, malformed/empty geometry, provider failure/backoff and recovery. HTTP tests confirm the mobile gateway protects the new endpoint and airport requests do not invoke flight providers.
- A real bounded Overpass request for AVL succeeded on September 8, 2026 and returned 33 airport features. Runtime data is not committed.
- Live aircraft reception and rendering on the actual iPhone/HP display still need the next trip's observation. No aircraft credentials were supplied or real flight telemetry queried during this build.

## Install

On the Dad Radar PC:

```bat
cd /d C:\Users\cfijo\Dad-Radar
git fetch origin agent/mobile-companion
git merge --ff-only FETCH_HEAD
npm.cmd test
npm.cmd run beta:autostart:restart
npm.cmd run display:restart
```

Reload the mobile page once so it loads the new scripts. Keep the existing home-screen link. A server restart is necessary for the new map endpoint and provider behavior.

## Map data

© OpenStreetMap contributors, [ODbL](https://www.openstreetmap.org/copyright). The airport view includes visible attribution. Geometry comes from the [Overpass API](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html), not downloaded public map tiles. Cached normalized map data carries its source, license and fetch date.
