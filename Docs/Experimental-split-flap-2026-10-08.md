# DadRadar Unit 001 — experimental split-flap artwork, October 8, 2026

Status: **review only; not production approved, merged or deployed.**

Repository: joeythepilot/Dad-Radar. Base production branch agent/mobile-companion and restore branch backup/pre-airline-logo-flap-2026-10-08 both verified at `f0022d6067768a4f2ac2e51f4bb08168fb30c184`. Restore branch is untouched. Experiment branch: `experiment/photoreal-flap-2026-10-08`.

## Continuity and deployment

The complete continuity source through Appendix AS (edition 3.22) and the previously reconciled October 4 v4.3 updates were read. Existing approved layout, square clocks and lower clock bottom alignment remain unchanged. GitHub restore and production refs were fetched before work. Latest home-control issue is status #194, run 37867202396, job 113616646508: the retrieved status log at 2026-10-09 00:55:25 UTC records installed/upstream/running SHA f0022d6, instance 1791507284453-20548-ik8vji and a running runner service. No later deploy issue was found. This is the latest recorded independently verified deployment, not a fresh physical-monitor observation. No home-control command, restart or deployment was issued during this experiment.

## Every supplied PNG inspected

All eight images were decoded, alpha-audited and visually inspected together on a dark background. Bounds below are nonzero-alpha extents on source canvases, not tile layout bounds.

| File | Dimensions | Alpha range | Nonzero-alpha bounding box (left,top,right,bottom) |
| --- | --- | --- | --- |
| blank-tile-49x129.png | 49 × 129 | 105–255 | [0, 0, 49, 129] |
| blank-tile-master.png | 607 × 884 | 0–252 | [0, 0, 607, 884] |
| center-seam.png | 607 × 884 | 0–250 | [59, 477, 545, 490] |
| hinges.png | 607 × 884 | 0–251 | [37, 445, 572, 523] |
| housing.png | 607 × 884 | 0–252 | [0, 0, 607, 884] |
| lower-flap.png | 607 × 884 | 0–251 | [59, 484, 545, 820] |
| upper-flap.png | 607 × 884 | 0–252 | [59, 156, 545, 483] |
| warm-lighting.png | 607 × 884 | 0–33 | [19, 59, 589, 401] |

Master and all separated layers never reach alpha 255; they do not constitute clean opaque production surfaces. Housing retains the photographed illumination, fixed hardware and cropped card boundary. Upper/lower assets retain portions of hinges, so using them unmodified would move fixed hardware. Center seam spans y477–490, with working datum y483 (54.638% of master height); existing browser mechanism pivots at 50%. Hinges overlap other layers. Warm-lighting is a low-alpha additive wash, not an isolated source that can remove the baked highlight. The 49×129 preview has no fully transparent pixels and visibly compresses the illustration; it was not used as the texture.

## Controlled implementation

Only 20 appended CSS lines alter the primary first flight-number tile. Production App/main.js, flight-number logic, printed ink, flip function, animation keyframes/timing, audio and tracking are byte-unchanged. All other groups/tiles and modules retain their current artwork/layout. `html:not([data-family-full])` excludes the full mobile companion. No airline logo, bank resizing or mobile change is included.

Rather than stacking the overlapping supplied separations, two deterministic masks are derived once from master pixels: experimental-fixed.png and experimental-surface.png. The master is split at y483 and resampled to y442 on its 607×884 canvas, registering the existing 50% animation pivot. Hardware mask keeps housing, complete hinge footprints and seam stationary in the existing ::before layer. Complementary surface mask feeds the unchanged stationary/moving halves, with their existing 100%×200% background mapping. No pixels are painted or generated. Source alpha is retained. The Python preparation script and all eight original hashes are committed for reproduction; the supplied ZIP remains authoritative for input bytes.

Selected tile actual rectangle: **x47.84375, y47.734375, width70.28125, height128.875 pixels**. Everything stays at its original position. Fitting 607×884 art into this existing rectangle compresses horizontal proportions about 21% relative to source; the piecewise registration additionally adjusts upper/lower vertical proportions. This is an explicit adaptation for the experiment, not a claim of unchanged artwork proportions.

## Tests and capture provenance

Playwright 1.63.0, portable Chromium 153.0.8010.0, headless Linux; viewport1920×1080 CSS pixels, DPR1. Project production browser build and unchanged display-browser-fixture.js serve fictional EN ROUTE ORD→AVL flight3761. Browser clock fixed at 2026-10-09T02:35:00Z for repeatable paired comparisons. All full dashboard PNGs are1920×1080. No physical monitor verification.

A test first failed on the baseline with missing experimental stationary hardware. Final focused browser proof passes: exact equality of every measured tile/group/module rectangle, only one primary tile changed, remaining17 tile backgrounds original, unchanged moving-half textures/printed3→4,190ms top/bottom motion with185ms bottom delay, fixed hardware transform none, cleanup and return to3, blank lamp overlay opacity0, original mobile artwork, and existing browser-error observer. Additional passing checks: split-flap state, audio, printed ink, original approved artwork identity, fixture contract and git diff --check. No full release gate or new WebKit proof is claimed. Pixel comparison finds all static regions outside the selected tile unchanged; 2,194 differing pixels are confined to the existing aircraft/pulse at x1003–1063,y591–652, captured at different animation phases. Geometry comparison covers46 actual elements, including all modules and clock windows.

before.png is from the unchanged base checkout; experimental-rest.png retains original number3. experimental-indexing.png uses the real flip function with CSS animation timelines paused at100ms for capture; production timing/function are unchanged. Its close-up is cropped from that full screenshot, avoiding element-screenshot stability waiting. close-up-comparison.png shows originals at actual size plus nearest-neighbor enlargements. experimental-blank-lamp-off.png records the unresolved baked-light behavior. animation-results.json records assertions and native transform evidence; baseline-geometry.json records measured bounds.

To reproduce: build the base and experiment browser bundles, then run scripts/experimental-flap-browser-test.js --baseline with DADRADAR_BASELINE_REPO pointing at unchanged f0022d6 checkout and DADRADAR_ARTIFACT_ROOT pointing at a shared output directory. Run again without --baseline on the experiment checkout. DADRADAR_BROWSER_EXECUTABLE can select an available Chromium binary.

## Production assessment

**Promising appearance at rest; unsuitable as a production drop-in from these extracted layers.** The deep surfaces, textured metal and brass look visibly closer to the approved illustration at actual size. Housing and hinges remain stationary and the existing numeral and indexing mechanism work. However:

1. Warm overhead light is baked into the fixed photograph and remains visible with the existing blank/off lamp. The opacity assertion does not establish photographic light-off behavior.
2. Rectangular masks lack independently photographed card underlap and hinge occlusion geometry. During the100ms frame the moving top card produces a doubled upper-edge line and narrow texture/alpha transitions near the hinges. This is visible in the real indexing close-up, not a new geometry problem.
3. The source alpha is partially transparent everywhere and cannot simply be stacked without changing brightness. One-pass complementary masks avoid gross layer duplication, but anti-aliased registration edges still deserve true layered-source cleanup.
4. The current tile is narrower in proportion than the illustration; preserving the dashboard geometry requires aspect adaptation. Do not silently expand the bank to hide this.

Recommendation: keep this isolated branch for Joey's review. Obtain genuine unlit housing/fixed hardware and clean independent card fronts/undersides with an isolated illumination layer before production consideration. Do not roll out to remaining tiles or deploy based solely on this experiment. No approval or family acceptance is inferred.
