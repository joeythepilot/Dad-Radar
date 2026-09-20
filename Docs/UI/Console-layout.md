# Current console layout

The HP 23es 1920 × 1080 cabinet is the primary visual reference. The current layout is implemented by `index.html`, `UI/approved-map-artwork.css`, the supporting `UI/` styles and `Mobile/layout.css`.

| Area | Current treatment |
| --- | --- |
| Upper main bay | Permanent Flight, From, To and Status split-flap fields with warm concealed-lamp illumination |
| Upper right | One approved twin-clock panel, aligned to the instrument rail width and split-flap bay height, with live current time and ETA |
| Lower left | Destination poster above the physical Today’s Duty card |
| Center | Regional/airport map with continuous vertical roll, approved airport plaques and leader fittings |
| Below map | Seven equal mechanical overnight modules; today at left, daily rollover at 06:00 local |
| Map lower-left edge | Active-sequence/leg housing seated against the bezel without a support leg |
| Right rail | Three live gauges with existing needles and 3/3/5-digit rolling readouts |

The duty card uses `assets/ui/today-duty-card-weekly-paper.png` with live blank-window overlays and `brightness(0.84) saturate(1.16)`. The September 20 home-monitor photograph showed paper reading too pale: the regional chart now has reduced printed-sheet exposure and stronger aged-paper texture, airport charts share the richer cream treatment, and weekday and clock paper windows receive a gentle aperture-only tint. Original artwork, live lettering, brass, wheels, posters and layout are preserved. These settings still need Allison's visual confirmation on the physical monitor; browser proof is not monitor calibration.

Full-family views reuse this artwork and live state; portrait allows scrolling and adapts module arrangement. Compact is a separate presentation of the same server state. Use current-browser geometry tests and screenshots instead of inferring layout from historical sketches.

See [approved artwork](../Approved-map-artwork-implementation.md), [instrument readouts](../Instrument-wheel-readouts.md) and [current handoff](../Current-build-handoff.md). Physical faceplate construction may require a future alignment adjustment approved by Joey.
