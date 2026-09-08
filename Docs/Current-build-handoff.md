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


## Mobile companion continuation (v11)

The repaired `cb3d4dc` baseline was subsequently confirmed on GitHub and Joey confirmed weather works after installation. The mobile-first follow-up is on `agent/mobile-companion`; inspect its actual HEAD before continuing.

Implemented: dedicated `/mobile` view using the existing Calendar/live controller, vintage map and posters; commute-home arrival emphasis; destination-local absolute arrival timestamps and stale-data labels; foreground refresh and installable metadata; no offline private-data caching; separate loopback-only Cloudflare Access gateway; guided `mobile:setup`; full setup instructions in `Docs/Mobile-family-setup.md`. The candidate same-event route-edit test was ported and the provider-match identity now includes route, flight and start time independently of the Calendar lock identity.

No remote deployment is complete until the user's Cloudflare DNS, family policy, AUD/team settings, and Windows tunnel are configured and cellular-tested. This is a mobile-first release; sequence history/mileage remains authorized and unfinished. The remaining timezone/calendar-notes investigation is not represented as solved by formatting the mobile arrival time correctly. Browser visual verification and real-device tests remain unperformed; automated server/model/security tests passed.

## Current continuation: airport ground view (September 8, 2026)

The accepted mobile layout at `7c74fd5` is four stacked split-flap rows at left and a permanent map at right, with arrival time on the map. Posters and Today/Live switching were removed from mobile. Preserve this layout; the earlier v11 description above is historical.

The airport-ground follow-up continues directly from that commit on `agent/mobile-companion`. See `Docs/Airport-surface-view.md` for behavior, validation and installation. It adds automatic cached OSM airport geometry, equal-scale ground projection, raw ADS-B position rendering, field-elevation-aware regional zoom, and stationary Taxi-Out handling. Fresh ground ADS-B at departure means Taxi-Out under Joey's transponder practice; movement is not required. Destination ground follow-up is adsb.lol-only and ends after five minutes without new ground reports.

Trip breadcrumbs/mileage and the Cloudflare account/domain setup remain unfinished. No remote tunnel has been configured by this change. Do not return to the old `agent/mobile-reliability-update` branch or replace the recovered server wiring.


### Boarding overlap correction

Joey's September 8 test showed flight 3498 ORD–BIL in Today's Duty at 10:39 Eastern, with a 10:40 departure, while overlapping HOME entries kept the main display at HOME. Calendar retrieval was successful. The resolver returned an active ground event before considering the upcoming boarding window.

Upcoming flights now take priority over day-off/layover entries within the configured boarding lead time. Active flights and explicitly locked delayed flights retain priority over later flights. Cancelled flights remain excluded. This change is a small follow-up to `2efda56`, with regression cases for the observed overlap, the boarding boundary, cancellations, and active/locked legs. Primary bundle and mobile model cache versions are advanced.

### FR24 ground telemetry correction

The next test showed ORD–BIL 3498 as BOARDING with speed/heading displayed; FR24's app showed ENY3498/N311VE at 2 knots and zero reported altitude. This establishes what the screens displayed, not which provider the PC selected or its installed commit. Code review found that the generic FR24 phase resolver retains BOARDING below three knots, while the new close-up and late-departure override accepted only adsb.lol.

The follow-up uses already-received, fresh FR24 ADSB fallback records as ground evidence when altitude is zero, speed is known and low, vertical movement is absent, and the aircraft is at a route endpoint. This is explicitly an inference, unlike adsb.lol's ground flag. Those records now feed the raw ground map and stationary Taxi-Out override. Other current provider reports also replace the raw surface candidate, so airborne/unknown reports cannot accidentally preserve the prior provider's ground flag. No FR24 polling interval or provider order was changed. Any continuing ground-arrival polls remain adsb.lol-only, including when FR24 first reported touchdown.

Regression tests reproduce the zero/two-knot fallback case through the provider adapter, reconciler and camera selector, reject stale/missing/estimated evidence, and cover free-only arrival follow-up after an FR24 report. Primary and mobile script versions advance together. Actual PC provider diagnostics and live installation remain the final on-device check; the screenshot alone cannot prove the selected feed.

### Mobile duty day and numerical instruments (v11.5)

Continues from `11f9950` on `agent/mobile-companion`. The four split-flap fields now occupy a compact upper section of the existing 25% left column. Today's Duty fills the space below, using the shared daily schedule and its current/completed/upcoming states. Departure times retain the primary display's Eastern zone, shown as ET; arrival remains destination-local. Flight rows take precedence over overlapping all-day HOME/layover rows. HOME still has a useful off-duty entry.

