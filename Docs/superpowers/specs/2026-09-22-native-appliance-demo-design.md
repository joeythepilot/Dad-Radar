# DadRadar native appliance: first rendering proof

- Date: 2026-09-22
- Status: Proposed written specification; awaiting Joey's review.
- Repository: `joeythepilot/Dad-Radar`
- Development branch: `agent/native-appliance`
- Inspected source baseline: `669bf0e92b701ae43085afd8ae191ffcd4513fa5` on `agent/mobile-companion`.

## 1. What we are building, and why

DadRadar is a living appliance for Allison and Delaney: a window toward Joey when he is away, not a dashboard that asks the family to operate a computer. The physical home unit is the product. The mobile companion remains useful but secondary.

Joey wants standalone software with its own native display, not the existing web page inside an executable. This migration must preserve the machine the family already knows: its photoreal hardware, aged paper, mechanical movement, sound, and trustworthy flight state. It must also provide a foundation for deliberately choreographed startup and shutdown later.

The first deliverable is a separate Windows demonstration executable. It proves that native rendering can reproduce the difficult visual and mechanical elements before we undertake the whole display rewrite. It is not a replacement home installation and is not advertised as a finished native DadRadar.

In plain English: build the new display mechanism beside the working one, compare them using the same artwork and test conditions, and proceed only if the new mechanism earns its place.

## 2. Decision and alternatives

Use **Qt Quick with C++** for this rendering proof. QML describes the native scene and its behavior; it is not HTML. Do not include Qt WebEngine, Chromium, a WebView, an Electron renderer, or an embedded browser as a compatibility shortcut.

Qt's native scene graph is the reason to test this approach, not a promise that our existing visuals will automatically become faster or sharper. The map, layered textures, animation, and audio must be measured and inspected in the actual implementation. See the [Qt Quick scene graph documentation](https://doc.qt.io/qt-6/qtquick-visualcanvas-scenegraph.html).

Alternatives considered:

- A browser-backed wrapper would preserve more display code, but fails Joey's explicit browser-free display requirement.
- A game engine could also render a genuinely native appliance. Reconsider it if the Qt proof exposes an unacceptable limitation; do not start two competing rewrites.
- A Windows-only UI framework would narrow future hardware options. Windows is the first target, but the design should not gratuitously prevent a later embedded-Linux evaluation.

No Raspberry Pi selection, embedded deployment, performance gain, or toolchain availability is assumed. Pin the Qt release, compiler, modules, and build tooling in the subsequent implementation plan after checking supported combinations. Review the selected dependencies' licensing and deployment requirements before distributing a packaged build.

## 3. Boundaries that must not change

- Keep one authoritative server flight state. The native display must not become another flight-acquisition or arrival-detection system.
- Keep Google Calendar as the planned schedule authority and preserve the existing provider policy, credentials, saved state, and operational behavior.
- Preserve Eastern family-time presentation, the seven overnight bays and their 6 AM rollover, existing HOME behavior, and the already tracked commute. Native migration is not an opportunity to reinvent these features.
- Preserve the approved display composition, including the twin clocks, instrument rail, lower-left active-sequence housing, map hardware, and weekly bays.
- Preserve the physical visual language: original artwork, imperfect printed lettering, individual warm flap lights that extinguish on blank tiles, aged cream paper, deep-blue water, and graphite historical paths.
- Keep the maintained `agent/mobile-companion` branch and the running MAXWELLHOUSE installation unchanged during this proof. Do not alter startup tasks, display launching, control workflows, ports, packaging, or the home-control executor.

This specification describes proposed work. Its source baseline is not a fresh assertion about the SHA currently running on the physical unit.

## 4. What the first executable includes

The proof uses a fixed 1920 x 1080 reference composition and the existing module coordinates. Native window scaling must preserve aspect ratio and layout. A developer diagnostic view may expose measurements outside the faceplate; it is not part of the family-facing design.

Three rendering areas are in scope:

