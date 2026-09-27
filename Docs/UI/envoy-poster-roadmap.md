# Envoy destination poster roadmap

Snapshot: 2026-09-27. The machine-readable working list is `data/envoy-destination-poster-inventory.json`.

Envoy describes service to **over 160 destinations**, but its public site does not provide an airport-by-airport roster. The working list combines **141 candidate airport codes** transcribed from a public MQ route listing with **four codes already in DadRadar's poster catalog** that the route snapshot did not expose (SGF, SPI, TUL, TVC). It is a research queue, **not a claim that all 145 are currently served** or that the inventory is complete. A route listing can retain historical and seasonal flying. Confirm operating-carrier service against a dated schedule before using this as a commercial coverage claim.

Sources: [Envoy Air](https://www.envoyair.com/), [FlightNerve MQ route listing](https://www.flightnerve.com/airlines/MQ). The latter's own destination count and visible code list vary between crawls; its 146/148 headline is not treated as a complete verified roster. Ground handling locations are a separate service and are not automatically destinations flown by Envoy.

At this snapshot, **37** airport codes have an installed poster. Of the 141 public route candidates, **33** have one and **108** do not. The union of the candidate list and four local-only codes contains **145** codes. The JSON records each code, airport catalog geography, source tag, and poster status, so batches can be selected without conflating a candidate route with approved art.

## Batch A: five candidate posters

| Code | City | Visual anchor | Review note |
| --- | --- | --- | --- |
| AMA | Amarillo, Texas | Palo Duro Canyon and Lighthouse formation | Check formation silhouette against park photographs. |
| LIT | Little Rock, Arkansas | Big Dam Bridge and Arkansas River | Check bridge geometry and skyline relationship. |
| ATW | Appleton, Wisconsin | Fox River, mills, locks, autumn | Campus-like building may be invented; replace if fidelity cannot be established. |
| FAR | Fargo, North Dakota | Fargo Theatre and snowy Broadway | Check the theatre frontage and marquee treatment. |
| BRO | Brownsville, Texas | Resaca water, palms, historic fabric | Scene combines local motifs; check architecture and geography. |

Candidate art lives in `assets/destinations/` and is compared in `Docs/UI/envoy-gap-2026-09-27-a-review.png`. These five are **not installed in the application**. Promotion requires Joey's visual acceptance, factual landmark review, display and archival derivatives, and an update to the approved poster catalog.

## Next passes

1. Validate the roster against a current dated Envoy operating-carrier schedule, including international and seasonal routes. Add newly confirmed codes and retire stale ones without deleting provenance.
2. Reprioritize missing codes from Joey's real trips, then route frequency and geographic variety. Produce batches of about five so each can receive a meaningful visual and factual review.
3. Check legibility and architectural fidelity at console size before approval; keep candidate and approved states distinct.
