# Airline logo split-flap experiment — October 9, 2026 UTC

Allison and Delaney requested a recognizable passenger-facing airline mark next
to Daddy’s flight number. Joey authorized a focused 19-tile arrangement and
requested eventual deployment to both Unit 001 and the mobile companion.
Rendered family acceptance and deployment approval remain pending.

## Restore and source evidence

- Starting source: agent/mobile-companion at 1024133e5a0b8123c19b4049fa83b43cad5ac2fb.
- Independently verified running artwork release: 6d99c740a2b19ce9cbe0fa8cc22bc6e448fe48fe;
  healthy MAXWELLHOUSE instance 1791519967758-9500-4vo6bf at 2026-10-09T04:26:44Z.
- New restore branch backup/photoreal-flap-before-airline-logo-2026-10-09 points to
  that deployed artwork release. The older backup/pre-airline-logo-flap-2026-10-08
  remains untouched at f0022d6067768a4f2ac2e51f4bb08168fb30c184.
- Work is isolated on experiment/airline-logo-flap-2026-10-09. No production merge,
  home deployment, restart, or mobile deployment is authorized by this review record.

## Measured geometry

Production fixture, primary 1920×1080, DPR 1, Chromium 153.0.8010.0, Playwright
1.63.0. All measurements are CSS pixels relative to the display, not physical
monitor verification. Previous cards varied slightly by flex rounding.

| Group | Before x / width | After x / width | Count |
| --- | --- | --- | --- |
| Flight | 47.84375 / 291.5 | 47.84375 / 345.453125 | 4 → 5 |
| Origin | 387.203125 / 217.875 | 441.15625 / 205.890625 | 3 |
| Destination | 652.9375 / 217.875 | 694.90625 / 205.890625 | 3 |
| Status | 918.6875 / 585 | 948.671875 / 554.796875 | 8 |

All 19 new cards measure 66.328125 × 128.875. Their y remains 47.734375 and
bottom 176.609375. The internal gap remains exactly 3.453125; the three physical
group gaps remain exactly 47.859375, 47.859375, 47.875. No fourth group gap exists.

The original sum of card widths was 1263.90625. Exact mathematical target:
(1263.90625 − 3.453125) / 19 = 66.33963815789474. An equal CSS width must resolve
to the browser’s 1/64px layout grid: 66.328125. Its 19 cards finish 0.21875px
inside the original allocated envelope (right edge 1503.6875); that residual
is explicitly retained at the end, never redistributed into group gaps.
The existing whole-display position, vertical bounds and all neighboring module
rectangles remain unchanged. This quantization discrepancy is disclosed for review.

Phone portrait, phone landscape and tablet retain every neighboring module
rectangle. Each layout uses one common tile width; former tile height, typography,
strip allocation and internal gaps are retained. Native subpixel rounding leaves
less than 0.125px variation in mobile horizontal registration/group gaps.

## Artwork and behavior

The deployed V2 photographic card material, V4 stationary housing PNG and V3
rectangular overhead lamp source bytes are unchanged. The housing uses two
uniformly scaled left/right crops so hinges/corners are never stretched
horizontally. The card texture and lamp also scale by height and crop horizontally.
The original native flip halves, 190ms animation, 185ms bottom delay, blank/off
lighting, printed character wear and audio controller remain.

Seven original vector marks and their source URLs/SHA256 checksums are recorded in
[assets/airlines/sources.json](../assets/airlines/sources.json). JetBlue and Alaska
use official reversed white artwork for the charcoal surface. American, United,
Delta, Southwest and Allegiant use original vector paths from the immutable
AirTrail airline collection; these are mirrored assets, not claimed direct
downloads from airline brand portals. United’s white rectangular backdrop was
removed; its blue vector path remains intact. All other shapes/colors are
unchanged. No AI logo art or presentation-sheet crops are included.

The logo clips across the same mechanical joint and moves with both native card
halves; the housing/hinges/lamp stay fixed. Logos preserve aspect ratio and use
optical inset padding. Unknown or ambiguous carriers show a blank tile.

Marketing carrier comes from scheduled calendar metadata
extendedProperties.private.marketingCarrierCode (or shared), or an explicit
“Marketing carrier/airline/brand:” description line. Scheduled AA/MQ/ENY maps to
American; UA/United Express and DL/Delta Connection map to their marketing
brands. Ambiguous regional callsigns, live idents and unbranded calendar flights
never supply a presumed brand. The existing unbranded CCI exports require an
explicit calendar brand annotation to display a logo. No family calendar was edited.
Tracking carrier, ADS-B matching, flight number and held telemetry remain intact;
scheduled branding is preserved independently through fresh and held live states.

## Verification and acceptance

Complete deterministic npm test and protocol selection checks passed locally.
The browser proof exercises production state events, all seven scheduled brands,
unknown fallback, native indexing, stationary hardware, settling, rapid retargeting,
all 19 dimensions/gaps and four representative primary/mobile viewports.
Existing split-flap/Chromium and full approved-artwork browser checks passed.
Hosted exact-SHA release verification must be recorded with the published
implementation SHA before deployment.

Review captures use fictional AA3761 ORD–AVL EN ROUTE; their duty/wheels are
fixture data, not the current family schedule. Indexing captures pause native
animations at 100ms. No physical monitor or phone acceptance is claimed.
This implementation is proposed; Joey must review the rendered result before
merge/deployment. After approval, deploy the shared release to home and mobile,
verify running SHA/server health, then obtain Joey’s visual confirmation.
