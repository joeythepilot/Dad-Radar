Dad Radar data flow. Calendar service to state engine. The calendar service reads upcoming trips, scheduled flights, and key event times. It provides a planned timeline to the state engine.

Flight data service to state engine. The backend FlightAware adapter receives provider-neutral lookup details from a normalized Calendar flight. It checks ICAO identifiers first, matches the result by route and scheduled departure, and returns one normalized live-flight snapshot. The API key never reaches the browser. The live snapshot includes operational phase, delays, gates, progress, and the most recent available position. It refines or overrides the planned schedule as real-world events occur.

Calendar data remains usable when live data is unavailable. A missing live match is not treated as proof that the Calendar flight is invalid.

State engine to user interface. The state engine publishes high-level states, such as home, commuting, pre-flight, boarding, taxi out, en route, approach, arrived, layover, offline. The user interface reacts to these state changes by updating animations, sounds, and display modules.
