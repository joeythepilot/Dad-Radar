Dad Radar data flow. Calendar service to state engine. The calendar service reads upcoming trips, scheduled flights, and key event times. It provides the authoritative planned timeline to the state engine.

Flight data service to state engine. While the current Calendar state points to a trackable flight, the browser sends provider-neutral lookup details to the local backend once per minute. The backend FlightAware adapter checks ICAO identifiers first, matches the result by route and scheduled departure, and returns one normalized live-flight snapshot. The API key never reaches the browser.

Live reconciliation. A fresh, route-matched snapshot can refine the display phase, status, ETA, delay, gates, progress, heading, altitude, and aircraft position. Live coordinates drive the aircraft marker when they are inside the map bounds. FlightAware groundspeed remains a separately named state value and is never sent to the airspeed instrument.

Fallback behavior. Live snapshots expire after three minutes. A stale snapshot, missing match, provider error, or unconfigured provider leaves the Calendar-derived state intact. The controller does not poll while Dad Radar is in Home, Layover, or Offline mode. A live-data failure never changes Dad Radar to Offline when Calendar data is still available.

State engine to user interface. The state engine publishes high-level states, such as home, commuting, pre-flight, boarding, taxi out, en route, approach, arrived, layover, offline. The user interface reacts to these state changes by updating animations, sounds, and display modules.
