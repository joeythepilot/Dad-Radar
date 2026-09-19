# DadRadar application structure

| Path | Responsibility |
| --- | --- |
| `server/index.js` | HTTP entry point, display pages, local APIs and family-gateway lifecycle |
| `server/master-state-service.js` | Single authoritative state, provider coordination, operational enrichment and persistence |
| `server/` | Calendar/provider adapters, access control, diagnostics and server tests |
| `models/` | Pure schedule and flight-state rules; shared by the server coordinator |
| `services/` | Shared reconciliation and API adapters; the server runs the reconciliation controller in its VM context |
| `App/main.js` | Main display rendering from published state |
| `App/boot-diagnostic.js` | Independent startup failure reporting |
| `App/deployment-refresh.js` | Independent deployment/wake/reconnect refresh watchdog |
| `App/` | Display, map, animation, artwork overlays, audio and presentation tests |
| `UI/` | Main display styles; approved artwork supplies physical components |
| `Mobile/` | Compact family presentation, Full layout adapter, authentication UI and offline page |
| `config/` | Nonsecret display settings and approved poster selection |
| `data/` | Airport catalog and poster manifest; airport catalog is generated |
| `assets/` | Active artwork/audio/geography plus retained provenance and approved originals |
| `scripts/` | Browser build, visual proofs, Windows helpers and maintenance tools |
| `ops/home-control/` | Existing allowlisted MaxwellHouse deployment and restart mechanism |
| `.github/workflows/` | Application/browser verification and Windows control-contract checks |
| `Docs/` | Current documentation, dated records, plans and specs |
| `runtime/` | Ignored host-owned state and logs; never remove during cleanup |

`npm start` and `npm run beta:start` build the browser output and start `server/index.js`. The installed Windows host imports `startServer`; preserve that contract. Generated `App/dad-radar-browser.js` and `App/map-roll-browser.js` are ignored outputs of `scripts/build-browser.js` and must not be hand edited.

The browser build targets `> 0.5%, not dead`. Current Chrome/Edge and Safari/WebKit are the browser families under test. The build, server-owned state, ports, credentials, startup tasks and production packaging remain unchanged by repository housekeeping.

Run `npm test` for all deterministic groups. `npm run test:browser` runs the existing current-browser visual/transport suites plus artwork and automatic-refresh checks; Playwright and its Chromium/WebKit binaries are test prerequisites, not production dependencies.
