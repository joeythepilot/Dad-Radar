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
- [ ] Live flight tracking
- [ ] Flight status detection
- [ ] Delay detection
- [ ] Diversion detection
- [ ] ETA calculations

---

# Current Implementation Checkpoint

Last verified: August 4, 2026

Dad Radar can authenticate with the Pilot Schedule Google Calendar, retrieve upcoming events, parse roster flights and manually entered commutes, resolve the current high-level display state, and publish that state to the existing interface.

The browser still displays the Calendar-derived plan only. Live aircraft position, telemetry, delay detection, diversion detection, and operational phase detection will remain out of the interface until the new provider snapshot is reconciled with that plan.

The FlightAware AeroAPI backend foundation now performs secure provider lookups, selects a flight by route and scheduled time, and normalizes status, delay, gate, progress, and position data.

Next milestone: connect the normalized live-flight snapshot to the browser controller and reconcile it with the Calendar-derived display state.

---

# Phase 5 — Audio

- [ ] Startup sequence
- [ ] Tube warm-up sound
- [ ] Split-flap sounds
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
