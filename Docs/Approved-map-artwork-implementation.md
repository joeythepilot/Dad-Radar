# Approved artwork implementation — September 19, 2026

Installed all six PNGs from the active Library manifest in `assets/hardware/`, preserving original bytes, alpha channels and aspect ratios. SHA-256 values are recorded in `assets/hardware/approved-map-artwork.json` and checked by the standard test suite.

## Behavior and visual result

- One twin-clock housing above the unchanged instrument rail; the existing current-time and ETA elements continue receiving the same runtime values.
- Live text is fitted inside the baked-in windows, with no duplicate visible labels. Long ETA states and hidden/reveal/resizing are covered.
- At 1920 × 1080, clock/rail width is approximately 341px and clock/split-flap height approximately 198px. Original lower grid and gauge positions are preserved. The existing split-flap artwork scales into the top-left bay.
- Navy departure and maroon destination artwork replace the old plaques; the supplied medallions and leader fittings use the existing marker placement and camera scaling.
- Active-sequence artwork replaces the CSS housing at the bottom-left map bezel, retaining existing data formatting. The brass support rod is removed per the follow-up request. Its live text scales to the available face.
- Superseded separate clock markup and dedicated map-clock housing CSS were removed. Neither retired individual-clock PNG is actively referenced.
- The six source PNGs are unchanged. SVG viewports exclude transparent twin-clock side gutters and unrelated source-image fragments outside the sequence housing/medallion. No hardware is regenerated or painted with CSS.
- Full-family portrait uses the natural twin-clock height for the top row; the existing lower portrait arrangement remains.

## Verification

- `npm run build:browser`: passed.
- `npm test`: passed (60 existing/new script invocations; includes flight state, master state, providers, calendar, weekly itinerary, map, poster, audio, startup, home-control and mobile contracts).
- `node scripts/approved-artwork-browser-test.js`: passed in Chromium at 1920×1080, 1440×900, 1024×768, Full-family 844×390 and 390×844. Checked exact asset decoding, visible artwork bounds, text containment, ticking clock, alternate ETA, same-page resize, hidden/reveal, seven weekly modules, three gauges and foreground poster.
- Existing `node scripts/map-hardware-browser-test.js`: passed in Chromium for nine desktop/full/compact/touch layouts, including desktop and compact map transport round trips, stationary hardware and registration/audio timing.
- Screenshots of full display and responsive layouts were captured and visually inspected.
- Independent review identified sequence-footer overflow, a detached leader fitting and portrait clock letterboxing. Added failing checks, corrected each, and passed the checks.
- `git diff --check`: passed.
- MaxwellHouse preflight: healthy, clean checkout, running the starting SHA 8e69ecfa5f3c9139e673e3ab08533b8d5080e0d5. Deployment uses the existing private home-control workflow; final SHA and deployment result are reported in the task completion message.

## Remaining limitations / unrelated issue

- Existing poster CSS background requests `/UI/assets/destinations/...` and receives a 404. Reproduced using baseline HEAD HTML; the visible foreground poster loads correctly. Left outside this artwork-only scope.
- In small Full-family landscape, uniform image fitting leaves approximately 1.6px difference between visible clock width and the rail. Artwork is not stretched.
- Browser visual checks ran in Chromium; WebKit was not available in this environment.
- No live credential, provider configuration, saved flight state, startup configuration, port or production packaging changes.

## Files changed

- `App/approved-map-artwork.js`
- `App/route-map-test.js`
- `App/route-map.js`
- `App/sequence-history-display.js`
- `Docs/Approved-map-artwork-implementation.md`
- `UI/approved-map-artwork.css`
- `UI/family-map-hardware.css`
- `UI/map-roll-transition.css`
- `UI/sequence-history.css`
- `assets/hardware/airport-anchor-medallion.png`
- `assets/hardware/airport-leader-end-fitting.png`
- `assets/hardware/airport-plaque-departure-navy.png`
- `assets/hardware/airport-plaque-destination-maroon.png`
- `assets/hardware/approved-map-artwork.json`
- `assets/hardware/instrument-active-sequence.png`
- `assets/hardware/instrument-twin-clock-panel-final.png`
- `Docs/superpowers/plans/2026-09-19-approved-map-artwork.md`
- `index.html`
- `package.json`
- `scripts/approved-artwork-browser-test.js`
- `scripts/approved-artwork-test.js`
- `scripts/browser-bundle-test.js`
- `scripts/build-browser.js`
- `scripts/clock-rods-browser-proof.js`
- `scripts/map-hardware-browser-test.js`
- `scripts/map-startup-mobile-browser-proof.js`
