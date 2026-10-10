# Unit 001 Display Power Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a primary-only temporary power switch and convincing, interruptible startup/shutdown choreography without interrupting tracking.

**Architecture:** One browser-local coordinator owns the four power states and cancellation. Presentation adapters animate the existing live modules; authoritative flight state remains untouched. Start with map/switch, then mechanical modules, then synchronized audio.

**Tech Stack:** Existing CommonJS/global browser modules, Babel build, CSS/SVG/canvas, Web Animations, Web Audio where available, Node assertions and project Playwright Chromium/WebKit fixtures. No framework migration or new production dependency.

**Spec:** `Docs/superpowers/specs/2026-10-10-display-power-design.md`; Joey approved its written design on October 10 at 09:51:55 Eastern. Its earlier proposed-status label is historical. This plan requires review before runtime implementation.

## Global Constraints

- Baseline `94c193db4f7a5275eb0d31dc022f1d9c7c66f28c`; experiment `agent/display-power-2026-10-10`, design commit `c0349d90ea105b989296730df796bc6105fa311d`.
- States: `on`, `stopping`, `off`, `starting`; initial state `on` and reload returns to normal on view.
- Nominal initial budget: startup 4–6 seconds, shutdown 2–3 seconds; bright shutdown dot holds 300–500 ms.
- Keep CRT effects confined to the map aperture and never scale its housing; no static or repeated flashing.
- No GPIO, OS shutdown, monitor power control, server route, or hardware wiring now.
- Do not unmount/remount the dashboard, destroy maps, reset tracking, clear sequence history, or pause calendar polling.
- Gate control, visual adapters and local audio suppression off completely for `/mobile`, `/mobile/full` and `data-family-full` views.
- Keep all existing module geometry and approved assets; no production-branch mutation, merge or deployment before Joey's visual approval.

## Review Focus

1. Rapid opposite commands during CRT collapse: latest command wins without a flash or stuck mask (Tasks 1–2).
2. Calendar flight replacement while visually off: wake shows the newest route, brand and instruments (Tasks 3, 5).
3. An operational map roll underway at switch-off: no transport replay or housing movement on wake (Task 2).
4. Mobile shares primary HTML/bundle: switch and local power/audio state cannot leak into either family route (Tasks 2, 4–5).
5. Audio decode/autoplay failure or background-tab timing: visuals still finish and no stale sound plays when resumed (Tasks 1, 4–5).

## File map

- New `App/display-power-state.js` / `-test.js`: deterministic coordinator, injected clock/scheduler.
- New `App/display-power.js` / `-test.js`: primary-only DOM adapter and temporary switch.
- New `App/display-power-audio.js` / `-test.js`: cancellable power sound envelope; visual completion never awaits sound.
- New `UI/display-power.css`: aperture-local CRT and lighting; fixed button/black field.
- Modify `App/main.js`, `App/clock-drums.js`, `App/weekly-ticker.js`, `App/map-roll-transition.js` only for explicit presentation/audio hooks; no state-engine rewrite.
- Modify `index.html`, `scripts/build-browser.js`, `package.json`: wiring and deterministic test registration.
- New `scripts/display-power-browser-test.js`; modify `scripts/browser-test-plan.js` and `scripts/testing-protocol-test.js`: register power suite in both engines, preserve existing release coverage.
- New `Docs/Display-power-2026-10-10.md`: implementation/verification/continuity evidence, not acceptance claims.

### Task 1: Cancellable local power coordinator

**Interfaces:** `createDisplayPowerController({now, requestFrame, cancelFrame, render, reducedMotion}) -> {setDisplayPower(on:boolean), getState(), getSnapshot(), destroy()}`. Snapshot is `{state, targetOn, progress, generation}`; progress is displayed brightness/reveal in `[0,1]`. Export CommonJS and `dadRadarDisplayPowerState` like existing controllers.

- [ ] Write `App/display-power-state-test.js` with fake frames: `assert.equal(controller.getState(), 'on')`; off completes in 2400 ms, wake in 5000 ms; opposite commands preserve current progress; duplicate targets do not replay; cancelled-generation frames cannot settle; reduced-motion settles in 180 ms; destroy cancels callbacks. Hidden-tab resumed timestamps settle correctly. A throwing renderer yields safe `on` and invalidates pending callbacks.
- [ ] Run `node App/display-power-state-test.js`; verify missing module/behavior fails, not test-harness setup.
- [ ] Implement that interface in `App/display-power-state.js`, timing constants 5000/2400/180 ms, monotonic progress, generation cancellation, no fetch/storage/global flight writes.
- [ ] Run the same test; require all assertions pass. Register it in `test:presentation`, check build and whitespace, commit this independently testable controller.

