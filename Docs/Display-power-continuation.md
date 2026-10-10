# DadRadar Unit 001 — display-power continuation checkpoint

Updated: October 10, 2026, Eastern. This is a live execution ledger, not a completion claim.
Plan identity: `Docs/superpowers/plans/2026-10-10-display-power.md`.

## Resume prompt (copy into a new chat)

Continue DadRadar Unit 001 in `joeythepilot/Dad-Radar`, experiment branch
`agent/display-power-2026-10-10`. Read the complete current project continuity
source and newer updates, then this checkpoint, the approved spec at
`Docs/superpowers/specs/2026-10-10-display-power-design.md`, and implementation
plan at `Docs/superpowers/plans/2026-10-10-display-power.md`. Verify remote branch
and local changes before doing anything. Resume at the first incomplete task;
do not restart completed work or repeat design/plan approval.

Joey approved the written design and then the implementation plan and native
execution. Implement inline using executing-plans and test-driven-development;
keep this tracked checkpoint current and publish tested task checkpoints to
the experimental branch so scratch/chat loss does not lose completed work.
Use a fresh whole-branch review at the end. Do not merge or deploy before
Joey reviews the actual rendered animation and explicitly approves deployment.

Build a primary-only lower-right temporary switch controlling display-only
startup/shutdown. Tracking, calendar polling, server and mobile keep running.
Preserve all existing geometry, artwork, normal animations and flight logic.
Initial/reload state remains on; intentional commands animate startup or
shutdown. CRT map starts with pinpoint bloom/raster catch/focus, no static;
shutdown collapses vertically and holds a dot 300–500 ms before fading.
Mechanical modules and local illumination follow, then synchronized sound.
Unknown status must remain explicitly unverified. No GPIO or Pi shutdown now.

## Approved authority and source

- App baseline: `94c193db4f7a5275eb0d31dc022f1d9c7c66f28c`, tree
  `d1803f5f4aeb001d31df61088b0792efb5b67652`.
- Design commit: `c0349d90ea105b989296730df796bc6105fa311d`.
- Plan commit: `69622d0e5994583efac2e73c1b740ade8d708296`.
- Written design approved October 10 at 09:51:55 Eastern.
- Plan/native execution approved October 10 at 09:56:10 Eastern. Joey also
  explicitly requested reliable new-chat continuation if this chat fails.
- Last documented home verification: October 9 at 09:33:46 Eastern,
  running baseline SHA, healthy, instance `1791552800685-28924-jbh0id`.
  No fresh October 10 physical/server health verification is claimed.

## Execution state

| Task | Status | Evidence / next action |
| --- | --- | --- |
| Baseline/setup | Passed | `npm ci` succeeded; complete baseline `npm test` exited 0 |
| 1 — Power state controller | Complete and published | `a8b3648663030fa8e0b009e5fb25052f761f1e02`; RED then GREEN; complete `npm test` exited 0 |
| 2 — Switch/CRT | Prototype published; supplementary Chromium proof passed | Source checkpoint `0a16fc611af43a43f4121b8ede4a8594494b638c`, tree `324eebe7d56925a80e730b719d66a4b6feb27c40`; focused Node/map tests GREEN, prior full `npm test` exited 0; portable Chromium switch/data-refresh/geometry/reversal/both-family tests exited 0; pinned Chromium/WebKit proof remains pending |
| 3 — Mechanical modules | Implemented; preview/release proof pending | Gate/clock/weekly/local-light/needle tests RED→GREEN; off-flap browser assertion RED→GREEN; full `npm test` exit 0; stronger portable Chromium checks pass actual blank drums/flaps/bays and newest digits/route on wake; final phase captures/dual-engine proof still pending |
| 4 — Audio | Implemented; audition/hosted audio browser proof pending | New envelope/isolation tests RED→GREEN; existing flap/map/chime/ident tests pass; full `npm test` exit 0; portable primary/family browser cycle passes; no acoustic approval |
| 5 — Browser/gates | Recovery integration implemented; hosted gate pending | Full matrix now requires power/Chromium and power/WebKit (protocol RED→GREEN); background/latest-digit recovery RED→GREEN; reduced motion/resize/fail-open portable browser checks passed; final exact-source artifacts/hosted gate pending |
| 6 — Handoff/continuity | In progress | This durable checkpoint established; final evidence pending |

