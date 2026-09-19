# DadRadar repository audit — September 19, 2026

## Outcome and scope

The current family-beta build passes its existing deterministic test suite. Repository maintenance has fallen behind the product: historical branches and design documents are mixed with active work, some assets are duplicated, and important newer browser checks are not wired into CI. The evidence supports staged housekeeping, not a wholesale rewrite or a merge of every branch.

This audit covers all **17 remote branch heads** discovered through GitHub and fetched explicitly. The original checkout had a single-branch fetch configuration; a normal fetch alone did not retrieve the other branches. The active checkout was not switched.

Baseline: `27cb461fa9b3ee9b7c55cd644fe3caee753fe643`, tree `8354a4080c7650aabce4ff3e738666b4a0ee474a`, branch `agent/mobile-companion`. This is also the deployment checkpoint provided by Joey. No deployment, restart, merge, branch deletion, dependency upgrade, or runtime modification was performed during the audit.

Depth: every branch was checked for ancestry, tree contents, unique commits, JavaScript syntax, and package-script targets. Diverged changes were inventoried and selected high-risk differences inspected. The active branch additionally received documentation, build/test wiring, asset-reference, duplicate-content, and architectural-boundary review. This is not a line-by-line behavioral proof of every historical implementation, a dependency vulnerability audit, or a full-history secret scan.

## All-branch disposition

Counts mean commits unique to the listed branch / commits unique to the current baseline. A unique commit is not necessarily unique behavior. Zero branch-only commits proves ancestry containment; it does not alone prove that no automation still refers to the branch.

| Branch | Head | Unique / current-only | Recommended treatment |
| --- | --- | --- | --- |
| `__nope__` | `6801f60` | 0 / 256 | Contained; same head as ticker-hires-probe. Retirement candidate. |
| `agent/connect-live-flight-state` | `ed7ed78` | 2 / 480 | Diverged early live-state implementation. Preserve; compare requirements before retirement. |
| `agent/ipad-air-compatibility` | `4e20fef` | 0 / 469 | Contained. Retirement candidate; retain current compatibility coverage. |
| `agent/live-flight-diagnostic` | `f6dff0c` | 0 / 471 | Contained; same tree as main. Retirement candidate. |
| `agent/map-roll-verification` | `70695da` | 0 / 290 | Contained, but still explicitly named by the verification workflow. Resolve that reference before retirement. |
| `agent/mobile-companion` | `27cb461` | 0 / 0 | Active and deployed. Keep as the cleanup base. |
| `agent/mobile-reliability-update` | `2855d43` | 7 / 469 | Diverged sequence-history/reassignment implementation. Preserve; do not merge wholesale. |
| `agent/recovered-family-beta` | `cb3d4dc` | 0 / 435 | Contained. Retirement candidate. |
| `agent/split-flap-matte-repair` | `cf64d74` | 9 / 232 | Diverged discarded material implementation and tests. Preserve until current coverage is compared. |
| `agent/split-flap-matte-repair-20260916` | `0064c2f` | 1 / 232 | Diverged raster material variation. Current SVG material/glow is approved; do not restore this variation. |
| `agent/ticker-asset-assembly` | `d26f851` | 5 / 256 | Diverged transfer chunks and ticker assets. One upload patch is already equivalent upstream; preserve remaining unique objects before retirement. |
| `agent/ticker-binary-stage` | `0802829` | 2 / 254 | Only branch-specific changes are noop and noop2 files. Retirement candidate after preserving the head. |
| `agent/ticker-clean-rebuild` | `59ffec7` | 0 / 254 | Contained. Retirement candidate. |
| `agent/ticker-hires-probe` | `6801f60` | 0 / 256 | Contained; same head as __nope__. Retirement candidate. |
| `agent/ticker-simple-fix` | `50d8212` | 4 / 258 | Diverged four-commit retired ticker variation. Preserve; do not bring its old presentation into the current display. |
| `main` | `625144c` | 1 / 471 | Default branch remains the August 13 tree. Its unique commit is merge metadata; no content change from its fork. Keep; any promotion is a separate release decision. |
| `tmp-v8-test` | `4c3ecd2` | 0 / 258 | Contained. Retirement candidate. |

