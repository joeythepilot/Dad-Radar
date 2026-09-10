# Great Lakes shoreline alignment

The water fills were five hand-drawn polygons of roughly a dozen points each.
Individual state outlines also drew a second set of shorelines over those fills.

The map now uses a vendored subset of Natural Earth's 1:50m lake geometry for
Superior, Michigan, Huron, Erie and Ontario, including island holes. The lake
coordinates use the same projection and frame as the existing geographic map.
Water uses the existing muted green-blue palette, with a finer shoreline stroke.
State outlines now draw shared interior boundaries only, and the water layer
covers administrative boundaries crossing the lakes. Country geometry, terrain,
aircraft coordinates and camera rules are unchanged.

Source: [Natural Earth lakes](https://www.naturalearthdata.com/downloads/50m-physical-vectors/50m-lakes-reservoirs/).
The public-domain coordinate subset is committed in `data/great-lakes-50m.json`;
the full source URL is recorded inside that file. There is no runtime download or
new API requirement. Run `npm run build:map` to reproduce the SVG.

Both primary and family HTML reference the same versioned map asset. This repair
is cumulative with the server-master update; use its installation instructions.
It does not add the still-pending work-trip counter, shutter assets or descent zoom.