## Pre-flight interfaces and rulings

- Task 1 snapshot feeds Tasks 2–4: `{state,targetOn,progress,generation}`;
  progress means displayed reveal, not authoritative flight progress.
- Tasks 2–3 expose one browser-local power command; data rendering remains
  live underneath masks. No synthetic flight state for sweeps/blanking.
- Task 4 local `canPlay()` gating defaults true; family pages must never
  mount primary power state, masks, control or sound suppression.
- Ruling: use this tracked repository ledger as the durable checkpoint in
  addition to any ignored execution scratch — Joey explicitly requires
  recovery after scratch loss; otherwise completed work could be lost.
- Skill helper resource `test-driven-development/writing-good-tests.md`
  could not be read via the cloud resource locator. Main TDD instructions
  were read completely; do not claim the additional resource was read.
- Execution helper `scripts/task-start` likewise unavailable via cloud locator;
  use this tracked ledger and direct brief/test execution rather than inventing
  a filesystem skill path. Ruling: standalone `test:display-power` is called by
  complete `npm test`, retaining the requested test coverage without extending
  the already long presentation command.
- Local Playwright 1.62.1 is available through the runtime; its Chromium and
  WebKit executables are absent. Standard browser download returned truncated
  archives. Trying an npm-packaged portable Chromium for supplementary local
  proof only; the required project-pinned hosted Chromium/WebKit gate remains.
- Portable Chromium 153 extracted successfully through the npm package.
  Package extraction had an incidental fonts `chown EINVAL`, but the extracted
  executable runs and the small official Playwright ffmpeg download succeeded.
  The package is test-only, not recorded in package.json/lockfile.
- Browser RED: missing primary switch assertion observed. First GREEN attempt
  passed primary newest-data/geometry/reversal checks, then portable single-
  process Chrome closed when the context was closed before family tests.
  Removing single-process prevented that failure; later captures timed out
  while shooting moving filtered SVG. Exact phase capture now uses Playwright
  virtual clock. Its screenshots/video are controlled-time fixture evidence,
  not a real-time performance benchmark. The later corrected run passed below.
- Follow-up capture diagnosis: Playwright actionability checks and settled-frame
  error proof require RAF advancement; when virtual time is paused, invoke the
  button through its actual DOM click handler, fast-forward phase timestamps,
  and resume the clock for HTTP-refresh and settled-frame assertions. A run using
  `runFor` remained expensive on this software renderer. Current diagnostic run:
  `/tmp/dadradar-power-browser-clock4.log` completed with exit 0 and the message
  "switch, newest data while off, geometry, reversals and family isolation passed."
  This is portable Chromium 153 / runtime Playwright 1.62.1 supplementary proof,
  not the required project-pinned dual-engine release gate.
- Removed full-map CSS blur: the live map has nested SVG filters, so additional
  whole-map blur produced costly offscreen rendering in portable Chromium.
  Raster/light catch remains aperture-local; no Pi performance claim. After this
  correction, `npm run test:display-power`, map lifecycle test, browser build and
  whitespace checks passed. Default browser capture remains enabled; optional
  `DADRADAR_POWER_CAPTURE=0` permits DOM-only diagnosis on slow renderers and
  records `capture:false` in geometry output. It is not visual acceptance.
- DOM-only follow-up exposed a capture-harness race: resumed virtual time could
  advance past the timestamp passed to `clock.pauseAt`. The harness now pauses
  at a timestamp 1000 ms ahead. `/tmp/dadradar-power-browser-dom2.log` completed
  with exit 0: primary control, server refresh while off, unchanged geometry,
  reversals and both family routes passed in DOM-only mode. Default visual
  captures passed on the prior recorded source tree; final candidate captures
  and pinned dual-engine gate remain mandatory.
