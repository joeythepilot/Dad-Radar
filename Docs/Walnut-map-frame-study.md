# Walnut map-frame visual study — not a production installation

Joey rejected the deployed flat walnut backing/thin-strip treatment as failing
the approved framed-module mockup. Passing fill/geometry tests was insufficient
visual acceptance. The existing deployed walnut is not retrospectively approved.

The agreed next step is one photographic frame around the real map, compared
with the approved reference, before extending treatment across the dashboard.
No deployment, responsive rollout or replacement mechanisms are included here.

## Material and construction

The physical record specifies applied quarter-inch trim and no routed cabinet
rebate. This study uses square-section walnut with visible inner depth and
fitted miter corners, not ornate molding. Five built-in image generations were
made: three proportion studies did not fit; an exact silhouette-guided fourth
gave a near-fit but overly orange finish; the fifth corrected the finish.
Earlier material remains as Study_v2 for comparison, not as accepted artwork.

Final selected study: assets/hardware/HomingBeacon_Map_Walnut_Frame_Study_v3.png,
1536×1024 RGBA, SHA256
071b84c85cd915090ec28e211fb0f31b434f5347a644bfb0701d09e7bc993364.
Byte-exact built-in output exec-5ff59885-064d-4822-908f-503ebf78f615.png.
The frame is AI-generated photographic artwork, not a camera photograph of a
built walnut frame. No CSS wood/shadows, repeated edge pixels, nonuniform scale
or runtime map replacement is used.

Final image-edit prompt (built-in tool; earlier frame as target and approved
mockup as finish reference):

> Edit IMAGE1 only, using IMAGE2 solely as the walnut FINISH reference. Preserve
> IMAGE1 exact frame geometry, canvas, alpha opening and outside transparency,
> corner positions, rail widths, grain direction and straight-on view. Change
> only the wood finish and lighting response: remove the orange/copper cast and
> shiny golden edge highlights. Match the darker chocolate-brown, low-sheen satin
> walnut around the map in IMAGE2. Softer restrained warm highlights; fine visible
> real pores and grain; credible wood thickness and inner contact shadow remain.
> The object must feel like a beautifully finished applied walnut instrument
> faceplate, not a glossy commercial picture frame. Do not add trim, borders,
> black outlines, gold, distressing, brass, text or a backing. No geometry changes
> or perspective. Keep actual center and outside alpha transparent.

## Actual browser proof and limitations

`scripts/walnut-map-frame-study.js` loads the existing display fixture and real
mobile HTML/App bundle at844×390,DPR2. It adds only an experimental canvas in
the browser session; no product source imports or mounts the study.

Original map module373.640625×246.703125; live opening357.640625×228.703125.
Measured source inner-wall opening at128-alpha threshold is(69,64,1399,894).
Whole-photo uniform scale0.2556923405559423; edge discrepancy from that measured
source boundary is0.03648CSSpx horizontal and−0.05709CSSpx vertical. Generated
faint edge alpha is clipped at the exact working map aperture, and other
original protected interiors are also cleared. This is disclosed registration,
not a claim that generation produced mathematically exact alpha boundaries.

Actual proof: unchanged original map/module rectangles; zero covered pixels in
945197 protected interior samples (oneCSSpx raster-edge seam excluded);149 real
map SVG paths; zero page errors. These preserve the working display but do not
certify visual fidelity. The main agent inspected the actual whole dashboard,
map detail and side-by-side approved-reference comparison. Only the map frame
has this treatment; the other visible wood is still the rejected old treatment.

No portrait/tablet/resize/asset-failure/full-release qualification, new hosted
gate, code review, commit publication, live deployment or device acceptance is
claimed. The next visual judgment is the displayed actual map-frame comparison.