| Area | What must be demonstrated |
| --- | --- |
| Split-flap | One complete existing row, its photoreal tile artwork, printed glyph treatment, mechanical transitions, per-tile warm lighting, blank-tile lights off, and coordinated sound. |
| Wheel readouts | All seven weekly bays, including static weekday labels and rolling HOME/airport readouts, plus one representative instrument wheel readout. Reproduce texture, clipping, shading, and legibility at the existing sizes. |
| Moving map | Existing regional and airport map examples with paper, geography/terrain, labels, route, airport plaques/pointers, aircraft, and fixture weather. Demonstrate the established roll transition while the surrounding hardware remains stationary. |

Unported portions may use explicitly identified static reference artwork in the comparison scene. Do not present those portions as implemented controls. A prerecorded video, browser capture playing as an animation, or a screenshot of the whole app is not evidence of native rendering.

Use deterministic, non-sensitive fixtures to exercise populated and blank flaps, text-length changes, HOME and airport wheels, idle periods, route changes, and map rolls. The proof does not contact flight providers, read credentials, request live home state, or create a second live backend.

Final theatrical startup/shutdown artwork, every instrument, duty-card behavior, posters, live schedule handling, and a complete production installer are outside this first proof. Their exclusion limits scope; it does not remove them from the eventual appliance.

## 5. Reuse the artwork, port the presentation

The inspected app contains DOM, SVG, canvas, animation-frame, and browser-audio rendering code. These presentation components need native equivalents. The migration is not merely changing the launcher.

Relevant existing sources include:

- `App/weekly-ticker.js`, `App/printed-glyphs.js`, and `App/printed-ink.js`.
- `App/route-map.js`, `App/map-roll-transition.js`, and `App/map-roll-audio.js`.
- `assets/hardware/approved-map-artwork.json` and the hardware artwork directories.
- `assets/split-flap/`, `assets/lettering/`, `assets/maps/`, and `assets/audio/`.

Create an explicit asset manifest for the proof from the actual assets at the chosen baseline. Preserve their provenance, hashes, and license notices. Use source-resolution images; do not regenerate artwork, upscale reduced images, replace printed lettering with a platform UI font, or substitute CSS-style approximations for physical parts.

`App/printed-glyphs.js` already contains reusable glyph outlines. Native presentation may require a documented conversion of those outlines, map fonts, SVG styling, masks, or texture effects. Verify these conversions visually; do not assume that a native SVG loader reproduces every browser effect. Build-time derived files must remain traceable to their originals.

Existing map-roll audio includes base64-encoded source files. A build-time conversion may decode those locally into normal audio resources. Do not print or transport their contents through conversational output. Preserve the existing sound design.

Texture and offscreen-render target resolution must account for display scaling. Inspect text and artwork at Windows 100%, 150%, and 200% scaling, recording both physical resolution and scaling. A larger source PNG alone is not proof of sharper rendered text.

## 6. Component responsibilities and data boundary

Keep presentation separate from operational decisions:

| Component | Responsibility and boundary |
| --- | --- |
| Native application shell | Own the window, asset loading, native event loop, controlled exit, and developer diagnostics. It does not acquire flights. |
| Fixture source and adapter | Supply repeatable display inputs. Translate fixture fields into presentation properties without inferring flight events. |
| Visual modules | Draw and animate flaps, wheels, and map layers from those properties. They own visual transition state, not flight state. |
| Animation/audio coordinator | Coordinate mechanical movement and sound using native timing. Stop or settle pending effects predictably on exit. |

The eventual live connection should consume the existing server's `/api/state` publication. Inspection found `server/index.js` reading `masterState.read()` for that endpoint; display reads do not initiate upstream provider requests. The browser's `services/calendar-state-controller.js` already checks published state and preserves the last state on a failed read rather than inferring an arrival.

Phase-one fixtures should document the subset of that publication they represent, including revision/freshness where used. Do not change the endpoint for the demo or silently invent a competing contract. Connecting to the live engine is a separate milestone with its own contract tests.

Retaining a local Node-based operational engine is compatible with the native-display goal: the requirement is a browser-free display, not an immediate rewrite of every working subsystem in C++. The completed product must eventually package and manage its required runtime; it must not depend on the family opening a terminal. That production packaging is not claimed by this fixture-only executable.

