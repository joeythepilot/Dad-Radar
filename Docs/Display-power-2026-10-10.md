# Unit 001 display-power experiment — October 10, 2026

Status: implemented experimental candidate; review and final release evidence
pending. Not merged, deployed, or accepted visually/acoustically.

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

Final candidate Chromium/WebKit project-pinned hosted verification, clean-source
1920×1080 captures, fresh branch review and user-facing persisted previews remain
pending. Controlled-clock regression video is not real-time performance evidence.
The separate preview script uses real RAF/timers; its video is silent, with actual
production Web Audio offline-rendered WAV envelopes supplied separately.

No fresh MAXWELLHOUSE running-state check, Pi performance, physical monitor
inspection or family visual/acoustic acceptance is claimed. Production remains
untouched. Any later deployment requires Joey's approval and the established
exact-SHA deployment procedure.