### Task 2: Primary-only switch and map CRT prototype

**Interfaces:** `dadRadarDisplayPower.mount({document, controllerFactory}) -> controller|null`; expose mounted controller as `window.dadRadarDisplayPowerController`. Dispatch `dad-radar:display-power-change` with coordinator snapshot. Family mode returns null without creating nodes/listeners/audio. `dadRadarMapRoll` adds presentation-only `settleForDisplayPower()` preserving its requested surface/camera and suppressing transport replay.

- [ ] Write DOM tests in `App/display-power-test.js`: family returns null; primary adds one accessible button outside the grid; click/keyboard calls `setDisplayPower`; duplicate mount is inert; failure leaves dashboard visible; off interaction mask covers dashboard but not button/boot diagnostics.
- [ ] Add browser failing cases to `scripts/display-power-browser-test.js`: fixed map/housing bounds, no static, current-map image behind CRT effect, off black, dot visible for 400 ms within shutdown, active map-roll settles without a new motor/diagnostic command. Baseline rectangles remain unchanged.
- [ ] Run Node test and power browser script against old code; verify expected failures.
- [ ] Implement `App/display-power.js`, `UI/display-power.css` and the transport presentation hook. Use aperture-local masking/reveal, a soft additive dot and restrained raster/focus effects; do not transform `.map-shell` or duplicate stale map artwork. Add switch minimum 44×44 px hit area, lower-right 12 px inset, visible focus and state-specific label. Leave non-map modules on normal rendering behind an initial light/black presentation mask until Task 3.
- [ ] Wire sources in `scripts/build-browser.js` and CSS in `index.html`; build, run Node/browser map/switch tests in Chromium and WebKit, inspect motion, commit as a map-only prototype. Do not call whole-unit choreography complete.

### Task 3: Mechanical modules and registered lighting

**Interfaces:** adapters `setPowerPresentation(snapshot)` and `clearPowerPresentation()` retain newest live targets independently of displayed transitional values. Main rendering supplies targets through its existing calls; coordinator never calls `updateDashboard` with fabricated state. Clock hook `setClockPowerPresentation(clock,snapshot)`; weekly controller hook `setPowerPresentation(snapshot)`.

- [ ] Add failing assertions to split-flap/clock/weekly/power tests: off blanks presentation only; updates while off retain latest carrier/number/route/time/weekly target; reversal cannot restore old characters; instrument sweep never enters flight/chime state; settled on restores normal behavior exactly.
- [ ] Run `node App/split-flap-state-test.js`, `node App/clock-drums-test.js`, `node App/weekly-ticker-test.js`, `node App/display-power-test.js`; verify new cases fail before implementation.
- [ ] Implement targeted hooks in `App/main.js`, `App/clock-drums.js`, `App/weekly-ticker.js`, with power visual composition in `App/display-power.js`. Fixed hardware/glass remains stationary; reuse mechanical surfaces and current printed-ink renderer. Preserve original textures and crops; no whole-module scaling. Sequence blanking is presentation-only. Lamp reveals remain independent of mechanical indexing.
- [ ] Use deterministic startup offsets: map 0 ms, paper 700 ms, instruments 1100 ms, clocks 1500 ms, flaps 1700 ms, weekly 2100 ms with 100 ms bay stagger. Shutdown reverses module order within 2400 ms and reserves final map dot 400 ms. Latest values settle by coordinator deadline; if normal indexing needs more time, adjust the disclosed timing budget before claiming success.
- [ ] Run focused tests and browser power suite; capture stationary hinges, moving textured flap, both clock rows, needle settling and weekly direction. If baked artwork prevents believable lamp-off/moving texture, stop that adapter and prepare registered source-layer corrections for Joey's review rather than forcing a brightness fade. Commit only verified behavior.

### Task 4: Sound isolation and auditionable power envelopes

