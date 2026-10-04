# DadRadar testing protocol

Use focused checks while iterating, inexpensive complete deterministic regression on code pushes, and full exact-SHA browser verification before home deployment. Tests protect current family-facing behavior; they must not silently preserve superseded layouts.

## Commands

- `npm test`: build once and run the complete deterministic suite, including test-selection/failure-collection checks.
- `npm run test:browser -- --suite clocks`: focused clock checks in Chromium and WebKit at the kiosk and family portrait, plus arrival/next-flight transitions and crop/lighting registration after resize.
- `npm run test:browser -- --suite map --engine webkit`: one component/engine for investigation.
- `npm run test:browser`: all supported component/engine cases. Independent programs continue after failures and the final exit code fails if any case fails. CI runs these cases in parallel jobs.
- `npm run test:protocol`: fast regression for test selection and failure collection.

Browser commands require Playwright 1.63.0 and the selected browser binaries. The npm pretest hook builds the application once. Suite names: `weekly`, `split-flap`, `map`, `artwork`, `deployment`, `audio`, `clocks`. Existing fractional-scale, touch, animation, reduced-motion, recovery and layout cases remain in the full release coverage.

## Push selection

The verification workflow records the exact SHA, changed files and selected suites in its summary. Clock-only code/assets select clocks. Known weekly, split-flap or map edits also select their artwork integration consumers. Shared HTML/CSS, browser build, dependencies, state/server code, unknown files, unavailable diffs and verification-code changes select the complete browser matrix conservatively. Both sides of a rename are considered. Documentation-only pushes skip application/browser jobs.

Selection is intentionally conservative. Add a narrow rule only after identifying all consumers. A focused green run is not full release approval. The Windows control-contract workflow retains its existing triggers and hosted runner.

## Full release gate

Before deploying, obtain successful `regression`, every selected full-matrix `browser` job, and `release-gate` for the exact candidate SHA in **DadRadar verification**. The gate cannot pass if regression or any browser job fails, is cancelled or is skipped.

Trigger the workflow manually with mode `release` on the candidate ref. Alternatively create a new branch `verify/release/<40-character-candidate-SHA>` pointing to that exact SHA through the authenticated GitHub connector (`update_ref`, `force: false`) or Git. This triggers full release checks without another source commit. Verify the run's `head_sha`; do not infer it from a branch name or reuse earlier-SHA results. Do not move a release branch to another SHA.

For a local authorized git workflow:

```sh
git push origin <40-character-candidate-SHA>:refs/heads/verify/release/<40-character-candidate-SHA>
```

The workflow's matrix has failure cancellation disabled. Each component/engine has its own logs, exact-SHA checkpoint and artifact. Local browser results are isolated under `artifacts/browser/<suite>-<engine>/`. No huge source archive is uploaded routinely; manual `preserve_source` is available when a complete rendering checkout is needed.

After the gate passes, follow [home control](../ops/home-control/README.md): private allowlisted exact-SHA deploy, full Windows tests, managed restart, changed server instance and independent healthy status. Public verification uses only GitHub-hosted runners. Do not attach the home runner to this public repository or change the private executor to skip its Windows tests.

## Test maintenance

Every test should name a current behavior or a known defect it catches. Keep asset identity/dimensions, calendar/flight/arrival state, authentication, provider fallback and deployment-identity protections. Prefer rendered/behavioral assertions over exact source spelling, cache-version strings or incidental CSS formatting. Approved physical dimensions and artwork hashes remain legitimate contracts.

Remove exact duplicate assertions. Split-flap CSS wiring, seam, ink shadow and individual lamp behavior are owned by its two-engine browser proof; its deterministic source test retains immutable artwork identity rather than requiring particular CSS spelling or cache-version text. Consolidate a repeated browser assertion only after naming which suite and viewports own its coverage; a similar-looking check is not automatically redundant. Drive integrated fixtures through production events, use bounded readiness conditions, and keep unrelated animations out of focused checks.

Manual proofs `paper-chart-browser-test.js`, `scheduled-leg-count-browser-test.js` and `graphite-history-browser-test.js` are outside the routine npm/CI matrix. Preserve them until their unique coverage is reviewed; their absence from CI does not make them obsolete. A misleading filename also does not justify deletion: the clock-rods helper protects the absence of the retired rods.

A failing assertion may be updated only after comparing its expected behavior with approved current requirements. Runtime defects remain defects. Record retired coverage and its replacement rather than weakening thresholds to obtain green CI.
