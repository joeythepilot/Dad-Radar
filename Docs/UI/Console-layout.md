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

The duty card uses `assets/ui/today-duty-card-weekly-paper.png` with live blank-window overlays and `brightness(0.92) saturate(1.13)`. Keep the original card asset and provenance. The paper treatment still needs real-monitor feedback before any further adjustment.

Full-family views reuse this artwork and live state; portrait allows scrolling and adapts module arrangement. Compact is a separate presentation of the same server state. Use current-browser geometry tests and screenshots instead of inferring layout from historical sketches.

See [approved artwork](../Approved-map-artwork-implementation.md), [instrument readouts](../Instrument-wheel-readouts.md) and [current handoff](../Current-build-handoff.md). Physical faceplate construction may require a future alignment adjustment approved by Joey.
