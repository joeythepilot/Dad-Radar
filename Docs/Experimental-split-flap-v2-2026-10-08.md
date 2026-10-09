# DadRadar split-flap asset rebuild v2 — October 8, 2026

Review-only follow-up on experiment/photoreal-flap-2026-10-08, base experiment697a3499479c1ebfef16be2ee2366c0bcde7eaea. Production and restore baseline remains f0022d6067768a4f2ac2e51f4bb08168fb30c184. No merge/deployment or physical monitor approval.

## Corrections

ImageGen built an unlit version of the supplied photographic master and a separate uninterrupted opaque charcoal card material. These are independently authored inputs, not renamed crops from the flattened illustration. The exact prompts and original source outputs are retained. No lamps, frame, hinge, bevel or seam pixels occur in the moving material.

The fixed housing is rebuilt by shortening straight rails while retaining side frames/corners at1:1. Complete hinge assemblies are shifted105 source pixels to align the mechanical joint at50%, preserving their dimensions. A separately registered fixed seam sits at y757. The826×1514 production canvas matches the70.28125×128.875px native tile aspect within0.043%, eliminating the prior global horizontal hardware compression. Straight rail texture reconstruction is explicitly part of this asset rebuild; the dashboard tile itself is never resized or moved.

The fixed PNG has genuine transparent card apertures. The continuous material PNG is fully opaque; upper/lower reference PNGs share one exact boundary. CSS continues to use the same full continuous material at100%×200% on native moving/stationary halves. There are no duplicate card-edge lines to rotate and no hinge fragments to move. The stationary aperture lip is owned by the fixed housing.

Independent warm-lighting.svg and equivalent RGBA PNG contain only light, not dark material/hardware pixels. The existing ::after opacity,180ms fade and blank/off behavior control this registered layer. The unlit material/header has no baked incandescent hotspot. The measured header average changes from RGB[113.54666666666667, 92.32666666666667, 62.12444444444444] on to RGB[29.84888888888889, 29.78, 29.793333333333333] off; off is neutral dark gray. This proves the rendered warm pool disappears rather than only asserting CSS opacity.

## Scope and verification

Only the original first primary flight-number tile uses v2 artwork. Number3 at rest, printed ink, App/main.js, original3→4 native animation timings, geometry, remaining17 tiles, other groups/modules, audio/tracking and mobile remain unchanged. Exact comparison covers46 rendered rectangles. Original approved PNG identity, split-flap state/audio/printed ink tests and diff --check pass. Focused browser proof passes both internally and in independent review; no important implementation blocker was found. Final asset alpha/light/native aspect assertions pass. The100ms motion capture no longer shows the prior doubled upper edge; brass hardware stays stationary. No full release gate or new WebKit proof is claimed.

Screenshots: unchanged base before.png, v1-rest.png reference, v2 experimental-rest.png, real indexing at100ms experimental-indexing.png, blank lamp off and v2-comparison.png. Full dashboard captures remain1920×1080/DPR1, Playwright1.63.0/portableChromium153.0.8010.0, existing fictional ORD→AVL3761 fixture. Browser clock is fixed at2026-10-09T02:35:00Z for reproducible paired comparisons. Motion uses a paused native CSS timeline for capture, with no production timing/function changes. Crop is taken from the actual indexing dashboard PNG. No physical-monitor fit or family acceptance is inferred.

## Asset contract and handoff

assets/split-flap/experimental-v2 contains unlit-master.png and card-material-source.png inputs; experimental-fixed.png; experimental-surface.png; exact upper-flap.png/lower-flap.png references; warm-lighting.svg and warm-lighting.png; layer-contract.json with source coordinates, native aspect and hashes. scripts/prepare-experimental-flap-v2.py deterministically reproduces the registrations/masks from these inputs. Source outputs came from the built-in ImageGen tool; the engineering masks/registration and illumination layer are deterministic. The prompt set is included in the handoff.

Assessment: the identified layer compositing, baked-light and global aspect-compression defects are corrected in this revision. The image sources are still generated, and the artwork is **pending Joey's rendered visual review**, not approved or deployed. Small stationary rail texture joins can be inspected at enlargement; no moving hardware or edge artifact was observed at native size or the captured indexing frame. Retain the original production implementation until approval.
