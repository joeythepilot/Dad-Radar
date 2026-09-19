# Moving map module

The map consumes the home server’s resolved flight state. ADSB.lol supplies primary live telemetry; FR24 is an optional fallback. Calendar defines the planned flight, and optional FlightAware enrichment supplies operational timing and filed-route fixes.

The dashed planned route uses filed-route fixes when available or the direct curve otherwise. The solid current track uses actual observations; prior work-leg tracks come from server-owned sequence history. Presentation interpolation animates known samples without creating provider observations.

The regional and airport views travel on the approved continuous vertical map roll. Preserve its timing, worn splice, uneven motor motion, V3 gearmotor audio and registration clacks after settling. Map hardware stays attached to its frame. Do not reintroduce shutters or the abandoned paper ticker.

Geography, city labels, terrain, NOAA weather and airport-surface geometry use the existing local/server pipeline. State acquisition, airport selection, transport and audio are outside routine repository housekeeping.

Source: `App/route-map.js`, `App/airport-surface-map.js`, `App/map-roll-transition.js`, `App/sequence-history-map.js`, corresponding `UI/` styles, and `Mobile/` adaptations. See [data flow](../Dataflow.md) and [current handoff](../Current-build-handoff.md).
