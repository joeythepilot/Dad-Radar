# Envoy destination poster roadmap

Snapshot: 2026-09-27. The machine-readable working list is `data/envoy-destination-poster-inventory.json`.

Envoy describes service to **over 160 destinations**, but its public site does not provide an airport-by-airport roster. The working list combines **141 candidate airport codes** transcribed from a public MQ route listing with **four codes already in DadRadar's poster catalog** that the route snapshot did not expose (SGF, SPI, TUL, TVC). It is a research queue, **not a claim that all 145 are currently served** or that the inventory is complete. A route listing can retain historical and seasonal flying. Confirm operating-carrier service against a dated schedule before using this as a commercial coverage claim.

Sources: [Envoy Air](https://www.envoyair.com/), [FlightNerve MQ route listing](https://www.flightnerve.com/airlines/MQ). The latter's own destination count and visible code list vary between crawls; its 146/148 headline is not treated as a complete verified roster. Ground handling locations are a separate service and are not automatically destinations flown by Envoy.

After Joey's batch A through H approvals, **77** airport codes have an installed poster and **68** have no active artwork in the 145-code working union. The JSON records each code, airport catalog geography, source tag, and poster status, so batches can be selected without conflating a candidate route with approved art.

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

## Batch C: approved and installed in the application catalog

| Code | City | Visual anchor | Review note |
| --- | --- | --- | --- |
| ATL | Atlanta, Georgia | Piedmont Park, Lake Clara Meer and Midtown | Check skyline silhouette and park vantage. |
| BOS | Boston, Massachusetts | Public Garden lagoon, bridge and swan boat | Check adjacent streetscape and bridge geometry. |
| BOI | Boise, Idaho | State Capitol, foothills and river | Check Capitol silhouette and relative setting. |
| EYW | Key West, Florida | Key West Lighthouse and Old Town houses | Check lighthouse proportions and surrounding rooftops. |
| MCI | Kansas City, Missouri | Union Station, fountain and downtown | The first pass placed Liberty Memorial behind the station; the candidate removes it. Check the station façade and skyline. |

Joey flagged the first-pass images as drifting toward photorealism. All five were restyled with matte limited-ink color, graphic shadows, stippled print texture and simplified skies; the original and revised versions are paired in `Docs/UI/envoy-gap-2026-09-27-c-style-before-after.png`. The revised candidates are compared with approved Batch B at the same review size in `Docs/UI/envoy-gap-2026-09-27-c-review.png`. Joey approved the revised set on 2026-09-27, and the assets are wired into `config/posters.js`. Landmark details still deserve a factual review before commercial use. Publication to the application branch does not by itself verify deployment to the home display.

## Batch D: approved and installed in the application catalog

| Code | City | Visual anchor | Review note |
| --- | --- | --- | --- |
| AUS | Austin, Texas | Congress Avenue Bridge, Lady Bird Lake and skyline | Check bridge arches, skyline vantage and small bat silhouettes. |
| CHS | Charleston, South Carolina | Rainbow Row along East Bay Street | The revised scene keeps the pastel streetscape and removes an extraneous distant steeple; check façade sequence. |
| CLE | Cleveland, Ohio | Hope Memorial Bridge guardian and Terminal Tower | A factual pass replaced an invented steering wheel with a vehicle and corrected the bridge to a curved-edge steel truss. Check the remaining geometry against direct references. |
| ELP | El Paso, Texas | Plaza Theatre and Franklin Mountains | Check façade and mountain silhouette; the candidate is a historic-styled street scene, not a claim about current vehicles. |
| PIT | Pittsburgh, Pennsylvania | Duquesne Incline, Point and river bridges | Check relative river, bridge and incline positions. |

These five use flatter matte colors and print texture following Joey's Batch C style correction. Charleston, Cleveland and El Paso received a second pass to bring the title and footer closer to the approved hierarchy. The contact sheet `Docs/UI/envoy-gap-2026-09-27-d-review.jpg` compares them with approved Batch C at the same size. Joey approved the revised set on 2026-09-27, and the assets are wired into `config/posters.js`. Factual landmark review remains necessary before commercial use. Publication to the application branch alone does not verify deployment to the home display.

## Batch E: approved and installed in the application catalog

| Code | City | Visual anchor | Review note |
| --- | --- | --- | --- |
| IAH | Houston, Texas | Buffalo Bayou Park and downtown skyline | Check skyline silhouette and bayou viewpoint. HOU remains a separate missing airport code. |
| MSP | Minneapolis, Minnesota | Stone Arch Bridge, Mississippi and mill ruins | Check arch count and mill placement. Water and footer received a print-style pass. |
| RIC | Richmond, Virginia | James River rapids, Belle Isle bridge and downtown | Check pedestrian bridge geometry and river vantage. Water and footer received a print-style pass. |
| SEA | Seattle, Washington | Elliott Bay ferry, Space Needle and skyline | Check mountains and skyline from the water; footer contrast was increased. |
| STL | St. Louis, Missouri | Gateway Arch, Eads Bridge and Mississippi | Check Arch, bridge and shoreline relationships. |

The comparison `Docs/UI/envoy-gap-2026-09-27-e-review.jpg` places these compositions above approved Batch D at the same size. The scenes use flat matte ink, halftone grain and distinct local anchors. Joey approved them on 2026-09-27, and all five are wired into `config/posters.js`. The route roster and landmark details remain subject to factual review before commercial use. Publication to the application branch alone does not verify deployment to the home display.

## Batch F: AVL style reset; approved and installed in the application catalog

| Code | City | Visual anchor | Review note |
| --- | --- | --- | --- |
| BHM | Birmingham, Alabama | Railroad Park lake, paths and downtown skyline | Joey approved the third AVL-style proof with the quieter sky and corrected, lower skyline. Installed in the application catalog. A Vulcan direction was discarded over asserted likeness rights; the industrial Sloss version and implausible nose-prop park pass were rejected. |
| BUF | Buffalo, New York | City Hall and Niagara Square | Approved painterly revision. The McKinley Monument was corrected to a plain white obelisk with lions at its base, removing an invented statue atop the first pass. Check architecture and winter streetscape. |
| COS | Colorado Springs, Colorado | Garden of the Gods and Pikes Peak | Approved painterly revision; check sandstone silhouettes and mountain viewpoint. |
| JAX | Jacksonville, Florida | Blue Main Street vertical-lift bridge and St. Johns River | Approved painterly revision; check lift-tower geometry and Northbank skyline. |
| SDF | Louisville, Kentucky | Big Four Bridge, Ohio River and Waterfront Park | Approved painterly revision. A bright cloud mass was softened to the approved quiet-sky direction; check truss spans and pedestrian approach relationship. |

Joey reset the entire set to the approved AVL poster after finding the first five too blocky. The former Batch F review sheet and five v1 images were removed from the active branch. `Docs/UI/envoy-gap-2026-09-27-f-reset-bhm-proof.jpg` preserves the Birmingham/AVL approval comparison; `Docs/UI/envoy-gap-2026-09-27-f-avl-review.jpg` shows the full revised set next to AVL. Joey approved the four revised candidates on 2026-09-27, and all five are now wired into `config/posters.js`. The artwork uses the 1173 × 1341 review canvas, not the later high-resolution print master. Aircraft geometry, landmark fidelity and third-party rights deserve review before commercial sale. Sources and visual profiles are recorded in `data/poster-batch-manifest.json`. Branch publication alone does not verify deployment to the home display.

## Batch G: approved and installed in the application catalog

| Code | City | Visual anchor | Review note |
| --- | --- | --- | --- |
| ALB | Albany, New York | New York State Capitol and State Street hill | Check roof/turret geometry and the exaggerated steps. No dome should be introduced. |
| CHA | Chattanooga, Tennessee | Walnut Street Bridge, Tennessee River and ridge | The first aircraft had an extra apparent propeller and was redrawn. Check the bridge's Petit truss and landscape viewpoint. |
| DSM | Des Moines, Iowa | Iowa State Capitol's five domes and grounds | The first aircraft had an extra propeller and was redrawn. Check the five-domed building and scenic river relationship. |
| MEM | Memphis, Tennessee | Hernando de Soto Bridge, Mississippi and riverfront | The first bright red sky was softened. Check the bridge's two arch spans and skyline viewpoint. |
| PNS | Pensacola, Florida | Palafox Pier marina and Pensacola Bay | The marina and bay are downtown, not an open-Gulf beach. Check pier structures and background roofline. |

`Docs/UI/envoy-gap-2026-09-27-g-avl-review.jpg` compares these five with AVL at equal review size. Joey approved the set on 2026-09-27, and all five are wired into `config/posters.js`. Each uses the 1173 × 1341 review canvas and the rich painted lithograph direction. The working Envoy route roster, landmark details, aircraft anatomy and commercial-use rights still require review before sale; publication to the branch does not verify home-display deployment.

## Batch H: approved and installed in the application catalog

| Code | City | Visual anchor | Review note |
| --- | --- | --- | --- |
| OKC | Oklahoma City, Oklahoma | Skydance Bridge over I-40, Scissortail Park and downtown | First pass mistakenly placed the bridge over water; revised to the highway. Check sculpture geometry and skyline. |
| MYR | Myrtle Beach, South Carolina | Boardwalk, SkyWheel, pier and Atlantic shore | An extra apparent propeller in the first proof was removed. Check pier and wheel placement. |
| ORF | Norfolk, Virginia | USS Wisconsin at Nauticus on the Elizabeth River | Check ship silhouette, mooring and waterfront background. |
| YQB | Québec City, Québec | Château Frontenac, Dufferin Terrace and St. Lawrence | A copied AVL footer caption was replaced. Check hotel and river viewpoint. |
| BTR | Baton Rouge, Louisiana | Old State Capitol on Mississippi bluff and modern Capitol farther back | An extra apparent aircraft propeller was removed. Check Gothic building silhouette and relative Capitol placement. |

The comparison `Docs/UI/envoy-gap-2026-09-27-h-avl-review.jpg` includes AVL at the same visual scale. Joey approved all five on 2026-09-27, and their corrected review-size assets are wired into `config/posters.js`. The Myrtle Beach third-propeller error, Oklahoma City bridge-over-water error, Québec City copied AVL footer, and Baton Rouge extra apparent propeller were corrected before approval. Joey also reiterated a standing artwork rule: aircraft must remain anatomically believable, with no stray propellers, phantom engines, or other impossible geometry. This 1173 × 1341 set is for screen use, not a print master. Landmark fidelity, aircraft anatomy, route status, and commercial-use rights still require dedicated review before sale; publication to the branch does not verify home-display deployment.

## Next passes

1. Validate the roster against a current dated Envoy operating-carrier schedule, including international and seasonal routes. Add newly confirmed codes and retire stale ones without deleting provenance.
2. Reprioritize missing codes from Joey's real trips, then route frequency and geographic variety. Produce batches of about five so each can receive a meaningful visual and factual review.
3. Check legibility and architectural fidelity at console size before approval; keep candidate and approved states distinct.