Eight older branch heads are ancestors of the active build. Seven other branches contain non-ancestor changes; `main` has a merge-only difference. No open pull requests were returned by the GitHub repository search during this audit.

The exact head hashes below must be preserved in recoverable Git refs before deleting a branch with unique history. Recording a hash in this document is an inventory, not a substitute for an archive tag or another retained ref.

## Findings

### 1. Current and historical guidance contradict each other — high maintenance priority

- `Docs/Roadmap.md` still says that the browser acquires flight snapshots, paid airline status is omitted, and filed-route acquisition was removed. Current `server/master-state-service.js`, `server/index.js`, and the current architecture/dataflow documents show server-owned state, optional FlightAware operational status, and optional filed-route enrichment.
- `Docs/UI/Console-layout.md` describes an older layout as permanent and calls instruments decorative until live data becomes available. That contradicts the approved current implementation.
- `Docs/UI/Moving-map-module.md` describes FR24-specific live behavior despite the current provider-neutral, ADSB.lol-first architecture.
- `Docs/Current-build-handoff.md` is dated September 17; it does not fully capture the September 19 approved artwork, wheel readouts, refresh behavior, and paper treatment.
- The documentation index names `Design-Canon.md`, `Project-Decisions.md`, and `Application structure.md`; tracked names are `Design-canon.md`, `Project-decisions.md`, and `Application-structure.md`.
- Six documentation files contain no substantive content. `Docs/Application-structure.md` is an unfinished outline and `App/README.md` says only “Application entry point.” `services/README.md` incorrectly implies all providers live there; the actual provider adapters live under `server/`.

Action: make the current build handoff and architecture map the first entry points; label historical design notes as historical; repair exact filenames; replace or remove empty placeholders. Preserve the approved design canon and distinguish enduring intent from superseded layout specifications. Future agents should be directed to live code and the active branch before any historical design document.

### 2. Branch history and release identity need explicit ownership — high maintenance priority

`main` still has the August 13 content tree. It has one merge commit absent from the active branch but no tree change relative to its merge base. The active branch has 471 commits that are not reachable from `main`. This is not evidence that an old feature should be merged back.

The home-control installer explicitly sets `agent/mobile-companion`; the remote deploy process checks that a requested SHA belongs to the configured branch. The verification workflow also explicitly names `agent/map-roll-verification`.

Action: keep `agent/mobile-companion` and the current deploy configuration throughout cleanup. Preserve unique branch tips in archive refs, check external references, then retire obsolete branches in a separate operation. Promoting the family build to `main`, changing the default branch, or changing deployment identity is a separate release decision.

### 3. Windows-sensitive directory casing — medium priority

The tree contains both `Docs/` (49 files) and `docs/` (five Superpowers plan/spec files). They currently contain different subpaths, so this is not evidence of a runtime failure, but it creates inconsistent path identity between case-sensitive environments and the Windows deployment host.

Action: move the five plan/spec files into the established `Docs/` hierarchy with an explicit Git rename and update references. Do not bulk-lowercase runtime directories such as `App`, `Mobile`, or `UI`; their URLs and build paths are active contracts.

### 4. Retired and duplicate artwork — medium priority

The baseline tracks 339 files, including 100 assets totaling about 123.96 MiB. Posters account for most of this size and many files named “candidate” are the actual production selections. A candidate/version suffix is not a deletion criterion.

Five identical asset pairs contain 5,394,519 redundant bytes (about 5.14 MiB):

| Retained/compared asset | Identical counterpart |
| --- | --- |
| `assets/destinations/dca-poster-7x8-candidate-v2.png` | `assets/destinations/dca-poster-7x8-baseline.png` |
| `assets/destinations/dfw-poster-7x8-candidate-v2.png` | `assets/destinations/dfw-poster-7x8-baseline.png` |
| `assets/ticker/weekly-ticker-frame-v3.png` | `assets/ticker/weekly-ticker-frame-v4.png` |
| `assets/ticker/weekly-ticker-glyphs-v3.png` | `assets/ticker/weekly-ticker-glyphs-v4.png` |
| `assets/ticker/weekly-ticker-paper-v3.png` | `assets/ticker/weekly-ticker-paper-v4.png` |