A ResizeObserver calculates how many rows fit without scrolling. The current leg and upcoming legs receive priority; small earlier/later counts identify omitted rows. Reassignment and calendar refreshes reuse the existing controller data. There are no Today/Live tabs or mobile posters.

The map's lower-left plate now includes numerical ground speed (kt) and altitude (ft), with a compact position-age line. Zero readings remain zero, unavailable values are dashes, and retained values are marked STALE or AGE UNKNOWN. Numbers come from the reconciled current flight, never an old unmatched snapshot. No provider calls or polling intervals change. The map width and lower-right arrival emphasis are preserved.

Validation: full `npm test` passed, with new duty-window, zero/missing/stale telemetry, and replacement-flight tests. Headless Chromium rendered the actual mobile page with fixture data at 844×390, 852×393, 667×375, 568×320, and 844×300, plus simulated 47px side/21px bottom safe areas. Geometry checks passed for page/duty overflow, permanent map, and separation of readings from arrival; taxi, stale, and HOME states passed with no page-script exceptions. The rendered layout was visually inspected. This is viewport emulation, not proof from the physical iPhone; WebKit could not run because the environment lacks its system libraries.

Install by fetching/fast-forwarding `agent/mobile-companion`, then reload the mobile page. Mobile HTML, stylesheet and script query versions are updated to 11.5. These mobile-only changes do not require interrupting the live test or restarting the server. If the preceding ground-telemetry update is not installed yet, its server changes still require the restart documented above.

### Airport centering and scale correction

Continues from `ed77e4e`. Joey's live AVL–ORD 3963 test now correctly showed TAXI OUT and fresh ground position, but the airport was small and pushed left. The cached 7 km radius query included an unrelated 04/22 runway about 5.5 km east of AVL. Fitting every returned feature widened the frame around both airfields.

The map service now identifies the aerodrome by ICAO/IATA within the bounded search, then requests surface features inside its OSM area. Where no usable boundary is available, it retains the ground network around the nearest runway, joining feature extents across gaps of up to 600 metres. This fallback tolerates incomplete taxiways but cannot prove airport ownership; mapped boundary results retain all their runways without that heuristic. Query syntax follows the [Overpass QL reference](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL).

Version 1 disk caches are filtered immediately on read and automatically refreshed into version 2. A failed refresh retains the corrected chart and the existing retry backoff. The browser checks again promptly when the server returns a usable chart with a refresh pending. Users do not need to delete runtime files. The camera fits the selected geometry with tighter padding, preserving north-up projection and equal scale; the full AVL ground network fills about 85% of panel height. No aircraft coordinates or provider polling intervals change.

Validation: full `npm test` passed. Added regression cases cover the extra airfield, connected parallel runways, disconnected runways inside an identified boundary, old-cache migration during an outage, version 2 restart retention, and centered primary/mobile bounds. A real Overpass response for KAVL returned its 17/35 runway without 04/22. Chromium rendered both the old cached map and the corrected live geometry for visual comparison, then checked centered framing, visible aircraft, and equal scale at 750×600, 600×280 and 390×265. Physical Windows/iPhone verification remains after installation.

Install by fetching and fast-forwarding `agent/mobile-companion`, running `npm.cmd test` to rebuild the primary browser bundle, then `npm.cmd run beta:autostart:restart` and `npm.cmd run display:restart`. Reload mobile too. A page refresh alone cannot load the new server-side map selection. Cloudflare setup remains paused at the nameserver step; this update does not configure a tunnel.

### Family-password authentication (September 8, 2026)

Continues from `97a55dc` on `agent/mobile-companion`. Joey explicitly chose a shared family password over email codes or Google sign-in. Mom and his sister also need access; Delaney has no email. This supersedes the earlier plan to require Cloudflare Access email identities for this installation.

The domain is active on Cloudflare after the GoDaddy nameserver change, and the public `dadradar` CNAME points to `joeythepilot.github.io`. A Cloudflare Access application named Dad Radar Family has been created for `family.joeymaxwell.com`, with a blank path. No tunnel or home-PC password has been configured by this code change.

Implemented: an explicit password mode in the existing loopback gateway on port 4174; vintage responsive password page; 30-day remembered cookies or 12-hour browser-session login; persisted hashes of random session tokens; server-side logout revocation; password changes revoke all prior sessions after restart. `mobile:setup` prompts privately for a password and confirmation, stores only a salted scrypt hash (N=131072, r=8, p=1), and preserves other `.env` settings. Re-running setup rotates the password hash and clears the obsolete Access email settings. No real family password was requested, generated, or saved in this session.

