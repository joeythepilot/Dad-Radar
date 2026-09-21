# Heading instrument overlay

`heading-airplane-glass-overlay-v2.png` uses the approved moderate-nose
airplane artwork, extracted from the 1254×1254 generated reference without
redrawing it. Its baked checkerboard was removed using the closed dark rim.
The pointer is uniformly scaled to a 310-pixel wingspan and its screw is
registered to the original pivot at (512, 505).

The overlay remains a 1024×1024 RGBA canvas with transparent space outside
the circular glass aperture. The original index arrow and upper-right glass
reflection are preserved pixel-for-pixel. The original overlay is retained
for provenance and the browser regression comparison. Card rotation, bezel,
lighting, instrument size, and readout are unchanged.

Preparation: `python scripts/prepare-heading-pointer.py APPROVED_SOURCE.png`
(requires Pillow, numpy, scipy). Approved source was
`exec-863833b6-e06b-4ce6-ac24-dd1f575794e6.png`.

Final PNG SHA-256:
`66e2f697e0358e74aae350a1aaa334b4df1ab1a7cf3857c515d9631e369b56d0`.

`scripts/approved-artwork-browser-test.js` checks canvas dimensions,
transparency, pointer registration, and preservation of the surrounding
glass/index in five layouts, and captures the assembled kiosk instrument.
