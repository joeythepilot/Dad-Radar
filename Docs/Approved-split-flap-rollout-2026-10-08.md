# Approved split-flap artwork rollout — 2026-10-08 EDT

Joey approved the corrected artwork and recessed rectangular lamp, and requested replacement of all tiles. This supersedes the experiment’s one-tile restriction for primary split-flap visuals. Approval applies to the displayed artwork; deployment has not been requested or performed.

All 18 primary split-flap tiles across flight number, origin, destination and status now share the approved V2 fixed housing/card material and V3 lighting SVG. Only the CSS selector scope changes. Blank tiles retain the native lamp-off behavior. No airline logos added.

All module/tile dimensions and positions, glyphs, flight logic, native animation timing, audio, clocks, map, instruments, poster, duty card and weekly wheels remain unchanged. Mobile remains on its original artwork. Production and restore branches remain f0022d6067768a4f2ac2e51f4bb08168fb30c184. Work stays on experiment/photoreal-flap-2026-10-08; parent 543aa9aaef2a4eeb3f1e7e0ad80bce7db91988e9.

Verification: browser test passed all 18 tiles/four groups, equality of all 46 baseline rectangles, stationary hardware, independently controlled lamp, native 190 ms animations/185 ms lower delay, real indexing and settling/restoration for every tile, blank lamp off, original mobile tiles and no browser errors. npm test passed the complete configured suite. git diff --check passed. Independent review found no blockers.

Capture provenance: unchanged display-browser-fixture, fictional EN ROUTE ORD–AVL 3761, fixed time 2026-10-09T02:35:00Z, Chromium 153.0.8010.0 / Playwright 1.63.0, 1920 × 1080 viewport, DPR 1, America/New_York. Indexing capture pauses actual native CSS animations at 100 ms. No physical monitor verification claimed.

Visual assessment: consistent new housing, seam, hinges and lamp across all groups; status separator blank remains dark. No visible clipping or misplaced hardware in the native-size capture. Not merged or deployed to MAXWELLHOUSE.
