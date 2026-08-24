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

✓ FlightAware AeroAPI v4 was the first live-flight provider evaluated for Prototype 001 and was retired because the projected personal-display cost was too high.

✓ adsb.lol is the primary live-position provider. Flightradar24 remains the automatic backup; its token stays on the local backend and is loaded only from `FR24_API_TOKEN`.

✓ FlightAware AeroAPI is used only for optional, cached filed-route enrichment through `FLIGHTAWARE_AEROAPI_KEY`. A missing route or key retains the direct dashed planned curve.

✓ Provider responses are normalized before reaching the rest of Dad Radar so another provider can be substituted later.

✓ Initial flight lookup prefers ICAO callsigns, falls back to commercial flight numbers, and validates the Calendar origin and destination before accepting a match.

✓ Initial acquisition uses the FR24 full live-position record. Later polls use the exact FR24 flight ID to select the light live-position record while retaining cached identity metadata for that leg.

✓ Paid pre-departure airline status and decoded filed-route data are not required. Calendar publishes Boarding beginning 30 minutes before departure. If neither an on-time Taxi Out nor airborne evidence appears by five minutes after scheduled departure, it publishes Delayed until live data confirms the aircraft is airborne. The map keeps its direct planned arc, and observed FR24 positions build the actual breadcrumb track.

✓ FR24 altitude arrives in feet. Groundspeed remains a distinct data field. Because no indicated-airspeed source is available, groundspeed may drive the existing speed gauge only when its digital readout is labeled Ground Speed.

✓ Calendar data remains the fallback plan when Flightradar24 is unavailable or cannot find a confident match.


### Live Flight State Reconciliation

✓ The browser requests live data only for a Calendar-selected flight in a trackable mode. Acquisition begins 30 minutes before scheduled departure, matching the Boarding window. Home, Arrived, Layover, and Offline modes do not generate FR24 polling.

✓ The default live polling interval is 60 seconds. A snapshot older than three minutes cannot supply new telemetry, but the same leg retains its highest confirmed live phase, last position, track, and progress rather than regressing to a Calendar-inferred earlier state.

✓ A live snapshot must still match the Calendar origin and destination before it can refine the display, even though the backend already performs route validation.

✓ Calendar owns the planned event identity. Flightradar24 may refine phase, ETA, progress, aircraft identity, and position, but a live failure never erases the plan.

✓ Live En Route and Approach phases preserve the family meaning of Commute to Base or Commute Home for commute events.

✓ Cancellation is represented as a live status on the Calendar-selected flight until a dedicated cancellation mode is designed.

✓ Real coordinates and heading drive the moving-map aircraft marker when available and within map bounds. Calendar progress remains the route-marker fallback.

✓ The direct vintage arc is the planned route. After two observed FR24 positions, a solid actual-flight breadcrumb track replaces the estimated completed-route segment.


### Live Flight Field Validation

✓ A one-command diagnostic exercises the production Calendar selection, Flightradar24 lookup, and reconciliation model without printing credentials.

✓ The diagnostic checks the active flight first and otherwise checks the next scheduled flight within the Calendar look-ahead window.

✓ A provider response is reported as Matched only when the reconciliation model accepts it as fresh and route-correct. Rejected or missing live data leaves the Calendar fallback visible in the report.


### Today's Duty Panel

✓ The unused lower-left console area displays the current Eastern Time day's normalized Calendar schedule.

✓ Completed, current, and upcoming items remain part of one daily timeline, with the current activity visually emphasized.

✓ Family-facing context explains what Daddy is doing now in Delaney's natural language. Calendar remains the sole source of planned schedule truth.

✓ The daily timeline filters entries to the current Eastern Time day while the Calendar query retains enough history to preserve completed legs and Daddy's last known location.

✓ Family-facing context names both the destination city and its state or province, such as `DADDY IS FLYING TO BILLINGS, MONTANA`.


### Poster Production Format

✓ New destination posters use a 7 : 8 aspect ratio, a 4200 × 4800 archival master, and a 2100 × 2400 display-delivery asset.

✓ Poster foreground artwork always uses contain behavior. Existing 2 : 3 artwork may be letterboxed but must never be cropped.

✓ DadRadar 1 poster acceptance uses the Maxwell family Raspberry Pi unit's HP 23es display at 1920 × 1080 and 60 Hz as the primary viewing target.

✓ The approved Asheville composition—with Asheville City Hall centered—is the visual baseline for poster hierarchy and print treatment. Destination posters must use distinct architecture, landscape, sky, cloud silhouettes, light, and atmospheric composition rather than cloning Asheville's scene.

✓ DFW poster Candidate 2 is the approved DFW composition. Its destination title uses a shared right edge to balance the upper-left aircraft, and its two-city landmark montage is intentionally illustrative rather than a literal shared skyline.

✓ DCA poster Candidate 2 is the approved DCA composition. It uses the same collection canvas dimensions as the approved baselines, with the Washington Monument centered, National Mall architecture grounded in direct references, and a distinct pearlescent spring atmosphere. DCA Candidate 1 is rejected because its canvas was too narrow.

✓ Destination artwork is produced in small manifest-driven batches. Exact copy, factual references, landmark hierarchy, sky, light, palette, and aircraft placement are fixed before generation; each image is generated and reviewed individually.

✓ Automated checks enforce the poster manifest, naming, dimensions, and collection ratio. A batch contact sheet is required to catch repetition and visual drift, while human approval remains the gate for landmark fidelity and final art direction.

✓ `MIA`, `CLT`, `PHX`, `XNA`, and `CMH` form pilot batch `pilot-hubs-01`. Joey and his family approved all five compositions for the display library.


### Live Motion and Approach

