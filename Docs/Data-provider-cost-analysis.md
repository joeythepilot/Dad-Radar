> Historical decisions, specifications or ideas. For the running build, use [Current build handoff](Current-build-handoff.md). Superseded details here do not authorize restoring older behavior.

# Data Provider Cost Analysis

Last updated: September 17, 2026

## Current Unit 001 decision

DadRadar now deliberately splits provider responsibilities instead of buying one expensive all-in-one feed.

- **Google Calendar**: planned schedule and assignment identity.
- **FlightAware AeroAPI**: low-frequency operational timing/status enrichment and optional filed-route enrichment.
- **ADSB.lol**: primary live aircraft position and telemetry.
- **Flightradar24**: optional telemetry fallback only; DadRadar must remain functional without an FR24 subscription/token.
- **NOAA/NWS**: weather radar.

This is a family-beta / Unit 001 decision. Commercial provider licensing and economics will be revisited before DadRadar is sold as a product.

## Why FlightAware returned

An earlier DadRadar design rejected FlightAware as a continuously polled all-purpose flight-data source because that usage pattern was unnecessarily expensive for a personal display.

The new design uses AeroAPI for a much narrower job: airline operational status.

DadRadar needs to know questions ADS-B cannot reliably answer before/after flight:

- Has the airline revised departure time?
- How many minutes is the flight actually delayed?
- Has the aircraft left the gate (`OUT`)?
- Is it airborne (`OFF`)?
- Has it landed (`ON`)?
- Has it arrived at the gate (`IN`)?
- Is it cancelled or diverted?
- What is the current estimated arrival time?

Those requests are cheap enough at Unit 001 scale when cached intelligently, while ADSB.lol continues to handle the high-frequency position workload for free.

## Operational polling budget

A Calendar refresh does **not** equal a FlightAware request. `server/flightaware-operational-service.js` owns an independent cache.

Current maximum request cadence per relevant flight instance:

| Flight phase / horizon | Maximum FlightAware operational lookup cadence |
| --- | ---: |
| More than 12 hours before planned departure | No lookup |
| 3–12 hours before | Every 30 minutes |
| 1–3 hours before | Every 10 minutes |
| Within 1 hour, before actual OUT | Every 2 minutes |
| After actual OUT, before actual IN | Every 5 minutes |
| After actual IN or cancellation | Terminal result retained for 6 hours |

The actual request count is lower when a flight is not in the near-term schedule or when the cached record remains valid.

## High-frequency tracking budget

ADSB.lol remains primary for position, altitude, groundspeed, heading, and actual track. DadRadar does not use FlightAware as the continuous map-position provider.

FR24 remains an optional fallback. Unit 001 should not require a paid FR24 plan to function. If no FR24 token is present, provider order simply continues with ADSB.lol and the existing outage/fallback behavior.

This keeps the potentially expensive workload, second-by-second/minute-by-minute aircraft telemetry, off the paid operational-status service.

## FlightAware dual use

`FLIGHTAWARE_AEROAPI_KEY` now enables two separate optional capabilities:

1. **Operational status enrichment** through `GET /flights/{ident}`.
2. **Filed-route enrichment** for the dashed planned route.

They share a key but are reported separately in `/api/health` because one can fail or be unavailable independently of the other.

DadRadar never exposes the key to the browser.

## Cost-control protections in code

The Unit 001 implementation includes these controls:

- no operational lookup more than 12 hours early;
- server-side cache rather than per-device polling;
- one master state shared by all family clients;
- route/time matching before accepting a flight instance;
- terminal caching after arrival/cancellation;
- no FlightAware position polling;
- no required FR24 traffic;
- no airline-site scraping;
- graceful fallback when FlightAware is unconfigured or unavailable.

A provider outage does not cause a tighter retry loop in the UI because clients never call FlightAware directly.

## What changes when FlightAware is available

| Previous family-beta behavior | Unit 001 operational behavior |
| --- | --- |
| Delay inferred from planned departure + grace period | FlightAware revised OUT / reported delay is authoritative when matched |
| Delay minutes accumulated from wall clock | Provider-derived delay minutes when available |
| ETA mostly planned Calendar time / telemetry estimate | FlightAware estimated IN, then actual IN, with Calendar as fallback |
| Arrival inferred from ADS-B disappearance/proximity/silence | FlightAware actual ON/IN is authoritative; inference remains fallback |
| Same planned time shown despite airline revision | Today's Duty may show actual/estimated OUT while preserving original Calendar plan internally |
| Cancellation/diversion lacked airline operational authority | FlightAware flag/status can publish CANCELLED or DIVERTED |

## What remains free/offline-capable

A missing FlightAware key does not disable DadRadar. The system returns to its established Calendar + ADSB.lol behavior, including the existing delay and arrival inference safety nets.

A missing FR24 token also does not disable DadRadar. ADSB.lol remains the primary live provider.

This matters for the first handcrafted unit: paid services add quality and certainty, but the box is not designed to become a monthly-subscription brick if one optional provider disappears.

## Commercialization note

The current FlightAware use is intentionally optimized for Joey's personal Unit 001/family beta. Before selling DadRadar units, revisit:

- commercial redistribution/display rights;
- minimum monthly spend and rate tiers;
- whether a centralized DadRadar backend is more economical than per-unit provider accounts;
- AeroDataBox/AirLabs/Cirium or other operational-status alternatives;
- alert/webhook products that could replace polling at customer scale.

The software keeps operational status behind a provider adapter so a future commercial provider can be swapped without replacing Calendar parsing, ADS-B tracking, the state engine, or the UI.

## Provider references

- FlightAware AeroAPI: https://www.flightaware.com/commercial/aeroapi/
- FlightAware data sources: https://www.flightaware.com/about/datasources/
- ADSB.lol: https://adsb.lol/
- Flightradar24 API: https://fr24api.flightradar24.com/
- NOAA/NWS radar services: https://www.weather.gov/
