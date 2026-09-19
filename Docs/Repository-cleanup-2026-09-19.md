# Repository cleanup — September 19, 2026

## Scope and baseline

Applied Joey's approved [all-branch audit](Repository-audit-2026-09-19.md) and request to retire obsolete tablet testing and behavior. Implementation starts from `3063fc6502817bce06c68b4031620fa9d51bf3e5` on `agent/mobile-companion`; its runtime matches deployed checkpoint `27cb461fa9b3ee9b7c55cd644fe3caee753fe643`.

## Changes

- Removed the old browser-version layout marker, fixed-dimension CSS overrides, flex-gap workaround, frame-rate cap, duplicate poster background renderer, and prefixed audio constructor in the retired ticker module. Current browser-frame scheduling and reduced-motion behavior remain covered. The existing modern browser build target is unchanged.
- Extracted startup diagnostics into `App/boot-diagnostic.js`, independent of the generated application bundle. Startup error, rejected promise, timeout, and successful-ready behavior have executable tests.
- Renamed the compact map loader to `Mobile/map-roll-entry.js` and the browser integrity check to `scripts/browser-bundle-test.js`. Removed obsolete support labels from active guidance and tests. Current Safari/WebKit and ordinary tablet usage remain supported.
- Removed unused paper-ticker text/glyph code and its obsolete tests. Retained the seven-bay overnight model, rendering, six-AM rollover, diagnostic interface, and approved artwork. Added coverage for edits, cancellation, and nonmutation in the active model.
- Deleted 26 confirmed unused images/artwork files (about 21.04 MiB) listed below, plus the orphan `map-snippet.txt` and six empty documentation placeholders. Current poster selections, artwork provenance, original duty-card artwork, and approved material files are retained byte-for-byte. Published Git history is not rewritten, so clone history size is not reduced.
- Consolidated the five lowercase `docs/superpowers` files under `Docs/superpowers`, repaired references, refreshed the current handoff and architecture/index pages, and marked superseded design notes as historical.
- Grouped the deterministic tests into named commands. Preserved the direct home-control contract gate. Added artwork and deployment-refresh browser tests to CI and broadened asset triggers. Removed the nonexistent package entry-point declaration; server launch commands, dependencies, lockfile, and production packaging remain unchanged.

Poster loading now uses its existing foreground image and placeholder/retry handling. The decorative blurred background takes the loaded image's resolved URL; removing the duplicate renderer also eliminates its stylesheet-relative asset request. No provider, arrival/layover, schedule-selection, map-transport, needle, or audio algorithm was redesigned.

## All-branch preservation

All 17 pre-cleanup branch heads are reachable from archive commit `939b99c6a3961ca2af0e17875833e0e1a9c9920c` on `archive/pre-cleanup-2026-09-19`. The archive commit has the unchanged active tree `0f1f21d51d6e59e50ec6d9397a60437e48c6d36a` and includes each distinct branch tip as a parent. This preserves unique historical objects without integrating their runtime changes. The exact branch/head mapping is retained in the archive commit message and audit (the active tip advanced to the audit commit before archiving).

`main` remains the default branch; `agent/mobile-companion` remains the configured deployment branch. The stale verification-workflow reference to `agent/map-roll-verification` is removed. Old display experiments are superseded by approved current artwork; old live-state and mobile-history implementations remain archived, with the current server-owned implementation and regression coverage retained.

**Branch deletion is pending authenticated access.** The connector can create/update refs but exposes no deletion operation. The browser is signed out; its delete control produced no deletion. No branch has been deleted, no credentials or control workflows have been changed, and no unique history has been discarded. Archived source naturally retains historical language; the active build and its guidance are the cleanup target.

## Verification