- Actual 1920×1080, DPR 1 fixture images and WebM were produced by the corrected
  Chromium run under `artifacts/power/chromium/`; shutdown dot PNG was visually
  inspected. Files remain scratch-only until final preview persistence. No
  hardware performance, audio audition, whole-unit choreography or deployment
  approval follows from this map-only prototype.
- Ruling: final project-pinned Chromium/WebKit proof stays at the full release
  gate; do not substitute portable Chromium or claim WebKit ran locally.
- Task 3 phase-gating tests are drafted behind `DADRADAR_POWER_MECHANICAL=1`;
  the missing gate function was observed RED. Remove the temporary guard once
  Task 3 exists; do not leave mechanical acceptance opt-in in final tests.
- Task 3 gates are now implemented and the temporary Node/browser opt-in guards
  removed. Clock adapters retain raw live time separately; weekly adapters retain
  independent live modules; main flap rendering stores raw carrier/number/route/
  status targets and blanks only presentation. Fixed hardware/source PNGs remain
  unchanged. Local dark masks use actual DOM rectangles; registered top-lamp art
  gets independent opacity. Needle sweeps use additive CSS rotation, never fake
  flight state, and release the override on settled on/reduced motion/failure.
- Task 3 Ruling: blanking uses one native flap turn without intermediate alphabet
  characters or tile stagger, while ordinary/wake indexing keeps its original
  queue — necessary to fit shutdown's 2400 ms deadline — cost if wrong: shutdown
  cadence may need Joey's visual tuning, not tracking/layout changes.
- Task 3 Ruling: phase captures now advance virtual time in ≤100 ms samples,
  allowing mechanical timer/microtask queues to run before the deadline. A single
  large virtual jump incorrectly began wake indexing only at the final frame;
  the stronger newest-digit assertion caught this (`mechanical-targets.log`).
  Corrected `mechanical-steps.log` exited 0. Cost if wrong: fixture phase timing
  could differ from real-time playback; real-time review remains required.
- Task 3 evidence: `/tmp/dadradar-power-task3.log` full npm test exit 0;
  focused split-flap/clock/weekly/display-power tests exit 0;
  `/tmp/dadradar-power-mechanical-red.log` missing off blanking RED;
  `/tmp/dadradar-power-mechanical-steps.log` portable Chromium exit 0 with
  actual off blanks and actual newest flight digits/destination after wake.
  Paper/counter lighting is local masking, not newly extracted photographic
  lamp layers; its visual suitability remains unapproved.
- Mechanical source published `c7d36b59a010b1b1eb8ac323b656e32a1859ff23`,
  tree `20e81f6af058d5a16ea31f79d6f1c324bbbb27a4`. Default capture run
  `/tmp/dadradar-power-mechanical-capture.log` exit 0, 1920×1080/DPR1.
- Task 4: `display-power-audio` produces provisional synthesized relay/tube
  envelopes, with generation cancellation and failure isolation. Primary local
  guards default true when no power controller exists, so family behavior stays
  unchanged. Off-state altitude/ADS-B acquisition events are accounted for
  silently with no wake replay, without changing configured volume/preferences.
  Flap silence and chime/ident stop cancel ongoing sounds; map entry points have
  async canPlay/token guards; weekly scheduled oscillator sources are stopped
  while not on. New audio tests observed RED, then GREEN; original four audio
  suites passed; `/tmp/dadradar-power-task4.log` full npm test exit 0;
  `/tmp/dadradar-power-audio-browser.log` portable browser exit 0.
- Task 5: background wake directly to elapsed deadline initially exposed blank
  digits (`background-red.log`, RED). Main's final on event now settles latest
  flap targets immediately, invalidating stale flip completions, only at the
  transition boundary; ordinary on-state indexing remains unchanged. Recovery
  test reached/passed that assertion, then revealed a harness resize timing
  issue with paused virtual time. Native resize delivery is now tested while
  the clock is running, then phase capture resumes. `task5-browser.log` exited
  0 including background wake, reduced motion, resize and injected DOM failure.
- Task 5 Ruling: shared/unknown changes keep full coverage, and power is added
  to both engine workers, rather than a narrowed release — critical shared
  main/audio adapters justify broad consumers — cost if wrong: additional CI
  runtime, not missing regression coverage.
