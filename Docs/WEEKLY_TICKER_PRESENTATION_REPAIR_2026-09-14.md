# Weekly ticker presentation repair — 2026-09-14

Scope: family beta / local staging only.

Starting checkpoint: `f156825f6ce8234c7ee3dcace899d5d85c3bb93a`

## Presentation repair

The weekly itinerary ticker keeps the existing schedule reducer and calendar-refresh behavior while replacing the visually weak strip with a raster-composited electromechanical paper-tape mechanism.

Production presentation layers:

- `assets/ticker/weekly-ticker-frame-v3.png` — generated physical ticker machinery, cropped into the production strip: substantial end housings, rollers, guides, rails and fasteners on a transparent background.
- `assets/ticker/weekly-ticker-paper-v3.png` — generated warm-ivory paper texture with restrained fibers and tonal variation.
- `assets/ticker/weekly-ticker-glyphs-v3.png` — production atlas distilled from the generated typewriter sheet, with four restrained raster impressions per character.

CSS remains geometry-only. It reserves the 84/16 map/ticker split and positions the canvas; it does not draw visible machine hardware, paper, rails, rollers or type.

## Renderer behavior

- The paper and glyph layers are clipped to the paper window.
- Paper and type move horizontally together through the stationary raster frame.
- Motion keeps a slow mechanical character with restrained speed wander and one small periodic hesitation.
- Per-character jitter is intentionally very small and rare. Most imperfection lives in the raster glyph variants and paper texture rather than in letter placement.
- Raster readiness is checked directly from each image’s decoded state on every frame, avoiding load-event races with fast or cached assets.

## Layout boundaries retained

- Ticker remains under the map and inside the center/map column only.
- Overall cabinet height is unchanged.
- Map is shortened vertically to reserve the ticker strip.
- Poster and gauge columns are unchanged.
- Existing clock/counter sizes and brass rods are untouched.
- Map-roll transport code and artwork are untouched.

## Schedule behavior retained

The ticker still reduces schedule data to family-readable overnight cities and the final home day, with the same three states:

- `THIS WEEK`
- `UPCOMING TRIP` beginning the day before departure
- `CURRENT TRIP` once the trip is underway

The ticker still refetches calendar data on the normal schedule interval and after successful calendar-sync events, so mid-trip schedule changes continue to flow into the summary.

## Verification gates

The focused browser proof checks:

- v3 generated frame, paper and glyph raster assets loaded;
- visible ivory-paper brightness and warmth versus dark stationary machine hardware;
- center-column-only placement;
- shortened map without cabinet growth;
- no CSS backgrounds/borders/pseudo-elements used to paint ticker hardware or paper;
- actual horizontal movement between frames;
- desktop, full landscape, full tablet, full portrait and touch-family layouts in Chromium and WebKit;
- unchanged map hardware/transport suite in the same workflow.


## Physical-build vertical feed revision — 2026-09-16

The physical-build pass supersedes the v9 finished-module presentation while retaining the same schedule reducer and refresh behavior. The LCD now renders only the mechanism that will remain visible behind the real Dad Radar faceplate.

Current presentation layers:

- `assets/ticker/weekly-ticker-mechanism-v10.svg` — shallow internal transport artwork only: upper/lower feed rollers, side bearings, gears, shafts, guides and dark cavity. It contains no outer faceplate, corner screws, module label or decorative service-panel trim.
- `assets/ticker/weekly-ticker-paper-v5.png` — warm aged paper texture, now spanning about 89% of the design width.
- `assets/ticker/weekly-ticker-glyphs-v5.png` — restrained typewriter impression atlas.

Current geometry and motion:

- Canvas is `1500 × 144`, substantially shallower than the previous `1500 × 200` presentation.
- Center stack is `87% map / 13% ticker`; overall cabinet and lower-grid height do not grow.
- Paper window is `x=80..1420`, leaving only narrow machinery strips at the ends.
- Itinerary text wraps into paper-width rows and the paper/type move **top-to-bottom** together. There is no horizontal text crawl.
- Feed speed is deliberately slow, with restrained speed wander and one short periodic hesitation to keep the movement mechanical rather than perfectly digital.
- CSS remains geometry-only. The screen-rendered mechanism, paper and type are asset/canvas layers; the production cabinet will provide the real outer service faceplate and fasteners.

Verification adds explicit checks for the shallow ticker ratio, vertical feed axis, near-full-width paper, absence of digital faceplate lettering, and exact rendering in Chromium/WebKit.