✓ Approach detection uses converging arrival evidence—altitude, airport distance, route progress, groundspeed, and FR24 vertical speed—rather than requiring a provider phase label.

✓ A climbing aircraft cannot be classified as Approach by the low-altitude fallback.

✓ Once a flight enters Approach, temporary level-offs and isolated provider regressions cannot demote it to En Route. The Approach latch is scoped to one calendar flight and releases for terminal phases or a confirmed climb through 12,500 feet.

✓ Landing begins only after Approach is confirmed and the aircraft descends below 3,000 feet above the destination airport elevation. It remains latched until a terminal phase, except that a confirmed climb above 3,500 feet AGL returns a go-around to Approach.

✓ Operational phases update immediately. Position and instrument telemetry interpolate visually for 52 seconds between the approximately one-minute provider snapshots.

✓ Visual interpolation never mutates the raw Flightradar24 snapshot or claims an estimated intermediate value as a new observation.


### Map Endpoints and Split-Flap Audio

✓ Departure and destination endpoints use fixed-size, runway-style airport symbols that remain legible at every map zoom level.

✓ Split-flap audio uses one shared playback per full-board update. Playback begins at 00:05.195 in the source recording and fades smoothly after the final active flap completes.

✓ The current Pragotron recording by Freesound user matucha is licensed CC BY-NC 4.0 and is approved only for the personal prototype. Commercial distribution requires a replacement recording or separate commercial permission.


### Home Location Evidence

✓ Home means Daddy is in Asheville and therefore requires AVL location evidence. A blank Calendar is not evidence of Home.

✓ The Calendar service retains seven days of completed-event history so the most recent flight destination can preserve Daddy's last known ground location across schedule gaps.

✓ After the Arrived hold ends, a flight that landed away from AVL transitions to an away-ground/Layover state even when no later flight is listed.

✓ When neither a recent destination nor a future flight origin provides location evidence, Dad Radar displays Location Unknown.


### Shared Airport Catalog

✓ One generated, offline airport catalog replaces the separate city, coordinate, and time-zone lists formerly maintained in the browser and backend.

✓ The catalog includes all current IATA-coded records from `mborsetti/airportsdata` and stores city, subdivision, country, coordinates, elevation, and IANA time zone.

✓ The schedule model, live reconciliation model, Calendar parser, and moving map all resolve airport codes through the same catalog.

✓ Airport metadata requires no runtime API call. Unknown codes retain safe three-letter-code fallbacks, and the catalog is informational only—not for navigation.


## 2026-08-13

### Family Beta

✓ The first family beta runs on the downstairs Windows desktop and serves an upstairs iPad over the trusted private home network. The desktop retains Google and FR24 credentials; the iPad is a display client only.

✓ The beta server listens on the local network but exposes only required browser assets and API routes. `.env`, `token.json`, `credentials.json`, backend code, package metadata, and project documentation are not publicly served.

✓ The HP 23es 1920 × 1080 layout remains the primary design target. The iPad scales that complete 16 : 9 canvas proportionally in landscape rather than creating a separate layout.

✓ iPad split-flap audio requires one explicit on-screen tap after a new browser session because Safari blocks uninitiated playback.

✓ An operating, commuting, or deadhead leg becomes Calendar-delayed five minutes after scheduled departure unless live data already confirmed an on-time Taxi Out or an airborne phase. Once confirmed, Taxi Out is a monotonic floor for that flight and cannot regress to Boarding or a later Calendar-inferred Delayed state. A flight that became Delayed before Taxi Out remains Delayed while it is still on the ground.

✓ Live-confirmed Arrived records an effective event completion time in browser storage. This protects early arrivals through stale provider data and browser reloads, keeps the map at the destination, and lets the Calendar's Arrived hold transition naturally to Home or Layover.

✓ A delayed or airborne leg locks the Calendar selection through overlapping future events and for up to eight hours beyond its scheduled end. Confirmed Arrived or Landed releases the lock immediately.

✓ Calendar deadhead events remain operationally trackable but use `DEADHEAD` in Today's Duty and family language that says Daddy is riding rather than operating.

✓ The approved poster library is `AVL`, `CLT`, `CMH`, `DCA`, `DFW`, `LSE`, `MIA`, `ORD`, `PHX`, `ROC`, and `XNA`.

✓ Dad Radar never substitutes an unrelated destination poster. An airport without approved artwork receives a designed vintage placeholder containing its real city, state or province, and three-letter airport code. New posters are produced in small batches driven by the upcoming schedule.

✓ The final faceplate covers the upper monitor area except for the split-flap tile openings. The split-flap row is therefore permanent in every state and may never be replaced by browser text or another full-width presentation.

✓ In a non-flight state, Flight and From remain visible as blank mechanical tiles. To displays the last confirmed airport when one exists—`AVL` for Home and the confirmed airport for Layover—and Status displays the compact state label. Unknown location leaves To blank rather than inventing an airport.

✓ The first-generation iPad Air on iOS 12.5.5 receives an ES5 browser bundle plus explicit CSS fallbacks for unsupported `clamp()`, flex-gap, and `aspect-ratio` behavior. Versioned browser assets bypass stale Safari caches, and a visible startup diagnostic replaces silent initialization failures.

## 2026-08-14

### Family Beta Reliability

✓ The Windows family-beta host runs through a named Task Scheduler task under the local system account. It starts after every Windows boot without a terminal or user sign-in, has no execution time limit, and retries after an unexpected failure.

✓ The background host rebuilds the legacy iPad browser bundle before serving Dad Radar, writes a bounded local operational log under `runtime/`, and can wait for a manually started server before taking over the configured port.

✓ The desktop monitor may turn off and Windows may remain locked, but the PC must not sleep while serving the upstairs iPad. Raspberry Pi power behavior remains part of the physical-build phase.
