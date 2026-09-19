# Repository cleanup implementation plan

> Execute inline using the executing-plans skill; obtain one independent review before publishing.

**Goal:** Apply the all-branch audit and remove obsolete tablet support while preserving the approved family-beta experience.

**Spec:** `Docs/Repository-audit-2026-09-19.md`, supplemented by Joey's explicit request to remove old iOS 12 testing language and behavior.

**Architecture:** Keep server/provider/state boundaries, build outputs, launch commands, and deployment control unchanged. Remove obsolete browser branches and retired artifacts, refresh current guidance, and preserve old Git histories before retirement.

**Constraints:** No provider, credential, startup, port, packaging, arrival, schedule, transport, artwork, audio, or needle algorithm redesign. Current Safari/WebKit remain supported. Preserve the original duty card and provenance. Keep the deployed branch and default branch identities. Do not rewrite history.

**Review focus:** Startup failure reporting without the main bundle; identical physical geometry at all five display sizes; poster failure/recovery and destination changes; reduced-motion and frame scheduling; exact branch preservation and deploy SHA.

### Task 1: Browser cleanup

- [x] Capture baseline artwork/browser results from the unchanged build.
- [x] Add behavioral startup tests against the real boot diagnostic, including failure, ready, timeout, and no layout mutation. Run against the old implementation and observe failure.
- [x] Replace the source-only frame-rate test with a real frame-progression test at browser frame intervals; observe failure before removing the obsolete throttle.
- [x] Extract the boot diagnostic into an independently loaded script. Remove layout detection, fixed-dimension fallbacks and obsolete cache labels. Promote existing modern CSS branches without changing their computed geometry.
- [x] Retain poster recovery and current engine support; remove the duplicate background rendering workaround only after its recovery tests and browser requests establish safety.
- [x] Run targeted tests and all deterministic tests, then commit.

### Task 2: Repository hygiene and verification

- [x] Consolidate `docs/superpowers` under `Docs/superpowers`; fix exact documentation paths and refresh current guidance.
- [x] Remove empty placeholders and the unused root HTML fragment; classify historical implementation notes explicitly.
- [x] Remove the retired ticker directory and confirmed unused duplicate/revision assets after reference checks; record hashes in the cleanup result.
- [x] Add named deterministic/browser test commands preserving all existing test invocations and nested tests. Add artwork/refresh browser checks to CI and broaden asset triggers; leave home-control untouched.
- [x] Run full tests, five-size artwork proof, refresh proof, transport proof, and inspect kiosk/family screenshots. Commit.

### Task 3: Branch preservation and retirement

- [x] Reconcile the audited branch heads with live GitHub and document divergent requirements already covered by current code/tests.
- [x] Preserve every retired branch tip in durable archive refs before deletion. Keep `main` and `agent/mobile-companion`.
- [ ] Retire obsolete branches only through supported authenticated capabilities. If no deletion capability is available, record the precise limitation without modifying control workflows or credentials.

### Task 4: Review and deployment

- [x] Obtain a fresh whole-change review, resolve substantive findings, and rerun affected verification.
- [ ] Publish through Git Data tools with `force:false`; compare local and remote trees before reconciling commit metadata.
- [ ] Request `[DADRADAR] deploy` for the exact pushed SHA, inspect workflow completion logs, and confirm deployed SHA and instance.
- [ ] Publish a concrete cleanup result and remaining limitations.

Execution note: tasks 1 and 2 were consolidated in one tested cleanup commit. Branch histories are archived; deletion awaits authenticated access. Runtime release evidence is tracked in the cleanup result and home-control issue.
