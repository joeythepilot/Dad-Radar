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
- [ ] Validate a complete live flight with production Flightradar24 API data

---

# Current Implementation Checkpoint

Last verified: August 4, 2026

Dad Radar can authenticate with the Pilot Schedule Google Calendar, retrieve upcoming events, parse roster flights and manually entered commutes, resolve the current high-level display state, and publish that state to the existing interface.

The browser now requests normalized Flightradar24 snapshots for the Calendar-selected flight. Initial acquisition uses a full live record; continuing one-minute telemetry uses the light record. Operational phase, ETA, progress, heading, vertical speed, altitude, groundspeed, and map coordinates can refine the Calendar plan.

Calendar remains authoritative before live acquisition and whenever Flightradar24 is unavailable, returns no confident match, or becomes stale. Paid preflight airline status is intentionally omitted. Live failures do not erase the planned schedule or force an Offline state. Groundspeed remains distinct from airspeed in the state model, but it drives the speed gauge and a Ground Speed readout because no indicated-airspeed source is available.

The browser API client, pure reconciliation model, cost-controlled polling controller, live moving-map position, and deterministic regression tests are implemented. A one-command diagnostic exercises the production Calendar selection, Flightradar24 lookup, and reconciliation path while keeping credentials out of its report.

Filed-route acquisition was deliberately removed from the active design. The origin-to-destination curve is the planned route, while accumulated FR24 observations draw the actual breadcrumb track. The current 90-flight-hour provider cost model is documented in `Docs/Data-provider-cost-analysis.md`.

Next milestone: run `npm.cmd run diagnose:live` against a real active flight with `FR24_API_TOKEN` configured, repeat it during each major flight phase, and address any provider-data edge cases found during that field run.

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
