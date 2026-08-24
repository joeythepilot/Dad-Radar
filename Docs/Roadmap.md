# Dad Radar Development Roadmap

## Vision

Dad Radar is an heirloom-quality flight operations display that helps Delaney stay connected to her dad's aviation journey through thoughtful industrial design, live flight data, and timeless storytelling.

---

# Phase 1 — Foundation

- [x] Create GitHub repository
- [x] Create README
- [x] Define software states
- [x] Create Design Bible
- [x] Create project roadmap
- [x] Create project folder structure

---

# Phase 2 — Industrial Design

- [ ] Finalize cabinet dimensions
- [ ] Select monitor
- [ ] Engineer instrument panel
- [ ] Select hardware
- [ ] Produce mechanical drawings
- [ ] Build Prototype 001

---

# Phase 3 — User Interface

- [x] Build static UI
- [x] Flight board module
- [x] Travel poster module
- [x] Moving map module
- [x] Instrument cluster
- [ ] Status indicators
- [x] Layover mode
- [x] Home mode

---

# Phase 4 — Flight Intelligence

- [x] Google Calendar integration
- [x] Pilot schedule parser
- [x] Calendar-to-display state resolution
- [x] Live flight tracking pipeline
- [x] Flight status detection
- [x] Delay detection
- [x] Diversion detection
- [x] Live ETA reconciliation
- [x] Production-path live-flight diagnostic
- [x] Validate a complete live flight with production Flightradar24 API data
- [x] Boarding and Calendar-inferred delay behavior
- [x] Cascading-delay active-leg lock
- [x] Deadhead parsing and family-facing context

---

# Current Implementation Checkpoint

Last verified: August 13, 2026

Dad Radar can authenticate with the Pilot Schedule Google Calendar, retrieve upcoming events, parse roster flights and manually entered commutes, resolve the current high-level display state, and publish that state to the existing interface.

The browser now requests provider-neutral snapshots for the Calendar-selected flight. adsb.lol is primary and Flightradar24 is the sticky automatic fallback. Active phases refresh every 30 seconds while acquisition and ground states use 60 seconds. Operational phase, ETA, progress, heading, vertical speed, altitude, groundspeed, and map coordinates can refine the Calendar plan.

Calendar remains authoritative before live acquisition and whenever Flightradar24 is unavailable, returns no confident match, or becomes stale. Paid pre-departure airline status is intentionally omitted: Boarding begins at T-minus 30 and Calendar-inferred Delayed begins five minutes after scheduled departure unless an on-time Taxi Out was already confirmed. Confirmed Taxi Out cannot regress at that boundary; a delay that appeared first remains until airborne evidence arrives. Active-leg locking prevents cascading calendar overlaps from replacing the current delayed or airborne flight. Groundspeed remains distinct from airspeed in the state model, but it drives the speed gauge and a Ground Speed readout because no indicated-airspeed source is available.

The browser API client, pure reconciliation model, cost-controlled polling controller, live moving-map position, and deterministic regression tests are implemented. A one-command diagnostic exercises the production Calendar selection, Flightradar24 lookup, and reconciliation path while keeping credentials out of its report.

Filed-route acquisition was deliberately removed from the active design. The origin-to-destination curve is the planned route, while accumulated FR24 observations draw the actual breadcrumb track. The current 90-flight-hour provider cost model is documented in `Docs/Data-provider-cost-analysis.md`.

The family beta is deployed on the downstairs Windows desktop with the upstairs iPad as the private-network display. Windows automatic startup removes the terminal dependency and restores the server after operating-system restarts. The active milestone is real-use flight testing, poster expansion, and bug capture using the checklist in `Docs/Family-beta-guide.md`.

---

# Phase 5 — Audio

- [ ] Startup sequence
- [ ] Tube warm-up sound
- [x] Split-flap sound synchronized to the full-board animation
- [ ] Cabin chime (below 10,000 feet)
- [ ] Shutdown sequence

---

# Phase 6 — Hardware

- [ ] Raspberry Pi integration
- [ ] LCD installation
- [ ] Speaker installation
- [ ] Power management
- [ ] Cooling and ventilation
- [ ] Final wiring

---

# Phase 7 — Final Assembly

- [ ] Assemble cabinet
- [ ] Install electronics
- [ ] Configure software
- [ ] Field testing
- [ ] Prototype revisions
- [ ] Production-ready design