All private pages, artwork and APIs require a session through the gateway. Diagnostic/configuration APIs stay blocked, including differently capitalized paths; remote mutations require the configured HTTPS origin. Login has per-client and global rate limits plus bounded hash concurrency. Browser cookies are Secure, HttpOnly, SameSite=Lax and host-only. Unreadable session storage disables gateway startup; failed session writes cannot issue a login cookie. Gateway no-store survives downstream static middleware. Only the public login page is available without authentication. The mobile-only fetch adapter returns an expired session to login without changing local-display or legacy Access behavior. The home console and provider polling are unchanged.

Validation: full `npm test` passes with dedicated password/HTTP tests for invalid config, wrong passwords, unauthenticated APIs/assets, cookie properties, tampering, restart persistence, short/remembered expiry, logout replay, password rotation, origin/host rejection, rate limits, storage failures and settings preservation. Chromium over a local HTTPS fixture passed real form sign-in, secure cookie issuance, reopening with remembered browser state, automatic expired-session redirect, and portrait/landscape fit at 390×844, 844×390 and 667×300. Both login layouts were rendered; landscape was visually inspected. A PTY setup test confirmed neither password entry is echoed and only the hash is saved. WebKit/physical iPhone and the actual Windows tunnel remain installation checks.

Install and run `npm.cmd run mobile:setup`, then restart the background service. Confirm `/family/login` on port 4174 with the configured Host header. Only then remove the Cloudflare Access application for the family hostname so it no longer intercepts requests with email sign-in, and create the named cloudflared Windows tunnel targeting `http://127.0.0.1:4174`. Preserve the public information hostname, use no router forwarding, and never target unprotected port 4173. Follow the updated `Docs/Mobile-family-setup.md` for exact steps. Tunnel/PC changes have not been performed remotely; code is ready for installation.

### Windows mobile gateway startup correction

The first family-password installation exposed a startup bug: the Windows background host imports `startServer()`, while gateway startup was only in the CLI entry point. The primary display could run with port 4174 closed. Gateway startup and shutdown now belong to `startServer()` so both launch paths use them. Existing password configuration is preserved.

A regression test starts the real imported entry point, verifies the login endpoint returns HTTP 200 with the configured Host header on loopback, and verifies primary shutdown also closes the gateway. Run the full npm test suite before installation. Fetch and fast-forward `agent/mobile-companion`, then restart the background host and repeat the port 4174 login probe before continuing tunnel setup.

### Arrival retention and ADS-B rate-limit repair

Family tunnel and password access are confirmed working on the home PC and mobile. Joey's AVL–ORD test later showed Arrived, Delayed, Arrived, then No Track on both screens; taxi-in airport mapping was absent despite telemetry. The supplied recent diagnostics show repeated adsb.lol HTTP 429 responses and no-match responses from both live providers. They do not include the earlier ground-position payload, and cannot establish why the airport chart was rejected.

This bounded repair preserves the same flight's confirmed arrival through missing/stale data and fresh regressed departure phases, and saves confirmed arrival immediately during ground follow-up. ADS-B 429 responses now trigger a shared one-minute provider cooldown for normal and surface-only requests; the existing 403 cooldown and prohibition on paid surface follow-up remain. This is not a request-coalescing implementation. Arrival phase and provider regression tests cover these paths. Browser script versions are bumped for both displays.

The taxi-in map issue remains open pending raw ground source, freshness and accuracy evidence; this change does not relax position-quality checks or claim that issue fixed. Install with fetch/fast-forward, npm.cmd test (rebuilds browser), background service restart and display/mobile reload.

### Taxi-in through transponder shutdown

Joey's rule: arrival ground telemetry means Taxi-In even at zero speed; Arrived is reserved for reports stopping after parking. Provider ARRIVED/LANDED snapshots now enter an internal TAXI_IN phase. It stays selected and uses ADS-B-only surface follow-up without the former five-minute hard polling cutoff. Valid ground coordinates continue into the shared airport renderer. Position-quality and freshness requirements remain in force.

Completion requires five minutes of successful absence/stale-report checks, with no polling gap greater than two minutes. Fresh reports reset the grace timer. Errors, rate-limit cooldowns, malformed surface responses and HTTP failures reset it too and retain Taxi-In. The HTTP response distinguishes provider unavailability from a healthy no-match, and the browser treats unavailable surface tracking as an error. No paid surface fallback is added.

