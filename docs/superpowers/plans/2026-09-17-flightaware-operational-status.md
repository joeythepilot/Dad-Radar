# FlightAware Operational Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich DadRadar's Calendar-derived schedule and shared master state with matched FlightAware operational times/status so real delays and arrivals replace fabricated delay/arrival inference whenever available.

**Architecture:** Add a server-side FlightAware operational-status adapter with adaptive caching. The home server enriches near-term Calendar flight events before the existing schedule-state model resolves them. Schedule-state preserves original Calendar times, uses FlightAware operational evidence for DELAYED/TAXI_OUT/EN_ROUTE/TAXI_IN/ARRIVED/CANCELLED/DIVERTED, and falls back to existing inference when operational data is unavailable. ADSB.lol remains movement truth and can still refine active phase/position.

**Tech Stack:** Node.js CommonJS, existing Express server, FlightAware AeroAPI v4, Google Calendar schedule parser, existing schedule/live state models, GitHub Actions and home Windows regression gate.

**Spec:** `docs/superpowers/specs/2026-09-17-flightaware-operational-status-design.md`

## Global Constraints

- Google Calendar remains planned schedule truth and is never rewritten.
- FlightAware supplies operational timing/status only.
- ADSB.lol remains primary movement/position provider.
- Existing fake-delay and arrival inference remains fallback-only.
- FR24 stays optional.
- Missing FlightAware key must preserve current behavior.
- No API key may be exposed through browser state, diagnostics, or docs.
- Update internal documentation in the same feature.

---

### Task 1: FlightAware operational-status adapter

**Files:**
- Create: `server/flightaware-operational-service.js`
- Create: `server/flightaware-operational-service-test.js`
- Modify: `package.json`

**Interfaces:**
- Produces `getOperationalStatus(event, options)` -> normalized operational record or `null`.
- Exposes normalization/matching helpers for direct unit testing.

- [ ] Write failing tests for route/date matching, OUT/OFF/ON/IN normalization, cancellation/diversion, delay calculation, cache TTL behavior, and no-key behavior.
- [ ] Run the new test and verify RED.
- [ ] Implement the minimal adapter using `GET /flights/{ident}` and the existing Calendar lookup candidates.
- [ ] Run adapter tests and verify GREEN.
- [ ] Add the adapter test to `npm test`.

### Task 2: Server-side Calendar enrichment

**Files:**
- Modify: `server/master-state-service.js`
- Modify: `server/master-state-service-test.js`
- Modify: `server/index.js`
- Modify: `server/index-test.js`

**Interfaces:**
- `createMasterStateService({ getCalendar, getFlight, getOperational, ... })`
- Enriched flight event field: `event.operational`
- When `operational.actualIn` exists, enriched event also exposes `confirmedArrivalAt`.

- [ ] Write failing master-state tests proving Calendar events are enriched without rewriting planned timestamps, provider failures preserve Calendar state, and actual IN becomes confirmed arrival.
- [ ] Run focused master-state tests and verify RED.
- [ ] Inject `getOperationalStatus` from `server/index.js` and enrich only near-term flight events in the server Calendar path.
- [ ] Extend `/api/health` with operational provider configuration status.
- [ ] Run focused server tests and verify GREEN.

### Task 3: Operational evidence in schedule-state

**Files:**
- Modify: `models/schedule-state.js`
- Modify: `models/schedule-state-test.js`

**Interfaces:**
- Planned event times stay at `event.times.startUtc/endUtc`.
- Operational evidence is read from `event.operational`.
- State flight exposes `operational` plus provider-derived delay/arrival timing fields.

- [ ] Write failing tests for provider-derived DELAYED, no fabricated numeric delay when matched provider reports no delay, actual OUT -> TAXI_OUT, actual OFF -> EN_ROUTE, actual ON -> TAXI_IN, actual IN -> ARRIVED, cancellation/diversion, revised daily display time, and ETA from estimated/actual IN.
- [ ] Run focused schedule-state tests and verify RED.
- [ ] Implement operational precedence and revised display/ETA helpers without changing event identity.
- [ ] Run focused tests and verify GREEN.

### Task 4: Demote arrival inference when operational arrival exists

**Files:**
- Modify: `services/calendar-state-controller.js`
- Modify: `services/calendar-state-controller-test.js`
- Modify: `models/live-flight-state.js` only if required by a failing test
- Modify: `models/live-flight-state-test.js` only if required by a failing test

**Interfaces:**
- `actualOn`/`actualIn` from the enriched Calendar event must outrank silence-based arrival inference.
- Existing taxi/coverage fallbacks remain unchanged when no operational arrival evidence exists.

- [ ] Write failing controller test proving operational actual IN prevents fake-arrival timers from inventing a competing arrival.
- [ ] Run focused controller test and verify RED.
- [ ] Make the smallest controller change necessary.
- [ ] Run controller and live-state tests and verify GREEN.

### Task 5: Internal documentation and diagnostics

**Files:**
- Modify: `Docs/Dataflow.md`
- Modify: `Docs/Software-architecture.md`
- Modify: `Docs/States.md`
- Modify: `Docs/Data-provider-cost-analysis.md`
- Modify: `Docs/Current-build-handoff.md`
- Modify: `.env.example`

- [ ] Document source-of-truth boundaries, normalized operational fields, adaptive polling, failure/fallback behavior, cost-control intent, and the demotion of fake delay/arrival logic.
- [ ] Document that Calendar itself is not rewritten.
- [ ] Document Unit 001 use of FlightAware now and provider abstraction for later commercialization.

### Task 6: Full verification and home deployment

**Files:**
- No new implementation files unless verification exposes a defect.

- [ ] Run the complete `npm test` suite on exact branch HEAD.
- [ ] Confirm GitHub hosted regression job succeeds for exact HEAD.
- [ ] Deploy exact HEAD through the allowlisted home-control deployment gate.
- [ ] Confirm the home Windows suite passes, restart succeeds, and post-restart status shows Installed/Upstream/Running on the exact SHA with a clean working tree.
- [ ] If the home machine has a configured FlightAware key, use read-only state/diagnostics to confirm operational enrichment is present; if it does not, report that configuration remains the only blocker without inventing evidence.
