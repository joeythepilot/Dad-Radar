# Weekly itinerary ticker presentation repair — 2026-09-14

Scope: family beta / local staging on `agent/mobile-companion`.

## What changed

The weekly itinerary reducer and state rules were intentionally left unchanged. The presentation layer now renders the ticker as a three-layer paper-tape mechanism:

1. moving warm-ivory paper texture (`assets/ticker/weekly-ticker-paper-v2.png`)
2. moving raster typewriter glyphs (`assets/ticker/weekly-ticker-glyphs-v2.png`)
3. stationary machine/frame overlay with end roller housings, paper guides, slot rails, fasteners, and dark metal/brass wear (`assets/ticker/weekly-ticker-frame-v2.png`)

The hardware and paper are raster artwork. `UI/weekly-ticker-layout.css` remains geometry-only and does not draw ticker hardware, paper, borders, gradients, or pseudo-element decoration.

## Motion and lettering

- Horizontal tape motion remains slow and readable.
- Speed wander and the periodic mechanical hesitation remain deliberately subtle.
- The paper texture moves with the tape while the machine overlay stays fixed.
- Per-character position jitter is now tightly bounded (0.35 px vertically and 0.2 px horizontally) with fixed character advance.
- Most typewriter imperfection is carried by restrained ink-density variants in the raster glyph atlas instead of exaggerated character displacement.

## Layout

The production canvas remains 750 × 72. The ticker still occupies only the center map stack, directly beneath the map. The map/ticker split remains 87/13, so no cabinet, poster, instrument, clock, counter, or brass-rod geometry is enlarged or moved.

## Schedule behavior retained

- `THIS WEEK`
- `UPCOMING TRIP` beginning the day before departure
- `CURRENT TRIP` once the trip begins
- family-readable overnight-city plus final-home-day summaries
- schedule refresh from `/api/calendar/upcoming`
- refresh on the existing calendar sync event and recurring schedule refresh

## Verification

The weekly ticker browser proof now:
- requires all three v2 raster assets
- verifies paper is visibly light, warm ivory, and distinct from the dark machine hardware
- verifies the ticker stays below the map and inside the unchanged cabinet geometry
- verifies CSS remains artwork-free
- verifies the paper/text actually moves
- covers desktop, full landscape, full portrait, full tablet, and compact touch layouts in Chromium and WebKit
- saves desktop and full-landscape dashboard screenshots to the map-hardware workflow artifact

The existing map-hardware workflow continues to run the complete regression suite and map-roll/browser diagnostics, guarding the transport behavior against regressions.

## Home beta update

No credential migration, startup-task change, or provider-key change is required. The home PC only needs the branch update plus the normal browser rebuild/restart so the rebuilt bundle and new raster assets are served.
