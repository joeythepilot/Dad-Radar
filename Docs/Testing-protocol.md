# DadRadar testing protocol

Run one inexpensive complete deterministic pass for code changes. Select browser and Windows deployment checks by the complete change since the verified running deployment. A successful selected exact-SHA release gate is sufficient for a localized deployment; a full audit remains available for broad/unknown changes.

## Commands and coverage

- `npm test`: build once, then the complete deterministic regression. Schedule, arrival, provider, auth, audio, math and asset protections remain.
- `npm run test:protocol`: selection, required-result gating, multi-commit baseline and failure collection checks.
- `npm run test:browser -- --suite weekly,duty --engine webkit`: selected cases sharing one installed browser. Omitting suite/engine runs all supported cases.
- `npm run test:deploy -- --base <running-40-character-SHA>`: explicit Windows selection; never silently changes what `npm test` means.

Browser verification uses Playwright 1.63.0 and installed engine binaries. Suites are power, weekly, airline-logo, split-flap, map, artwork, deployment, audio, clocks, duty, posters and family. The runner collects independent failures, keeps suite/engine artifacts separate and records individual child times. Hosted CI installs each engine once per worker; it does not reinstall for each component.

Large selected runs use balanced workers, capped at two Chromium and three WebKit workers. Rounded measured suite runtimes guide assignment only; coverage selection, full fallback and the required-result gate are unchanged. Every selected suite/engine runs exactly once. Small scopes retain one worker per engine. Each worker has a unique job/artifact identity, so a failed-job retry repeats its assigned group rather than the entire engine. Added setup/compute is the tradeoff for shorter wall time; queue time and actual measured results must be reported separately from estimates.

The complete deterministic pass measured about 14 seconds on hosted Linux before this cleanup. Routine browser/Windows work is where selection saves most time. Queue, dependency/build, child-test and restart times must be reported separately; estimates in the approved inventory are targets, not guaranteed measured results.

## Baseline and release gate

`ops/home-control/verified-baseline.json` records the last independently verified running SHA and evidence. Update this record after a successful deployment/status confirmation. A manual workflow baseline can override it when backed by running-status evidence. CI compares that ancestor SHA to the candidate, including all intervening commits, deletions and both sides of renames. It never assumes `HEAD^` or only the last push describes the release.

Invalid/unavailable/non-ancestor baselines, new/unclassified dependencies, shared main HTML/CSS, build/dependencies and verification infrastructure select full coverage. Documentation-only changes skip application tests. Known isolated clock, map, weekly/duty, poster, split-flap, audio, provider, family and Windows changes select their explicit consumers. The hosted deterministic pass remains complete for every code change.

Every verification run publishes the candidate SHA, baseline, changed paths, selected cases and Windows scope. The gate requires successful plan/regression/browser jobs when selected; only genuinely unselected jobs may be skipped. Failure, cancellation and missing required results block the gate. Gate job names record either `release-gate (full)` or `release-gate (base <SHA>)`.

The home executor accepts only a successful exact-candidate-SHA public gate. A scoped gate must match the running baseline; a full gate can cover an older/missing baseline. Moving a branch does not transfer proof to another SHA. Home-control/package changes also require their exact-SHA hosted Windows contract. Browser and public verification run only on hosted runners; never attach MAXWELLHOUSE to the public repository.

Use workflow mode `scoped` (default) for selected release verification or `full` for an explicit audit. An immutable `verify/release/<candidate-SHA>` branch triggers full verification through the connector when dispatch is unavailable. Do not create repeated full runs merely to compare small changes. Full verification is warranted for a change to this infrastructure itself; after that passes, a representative non-clock focused comparison validates selection and timing.

## Browser ownership

| Requirement | Owner |
| --- | --- |
| Weekly schedule, rollover, resizing/density and real wheel animation | weekly; expensive change animation on kiosk and Full portrait per engine, settled layout checks elsewhere |
| Duty raster, three-row stamp/time separation, five ruled flight rows, commute number and narrow Full status fitting | duty, on both engines and the existing five representative layouts |
| Map geometry, camera, transport/reduced-motion, touched layout classes and stale diagnostic replay | map; no duplicate complete duty scenarios on every screenshot |
| Physical cutouts, gauges, wheel art, pointer/sequence placement and printed ink raster | artwork; integration housing geometry remains |
| Clock digits, ETA states, arrival/next leg, independent lighting and aperture/crop registration | clocks on both engines; broad artwork no longer repeats complete clock scenarios |
| Selected poster decode/foreground path | posters on both engines; compact route has no poster |
| Full family rendering on phone portrait, phone landscape, tablet and legacy Full URL; watchdog and no layout bar | family; auth semantics are additionally owned by the real HTTP password/Access tests |
| Mobile photo registration and its exact source/donor PNGs | split-flap, clocks and family; Windows startup smoke |
| Approved mobile walnut overlays and instrument plate PNG | family mounting/alpha/stacking proof; Windows startup smoke |
| Mobile layout JS/CSS and its unit test | weekly, airline-logo, split-flap, map, artwork, clocks, duty, posters, family; Windows startup smoke; primary-only power/audio/refresh scenarios excluded |
| Shared component-browser-test harness | duty, posters and family; every consumer of that harness |
| Audio gesture/diagnostic controls | audio; unit tests independently cover flap, map motor, short-flight chimes and station identifier |

Mobile photo/wood owners include future numeric versions of the same reviewed
asset roles; a routine PNG version bump must not silently restore full fallback.
New asset roles and unknown Mobile code still require full coverage. The real
CLI regression uses a production PNG and multiple Git commits to verify both
selected cases and Windows smoke across the complete baseline diff. Layout
changes retain all nine affected suites; a material-only change does not inherit
that broader layout scope. Changes to the selector itself still require one
full verification before release.
| Refresh/offline/wake/reload behavior | deployment |

Approved artwork hashes and physical geometry remain exact where approval requires them. Map/terrain cache revisions are checked once in the expanded-map asset contract, not frozen to historical strings. The unused contiguous-US asset assertion is retired; the current expanded map's geography/lakes/borders remain protected. Map home/throttle regressions exercise rendering rather than variable/call spelling. Poster approved membership is independently recorded without freezing catalog size at 175. Duty source tests retain raster dimensions/build inclusion; rendered fit replaces literal CSS spelling.

Manual paper-chart, scheduled-leg and graphite-history proofs remain manual until every unique assertion has an active replacement. Old filenames and fixture dates do not make useful regressions obsolete. Legacy duty entry selection still has a runtime consumer and is retained. The FR24-required readiness checker discrepancy is a separate runtime-policy issue, not concealed by relaxing its test. Precise split-flap appearance calibration remains pending a documented replacement; animation/blanking/ink checks stay active.

## Deployment

Follow [home control](../ops/home-control/README.md). The fixed executor captures and checks the running baseline before moving the checkout, validates hosted proof, installs dependencies, then calls `test:deploy`. Shared/platform/unknown changes run full Windows verification. Isolated presentation/data changes build and run deployment identity, host/restart-marker, gateway-startup and boot smoke. Rollback and missing running identity retain full local verification.

Every deployment still requires healthy startup, exact running SHA and changed server instance; a separate status probe records final identity. The installed `C:\DadRadarOps\DadRadarRemote.ps1` must be updated through the trusted installation path; editing its repository copy is insufficient. Status includes its SHA256. No arbitrary shell command, new runner privilege, artwork upload or runtime feature change is part of this protocol.