`assets/ticker/` contains 18 files totaling about 2.14 MiB. The current weekly presentation uses `assets/hardware/weekly-overnight/`; literal ticker-asset references found in the tracked tree were historical documentation and an internal retired SVG-to-PNG reference, rather than active application code. These are strong retirement candidates, subject to runtime/network-reference verification.

Several older poster revisions also have no literal filename reference. This static check is insufficient by itself to authorize deleting every apparent orphan: dynamic paths, provenance metadata, approved originals, and retained rollback assets need separate treatment. In particular, retain `today-duty-card-v2.png` and the current material/hash JSON files as requested in the handoff.

Action: build an explicit keep/remove manifest, follow HTML/CSS/JS/SVG/config references and browser requests, retain approved provenance, and remove only confirmed retired files. Removing files from the current tree does not shrink already-published Git history; do not rewrite history to chase repository size.

### 5. Test entry points and CI have drifted — medium priority

`npm test` contains 60 chained Node invocations and passed on the current baseline, including its browser-build prerequisite. This provides useful regression protection.

The newer `scripts/approved-artwork-browser-test.js` and `scripts/deployment-refresh-browser-test.js` are not invoked by the GitHub workflow or package scripts. The workflow runs other browser suites, so the finding is a gap in specific new coverage, not an absence of browser testing. Its path filters also omit asset-only changes under `assets/ui/`, `assets/destinations/`, and `assets/maps/`.

`App/map-roll-lifecycle-test.js` initially appears absent from the package command but is required by `App/map-roll-transition-test.js`; it is already covered. Do not add a duplicate invocation.

Browser helpers repeat local HTTP fixtures and extract the `familyHtml` expression from server source with a regular expression. That couples tests to source formatting and makes harmless refactoring more likely to break test harnesses.

Action: add named deterministic/browser test groups while preserving existing Windows `npm test` behavior; include the two new suites and relevant asset paths in verification. Consolidate browser fixtures only as a separate tested change. Do not alter the home-control workflow, executor, restart broker, or deployment packaging as housekeeping.

### 6. Orphan fragment and misleading package metadata — low priority

`map-snippet.txt` is a 450-line partial HTML fragment at repository root. No tracked filename references were found; it is outside the server's public-directory allowlist and outside browser source inputs. It is a strong cleanup candidate, with its contents already recoverable from Git history.

`package.json` declares `main: index.js`, but that file does not exist. Actual launch commands use `server/index.js`; the Windows host imports its `startServer` export. This metadata mismatch does not explain a current startup failure. Decide whether to omit the package entry field or document the actual module contract without changing runtime packaging in this pass.

### 7. Architectural coupling deserves later, focused work — assessment needed

`services/calendar-state-controller.js` is 1,189 lines and serves both browser/master-client behavior and server reconciliation. The master service executes shared browser-shaped sources in a VM context with adapters for storage, timers, events, and provider calls. The browser bundle also includes these shared modules. This is a live dependency, not obviously dead browser code.

`App/main.js` is 2,226 lines, `App/route-map.js` is 2,191, `UI/styles.css` is 2,838, and `UI/layout-side-rail.css` is 1,524. These are maintenance review targets, not proof of defects. The 8,062-line airport catalog is generated data and should not be treated as an oversized handwritten module.

The old mobile-reliability branch contains a route-reassignment reset and a separate history stack. Current code already has `liveEventKey`, same-event route-edit assertions, and a server-owned sequence-history implementation. That supports preserving the current architecture; it does not prove that every old test requirement has been reconciled.

Action: compare divergent behavior requirements and tests before retiring their branches. If structural changes are later warranted, extract one boundary at a time with replay/contract tests and exact visual checks. Do not rename “ticker” or “shutter” identifiers solely because the display vocabulary changed; tests, diagnostics, and remote commands may still depend on them.

## Proposed cleanup sequence

