# Mechanical instrument readouts

The three main-display numerical readouts use the approved blank rolling-wheel hardware, recessed into the lower faces of the existing instruments. KT, degrees, and FT remain baked into the artwork. The needles, telemetry selection, state processing, and compact companion are unchanged.

`App/instrument-wheels.js` observes the existing instrument text nodes. It adds three, three, and five live digits respectively, padding leading zeroes and removing altitude grouping commas for the drums. Missing or unrepresentable values show dashes. Negative altitudes retain their sign. The original formatted value and speed source label remain available through the SVG's accessible label.

Changed digits roll directly to the newest reading over 360 ms. Pending motion is canceled when another value arrives. Unchanged values do not animate. Initial, unavailable, background-tab, and reduced-motion updates settle immediately. No timers poll telemetry and no alternate flight state is maintained.

The approved generated sheet had a baked checkerboard. Image-generation background extraction produced a true RGBA asset, saved unchanged as `assets/hardware/instrument-wheel-inserts.png`; the adjacent JSON records its hash. SVG viewports select the three inserts. CSS positions/scales the artwork and live text only.

Verification: `npm test`; `scripts/approved-artwork-browser-test.js` using Chromium at kiosk 1920x1080, desktop 1440x900, tablet 1024x768, family landscape 844x390, and portrait 390x844. Wheel checks cover asset transparency, housing aspect ratios/placement, digit containment, leading zeroes, heading rollover, altitude carry, rapid updates, unavailable values, negative altitude, and reduced motion. Kiosk and portrait screenshots inspected. Existing map, poster, clocks, gauges, and weekly strip checks remain active.

Known unrelated issue: the existing poster CSS fallback requests `/UI/assets/destinations/...` with a 404; the foreground poster renders correctly. No new missing artwork requests or browser errors were observed.
