# DadRadar Industrial Ink

The weekly day windows, weekly overnight wheels, instrument wheels, and two clock
windows use shared condensed letter outlines with fixed screen-print texture.
Hardware PNGs and placement are unchanged. Existing schedule, telemetry and clock
controllers still own every live value.

`App/printed-glyphs.js` contains A–Z, 0–9 and punctuation derived from DejaVu Sans
Bold. Outlines were extracted with fontTools SVGPathPen, with H's cap height
normalized to 100 units, horizontal coordinates scaled by 0.72, and the y axis
flipped for SVG/canvas. Wide letters are fitted inside their individual print cells.
The license and attribution are in `LICENSE.txt`. No downloaded or installed font
is needed at runtime, so Windows and other browsers use identical letterforms.

`App/printed-ink.js` applies seeded pinholes, lighter ink patches, tiny registration
variation and restrained coverage/shading. The seed includes the physical slot,
character position and character, never time or animation progress. Print wear
therefore travels with each drum and remains identical when a character returns.

Clock and instrument lettering stays vector SVG. Weekly lettering is cached from
the outlines at 8x and drawn into a canvas with at least four backing pixels per
display pixel. Existing wheel rotation and clipping operate on the printed face.
The original clock text elements remain the accessible authoritative values; the
visible SVG copies are marked aria-hidden to avoid duplicate announcements.

Run `npm test` for deterministic printing and live-state checks. The Chromium and
WebKit browser proofs exercise actual apertures, changing values, wheel motion,
reduced motion and resizing. Local engine selection is explicit through
`DADRADAR_BROWSER_ENGINE`; do not report unrun engines as covered.
