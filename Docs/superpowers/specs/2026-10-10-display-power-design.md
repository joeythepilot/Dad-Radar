# Unit 001 display power and electromechanical startup/shutdown

Date: October 10, 2026 (Eastern)
Status: proposed written design; implementation and deployment not started.
Working branch: `agent/display-power-2026-10-10`.
Verified source baseline: `94c193db4f7a5275eb0d31dc022f1d9c7c66f28c`.
Baseline tree: `d1803f5f4aeb001d31df61088b0792efb5b67652`.

## Intent and approval boundary

Joey requested photorealistic startup and shutdown animations, temporarily
controlled by a digital switch at the primary display's lower-right corner.
He approved display-only switching, uninterrupted tracking/mobile service,
preservation of all module geometry, an isolated development branch, and
visual review before deployment. This written design still requires review;
approval of the conversation is not approval of unrendered artwork or timing.

DadRadar remains a passive family appliance for Allison and Delaney, not an
interactive dashboard redesign. Power motion should suggest individual
electromechanical mechanisms, not a whole-screen slide or software splash.

The recovered October 4 discussion accepted the map CRT sequence for
prototyping. Other modules' choreography was proposed. This design carries
that distinction forward; every new rendered result needs Joey's review.

## Verified existing integration points

- `App/main.js` paints server-authoritative state and owns normal startup
  visibility. Boot diagnostics and deployment refresh are independent.
- `App/clock-drums.js`, `App/instrument-wheels.js`, `App/weekly-ticker.js`,
  split-flap rendering in `App/main.js`, and map transport already animate
  live values. Reuse them, do not replace their state sources.
- `scripts/build-browser.js` builds the primary bundle; generated outputs
  are not hand-edited. Family pages reuse the primary HTML with
  `html[data-family-full]`, so explicit primary-only gating is mandatory.
- Existing fictional `scripts/display-browser-fixture.js` provides actual
  production HTML without contacting flight/calendar providers.
- Last documented independent home status is October 9, 09:33:46 Eastern,
  on the baseline SHA, healthy, instance `1791552800685-28924-jbh0id`.
  That is historical evidence, not a fresh October 10 host check.

## Architecture and boundaries

Introduce one browser-local display-power coordinator, not a new server
service. States: `on`, `stopping`, `off`, `starting`. The initial state is
`on` to preserve unattended boot and existing browser proofs. The new
sequence runs only on intentional switch commands in this first iteration;
automatic cold-boot choreography is a later explicit integration decision.

Provide one stable presentation command, `setDisplayPower(boolean)`, with
a read-only current-state accessor and a presentation-only state event.
The temporary button calls it. A future physical-switch bridge can call
the same command after separately authorized Pi integration. No GPIO,
OS shutdown, monitor power control, server route, or hardware wiring now.

The coordinator owns transition timing and cancellation. Module adapters
receive normalized transition progress and the current live display target;
they must not write simulated values into authoritative flight state.
Do not unmount/remount the dashboard, destroy maps, reset tracking,
clear sequence history, or pause calendar polling to turn the display off.

Off means a black visual field and disabled/hidden dashboard interactions,
with only a dim, keyboard-accessible power control still visible. Live
rendering and state adoption continue underneath, ensuring wake targets
the newest data rather than a captured flight snapshot. No persistent
off preference in this iteration: page reload recovers the ordinary on view.

## Visual treatment

Retain all approved PNGs, geometry, crop proportions, ink and hardware.
Fixed housings, brass fittings, glass and borders never travel with values.
Photographic flap texture moves with flap surfaces and characters. Where
current artwork has baked lighting, avoid pretending a global brightness
fade is independent lamp illumination; keep the original available and
prepare any needed registered dark/lit layers for separate visual review.

