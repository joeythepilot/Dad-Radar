# Mobile photographic plates: selected artwork and local registration

Joey approved the darker rounded clock edge, requested the matching split-flap
finish and smaller screws, then selected the existing small-screw split-flap
image on October 14, 2026. Use these photographs, not the rejected V5 or the
subsequent solid-face studies as whole replacement plates.

## Protected source photographs

The landscape image matches the visible selected reference. The existing
portrait companion retains the taller native housing proportions. The revised
two-row clock is the selected clock treatment. The six `HomingBeacon_Mobile_*`
PNGs distinguish immutable `Source` photographs from `CutoutDonor` inputs.
Source SHA256 values are independently pinned in the browser proof.

Joey explicitly approved precise local transparency edits and finishing affected
bevels. The renderer fits each complete source photograph with one scale, then
edits only its aperture bands: a photographic donor fills the old aperture band;
four distinct photographic bevel strips are independently translated and
uniformly scaled to the measured native edges; exact transparent windows reveal
the original mechanisms. No strip is tiled or nonuniformly stretched. Solid-face
studies are used only as local material donors, never for the selected face,
outer edge, labels or screws. The differential pixel proof compares the entire
unaffected image against a fresh draw of the selected source.

## Native geometry and body clearance

V5 changed rendered mechanism proportions. This release restores the original
pre-plate `Mobile/layout.js` sizing calculations and flow from
`63568b27b961993b35949fbc6e1d3ac5c9068d75`; it does not fit mechanisms to artwork.
The canvases are rear layers. The four groups retain 5/3/3/8 tiles, fixed hardware,
motion and original artwork. Both clocks retain four drums, colon and AM/PM
roller, original SVG viewBox/crops, illumination and ETA interpretation.

Photographed bodies are contained horizontally and may occupy up to three CSS
pixels of the existing vertical inter-module clearance. This is not a claim
that every alpha pixel lies inside the original module rectangle. The live
module boxes and other layout geometry remain unchanged. Local browser checks
compare actual tile, clock, colon, instrument and module rectangles against
independently rendered pre-V5 sources at five phone/tablet viewports; resize
proofs additionally cover wider phones and rotation back to portrait.

The browser integration proof requires exact window registration, genuinely
transparent windows, uniform image/edge-strip scaling, preserved source pixels
outside bounded cutout bands, independent pre-V5 group geometry, viewport
containment and original clock attributes. Existing clock-state and native
split-flap suites remain required. Primary never loads this renderer or its
assets; the three approved instrument plates remain byte-exact and unchanged.

## Limits and fallback

### October 15 clock recess and raster-density correction

The shared clock windows now have an opaque dark recess behind the unchanged
live drums and colon. Leaving these entire windows transparent exposed walnut
between the separate wheels. Split-flap apertures remain transparent.

Metal canvas backing stores now include the complete panel's uniform scale in
their device-pixel ratio. Previously a 1920-wide Retina panel displayed a
1645-pixel split-flap canvas across 3084 device pixels; it now renders 3084.
Portrait tablet and clock canvases receive the same correction. Source image
bytes, physical texture scale, mechanism artwork and walnut PNGs are unchanged;
this removes avoidable rendering softness but does not invent source detail.
Retina tablet/wide/portrait cases check actual displayed pixel coverage and
opaque clock recesses in the existing family browser proof.

Rendering is performed only on resize/startup, not in an animation loop. All six
photographic inputs currently load before mounting; an asset failure leaves the
native unplated layout usable. Approximately 10.7 MB of additional PNG transfer
and 38 MB of decoded source images is a known cost; orientation-on-demand loading
is a possible follow-up, not part of this release. No physical iOS 12.5.5 or Pi
performance result is claimed by the local Chromium proof. Hosted Chromium and
WebKit and the exact-SHA release gate must pass before deployment. Installation,
independent running identity and family visual acceptance are separate evidence.


### Native split-flap plate v8

The split-flap housing now mounts as one transparent PNG per orientation, at native 6578×893 landscape and 2118×536 portrait. Original mechanisms and module layout remain unchanged. Canvas/donor/aperture-edge patching is removed. The finished image already contains the measured openings and mounts with one uniform scale.

Offline physical-material authoring is preserved at [source/mobile-metal-native8](https://github.com/joeythepilot/Dad-Radar/tree/source/mobile-metal-native8/artwork/split-flap-native8), commit e5a19d3017ac41375c0305256eedc410e041921a. These are new geometry/material renders, not enlarged v7 photographs. Eight source pixels per native CSS pixel supply real visible detail. Browser checks examine actual source alpha around every aperture and compare mechanisms against the independent approved geometry fixture. Visual acceptance remains separate from numerical verification.
