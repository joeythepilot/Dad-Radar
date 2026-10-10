# Unit 001 display-power experiment — October 10, 2026

Status: original rendered candidate rejected by Joey. Revised motion/audio
candidate captured; local suite and latest exact-source hosted full gate pass. No family acceptance, merge or deployment. Historical evidence below
remains preserved and does not approve the rejected first result.

Branch: `agent/display-power-2026-10-10`. Original shared home/mobile source:
`94c193db4f7a5275eb0d31dc022f1d9c7c66f28c`.

Joey approved display-only switching, the written design, and native execution
of the implementation plan. He requested reliable new-chat continuation; the
tracked `Docs/Display-power-continuation.md` holds the full recovery prompt,
task evidence, source checkpoints and remaining work.

## Implemented behavior

- Primary-only lower-right 44×44 px accessible switch, outside the grid.
- Cancellable on/stopping/off/starting presentation coordinator: nominal 2400 ms
  shutdown, 5000 ms startup; reduced-motion 180 ms. Reload returns to normal on.
- Live map aperture collapse/dot/bloom/raster, with stationary housing. No static,
  map gearmotor substitution, new map snapshot, or operational transport command.
- Existing textured split-flap surfaces and printed characters index/blank;
  photographic housings/hinges remain fixed. Native top-lamp artwork is gated
  independently. No replacement artwork, stretching, resizing or tile changes.
- Both printed clock rows and seven weekly mechanisms retain independent live
  targets while blank; wake uses newest time/ETA/schedule. Weekly reveal follows
  left-to-right startup, right-to-left shutdown. Paper/counter reveal uses local
  measured masks; its photographic lighting suitability still needs review.
- Instrument sweep is an additive visual rotation; actual telemetry transforms,
  flight logic and altitude-chime state are never fed simulated readings.
- Local off audio suppression accounts for real events without wake replay.
  Synthesized relay/tube envelopes are provisional and require Joey's audition.
- Tracking, polling, server, sequence history and mobile continue unchanged.
  No GPIO, Pi/server shutdown, monitor power control or deployment integration.

## Evidence boundaries

Complete deterministic tests passed through the implemented audio/recovery
candidate. Focused tests observed meaningful RED→GREEN transitions; protocol
now requires power in Chromium and WebKit. Supplementary Linux Chromium 153
under runtime Playwright 1.62.1 passed server refresh while off, newest actual
flap targets, blank mechanisms, unchanged module bounds, reversals, long-pause
wake, reduced motion, native resize delivery, fail-open and both family routes.

Final application source `cbc020c3e63c2da892f1e196c2d55c7b1c30b480`, tree
`fb24b1cfc1842139bce770e75ec623c0809d3f8f`, passed full hosted run38062985341:
regression114244927409, Chromium114244927463, WebKit114244927367 and full
gate114247414174 all success. Project-pinned Playwright1.63.0. One fresh review
found no Critical and three Important issues, all fixed test-first in one pass.
Clean-source1920×1080/DPR1 native captures passed unchanged module/hardware
bounds, latest data while off, blanking, reversal, terminal recovery, reduced
motion, resize, fail-open and mobile isolation. Review ZIP contains geometry and
both real-time and separately identified virtual-clock captures.
Controlled-clock regression video is not real-time performance evidence.
The separate preview script uses real RAF/timers; its video is silent, with actual
production Web Audio offline-rendered WAV envelopes supplied separately.

No fresh MAXWELLHOUSE running-state check, Pi performance, physical monitor
inspection or family visual/acoustic acceptance is claimed. Production remains
untouched. Any later deployment requires Joey's approval and the established
exact-SHA deployment procedure.

Review downloads: `DadRadar-power-review-2026-10-10.zip` and
`DadRadar-power-preview.mp4`, with separate `starting-provisional.wav` and
`stopping-provisional.wav`. Silent H.264 video57.08s includes initialization and
capture waits; nominal startup/shutdown are5/2.4s. Capture timestamp
2026-10-10T15:18:12.351Z. Software-rendered browser performance is not Pi proof.
The original photographic assets remain unchanged. Full19 housing rectangles
and all measured module bounds match before/after; zero-sized display-contents
wrappers are not used as proof of module geometry.

Remaining acceptance: Joey's actual rendered choreography/photorealism and
provisional sound audition. Deferred integration coverage: browser audio
decode/autoplay/resume errors, changed instrument/brand values while off,
late-dot reversal and active map-roll interruption. Tests are not physical proof.
Do not merge/deploy until approval. Keep the experimental branch and workspace.
Complete continuity history receives AppendixAZ/edition3.29; recovery ledger
contains task history, important fixes, exact evidence and resume instructions.

## October10 realism correction — rendered review candidate

Joey rejected the first preview and sound as inadequate. Passing tests did not
establish the requested realism. Source CBC and its old silent video/separate
auditions are superseded for review, not approved or deployed.

Revised candidate published2346c23bff5918ef9c7d1d66f94c8bc6b7fc59e0,
captured local966ab12b4615c97d740feb5240ca109c97fce338 (clean).
Both file trees equal5d00cbaa6f7b14faf12848fef52c223da1e07c55; commit metadata
differs. Current shared production remains94c193d, freshly confirmed on GitHub.

Native textured flaps and clock/weekly mechanisms are now illuminated before
motion, then mechanically blanked before their lamps fall. CRT compresses a
reference of the full live map, preserving the measured source camera, then
expands from bloom/raster into focused glass. Registered incandescent spill
illuminates stationary paper; no replacement PNG or module geometry changes.
Power sound uses contact/housing resonance and transformer harmonics, clock/weekly
detents at mechanism events, and the existing native split-flap recording.

The software real-time video stream dropped intermediate pictures. It was
rejected, not shipped. The new9.6s MP4 uses20fps frame-stepped production DOM,
RAF/timers and native CSS keyframes at1920×1080/DPR1, with a1280×720 review movie
and full-resolution on/wake PNGs. Sound is offline production audio rendered at
the captured mechanical timestamps, including the existing sample at its5.195s
cue and0.68 volume. It is not real-time/Pi performance or physical acoustic
evidence. H.264 Baseline/yuv420p/AAC-LC/faststart; both streams decode without
error. PCM peak0.2273, no clipped samples; measured off pause is silent.

Full local npm test passed. The stronger native lamp assertion originally failed
because an extra180ms CSS transition ran independently of the coordinator.
Removing that transition passed the actual browser assertion, not a weakened
check. Captured module bounds and map camera compare equal; wake ends at3761.
Both engines/latest exact-source gate are recorded in the appended verification
checkpoint once complete. Provider data is fictional; current flight/weekly
fixture follows the real production normalized schema. No physical-monitor
verification, home health/installed-SHA check, mobile deployment or GPIO change.

Rulings: fixed source camera plus optical projection; lamps before motion;
mechanism-timed recorded/synthesized sound; explicitly controlled-time capture
when real-time software recording drops frames. Costs/limits and deferred browser
integration scenarios are enumerated in the review-package README. The new
rendered result still requires Joey's visual/acoustic review; do not infer
approval from this document or tests.

Final revised exact-source run38071475620 completed/success on2346c23:
regression114269650270, Chromium114269650251, WebKit114269650233 and aggregate
full gate114272198311 all success. Home contracts38071475669/38071474933 pass.
https://github.com/joeythepilot/Dad-Radar/actions/runs/38071475620
Review files are ready; family acceptance/deployment remain pending.
