# Mobile photographic walnut implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Reproduce Joey's approved warm satin walnut treatment as an independent mobile-only photographic layer, without installing the generated dashboard or altering approved mechanisms.

**Architecture:** Keep all existing modules as the source of geometry and live content. A separate wood renderer measures their existing trim and inter-module spaces, and mounts genuine photographic wood pieces behind them. Render on initial layout and resize only; retain the current display if assets fail.

**Tech stack:** Existing plain JavaScript/CSS, ES5-compatible production code, PNG photographic assets, existing Node tests and Playwright Chromium/WebKit release protocol. No new dependency.

**Spec:** Joey's October 14, 2026 in-chat approval of the corrected photographic walnut study, `exec-0cf3f389-07fc-43e9-86e5-d7b78bf88a61.png`. This approves wood appearance, not the generated instruments, text, paper, map or metal details. Physical material constraints come from continuity appendices K/BG and later corrections.

## Global constraints

- Preserve the exact deployed split-flap, clock and three instrument plate source bytes.
- Preserve all original tile, drum, colon, AM/PM, paper, poster, map and module rectangles; do not fit mechanisms to generated art.
- Walnut is warm and satin, with natural furniture-scale pores and grain following each separate physical piece.
- The plywood chassis reads as matte-black shadow; no exposed plywood edges.
- No resurrected faceplate chamfer/routed rebate, invented hardware, CSS wood gradients, nonuniform grain stretching, tiling or repeated edge pixels.
- The full generated dashboard is a color/joinery reference only, never a production asset.
- Primary desktop display, operational logic and family access remain unchanged.
- Portrait and landscape must be composed independently around their existing arrangements.

## Review focus

1. Rotation after loading: wood re-registers without moving or obscuring any module.
2. Small portrait and wide tablet: narrow rails remain plausible; no clipping or invented space.
3. Slow or failed image load: native usable display remains; no empty blocking overlay.
4. Layering: wood never covers photographic metal edges, labels, live ink or moving mechanisms.
5. Rendering cost and legacy APIs: no animation-loop painting, modern-only syntax or new dependency; physical iOS12 performance remains separately unverified.

## Task 1 — Geometry contract and independent photographic inputs

**Files:** Create `Mobile/wood-registration-test.js`, `scripts/fixtures/mobile-wood-baseline.json`, `assets/hardware/HomingBeacon_Mobile_Walnut_Source_v1.png` and `Docs/Mobile-walnut-materials.md`.

**Consumes:** Unchanged mobile DOM and the approved preview as material reference.

**Produces:** Immutable photographic source with documented grain directions/material regions; independent pre-wood DOM geometry fixture at 320x568, 390x844, 844x390, 768x1024 and 1024x768.

- [ ] Capture the current module/content rectangles and original artwork hashes before edits. Identify exactly which existing rails and gaps can accept wood. Do not enlarge gaps to imitate the mockup.
- [ ] Write failing tests for `planWoodPieces(regions, source)` returning destination/source rectangles and masks. Require positive sizes, equal X/Y source scale and no intersection with protected apertures; zero-sized regions return no pieces.
- [ ] Generate isolated photographic walnut stock/trim inputs using the built-in image tool, not a regenerated dashboard. Inspect the source at full size. Document any crop/mask operation and preserve originals. If photographic source cannot cover a measured piece without stretching or visible repetition, revise the source rather than the live geometry.
- [ ] Pin the selected source hash and test genuine material/alpha samples. Do not call it approved production wood until its mounted appearance has been inspected.

## Task 2 — Mobile-only registration and mounting

**Files:** Create `Mobile/wood-registration.js`; modify `Mobile/layout.js`, `Mobile/layout.css`, and the existing `package.json` family-test command.

**Consumes:** Task 1's measured region contract, source and tests.

**Produces:** `window.DadRadarMobileWood.start()` and `.fit()`; exported Node-testable `planWoodPieces(regions, source)`.

- [ ] Run the new tests and observe the expected missing-implementation failure.
- [ ] Implement isolated photographic rendering using uniformly scaled source regions, bounded crops and precise transparent masks. Keep photographic depth/detail in the image; do not fake wood with CSS gradients. Document how joints/end treatments preserve the approved square-edged appearance.
- [ ] Load only from the mobile mount, fit after existing layout, and repaint only on initial load/resize. Clear complete integer canvas backing stores before redraw. Do not modify the existing metal renderer's source or mechanism fitting.
- [ ] Hide only superseded decorative trim paint when wood is successfully mounted; never change layout-affecting box dimensions. Asset failure leaves existing trim/display intact.
- [ ] Run `node Mobile/wood-registration-test.js`, full `npm test`, and `git diff --check`; commit only after success.

## Task 3 — Actual mounted visual and release verification

**Files:** Create `scripts/mobile-wood-browser-proof.js`; extend the family branch of `scripts/component-browser-test.js` to call it; update `Docs/Mobile-walnut-materials.md` with evidence.

**Consumes:** Mounted production assets and the independent pre-wood geometry fixture, not a generated full-screen replacement.

**Produces:** Inspected actual-browser screenshots, invariant checks and a traceable candidate commit.

- [ ] Before implementation, write a browser check requiring mounted photographic wood and confirm it fails against the no-wood baseline.
- [ ] Compare actual content/module rectangles and all protected source hashes against Task 1. Test all five baseline sizes, 430x932/932x430 and rotation back to 390x844. Assert unobscured apertures, no viewport clipping, uniform grain scale, and no changed primary requests/layers.
- [ ] Exercise slow/failing asset requests and confirm the usable original fallback. Check no page errors and no accumulating pixels across repeated rotation.
- [ ] Inspect full-size actual mounted portrait/landscape/tablet screenshots beside the approved study. Reject wrong grain scale, thick cartoon trim, poor joints or obscured metal even if tests pass. Present the real mounted result clearly distinguished from generated art.
- [ ] Run the complete deterministic suite plus hosted exact-SHA Chromium/WebKit gate under the existing release protocol. Never reuse a passing result for a different SHA or weaken checks to match changed mechanisms.
- [ ] Release only under the existing authorized home-control workflow, with exact-SHA deployment, changed server instance, independent healthy status and continuity update. If a material visual compromise is needed, discuss it before release.

## Review gate

Approved execution method: Norah implements directly in this session. Joey approved this plan on October14,2026 at23:40 Chicago. Keep changes confined to the mobile wood layer and its proof.