A per-browser Taxi-In checkpoint preserves the phase and last position through reload for the same event/route/start/candidates, up to 24 hours. Parking grace restarts after reload; it cannot be earned while the page was closed. Removed/reassigned events cannot adopt that checkpoint. It does not reconstruct the earlier failed test or share history between newly opened devices.

Validation: full npm test passed, followed by focused controller/API/provider checks for the final outage guard. Replays cover zero-speed taxi, destination airport selection, missing reports, outage recovery, a five-minute healthy grace, stopped polling after completion, reload continuity and no time-only completion. This verifies the flow with fixtures; the original ORD map failure still lacks a captured ground payload, so a live arrival remains the installation check.

Install from agent/mobile-companion, run npm.cmd test to rebuild the primary bundle, restart the background host/display, and reload mobile. Mobile script versions are bumped for the shared state, API and polling changes. Password and tunnel configuration are unchanged.

### Mobile arrival time in Eastern

Joey confirmed the live ORD–MSN 4038 taxi-out map works. He requested Eastern arrival times on mobile instead of destination local time. Mobile now formats all arrival times and their date/zone labels using America/New_York, automatically showing EDT or EST. This supersedes the earlier destination-local display decision. The mobile script URL is bumped to 11.6, and setup instructions reflect the change.

Validated with existing mobile tests (including the updated midnight date rollover expectation), plus summer/winter MSN arrival checks. Only mobile formatting and documentation change. Fetch/fast-forward and reload the mobile page; no server or primary-display restart is needed, so the ongoing arrival test can continue.

### Tablet full display and short-flight approach correction

Continues from 4717992. Joey approved the full primary display for landscape tablets through the family link, then explicitly requested an on-screen layout switch. `/mobile/full` reuses the primary HTML with a root base URL, family login recovery, the existing app manifest, and a compact layout bar. Automatic selects Full for landscape tablet-sized viewports at least 900px wide; phones and portrait/small tablet windows use Compact. Full/Compact overrides persist per device. The display fits its existing 16:9 composition inside the available viewport, with letterboxing on taller tablets. No second polling frame or new provider requests are introduced. The local primary route is unchanged.

The full route stays within /mobile PWA scope and existing family authentication. Private data is not cached offline; sign-in expiry returns to the family password page. The full route is tested as protected, and layout assets are served only through the existing authenticated gateway.

During this work Joey reported ORD–MSN 4038 climbing out but showing Approach. The shared provider phase rule could use the 90 NM destination radius even on the departure side of a short sector, especially with missing climb rate. It now requires arrival-side progress and respects an explicit climbing trend. Client reconciliation also rejects/releases Approach before halfway so a previously incorrect approach latch can recover. This fixes an identified code path; the exact live telemetry causing the report was not captured.

Validation: full npm test plus Chromium viewport checks at 1024×768, 1180×820, 844×390 and 768×1024 for automatic selection, no page overflow, full dashboard containment, manual switching and saved choice on reopening. Full tablet rendering visually inspected. Physical Safari/iPad remains the installation check. Fetch/fast-forward, npm.cmd test to build the primary bundle, restart background host and primary display, then reload the family app. Cloudflare and password settings need no changes.

### Regional zoom for short flights

Joey's ORD–MSN screenshot showed a continental frame with both airport markers clustered in the middle. The shared route camera capped zoom at 3.4× and applied minimum padding of 92/82 map units, dwarfing the short leg. The fit now permits up to 24× with smaller minimum padding, retaining proportional padding for longer routes. The low-altitude regional view uses the same tighter ceiling and cannot widen a short route that is already closer. OSM ground-airport selection and its quality checks remain separate.

Visual inspection also exposed the fallback route's fixed minimum decorative bend, which became a large detour on this sector. That bend now scales with route length. The fallback remains an illustrative direct-route curve, not a filed plan; filed geometry and actual track points remain authoritative when available.

Validation: route regression tests cover tight ORD–MSN framing, unknown altitude and non-widening descent, alongside existing filed-route/track/airport tests. Chromium rendered mobile 844×390, tablet 1024×768 and primary 1920×1080 with an ORD–MSN fixture. Airport placards remained inside each map; the compact view was visually checked with the full arrival plate. Full npm test also passes. The screenshot's Approach state cannot be attributed conclusively without the triggering telemetry: altitude, progress/proximity and motion inputs all contributed to the older rule, and a previous Approach label could remain during climb. The prior 78ab3fe approach guard is included.