| Module | Startup | Shutdown |
| --- | --- | --- |
| Map aperture | Pinpoint bloom; raster catch; focus resolves into live map, no static | Vertical picture collapse; bright dot holds 300–500 ms, then fades |
| Split-flap | Existing indexing mechanism presents latest values; warm top lamps awaken | Blank through the mechanism; lamps extinguish; fixed hardware stays seated |
| Clock rows | Existing printed drums synchronize to current live time/ETA | Blank visible drums without changing the underlying time or ETA |
| Instruments | Presentation-only restrained needle sweep, then latest readings | Needles settle; illumination fades, no fabricated telemetry published |
| Poster/duty | Warm local illumination reveals stationary paper | Local lamp spill falls away |
| Sequence/seven-day wheels | Existing mechanical surfaces index; weekly reveal left-to-right | Weekly extinguishes right-to-left; live schedule remains intact |

Start with the map alone and switch, then integrate modules, then sound.
Use configurable deterministic stagger/timing constants, not random motion.
Nominal initial budget: startup 4–6 seconds, shutdown 2–3 seconds; these
are prototype choices, not measured or approved final durations.
Keep CRT effects confined to the map aperture and never scale its housing.
Existing operational map-roll remains exclusive to regional/airport changes.
If a map roll is active, conceal/settle its presentation safely before the
power reveal without manufacturing a transport command or altering route.

## Interruption, sound and accessibility

- A new switch command cancels old timers, frames and effects. Reversal
  begins from the current visual state; stale completions cannot win.
- Data received mid-transition becomes the settling target immediately.
- Reduced-motion uses a short illumination transition, no raster roll,
  needle sweep or prolonged mechanical choreography.
- No strobing or repeated high-contrast flashing. CRT dot remains restrained.
- Restore visibility safely if a visual adapter fails; keep boot failure
  reporting and deployment-refresh recovery available.
- Use existing user audio/volume controls. Power motion starts from an
  intentional gesture; sound failure must never block the visual sequence.
- Prevent transition-induced split-flap chatter or synthetic needle sweeps
  from triggering altitude chimes or station IDs. Existing operational audio
  remains unchanged. New mechanical/tube sounds require audition; never
  substitute the map gearmotor for a CRT startup.
- In local off mode, suppress this display's operational audio without
  changing server state or another viewer's sound preferences.
- Button has an accessible label, visible focus, adequate hit area and
  state feedback. It is overlay-positioned, not a new grid module.
- Gate control, visual adapters and local audio suppression off completely
  for `/mobile`, `/mobile/full` and `data-family-full` views.

## Verification and delivery

1. Record browser-measured baseline rectangles at exactly 1920×1080,
   including both clock rows and every neighboring module.
2. Test coordinator transitions, repeated commands, reversal, stale callback
   cancellation, newest-data wake, reduced motion and failure recovery first.
3. Test adapter isolation: no state/provider mutation, no false chime/ident,
   no map-roll replay, no change to ordinary indexing behavior.
4. Use the existing production-HTML fixture in Chromium and WebKit. Capture
   on, CRT startup phases, shutdown collapse/dot, off and interrupted wake.
   Record video for motion review; stills alone do not prove choreography.
5. Require equal pre/post settled module bounds, stationary hardware,
   aperture containment, preserved flap texture and clean asset/error logs.
6. Prove ongoing shared-state updates while off and unchanged mobile layouts,
   control absence and audio behavior on both full-family routes.
7. Run complete deterministic verification and the required project browser
   release gate on the exact implementation SHA before any later deployment.
   Test target Pi performance separately; do not claim it from desktop CI.

Publish implementation only to this experimental branch. Provide source SHA,
fixture/viewport provenance, stills and motion preview for Joey. Do not merge,
deploy, alter restore branches or modify the private control executor.
Family acceptance and physical monitor/Pi verification remain distinct from
automated browser evidence. Preserve continuity history in dated additions.

## Review checkpoint

The code inspection found no shared display-power lifecycle. This is a new
presentation subsystem, so written-design review precedes implementation.
After Joey approves this document, prepare the implementation plan and obtain
its review/execution choice before writing runtime code. No new animation is
represented as implemented, approved visually, or deployed by this document.
