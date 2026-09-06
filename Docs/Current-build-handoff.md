# Dad Radar authoritative build handoff

Updated September 6, 2026. Read this before choosing a development baseline.

## Recovered installed baseline

- Joey's Windows checkout: `C:\Users\cfijo\Dad-Radar`, branch `agent/windows-autostart`.
- Uploaded full-history bundle: `Dad-Radar-current-full.bundle`.
- Verified installed commit: `234fd7ce1a36a2b9245cffbe659d73608b77b3b9`, Add September posters and finish enamel placards.
- User's status showed no tracked-file modifications; untracked files were installer bundles and old token backups. Those untracked files are not in the recovery bundle.
- The complete bundle includes the missing development history, including `f24731c` and `f5d233a`.
- GitHub main observed during recovery: `625144c42697e832d9f6c9cfc4e9fff7089881a1`. The installed build has 35 commits beyond that main.
- Recovery/repair development branch: `agent/recovered-family-beta`, based directly on the installed commit. Never replace this baseline with the older mobile branch.

## Proven v10 regression and v10.1 repair

Diffing `234fd7c` against its parent shows that v10 replaced `server/index.js` with an older FR24-only server while adding enamel CSS and duplicate-start handling. This disconnected the existing adsb.lol/provider orchestrator and FlightAware route service, removed `/api/weather/radar` and both diagnostic endpoints, and removed the structured Calendar reauthorization response. The service modules remained in the tree and their individual tests still passed.

v10.1 restores that parent's server/provider wiring while preserving v10's CSS injection and duplicate-start handling. It also replaces indefinitely cached missing FlightAware routes with a five-minute retry interval. Successful route results remain cached under the existing per-leg lookup key.

This explains why ordinary telemetry could still work through FR24 while filed plans, radar, and diagnostics disappeared. It does not establish the cause of every historical interruption. Live provider credentials were not supplied in the bundle and no live account lookups were made during recovery.

## Verification

- The untouched recovered baseline passed its existing full `npm test` suite; those tests did not detect the disconnected HTTP wiring.
- New `server/provider-http-integration-test.js` fails against the uploaded server and passes after the restoration.
- New HTTP tests exercise the real Express routes and provider orchestrator with fixtures replacing external calls: adsb.lol primary, FR24 fallback, filed-route-only preflight response, radar PNG delivery, nonfatal radar failure, provider/weather diagnostics, chime event logging, and Calendar authorization status.
- Filed-route tests cover both no matching flight and a flight with no fixes, bounded retries, later acquisition without restart, and successful cache reuse.
- Full repaired `npm test` and `git diff --check` pass.
- Home-PC installation and live weather/filed-route verification remain necessary. A server restart is required; a page refresh alone cannot load server changes.

## Architecture to preserve

- Google Calendar: planned itinerary.
- adsb.lol: default primary telemetry; the existing provider orchestrator can prefer an already-selected FR24 provider.
- FR24: telemetry fallback.
- FlightAware: existing filed-route acquisition, including preflight lookup.
- NOAA NWS WMS: existing graphical weather radar overlay. Do not replace this repair with a destination-METAR feature.
- Keep the v10 approved posters, enamel placards, map, lighting, sound, and established display geometry.

## Candidate work on the older mobile branch

Observed remote branch `agent/mobile-reliability-update` ends at `2855d43c887a2426f54399b399ba82f83c227fba`. Its common ancestor with the installed build is `4e20fefa8366e52fc1ce65fb1bd24e4898a0ec12`.

Seven candidate commits add scope notes, sequence grouping/tests, server history and FR24 historical-track recovery, history display wiring, and same-event reassignment handling. They are not merged here. The reassignment implementation depends on the sequence event fingerprint; do not cherry-pick it in isolation without resolving that dependency. Server/index, browser build, controller, and map changes must be reconciled with the recovered runtime instead of replacing it.

The old branch's `Docs/Next-family-update.md` is stale where it names 4e20fef as the baseline or describes graphical radar as a future project. This handoff supersedes those claims.

## Authorized next-update scope, still unfinished

1. Calendar edits during a work sequence must be adopted without a browser refresh: reassignment, cancellation, deadhead, changed route/time under an unchanged event id. Diagnose the stale Tulsa layover and apparent three-hour timing discrepancy with actual event data; timezone cause is not proven.
2. Verify missing filed-route recovery using restored endpoint diagnostics. Joey clarified that the PHX–CLT great-circle fallback was accurate and the camera stayed at Phoenix because the flight had not departed. Do not treat that screenshot as proof of an incorrect arc or camera defect.
3. Confirm graphical radar after restart; investigate upstream availability only if the restored endpoint still fails.
4. Active multi-day work-sequence breadcrumbs and cumulative mileage are included. Preserve operating and deadhead tracks across layovers; reset after 48 hours without work-flight activity. Ordinary personal commutes remain separate. Use observed tracks; never count canceled plans or fallback arcs as flown mileage. Share persistent history between home and mobile views.
5. Secure, authenticated, encrypted mobile/PWA companion for Allison's iPhone and Delaney's modern iPad. Preserve the home console presentation. Remote access and live credentials must remain protected; no remote service has been deployed by this repair.
6. Old iOS 12 compatibility is no longer required. Its removal is not performed in the v10.1 repair.
7. Preserve/check poster and 10,000-foot chime reliability during integration. Push notifications remain a later feature.

## GitHub synchronization

Authenticated command-line Git push is unavailable in the recovery session (dry-run failed with no HTTPS username). No original commits were rewritten to simulate synchronization. The recovery bundle is complete and the incremental repair preserves its ancestry. GitHub synchronization remains pending until the home PC pushes its recovered history, ideally after applying the repair, to `agent/recovered-family-beta`:

```bat
git push -u origin HEAD:refs/heads/agent/recovered-family-beta
```

Do not force-push. If rejected because another session advanced the branch, inspect and reconcile first. After synchronization, use that branch and this handoff for continued development; verify actual remote HEAD before changing it.
