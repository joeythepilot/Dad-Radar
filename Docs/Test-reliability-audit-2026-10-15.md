# Test reliability audit — October 15, 2026

Joey requested investigation and correction of misleading failures and slow
deployments. This pass changes test utilities only: no runtime, artwork,
geometry, animation duration, release policy, executor or security changes.

## Evidence, not a blanket flaky-test diagnosis

| Evidence | Finding | Treatment |
| --- | --- | --- |
| Full gate 38737056469, WebKit job 116429096530 | Real split-flap motion ended between driver reads; outgoing/incoming ink became undefined. | Atomic capture fixed in deployed d6366ac. This pass retains the actual 1000 ms delayed-response challenge in CI. |
| Runs 38659382117 and 38679736034, Chromium airline-logo cases | Geometry comparisons failed against old spacing or a photographic aperture-derived ratio. | Already corrected before this audit; current comparisons use independently captured original mobile geometry, not dimensions derived from the plate under test. Do not loosen tolerances or reshape mechanisms. |
| Runs 38636752595, 38639571670, 38649592387 and 38080962147, WebKit power case | Missing transient flap, empty computed duration, or locator timeout. | Current code already captures connected mechanics before screenshots. Do not reintroduce driver/screenshot reads of transient nodes. |
| Runs 38636752595 and 38639174872, schedule-state regression | LOCATION_UNKNOWN versus expected RESERVE. | A schedule behavior failure, not evidence of a random timing issue. Keep the reserve contract; this pass does not rewrite those assertions. |
| Run 38643776172, weekly startup and map registration; run 38073842473, weekly animation | Condition timeouts. | Historical evidence alone does not establish whether the condition was missed, late or genuinely wrong. No blind timeout increase or assertion removal. Further reproduction is needed before changes. |

All surveyed runs above were first attempts except 38649592387 (attempt 2).
Run 38645298895 succeeded on attempt 2; that is not, by itself, a diagnosis.
Cancelled production runs also occur when a newer metadata push supersedes
them; cancellation is not a failed product assertion.

## This pass

- `browser-response-delay.js` delays only delivery of the first evaluation
  response. The real action executes once; real browser timers and animations
  continue. The evaluator is restored on both normal and exceptional paths.
- Split-flap artwork proof uses that challenge around its existing assertions.
  Temporarily restoring separate flip-start and evidence evaluations produces
  the original failure: zero moving halves versus two. Atomic capture passes
  the same challenge and still checks actual settlement to Z. No suite retry.
- Two power-test `waitForFunction` calls passed `{timeout:15000}` as the page
  function's argument, not Playwright's third options parameter. Corrected to
  `null,{timeout:15000}`. A real local browser characterization with a 100 ms
  default and a requested 20 ms wait showed old form timing out at 100 ms and
  corrected form at 20 ms. This fixes an ineffective timeout, not a product
  condition or an excuse to extend the wait.
- The browser runner emits structured case status, duration and artifact path
  immediately after each case, not only at the end of its worker. A real-child
  regression verifies the first failure is reported before the later case
  executes, later evidence is still collected, and overall exit remains failed.

## Deployment time and profiling

Clean exact-SHA full gate 38739031060 ran from 13:00:05 to 13:10:16 UTC.
Its WebKit worker 116435774615 spent 25,831 ms on split-flap, 150,933 ms on map,
33,055 ms on posters and 248,949 ms on family. The family scheduling hint was
80 seconds, so the hint is stale; it is not a coverage selector. Do not change
release selection based on an estimate.

The family hint is now 250 seconds. Replaying all eight literal observed
WebKit case durations through the unchanged scheduler reduces the largest
worker's assigned case time from 458,768 ms to 340,770 ms (about 118 seconds).
This is a deterministic scheduling comparison, not a promised hosted speedup;
setup, contention and run-to-run variation remain. All selected suite/engine
pairs still run exactly once, with the same five-worker concurrency bound.

Home deployment 38740459155 spent 116,680 ms on full Windows npm tests.
False failures add another gate cycle to that baseline. This evidence does
not support attributing all deployment time to retries.

A focused local Chromium profile retained all lifecycle checks and eight
resize/return layouts. Combined wood pixel/geometry proof calls took 65–259 ms;
the four final screenshots took 149–264 ms. Those local results do not identify
the WebKit bottleneck. Keep exhaustive coverage; do not replace it with a few
samples merely to reduce elapsed time. Browser startup, virtual stepping,
asset lifecycle waits and slower-engine rendering need separate measurements
before a performance refactor can be justified.

## Verification scope

Node protocol tests and full npm test passed locally. The retained actual
Chromium flap challenge passed, failed under the original race mutation, then
passed after restoring atomic capture. Full Chromium family/lifecycle passed.
The first local power capture could not start because Playwright's ffmpeg
binary was absent; this is an explicit environment failure, not a passing
capture. Functional power checks are separately run with capture disabled;
hosted default capture remains required by the unchanged full release gate.

Physical iOS 12/Pi behavior is not established by these checks. Remaining
historical weekly/map timeouts are not declared fixed without reproduction.

## Weekly readiness correction during the walnut release

Exact candidate 11dcb47, gate 38763346740, passed the corrected walnut proof
in Chromium and WebKit. Its unchanged weekly/WebKit initial readiness check
timed out at 4000 ms. Diagnostic 38765493859 retained that predicate and passed
all six views: it did not reproduce or explain the original timeout. In the
first desktop snapshot the correct labels existed by 1843 ms and the approved
artwork request completed by 1481 ms. Do not label the historical failure fixed.

A separate controlled real-Chromium case proved an invalid assumption in that
predicate: after all seven original images decoded, clearing only Resource
Timing history caused the original check to time out at 4000 ms. The corrected
proof passes that retained challenge and all six actual display layouts. It
requires actual labels, all seven decoded 1192x976 images, then the unchanged
approved image paths, geometry, physical artwork and real animation assertions.
This replaces incidental bookkeeping with a stricter actual-image contract;
it does not increase either 4000 ms deadline or change the product.

Fast predicate regressions reject missing/extra images and each of seven
undecoded or wrong-size positions. Future readiness failures preserve the
phase, expected/actual labels, image state and browser time in logs/artifacts,
without replacing the original exception if evidence collection also fails.
The original hosted timeout remains unattributed; other historical weekly/map
and animation timeouts are still open evidence gaps. A new exact-SHA full gate
is required before deployment; the diagnostic's pass is not a release override.
