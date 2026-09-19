> Historical decisions, specifications or ideas. For the running build, use [Current build handoff](Current-build-handoff.md). Superseded details here do not authorize restoring older behavior.

# Sequence counter: matching small rod and centered text

Family beta only, on `agent/mobile-companion`.

The counter now uses the same `/assets/hardware/brass-clock-rod.png?v=1`
image as the two clocks. Its image is 4 CSS pixels wide and 18 pixels tall,
bridging the existing 14-pixel gap with the ends tucked behind the housing
and bezel. No new art, bracket, plate, collar or CSS-painted metal is added.
The three existing text elements are center-aligned. Counter dimensions,
position, data, clock styling, clock rods and map transport are unchanged.

The existing browser rod proof now checks all three instances, their identical
asset URL and loaded dimensions, narrow widths, bezel contact, stationary
parentage, absence of the old bracket and centered, contained counter text.
This supersedes the deferred-mount note in the bracket-removal record.

This source update does not install or restart the home PC.
