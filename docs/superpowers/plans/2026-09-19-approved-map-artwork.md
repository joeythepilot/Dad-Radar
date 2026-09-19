# Approved map artwork implementation plan

**Goal:** Install the six Library PNGs from the user-provided manifest on agent/mobile-companion.
**Spec:** User's September 19 implementation request in this work session; exact approved artwork, no redesign.
**Architecture:** Preserve existing runtime element IDs, state and rendering functions. Replace only physical visual layers. Use the existing cabinet grid and map marker transforms.
**Tech stack:** HTML, CSS, browser JavaScript, SVG, Node, Playwright.

## Constraints
- No changes to providers, credentials, state, schedule, weekly logic, map transport, posters, audio, startup or packaging.
- Keep original PNG bytes; uniform SVG scaling, including the clock's transparent side gutters.
- The 1920 × 1080 baseline upper row is 198.406px high; instrument rail is 341.109px wide. The visible twin housing is 1418 × 824, matching within one pixel at that width.
- Keep the active sequence in its existing map position and retain its small brass rod.
- Use the private MaxwellHouse bridge to deploy only the verified pushed SHA.

## Steps
- [x] Fetch latest branch and exact assets; run baseline npm test.
- [x] Add browser acceptance test, watch missing twin module fail.
- [x] Place unchanged PNGs in assets/hardware; move runtime clock IDs to SVG text over the original image. Share top row with the existing split-flap; preserve instrument rail and lower grid.
- [x] Replace sequence housing and airport marker/placard/fitting visual layers; preserve runtime data.
- [x] Verify normal, kiosk, tablet and full-family portrait/landscape, long ETA text and missing ETA; inspect screenshots. Run npm test and existing browser transport proofs with updated housing expectations.
- [x] Fresh code review, focused fixes, commit, connector push, MaxwellHouse deploy and verify.

## Review focus
- Preserve text-window alignment with uniform scaling and transparent image gutters.
- Long ETA and sequence detail must fit without losing runtime content.
- Avoid changing the leg counter's position or brass support.
- Full-family portrait retains its lower poster/instruments arrangement.
- Map fittings must track leader endpoints as camera zoom changes.

## Evidence ledger
- Baseline npm test: passed.
- Git clone/pull: current 8e69ecfa5f3c9139e673e3ab08533b8d5080e0d5.
- GitHub permissions and no-op non-force ref update: successful; direct shell push has no credentials.
- Library manifest and six PNGs retrieved successfully.

- Browser RED: missing twin housing assertion failed before implementation.
- Review fixes: family sequence Range containment failed, then fitted live ink; old leader endpoint assertion failed, then adapted plaque boundary; visible portrait housing height assertion failed, then matched row to natural artwork ratio.
- All five approved-artwork browser layouts pass with clock window/asset/geometry assertions; existing nine-layout Chromium map suite passes with desktop and compact transport checks.
- Full npm test and browser build pass; no changes to master state, provider, schedule, weekly, poster or audio runtime.
- Existing poster CSS background /UI/assets/destinations/... 404 reproduced with baseline HEAD index. Foreground poster loads. Deferred outside scope.
- Ruling: use SVG viewports for transparent clock gutters and unrelated source-image fragments outside sequence housing/medallion; original PNGs remain byte-identical.
- Ruling: adjust portrait-only top row to the natural clock height, preserving the existing portrait lower layout and desktop geometry.
- Minor deferred: Full-family landscape visible housing/rail widths differ by approximately 1.6px due uniform fitting; avoids artwork stretch.
- GitHub push and MaxwellHouse deploy verification are recorded in the final task report.
