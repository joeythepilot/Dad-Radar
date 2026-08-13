# Data Provider Cost Analysis

Last updated: August 13, 2026

## Decision

Dad Radar uses Flightradar24 as its live-flight provider. Google Calendar remains the authoritative source before a live aircraft is acquired, so a separate paid preflight airline-status feed is not required.

The filed route is also intentionally excluded. Flightradar24 does not publish decoded filed-route fixes through its live-position API. FAA CIFP data is available, but it is raw ARINC 424 data that would require the navigation-fix, airway, SID, and STAR decoder the project has decided not to maintain.

The map therefore uses:

- the existing direct vintage arc as the planned origin-to-destination route;
- Flightradar24 live positions for the aircraft and instruments; and
- locally accumulated observed positions as the solid actual-flight breadcrumb track.

This keeps the family-facing behavior intact while removing the expensive FlightAware status, position, and route calls.

## Monthly Workload Model

| Input | Assumption |
| --- | ---: |
| Airborne time | 90 hours/month |
| Average airborne leg | 1.5 hours |
| Legs | 60/month |
| Live refresh | 1 minute |
| Live acquisition begins | 30 minutes before scheduled departure |
| Airborne refreshes | 5,400 |
| Initial full records | 60 |
| Continuing light records | 5,340 |
| Maximum pre-departure no-match queries | 1,800–3,600 |
| Provider polling after Arrived | None |

The range for pre-departure no-match queries reflects one callsign search per minute, with a second commercial-flight-number search only when the callsign search returns no aircraft. A no-data FR24 query costs one credit.

## Selected FR24 Strategy

Dad Radar requests a full live-position record for initial acquisition. That record supplies the FR24 flight ID, callsign, commercial flight number, origin, destination, aircraft identity, and ETA. The backend caches that identity for the leg.

Subsequent one-minute updates use the light live-position endpoint. Its position, altitude, groundspeed, vertical speed, and track fields are sufficient for the map, instruments, and local phase inference. Once Arrived is confirmed, provider polling stops and Calendar holds the Arrived display locally.

| Request | Monthly volume | Credits each | Monthly credits |
| --- | ---: | ---: | ---: |
| Initial full acquisition | 60 | 8 | 480 |
| Continuing light telemetry | 5,340 | 6 | 32,040 |
| Pre-departure no-match searches | 1,800–3,600 | 1 | 1,800–3,600 |
| Total |  |  | **34,320–36,120** |

The Explorer API plan is $9 per month and normally includes 30,000 credits. At the published $0.0003 price for additional credits, the estimated monthly bill is **$10.30–$10.84 before tax**.

For comparison, requesting a full record every airborne minute would use approximately 45,000–46,800 credits and cost about $13.50–$14.04. The adaptive full-then-light design saves roughly $3.20 per month and still preserves every telemetry field Dad Radar actually displays.

## What We Intentionally Give Up

| Removed field or feature | Replacement behavior |
| --- | --- |
| Pre-departure gate, boarding, cancellation, and airline delay status | Calendar displays Boarding at T-minus 30 and infers Delayed after scheduled departure plus five minutes until FR24 confirms the aircraft is airborne |
| Filed flight-plan route | Direct planned arc plus observed breadcrumb track |
| Provider boarding and taxi labels | Dad Radar infers Taxi Out, En Route, Approach, and Arrived from position, groundspeed, vertical speed, altitude, route progress, and airport proximity |
| Continuously refreshed airline ETA | Calendar ETA remains the fallback; the initial FR24 full record may refine it |

These are acceptable omissions for Dad Radar's purpose: explaining to Delaney where Daddy is and what phase of the trip he is in.

## Rejected Alternatives

| Provider design | Estimated monthly cost | Reason not selected |
| --- | ---: | --- |
| FlightAware Personal | About $103.60 after its $5 credit | Too expensive for a personal display |
| FlightAware Standard | About $108.60 | $100 monthly minimum and unnecessary fields |
| FlightAware + FR24 hybrid | About $59.32 after the Personal credit | Still expensive and creates two-provider matching failures |
| AeroDataBox Ultra | $30 | Filed route is text and still requires our own decoder |
| OpenSky | Not treated as a production price | Does not supply the route and identity coverage selected for the family display |

## Sources

- [Flightradar24 API subscriptions and credits](https://fr24api.flightradar24.com/subscriptions-and-credits)
- [Flightradar24 API credit overview](https://fr24api.flightradar24.com/docs/credit-overview)
- [Flightradar24 API endpoint catalog](https://fr24api.flightradar24.com/docs/endpoints)
- [Flightradar24 official JavaScript SDK](https://github.com/Flightradar24/fr24api-sdk-js)
- [FAA Coded Instrument Flight Procedures](https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/)
- [FlightAware AeroAPI pricing](https://www.flightaware.com/commercial/aeroapi/)
