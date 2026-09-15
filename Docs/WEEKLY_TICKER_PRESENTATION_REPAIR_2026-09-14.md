# Weekly ticker presentation repair — 2026-09-14

Scope: family beta / local staging only.

Starting checkpoint: `f156825f6ce8234c7ee3dcace899d5d85c3bb93a`

## Presentation repair

The weekly itinerary ticker keeps the existing schedule reducer and calendar-refresh behavior while replacing the visually weak strip with a raster-composited electromechanical paper-tape mechanism.

Production presentation layers:

- `assets/ticker/weekly-ticker-frame-v2.png` — stationary raster hardware with upper/lower slot rails, end supports, guides and roller housings.
- `assets/ticker/weekly-ticker-paper-v2.png` — opaque warm-ivory raster paper texture with subtle grain/fibers; the asset was simplified after CI proved the earlier PNG payload had a corrupt palette/transparency chunk.
- `assets/ticker/weekly-ticker-glyphs-v2.png` — restrained raster typewriter glyph atlas with dark charcoal/aged ink.

CSS remains geometry-only. It reserves the 87/13 map/ticker split and positions the canvas; it does not draw visible machine hardware, paper, rails, rollers or type.

## Renderer behavior

- The paper and glyph layers are clipped to the paper window.
- Paper and type move horizontally together through the stationary raster frame.
- Motion keeps a slow mechanical character with restrained speed wander and one small periodic hesitation.
- Per-character jitter is intentionally very small and rare. Most imperfection lives in the raster glyph variants and paper texture rather than in letter placement.
- Image readiness handlers are attached before raster requests so fast/cached assets cannot miss their load event.

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

- v2 frame, paper and glyph raster assets loaded;
- visible ivory-paper brightness and warmth versus dark stationary machine hardware;
- center-column-only placement;
- shortened map without cabinet growth;
- no CSS backgrounds/borders/pseudo-elements used to paint ticker hardware or paper;
- actual horizontal movement between frames;
- desktop, full landscape, full tablet, full portrait and touch-family layouts in Chromium and WebKit;
- unchanged map hardware/transport suite in the same workflow.