Install with fetch/fast-forward, npm.cmd test, background/display restart and mobile reload. Primary bundle and mobile map script versions are bumped to regional-zoom-1.

### Release Landing when taxi-in is recognized

Joey's later ORD–MSN screenshot showed LANDING, GS 20 kt, altitude 0 ft, a position five minutes old and "Connection interrupted". Position age alone cannot confirm parking; errors reset the healthy tracking-silence timer. The screenshot does not establish which provider failed or prove transponder shutdown.

Inspection found a separate transition defect: the existing Landing latch returned LANDING even when the controller had converted a provider arrival to TAXI_IN. TAXI_IN now takes priority over that latch. A regression replay first reproduced LANDING instead of TAXI_IN, then passed with the change, following the same leg through Landing, stationary Taxi-In, outage recovery and five minutes of healthy absence to Arrived. This is a proven code defect, not a conclusive reconstruction of the live report.

With observed taxi-in, completion still requires five continuous minutes of successful checks without a fresh report. Fresh reports, provider errors and polling gaps over two minutes reset that grace.

### Estimated arrival when ground coverage is missing

Joey also requested arrival handling at airports where ADS-B reception stops at landing. A fresh, route-matched Landing report qualifies for a fallback only within 3 NM of the destination, at most 1,500 feet above known field elevation, at 0–200 knots, with no climb indication and no known poor position accuracy. Unknown coordinates, altitude, speed or report age do not qualify. An explicit on-ground altitude of zero is accepted; a materially below-field airborne altitude is rejected.

After that evidence, follow-up uses the existing ADS-B-only lookup and its explicit provider-health check. Ten continuous minutes of successful absence/stale-report checks produce ARRIVED with an estimated-arrival flag. Fresh reports, errors and polling gaps over two minutes reset the window. Reload restores the pending evidence or existing estimate, but restarts any pending silence window; closed-app time does not count. No paid fallback is added.

The estimate is labeled in the mobile arrival panel/story and primary duty context/ETA plate. No touchdown/gate timestamp or live instrument reading is fabricated. The previous position retains its original timestamp. Estimated arrivals keep polling and yield to fresh taxi, airborne or go-around reports. They are not saved as confirmed arrivals. Existing same-leg checkpoint validation and later-leg handoff remain in force. Removed the older clock-only Landing completion path, which could previously mark a scheduled-overdue flight confirmed during an outage.

Validation: full npm test passed. The Landing-to-Taxi-In regression first failed and then passed. Model tests cover distance, altitude, climb, age and accuracy exclusions. Controller replays cover missing ground reports, rate-limit errors, sleep/reopen, estimated-arrival persistence, continuing ADS-B-only checks, go-around recovery, normal Taxi-In completion and later-flight handoff. Mobile view-model tests check the explicit estimate label and absence of a fabricated arrival time. Chromium checks at compact 844×390, tablet 1024×768 and primary 1920×1080 verified visible estimate labels with no page overflow; compact and primary screenshots were visually inspected. Physical Safari remains an installation check.

Primary bundle and changed mobile script versions are bumped to arrival-fallback-1. Install this cumulative branch update with the same fetch/fast-forward, test, background/display restart and mobile reload commands. These are fixture-based checks; the installed flight's missing raw reports cannot be reconstructed from its screenshot, and any coverage-based arrival remains an estimate.

### Full-layout split-flap sizing on phones

Joey confirmed the installed update worked, but Full mode's split-flap was crowded on his phone. Chromium reproduced overlapping fields: the old 45×70 px minimum tiles exceeded a 54 px-high board, with negative gaps between flight/airport/status fields. Full mode now measures the board's available width and height and sizes all 18 tiles, lettering, internal gaps and field spacing together. A resize observer handles startup visibility, rotation and browser-chrome changes, with a hidden-attribute observer fallback for older iPads. The family Full layout uses explicit field widths; the local primary display and Compact layout retain their existing presentation.

Phone visual checks also exposed fixed-size clock and ETA panels overlapping on the map. Those two panels now scale with the Full dashboard. The layout controls remain at their existing touch-target size.

Validation: JavaScript syntax and server/index tests pass. Chromium checked 844×390, 844×300 with reduced browser space, 1024×768 and 393×852, including rotation back to landscape. All flap tiles stayed inside their board with positive field spacing, clock/ETA panels stayed separate and the page did not scroll. Phone screenshots were visually inspected. Physical Safari remains the installation check. Mobile layout script/style versions are now 2; fetch/fast-forward and restart the background service, then reopen the family app.
