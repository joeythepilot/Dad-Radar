# Moving Map Module

## Purpose

The moving map answers one question at a glance: where is Dad between the departure and destination airports?

It must read as a printed mid-century airline route chart, not a modern web map.

## Geographic artwork

- The map uses the bundled `assets/maps/contiguous-us-vintage.svg` vector artwork.
- The artwork contains detailed boundaries for the 48 contiguous states and Washington, D.C.
- It is derived from `us-atlas` 3.0.1 and U.S. Census Bureau cartographic boundaries. The required ISC notice is embedded in the SVG.
- The browser makes no map-service or tile requests at runtime.
- Water, parchment colors, paper grain, and state fills remain in the established muted vintage palette.

## Route camera

- The camera automatically fits the planned direct route, observed breadcrumb track, and live aircraft position to the available map panel.
- Regional routes zoom in enough to use the panel instead of remaining tiny on a national map.
- Camera framing includes breathing room for both endpoint placards.
- Aircraft, placards, beacon markers, and the compass rose counter-scale as the geography zooms so their apparent size remains stable.
- At or above 10,000 feet, the camera uses the normal full-route framing.
- Below 10,000 feet, the camera progressively eases toward the aircraft and reaches a 6x local view at the surface. The same altitude rule operates during departure, approach, and landing rather than depending on a phase label.
- Altitude and position already arrive through the 30-frame-per-second visual interpolation stream, so the camera zoom and pan remain synchronized with the aircraft and instruments. Reduced-motion preference continues to update immediately.
- The route is reframed after a window-size change.

## Route and airport placards

- The curved origin-to-destination arc is the deterministic planned route. It uses short six-unit dashes separated by fourteen-unit gaps, with matching open gaps in its shadow, so it cannot be mistaken for the solid actual track. Dad Radar does not purchase or decode a filed flight plan.
- Before live acquisition, the darker completed segment may follow Calendar progress. After two FR24 observations, a solid darker line follows the actual accumulated aircraft track instead.
- Departure and destination placards sit together on the side of the endpoints opposite the route arc.
- Placards use diagonal leader lines and must never sit directly on the route tangent.
- Placards display the three-letter airport code and mapped city name.
- Airport coordinates and placard cities come from the shared global IATA catalog rather than a hand-maintained route list.

## Aircraft marker

- The live marker is a custom top-down regional-jet silhouette with a high-contrast warm-black body, cream outline, brass centerline, neutral gunmetal engines, and a restrained oxblood pulse. It must remain immediately visible over both parchment land and muted green water.
- Live latitude, longitude, and heading take precedence while Flightradar24 data is fresh.
- Calendar progress positions the aircraft on the route path when live coordinates are unavailable. When a live position is available, its nearest point on the route determines the completed-track segment.
- Cataloged airports inside the contiguous-U.S. artwork bounds can render immediately, even when Dad Radar has never displayed that route before.
- Routes outside the current contiguous-U.S. artwork fall back to a live-position-only display when usable live coordinates are in bounds; future regional map assets can reuse the same global catalog.
- Consecutive live positions interpolate linearly over 27 seconds during active flight and 52 seconds during idle/acquisition states, along with heading and route progress, so the marker glides between adaptive provider snapshots.
- The interpolated marker is a visual presentation of the two surrounding provider observations. It is never stored or labeled as a newly observed live position.
- Operational phase and status changes remain immediate even while the marker continues its visual transition.

## Verification

`npm test` includes visual-state interpolation checks plus route-map checks for the detailed vector asset, the direct planned arc, the observed breadcrumb track, auto-fit framing, altitude-driven surface zoom at both ends of a route, off-route placard placement, a previously unlisted SEA-MCI catalog route, and the unknown-airport live-position fallback.
