# Unit 001 display-power experiment — October 10, 2026

Status: implemented, reviewed and full exact-source gate passed; preview ready
for Joey's visual/acoustic review. Not merged, deployed, or accepted by family.

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
