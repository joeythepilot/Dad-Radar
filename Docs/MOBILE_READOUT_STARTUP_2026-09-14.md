> Historical decisions, specifications or ideas. For the running build, use [Current build handoff](Current-build-handoff.md). Superseded details here do not authorize restoring older behavior.

# Mobile readout proportions and startup diagnostic replay

Scope: family beta on agent/mobile-companion; no production packaging.

The initial server snapshot may contain an old shutterTestToken. HTTP viewers
now ignore diagnostic visual events until the first resolved calendar-sync
snapshot provides their baseline. This handles local/mock startup events,
failed initial requests, and repeated snapshots without replaying the old test.
Later distinct commands still run one round trip. Actual flight-driven airport
map requests remain independent of the diagnostic baseline.

Full-family readouts use their existing housings and raster brass rods at one
aperture-based scale. The former 560px breakpoint/90px raised clocks no longer
applies to Full. Clock and counter bodies stay near the lower bezel rather than
forming a two-tier stack. Desktop and Compact geometry are unchanged. All data,
centered sequence text, and three original PNG rods are retained. Full mode is
a scaled cabinet; Compact remains the larger-reading mobile layout.

Focused lifecycle tests exercise authoritative startup ordering and subsequent
commands. Browser checks inject an old token into real initial state, trigger a
new command through the existing endpoint, and reload after it. Proportion
checks bound readout width, covered map area, and distance to the lower bezel.
The existing browser matrix now also covers two touch/mobile landscape sizes,
with the six-estimated-legs detail from the owner's screenshot.

Installation uses the existing C:\Users\cfijo\Dad-Radar checkout, which keeps
its local agent/windows-autostart branch. Fast-forward to the verified commit,
rebuild browser files, then refresh clients. These changes are client-side;
no server restart, task installation, credential change, or new art is required.