- Full `npm test`, including browser build, Windows installation contracts, server/state/provider/schedule coverage, and active presentation tests: passed locally.
- New startup and animation-frame tests failed against the original behavior and passed after cleanup.
- Artwork browser proof passed at 1920×1080, 1440×900, 1024×768, 844×390 full-family landscape, and 390×844 full-family portrait. Kiosk and portrait screenshots were inspected. Foreground posters loaded, with no failed asset responses.
- Deployment-refresh browser proof passed, including automatic navigation, downtime recovery, independent startup, wake events, preserved URLs, and loop avoidance.
- Chromium map geometry/transport proof passed across desktop, family, compact, touch, and reduced-motion cases. The old map geometry proof also failed on the unchanged baseline because it measured transparent tracker margins. Its assertion now measures visible artwork and verifies seating against both frame edges; runtime positioning is unchanged.
- Independent whole-change review found no critical or important issues. Direct checks of the actual poster renderer covered successful loads, fallback, stale destination callbacks, retry cancellation/exhaustion, missing posters, and recovery. The active seven-bay model/constants match the baseline.
- The prior deployed commit's macOS browser job was already failing because the weekly proof still expected the superseded duty-card filename and dimensions. The proof now checks the committed weekly-paper asset and its exact 1864×843 pixels.
- Browser proofs record the exact standardized ResizeObserver deferred-notification message separately from application exceptions. They now require eight rendered frames with no new resize notices after geometry verification, so persistent loops still fail. The error collector also has regressions for application errors, late errors, and recurring resize notices. See the [ResizeObserver processing model](https://www.w3.org/TR/resize-observer/#html-processing-model-event-loop). Runtime resize handlers are unchanged.
- Protected provider/state/configuration/operations code and approved hardware/material assets were compared with the baseline. The server change only updates family stylesheet/script cache versions.

Final publication and MaxwellHouse deployment are recorded by the exact-SHA GitHub Actions run and home-control deploy issue. A server restart proves the running build, not that a physical kiosk was visually observed refreshing. This cleanup does not claim a full-history secret scan, dependency vulnerability certification, or a rewrite of architectural hotspots.

## Removed artwork manifest

Each item remains recoverable from the baseline and archive. SHA-256 identifies the removed bytes.

| Path | Bytes | SHA-256 |
| --- | ---: | --- |
| `assets/destinations/asheville-poster-7x8-baseline-v1.png` | 2803559 | `2d60676b09351d13fbd58d8965a37a7ffd48e086cd3d36c54face277290374e0` |
| `assets/destinations/asheville-poster-7x8-baseline-v3.png` | 2590556 | `be5bf17648895e5780b39c20a9bb86ca99434a5e494aa59115f68267e7124bb1` |
| `assets/destinations/asheville-poster.jpeg` | 798494 | `2ae35e88cf7998034d714b8ab00fcdc5112b8f3f8234858d5745859db668640d` |
| `assets/destinations/dca-poster-7x8-baseline.png` | 2767712 | `0ba45b4296bdf121a7deae3f26c6c6ce55fef5b3f2d1b2ec9d0d892953c3969d` |
| `assets/destinations/dca-poster-7x8-candidate-v1.png` | 2887607 | `e8e4c57454757f24d5eb14d8f0b06494a672d9bd22ccae831b16cd447bb55725` |
| `assets/destinations/dfw-poster-7x8-baseline.png` | 2596511 | `d0a60d734a2321de417ac708f3278196b336e0ee88da38a6788ef957e25070e5` |
| `assets/destinations/dfw-poster-7x8-candidate-v1.png` | 2735832 | `07b9795c7ff65d78fd6661563e662e6f0f6017324e3341ad8ba1a19e2839d203` |
| `assets/destinations/ord-poster-7x8-candidate-v1.png` | 2630240 | `67d0d771b7e33397cfc1f2b16a9b8c8725f2080160af77797ade79b24c39663d` |
| `assets/ticker/weekly-ticker-frame-v1.png` | 8131 | `1c3ad249f676b597ec310b27a6742df95c1ea2472e7ae9da8c80a2b5771710d2` |
| `assets/ticker/weekly-ticker-frame-v2.png` | 4943 | `0f5ec8018f31b4d8ff709ecd362f6e0270fca12535c0019fbd676825adc96ebb` |
| `assets/ticker/weekly-ticker-frame-v3.png` | 7523 | `bd4859f4e4c3fa02c44198beb7fe9822ab981c0f70039f8a8471bda261c900db` |
| `assets/ticker/weekly-ticker-frame-v4.png` | 7523 | `bd4859f4e4c3fa02c44198beb7fe9822ab981c0f70039f8a8471bda261c900db` |
| `assets/ticker/weekly-ticker-frame-v5.png` | 7335 | `4b049929dd03f083c8ae237ae32268d1ed5eeafd9a71c326ce2bbf2e3b16c2f8` |
| `assets/ticker/weekly-ticker-glyphs-v1.png` | 11560 | `d6e6b0963878563dfac4a15c13cad36127d9e3c3938c70ece43e1cc525410758` |
| `assets/ticker/weekly-ticker-glyphs-v2.png` | 14384 | `e83ab1fcd5f79bfdfffc94ec7c0e0982e49c3c8b3d70618dff066bf014f5b68e` |
| `assets/ticker/weekly-ticker-glyphs-v3.png` | 7764 | `e50d580810342127e42fc2a562d0f7579856a6888a45796b9149203e80098840` |
| `assets/ticker/weekly-ticker-glyphs-v4.png` | 7764 | `e50d580810342127e42fc2a562d0f7579856a6888a45796b9149203e80098840` |
| `assets/ticker/weekly-ticker-glyphs-v5.png` | 12334 | `cab31a0d847df15702ec05cab97f9bd0f2eb388a24d33547ee0aa1f6c790432c` |
| `assets/ticker/weekly-ticker-machine-v8.png` | 9915 | `db0dff96e0f4b57761b3c700d2b19df99ac48cf3d9c7251f1ca9c6c161cd03a1` |
| `assets/ticker/weekly-ticker-machine-v9.png` | 1893599 | `99ed0e1799f291d97f46e960410ecbaef48d85ce9393cb4e251dd0df77c07b84` |
| `assets/ticker/weekly-ticker-mechanism-v10.svg` | 357 | `07f34a980986c83c9c887d71beaa3c79a1a97cee1082124261fc19fc6a2ab210` |
| `assets/ticker/weekly-ticker-mechanism-v11.png` | 216822 | `d9109bcffb304d966ea3a4c10ad23a8daa94462daae39bcdf1ea91158c868213` |
| `assets/ticker/weekly-ticker-paper-v2.png` | 1724 | `b78e6a454e36bd9e14c1bc49a990faa6be4e8b42c851ddbf121d77b485d54a93` |
| `assets/ticker/weekly-ticker-paper-v3.png` | 15009 | `ef5b00b8c012269ed6feec075a5e5a92620e770c4562d9f0279c30a1a13b5bd9` |
| `assets/ticker/weekly-ticker-paper-v4.png` | 15009 | `ef5b00b8c012269ed6feec075a5e5a92620e770c4562d9f0279c30a1a13b5bd9` |
| `assets/ticker/weekly-ticker-paper-v5.png` | 5286 | `e90f60192bd7e87b7c633b6f847ede977de9f30172e4ca1f5a22fb38fa304fe5` |
