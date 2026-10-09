# Proposed split-flap lighting refinement — 2026-10-08 EDT

Status: experimental; awaiting Joey’s rendered review. Not approved, merged or deployed.

User clarified a rectangular lamp recessed inside the upper split-flap housing. V3 replaces only the independently controllable lighting SVG with a horizontal warm rectangular emitter and downward spill. Existing V2 housing, hinges, seam, moving card texture, typography and native flip mechanism remain unchanged. No new binary artwork was transferred to GitHub.

Scope: first flight-number tile on primary display only. No tile geometry, spacing, flight logic, audio, other groups/modules or mobile changes. New lamp and glow disappear under the existing blank/off state.

Source parent: 241553e9df79e8c4015b3cc052134e14a9dd589d on experiment/photoreal-flap-2026-10-08. Production and restore source: f0022d6067768a4f2ac2e51f4bb08168fb30c184. Restore branch backup/pre-airline-logo-flap-2026-10-08 remains untouched.

Capture provenance: project display-browser-fixture and experimental-flap-browser-test; fictional EN ROUTE ORD–AVL flight 3761; fixed time 2026-10-09T02:35:00Z; Chromium 153.0.8010.0, Playwright 1.63.0, 1920 × 1080 viewport, DPR 1, America/New_York. Actual browser screenshots, no physical monitor verification.

Verification: all 46 measured rectangles equal the original baseline; other 17 tiles remain original; mobile remains original; fixed hardware transform is none; native 3→4 flip sampled at 100 ms retains 190 ms duration and 185 ms lower delay; settles and restores; blank lamp opacity 0; no browser errors. Split-flap state/audio, printed-ink and visual identity tests passed; git diff --check passed.

Visual assessment: a visible rectangular source now sits beneath the inner top lip, with warm spill concentrated on the upper card and restrained lower illumination. Native-size capture preserves the existing center seam and stationary hinges. Suitable for a lighting review; production suitability and approval remain pending Joey’s review. No physical lamp simulation or monitor calibration claimed.
