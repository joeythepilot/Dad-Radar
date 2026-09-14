# Tiny brass clock supports, family beta

Only the Current Time and ETA attachments change. The existing clock housing
art, dimensions, typography and responsive positions are retained. The map
transport, audio, camera, and sequence/leg counter source remain unchanged.
The sequence counter's placement and artwork are deliberately not resolved here.

`assets/hardware/brass-clock-rod.png` is a cropped portion of the fourth rod
in the owner's supplied image, not newly generated art. It contains only the
plain shaft. Crop coordinates, source hash and asset hash are recorded in the
adjacent JSON manifest. No collars, plates, caps, hinges or side arms remain
on the two clocks. The abandoned large-arm preview was never installed.

Each clock gets one decorative PNG image centered under its underside. The
4px-wide transparent crop contains about 3px of visible brass. Its ends tuck
into the existing housing and bottom bezel; its length follows the existing
gap without moving the clock or consuming additional layout space. This also
preserves the existing staggered positions on narrow Full views while the leg
counter decision is pending. CSS places/sizes the image; it does not draw metal.

Verification: `scripts/clock-rods-browser-proof.js` runs before each screenshot
in the existing Chromium/WebKit family-beta workflow. It checks image bytes,
image decoding, narrow width, contact with both edges, absence of old side
hardware, unchanged housing/map/counter geometry and no new Compact hardware.
The existing real-frame roll proof now also checks rod stationarity. Source
builds and the complete regression suite run separately in that same workflow.

No production packaging or home-PC installation is performed by this change.
