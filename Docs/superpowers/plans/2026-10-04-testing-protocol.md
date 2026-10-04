# Testing Protocol Implementation Plan

> **For agentic workers:** Execute natively in this session, following the approved testing-protocol review; no agent delegation.

**Goal:** Reduce routine verification cost while retaining full exact-SHA release and Windows deployment gates.
**Architecture:** A conservative changed-file selector feeds independent component/engine CI jobs. A shared browser runner collects all failures; the existing artwork proof supports focused clock checks without losing its full mode.
**Tech Stack:** Node scripts, npm commands, GitHub-hosted Actions.
**Spec:** Joey approved the October 4 testing-protocol review and in-chat protocol table.

## Constraints

Preserve runtime/artwork, complete deterministic tests, private home-control executor, full Windows deployment tests and SHA/instance verification. Unknown/shared paths broaden coverage. Docs do not start application tests.

## Review focus

Clock selection must include both engines; unknown diffs must not skip; independent failures must not hide later results; artifacts must not collide; focused results must not satisfy the release gate.

- [x] Add behavioral selection and real-child failure-collection regressions; observe failure before implementation.
- [x] Implement selector and runner; verify clock/shared/docs/unknown selection and failure propagation.
- [x] Add focused clock mode, isolate artifacts and retain existing full browser assertions.
- [x] Replace serial CI with conservative matrix selection and aggregate full-release gate; make source archives optional.
- [x] Remove exact duplicate duty assertions and update commands/protocol guidance.
- [ ] Verify syntax, whitespace, complete GitHub regression and every browser case on the published SHA.
- [ ] Record exact CI and deployment-boundary evidence in continuity.
