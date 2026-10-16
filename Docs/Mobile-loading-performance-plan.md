# Mobile loading performance implementation plan

> Execute inline with test-first verification; obtain one independent whole-branch review before release.

**Goal:** Reduce mobile startup waiting and graphic transfer without changing approved pixels, geometry, mechanisms, or family privacy.

**Architecture:** Retain approved PNG originals. Serve offline-authored, exact lossless WebP alternatives only when explicitly supported, with PNG fallback and `Vary: Accept`. Authenticated static artwork may be privately stored but must revalidate; HTML, code/configuration, APIs, authentication and errors remain no-store. The family viewer skips the primary appliance's artificial startup timers.

**Spec:** Joey's October 16 request to fix the reported 35-second mobile load; approved release and preservation constraints in continuity updates 93–95/111.

## Global constraints

- Preserve every approved original asset and all module/mechanism geometry.
- No runtime renderer, new application dependency, CDN exposure, credential change or executor/permission change.
- Every artwork request still passes family authentication; logout/expiry must not serve a conditional 304.
- Never cache schedules, positions, calendar tokens, family HTML, configuration or authentication responses.
- Use the existing exact-SHA release gate and private home-control deploy/status path.
- Distinguish synthetic hosted measurements from Joey's real 5G timing; do not claim an unobserved phone result.

## Review focus

- Unsupported image format / `q=0`: retain PNG; negotiated variants never mix in cache.
- Conditional requests after logout: reject access, no-store, never return 304.
- Error, path traversal, non-artwork, API and login responses: no caching exception.
- Rotation and delayed/failed images: preserve registered openings and original labels/fallback.
- Primary appliance startup: retain its existing 1800/3000ms sequence.

## Tasks

1. Authenticated artwork reuse (`server/mobile-access.js`, its existing test): add real HTTP tests for private revalidation/304, unauthorized conditional requests, non-artwork and error no-store; observe failure, then implement the narrow policy. Keep all authentication checks.
2. Lossless delivery (`server/artwork-delivery.js`, `server/artwork-delivery-test.js`, `server/index.js`, `assets/mobile-optimized/`, offline `scripts/build-mobile-artwork.py`): first assert real image negotiation fails on the old PNG-only server; generate exact RGBA-equivalent variants and a hash/size manifest, then implement explicit WebP negotiation and PNG fallback. Test q=0, HEAD, Vary, conditional validators, source hashes and all manifest entries.
3. Mobile startup (`App/main.js`, `App/mobile-startup-timing-test.js`): execute the real startup function under deterministic timers; first demonstrate the current 3000ms family wait, then remove only family delays. Assert the primary sequence and calendar startup remain intact.
4. Browser/release proof (`scripts/mobile-loading-browser-proof.js`, family suite integration, package regression): measure cold/repeat transferred bytes through the actual authenticated gateway with fictional state; exercise format support/fallback and decoded RGBA equivalence. Run complete npm regression and exact-SHA hosted Chromium/WebKit gates; obtain independent review, fix important findings test-first, then deploy and independently verify SHA/health/clean checkout/new instance. Commit the metadata receipt and update continuity only after verified deployment.

## Execution ledger

- Base: production receipt 1509f84ffd21353b73913bd939ac3724fde3bc54; recorded live runtime 84f94395b4afb1d2f7c6a5a6b93d4ea597248fb7.
- Dedicated fresh checkout and task branch agent/mobile-loading-performance; no user edits present.
- Prior diagnostic confirmed `private, no-store` on a successful authenticated PNG request and 3000ms startup configuration.
- Local browser launch is blocked by environment Unix-socket permissions. Do not bypass; browser proof must run on existing hosted runners.
- Regression: original complete npm suite passed; cache, image-negotiation and real startup tests each failed before implementation and then passed. Complete modified npm suite passed twice before final review additions.
- Independent whole-branch review found no production blocker. It caught an Important proof-only classification error (CSS under /assets must remain no-store); corrected the classification and added the complementary no-store assertion. Strengthened negotiated-format/pixel evidence and revoked/expired password-session conditional tests.
- No downsampling or generative image editing: all ten offline delivery copies have exact decoded RGBA equality; original PNG hashes are unchanged. Local browser measurements remain unavailable, not inferred from unit tests.
- Joey reported another chat freeze during binary transport. No further base64 transfers are permitted. All ten delivery blobs had already been stored and matched local Git blob identities; publication uses only those SHA references and text.
- First hosted candidate c9a4994 failed the new Chromium loading proof after all eight family layout cases passed. Inspected job 116966505360: recorder read req.url at response finish, after Express's static router removed /assets. Real mounted-router regression reproduced /fixture.png instead of /assets/fixture.png. Capture the original path before routing; preserve all cache assertions and require a new exact-SHA gate, not a rerun of the failed source.
- Candidate e9df747 reached the corrected recorder and exposed a proof assumption: /assets/audio/split-flap.mp3 legitimately returns 206/private,no-store. Downloaded ordinary ZIP artifact 12045493854 (no base64); its cold JSON identifies that sole policy mismatch. Added RED/GREEN partial-response policy proof; 200/304 artwork still must revalidate privately, and partial/error responses still must remain no-store. Move loading proof before the expensive eight-view family sequence so instrumentation failures surface sooner. Cold measured artwork/audio was 36,728,765 bytes on hosted Chromium; localhost timing is not 5G timing and the first-load payload remains a product limitation, not a solved claim.
