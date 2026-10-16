# Family loading: verified cache/startup release

Joey reported a 35-second mobile load on 5G and authorized a performance fix with the approved appearance preserved. Initial diagnosis confirmed every gateway response was no-store and the family viewer inherited a fixed three-second appliance startup wait.

## Release scope

- Permit authenticated built-in artwork to be privately stored and revalidated with ETag/304. Full successful responses and conditional 304s only; partial audio, errors and unauthorized responses remain no-store.
- Keep HTML, code/configuration, authentication and all live/API data no-store. Authentication remains ahead of conditional asset serving; expired/revoked password cookies cannot obtain a 304.
- Skip the artificial 1800/3000ms startup timers only for data-family-full. Preserve the primary appliance's sequence and immediate shared-state startup.
- Preserve every production image byte, mechanism, clock, layout and material. No image-format substitution, resized images, new dependencies or executor/permission change.

## Investigation and deliberate boundary

Lossless WebP study is retained separately on agent/mobile-loading-performance at71061942aed4d0aa072d4119bf33e42987e27bec. Ten offline variants decoded to exact RGBA in Pillow, but the actual Chromium canvas comparison differed. That study did not clear its exact-SHA gate and was NOT deployed. Do not explain away the difference, weaken pixel assertions or equate offline equality with browser appearance. This release branches independently from verified production receipt1509f84, and contains none of that delivery middleware, variants or application dependency changes.

Three study gates were inspected, not blindly rerun:38899009271 exposed a response recorder reading an Express-stripped URL;38899964674 exposed a proof that incorrectly expected cacheability for partial206audio;38901159965 reached and failed the browser pixel comparison. Real mounted-router and partial-response RED/GREEN tests now protect the instrument. The actual third-study Chromium record showed37,394,399bytes cold versus500,968bytes repeat, with33body-free304s; those are synthetic-hosted measurements of the study, not this release's measurements or Joey's 5G result.

## Verification and release contract

Run complete npm test. Run existing full exact-SHA hosted Chromium/WebKit gate and Windows contract. The family proof uses the actual authenticated production gateway with existing fictional state, measures cold/repeat body bytes, requires at least90% less repeat artwork/audio transfer, verifies the ten approved PNG response hashes, exercises rotation and keeps all eight layout/alpha/geometry cases. Original PNG delivery, not a tolerant substitute, is the visual-preservation guarantee.

The first-visit payload remains large. This release addresses repeated downloading and startup waiting; it must not be described as a measured solution to every35-second cold5G load or as product-ready performance. A separate cold-load delivery strategy remains needed, with no base64 image transfers (Joey reported repeated chat freezes).

Deploy only after the exact gate succeeds, using the existing private allowlisted home-control path; independently verify running/installed SHA, clean checkout, healthy startup, changed instance and unchanged executor, then record a metadata-only receipt and continuity evidence. No installed-code or user-device claim before those checks.