## 7. Lifecycle and failure behavior

The shell must distinguish loading, ready, running, and closing. A loading sequence cannot imply that live flight information has arrived; this proof only has fixtures.

Missing essential artwork should produce an actionable developer error without hanging the process or silently substituting a new design. An unavailable audio device must not prevent the visuals from running. Closing during a flap change or map roll must release resources and exit without an orphan process.

Exercise simple startup and close hooks to establish the foundation for later choreography. Do not design the final animated events in this phase. A graceful application exit can be animated; an abrupt power loss cannot be guaranteed to show an animation. Closing a future native display must not casually terminate a shared engine that still serves the companion display.

## 8. Verification and acceptance

Prepare matched reference captures from the current browser display using the same selected fixtures, artwork, resolution, and animation positions. Browser automation is permitted to capture that reference; no browser engine may run inside the native executable.

The rendering proof passes only when all of these are evidenced:

1. **Actually native:** inspect build dependencies and the running packaged process to confirm the display contains no browser engine or web renderer.
2. **Visual fidelity:** compare settled frames and representative transition frames. Hardware placement and module dimensions must match. Printed lettering, map labels, paper/water treatment, reflection layers, and individual flap lighting must survive the port. Joey's visual review is required; automated pixel differences alone cannot approve the appearance.
3. **Readable at physical scale:** inspect the stated Windows scaling settings without judging only enlarged screenshots. Do not claim physical-kiosk confirmation unless someone actually observes that display.
4. **Smooth enough for an appliance:** target 60 frames per second at the reference resolution on the identified Windows test machine. Record hardware, graphics backend, frame-time distribution, missed frames, and CPU/memory use during flap and map activity. Missed-frame bursts require investigation, not an unsupported claim that native must be faster.
5. **Stable repeated motion:** run at least 100 scripted flap/map transition cycles and a 30-minute local fixture run. Check memory after warm-up for persistent growth, timing drift, freezes, and overlapping or stuck sounds. These are development tests, not a request for ongoing remote monitoring.
6. **Predictable failure and exit:** test missing artwork, unavailable audio, and exit during motion. Report observed results and any limitations.
7. **No home-unit side effects:** no deployments, changes to the maintained application branch, provider requests, credential accesses, or modifications to the running installation.

Windows verification is required for a Windows proof. Linux development or screenshots are useful supporting evidence but do not satisfy that requirement. If Windows execution is unavailable, report the blocker and stop short of claiming the native proof complete; do not reconfigure MAXWELLHOUSE to manufacture test access.

## 9. Deliverables and decision after the proof

The subsequent implementation should add a clearly separated `native/` subtree, fixtures, the asset manifest/conversions, focused tests, and native build/run instructions. Native commands must not replace existing npm entry points or deployment workflows. Deliver a runnable Windows executable with its required application libraries/resources; a single physical `.exe` file is not required.

Include comparison captures and a concise verification report identifying which areas are implemented, which remain static references, the Windows environment, performance results, limitations, and visual-review status.

If the map, text, or mechanical motion cannot meet the acceptance bar, stop and reassess the renderer before porting the remaining display. A successful proof permits planning the next stage; it does not authorize a home-unit cutover.

The intended sequence afterward is: connect the existing authoritative engine; port the remaining display modules; implement production lifecycle and packaging; validate extended operation; then obtain explicit approval for a reversible home installation. Keep the working display available until that installation is verified. The mobile companion remains supported without becoming the migration's focus.

## 10. Continuation record

- Joey approved beginning work on a separate branch in the existing repository after discussing a genuinely native display.
- This commit is documentation only. No native scaffold, dependency installation, renderer, executable, or deployment is included.
- The written specification still needs Joey's review. After approval, write the implementation plan and obtain review of that plan and the execution method before building.
- Future chats must inspect the actual branch and worktree before using this document as a progress report. Update this record with approvals, verified milestones, and unresolved limitations as work proceeds; never confuse proposed work with completed work.
