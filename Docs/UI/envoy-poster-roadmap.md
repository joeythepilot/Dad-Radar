# Envoy destination poster roadmap

Snapshot: 2026-09-27. The machine-readable working list is `data/envoy-destination-poster-inventory.json`.

Envoy describes service to **over 160 destinations**, but its public site does not provide an airport-by-airport roster. The working list combines **141 candidate airport codes** transcribed from a public MQ route listing with **four codes already in DadRadar's poster catalog** that the route snapshot did not expose (SGF, SPI, TUL, TVC). It is a research queue, **not a claim that all 145 are currently served** or that the inventory is complete. A route listing can retain historical and seasonal flying. Confirm operating-carrier service against a dated schedule before using this as a commercial coverage claim.

Sources: [Envoy Air](https://www.envoyair.com/), [FlightNerve MQ route listing](https://www.flightnerve.com/airlines/MQ). The latter's own destination count and visible code list vary between crawls; its 146/148 headline is not treated as a complete verified roster. Ground handling locations are a separate service and are not automatically destinations flown by Envoy.

After Joey's batch A and B approvals, **47** airport codes have an installed poster and **98** remain without artwork in the 145-code working union. The JSON records each code, airport catalog geography, source tag, and poster status, so batches can be selected without conflating a candidate route with approved art.

## Batch A: approved and installed in the application catalog

| Code | City | Visual anchor | Review note |
| --- | --- | --- | --- |
| AMA | Amarillo, Texas | Palo Duro Canyon and Lighthouse formation | Check formation silhouette against park photographs. |
| LIT | Little Rock, Arkansas | Big Dam Bridge and Arkansas River | Check bridge geometry and skyline relationship. |
| ATW | Appleton, Wisconsin | Fox River, mills, locks, autumn | Initial invented-looking campus building was removed before review. |
| FAR | Fargo, North Dakota | Fargo Theatre and snowy Broadway | Check the theatre frontage and marquee treatment. |
| BRO | Brownsville, Texas | Resaca water, palms, historic fabric | Scene combines local motifs; check architecture and geography. |

Joey approved the five compositions on 2026-09-27. Their review-size assets are wired into `config/posters.js`. The earlier comparison is `Docs/UI/envoy-gap-2026-09-27-a-review.png`. Application installation and any later home-host deployment are separate states; publication to the application branch alone does not prove the display is running these images. Landmark details still deserve a dedicated factual review before commercial use. The 2100 × 2400 display and 4200 × 4800 archival deliverables are a later production pass; the application currently uses the validated 1173 × 1341 assets, consistent with the existing poster library.

## Batch B: approved and installed in the application catalog

| Code | City | Visual anchor | Review note |
| --- | --- | --- | --- |
| GRR | Grand Rapids, Michigan | Grand River and Blue Bridge | Check bridge span and downtown skyline fidelity. |
| SAT | San Antonio, Texas | Mission San José | Water feature from first generation was removed; check mission façade. |
| ABQ | Albuquerque, New Mexico | Old Town and Sandia Mountains | Check San Felipe de Neri and mountain perspective. |
| GPT | Gulfport, Mississippi | Jones Park marina and Mississippi Sound | Confirm waterfront details and avoid a generic coast reading. |
| ICT | Wichita, Kansas | Historic municipal airport terminal | Check tower and Art Deco wings against photographs. |

Joey approved these five compositions on 2026-09-27. Their review-size assets are wired into `config/posters.js`, with the comparison in `Docs/UI/envoy-gap-2026-09-27-b-review.png`. Landmark details still deserve factual review before commercial use. The batch records and local-reference URLs are in `data/poster-batch-manifest.json`.

## Next passes

1. Validate the roster against a current dated Envoy operating-carrier schedule, including international and seasonal routes. Add newly confirmed codes and retire stale ones without deleting provenance.
2. Reprioritize missing codes from Joey's real trips, then route frequency and geographic variety. Produce batches of about five so each can receive a meaningful visual and factual review.
3. Check legibility and architectural fidelity at console size before approval; keep candidate and approved states distinct.