1. **Documentation and repository housekeeping:** repair the index, refresh the current handoff and folder map, consolidate documentation casing, handle empty placeholders, and remove the unused root HTML fragment. Keep runtime code/assets and deployment settings unchanged. Verify links, case-correct tracked paths, diff scope, and the resulting tree.
2. **Asset and test organization:** produce a file-by-file removal manifest, confirm runtime requests, remove verified duplicates/retired artwork, and wire existing browser checks into regular verification. Run the deterministic suite and relevant browser suites, inspect kiosk/family screenshots, and deploy only a tested runtime-affecting commit through the existing home-control channel.
3. **Historical branch retirement:** reconcile unique requirements, create durable archive refs, confirm any CI/PR/deployment references, then delete only the explicitly listed retired branches. Keep `main` and the active deployment branch. No wholesale merges and no history rewriting.
4. **Code structure:** use the audit hotspots to scope separate small refactors. Preserve provider precedence, one master state, arrival/layover continuity, schedule identity, physical artwork, map transport, posters, itinerary, needles, and audio. No blanket formatting pass or opportunistic dependency upgrades.

The audit establishes scope; it does not declare the entire codebase cleaned or certify untested historical branches for deployment. Branch deletion and changes to the release/default branch remain separate from the safe first housekeeping batch.

## Verification performed

- GitHub branch listing and explicit fetch of all branch heads: 17 branches.
- Ancestry, merge-base, tree, branch-only path, unique commit, and patch-equivalence comparisons.
- All 305 unique JavaScript blobs present at those heads parsed successfully with the installed Babel parser. This is a syntax check, not a runtime-compatibility guarantee.
- All explicit `node <file>` package-script targets at those heads exist in their corresponding trees.
- No open pull requests returned by the repository search.
- Current `npm test`: passed, including build and 60 direct script invocations; nested suites also ran.
- Tracked file inventory, case-collision scan, content hashes, literal asset references, documentation/index review, and build/CI wiring review.
- No known credential/runtime-state filenames found at the checked heads. This was a filename check only; no claim is made about all contents or historical secrets.
- Browser suites were inspected for wiring, not rerun during this read-only audit. No live provider polling or home deployment was requested.

## Exact branch snapshot

- `__nope__`: `6801f60220e3bad42be0f541372b0743dc8ed3c7`
- `agent/connect-live-flight-state`: `ed7ed786b686b1879b1004ae616e09415296ff93`
- `agent/ipad-air-compatibility`: `4e20fefa8366e52fc1ce65fb1bd24e4898a0ec12`
- `agent/live-flight-diagnostic`: `f6dff0c674e2a7d06061dd6e74b4609b07f4df84`
- `agent/map-roll-verification`: `70695da4b917aaf112ae4f36bf1c49ee04b0cf57`
- `agent/mobile-companion`: `27cb461fa9b3ee9b7c55cd644fe3caee753fe643`
- `agent/mobile-reliability-update`: `2855d43c887a2426f54399b399ba82f83c227fba`
- `agent/recovered-family-beta`: `cb3d4dcfa1a1ed96ea943f8e43e2b44b6f8035ee`
- `agent/split-flap-matte-repair`: `cf64d743f843806788c987bb243c068c79384405`
- `agent/split-flap-matte-repair-20260916`: `0064c2f05ffb0ad662b4b40d302dcbceae1a9122`
- `agent/ticker-asset-assembly`: `d26f85153ff545c5e75e30cfc2505ff99b96e0eb`
- `agent/ticker-binary-stage`: `08028291356ffccff4027724432f527d4bce0cec`
- `agent/ticker-clean-rebuild`: `59ffec71e9de83770bb65e6649dd98ee795339bb`
- `agent/ticker-hires-probe`: `6801f60220e3bad42be0f541372b0743dc8ed3c7`
- `agent/ticker-simple-fix`: `50d8212620d37d33796e847d1b779bb65609e8ea`
- `main`: `625144c42697e832d9f6c9cfc4e9fff7089881a1`
- `tmp-v8-test`: `4c3ecd20f07030ccd6dd16d5c0bd885bb8d55039`