- Task 5 Ruling: map and counter apertures use the measured rectangle union,
  represented by disjoint row spans. Overlapping even-odd rectangles previously
  blacked the counter/map intersection; union helper tests observed RED→GREEN.
  Cost if wrong: aperture seams visible during transition; verify actual PNGs
  and the browser's point-in-fill assertion before acceptance.
- Final review template resource could not be read through the cloud package;
  main requesting-code-review instructions were read completely. Use one fresh
  reviewer with full spec/plan/range and Review Focus, not a claimed template read.
- Task 5/6 Ruling: perform fresh whole-branch review on the implemented candidate
  before final exact-source hosted gate/handoff — review fixes would otherwise
  invalidate an expensive source gate — cost if wrong: reviewer may identify
  outstanding evidence, which must remain explicit and be completed afterward.

## Preservation / verification boundaries

### October 10 final-review fix pass

Fresh whole-branch review of candidate `eacf11c3c17ba7a1f843f0f5d8a1173e02ce8504`
(tree `7febd289e63cbce9e729564313059f051b2c2d89`) found no Critical and three
Important issues. Accepted all three after source inspection and failing
regressions: the old multi-character flap queue continued after forced
settlement; skipped wake frames began new weekly/clock motion at the deadline;
same-generation terminal power audio left suspended envelopes alive.
One fix pass invalidates the complete flap queue, settles weekly canvas and
clock ink at terminal wake/failure, and stops audio before terminal early return,
including re-suspension after an earlier unlock. Targeted tests observed RED→GREEN.
The browser independently observed weekly `data-animating=true` at a skipped
deadline before the fix. Added an actual terminal-paint assertion, not just target
metadata. Also source-verified and RED→GREEN tested an already-playing map clack:
power settlement now calls the existing all-source audio stop, not motor-only.
Intermediate hardware geometry and a mechanics-phase PNG are now checked.

Ruling: terminal wake must display latest targets immediately; preserve ordinary
live indexing when no power transition is occurring. Cost if wrong: background
resumption can replay stale motion/sound. No new provider or mobile behavior.
Deferred Minor coverage: browser-level decode/autoplay failures and changed
instrument/brand values during off replacement are not independently established;
focused audio/state tests are not a substitute. Late-dot reversal and active
map-roll browser integration remain additional coverage, not verified physical
behavior. Full hosted gate and clean fixed-source captures are still pending.
The first stronger browser run passed weekly settlement but exposed same-frame
live clock observer painting after terminal settlement. RED→GREEN added a
one-frame settlement window; normal later minute rolls are not suppressed.
Real-time PNG inspection also exposed giant map placards on wake: scaling the
live SVG during CRT collapse corrupted camera/label rendered-bound measurements.
Ruling: use aperture clipping rather than scaling the live SVG, preserving actual
map measurement dimensions throughout. Added collapse-bounds browser assertion
and same-flight before/after viewBox assertion in real-time capture. The earlier
preview is rejected evidence, not an accepted visual. These remain in the single
review/capture fix pass; no second review requested. Latest remote checkpoint
`02ccfd93c818537ba40e3a755c024bb189d39647` includes initial review fixes, not
these later terminal-observer/aperture corrections; publish those after testing.
Do not claim all review/evidence tasks complete until those checks are recorded.

`agent/mobile-companion` and all backup/restore branches remain unchanged.
Power-state controller is published; local switch/CRT adapter is wired into
the generated browser build. Do not edit generated bundles. No replacement
artwork, deployment, physical monitor verification, or family visual acceptance.
Next: publish this candidate checkpoint, fresh whole-branch review and one
test-first important-fix pass; then exact-source full hosted gates and clean-source
captures. `scripts/display-power-preview.js` captures a real-time cycle and actual
production synthesized envelopes as offline WAV audition; run only after the
candidate source is clean and record its provenance. Persist final previews and
append dated continuity without erasing history. No merge/deploy until Joey's
rendered approval. Do not treat fixture/CI proof as Pi/physical/audio acceptance.
Update this section with exact task commits, RED/GREEN evidence, test outputs,
blockers, artifact links and next action as work advances.
