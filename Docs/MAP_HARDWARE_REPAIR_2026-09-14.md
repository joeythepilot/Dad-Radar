# Map transport and bezel hardware: family beta repair

Scope: `agent/mobile-companion`. No home-PC installation, production deployment, release, or production packaging is performed by this repair.

## Preserved design

The regional and airport charts are adjacent sheets on one vertical physical roll. The 2,800 ms uneven transport, hesitation, lateral wander, changing motion blur, worn splice and approved V3 gearmotor assets remain. Current Time mounts to the left bezel, ETA to the right, and Active Sequence to the bottom. Hardware and cast shadows stay stationary over the map. There are no feet or full-width hardware rails.

## Saved repairs

- One HTML transport gives both sheets identical pixel travel, instead of mixing SVG and HTML percentage transforms. Extra paper behind the bezel lips prevents fractional-pixel edge gaps.
- Registration commits the final animation position atomically. Clacks follow two paint opportunities and the reverse request waits through registration. Reduced-motion preference changes are read at request time.
- Aperture-based hardware sizing, visible metal arms and a lower bracket keep the clock, ETA and sequence inside their housings in both landscape and portrait layouts.
- Portrait Full scrolls rather than shrinking the entire cabinet to an unreadable landscape thumbnail. Poster and gauges remain contained.
- Compact uses the same transport/audio source as Full, compiled through the existing legacy-Safari build.
- The home diagnostic can use a duplicate of the actual regional sheet with remapped SVG IDs. It never fabricates an airport or changes flight telemetry.
- The camera is refitted when the visible map aperture changes, including when the startup dashboard becomes visible. This fixes initial portrait cropping without waiting for the next periodic refresh.
- Airport rendering sends an explicit desired view after drawing its chart. Repeated ground reports replace queued takeoff requests even when the sheet is already temporarily visible during transport.

## Reconciliation

The four temporary `.map-repair-*.json` files were alternative patches against an older source snapshot. Their source guards failed before application. They have been removed; useful explicit-view handling is implemented directly in the current shared controller instead. The superseded `apply-map-repair.yml` workflow is to be removed when consolidating the beta branch. Read-only regression and browser verification remain.

## Evidence and boundaries

The recovered baseline `f31c38f706ffc87bb4045fa849ad08c06b3c7bec` passed workflow `34803930859`: full application regressions on Linux and all 14 browser/layout cases on macOS Chromium and WebKit. That result was retrieved and its screenshots reviewed before the final request/initial-framing corrections.

Final code changes must pass the same workflow again. The browser proof checks actual frames, adjacent-sheet coverage, stationary hardware, text containment, no overlapping housings, camera/aperture aspect agreement, repeated reversals, post-settle clack dispatch and reduced motion. The unit suite checks explicit latest-request handling, registration-gap requests, hidden-page handling, preference changes and height-only camera refitting.

All browser data is fictional and no live provider credentials are used. Browser-engine verification is not hands-on testing on the Windows display or the family's iOS 12 iPad, and audio invocation checks do not establish physical-speaker sound balance. The running family server still needs its normal local update and restart after the verified branch is installed.
