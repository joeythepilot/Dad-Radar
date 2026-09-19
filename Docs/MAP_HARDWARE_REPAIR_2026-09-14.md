> Historical decisions, specifications or ideas. For the running build, use [Current build handoff](Current-build-handoff.md). Superseded details here do not authorize restoring older behavior.

# Final map-framing and transport consolidation

Family beta only. No production deployment, packaging or home-PC installation.

The approved shared 2.8-second roll, uneven speed, hesitation, lateral wander, variable blur, worn splice, V3 gearmotor assets and stationary bezel-mounted hardware are preserved from the successful `f31c38f` baseline. Workflow `34803930859` passed its application regressions and all 14 Chromium/WebKit layout cases.

This consolidation preserves the subsequent narrow Today's Duty repair, its browser proof and all original checks from `a7ecf6f`. It adds explicit desired-view messages between the airport renderer and roll controller, and refits the regional camera when the actual aperture changes after startup or layout changes. The extra request, registration-gap, reduced-motion and resize-loop unit checks pass locally. The full combined branch must pass both CI jobs before it is considered verified.

The obsolete patch payloads and auto-apply workflow are removed. There is one application implementation and one read-only verification workflow. See `MAP_REPAIR_RECOVERY_2026-09-14.md` for the earlier recovery and Today's Duty details.

Browser tests use fictional data and no live-provider credentials. Automated browser and sound-invocation checks do not replace the owner's visual/audio approval on the Windows display and family tablet. Nothing in these commits restarts or updates the running home server.