**Interfaces:** `createPowerAudio({audioContextFactory, volume, isEnabled}) -> {unlock(), apply(snapshot), stop(), destroy()}` in `App/display-power-audio.js`. Local silence uses injected `canPlay()` guards in existing sound entry points, while existing chime/ident crossing bookkeeping continues normally. Guards default true and are primary-only.

- [ ] Write failing tests: off stops ongoing local sounds; operational events while off are accounted for but inaudible/no wake replay; power gesture does not change saved volume/preferences; family sound unaffected; asynchronous unlock/decode from old generation cannot play; rejected AudioContext never blocks transition.
- [ ] Run power-audio and existing split-flap/map/chime/ident audio tests; verify red cases.
- [ ] Implement a restrained relay transient and tube-hum envelope with Web Audio for audition, not copied map motor. Reuse existing split-flap sound for genuine indexing only. Add necessary `canPlay` hooks to `App/split-flap-audio.js`, `App/map-roll-audio.js`, `App/altitude-chime.js`, `App/station-ident.js`, and weekly audio path; initialize defaults without mutating family behavior or global audio prototypes. Honor current configured levels and audio controls.
- [ ] Run all focused audio tests and `scripts/audio-control-browser-test.js`; record audible preview for Joey, label synthesized sounds provisional. Commit verified isolation without claiming acoustic approval.

### Task 5: Full browser evidence and project gates

**Interfaces:** `scripts/display-power-browser-test.js` uses `createDisplayFixture()` and `DADRADAR_BROWSER_ENGINE`; artifact manifest includes source/tree, viewport 1920×1080, DPR 1, fictional state, browser and capture timestamps.

- [ ] Add failing integration checks for calendar replacement while off, data during wake, repeated reversals, viewport resize, background-tab resumption, reduced motion, audio failure and both unchanged family routes. Require actual shared `/api/state` refresh while off; do not prove it solely by direct UI state injection.
- [ ] Register `power` suite for Chromium/WebKit in `scripts/browser-test-plan.js`; assert full matrix includes both in `scripts/testing-protocol-test.js`. Keep shared/unknown edits selecting full coverage; do not narrow this release to avoid consumers.
- [ ] Run `npm test`, `npm run test:protocol`, `npm run test:browser -- --suite power`, existing split-flap/map/clocks/artwork/audio/family suites. Require all selected assertions and error observers pass; do not weaken geometry checks to accommodate effects.
- [ ] Capture full-resolution before/on, startup, collapse/dot, off and wake PNGs, close-ups and a video. Compare settled module bounds including every clock aperture with baseline at ≤0.02 px numerical tolerance; physically stationary housings must remain stationary during transitions too. Inspect recordings for clipped textures, stretched art, seams, discontinuities and stale values.
- [ ] Publish exact implementation SHA only to experiment; use required exact-source full hosted gate and verify remote tree equals tested local tree. Browser/Pi/physical-monitor evidence remain separate; do not claim Pi performance without hardware testing.

### Task 6: Visual handoff and continuity

**Files:** `Docs/Display-power-2026-10-10.md`, same authoritative continuity item (append-only dated update using its established persistence workflow), user-facing preview artifacts.

- [ ] Record approved intent, exact changes/tests/source SHA, screenshot/video provenance, unverified audio/physical/Pi acceptance and no-deployment status. Preserve earlier history. Persist preview artifacts through Library; repository-backed source/docs stay in Git, not duplicate repository storage.
- [ ] Present playable motion preview, full screenshot and brief test summary to Joey. Ask for visual/audio acceptance; no merge/deploy before explicit later approval.

## Plan self-review and execution handoff

Spec coverage: lifecycle/cancellation Task 1; switch/CRT/transport Task 2;
all mechanical modules/lighting Task 3; local sound Task 4; geometry/mobile/
recovery/provider continuity/performance-evidence boundaries Task 5;
review/persistence/continuity/deployment separation Task 6. Review Focus
cases each have owning tests. Newly prepared artwork/sound remains subject
to review, not implicitly approved by the plan.

Recommended execution: native, task-by-task in the current session, because
all module hooks share the same coordinator and existing display lifecycle.
No runtime implementation starts until Joey reviews this plan and chooses
the execution method. Avoid assigning independent implementation tasks to
multiple agents touching `App/main.js` simultaneously.
