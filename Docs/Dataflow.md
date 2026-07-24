Dad Radar data flow. Calendar service to state engine. The calendar service reads upcoming trips, scheduled flights, and key event times. It provides a planned timeline to the state engine.

Flight data service to state engine. The flight data service retrieves live flight status, such as position, delays, and gates. It refines or overrides the planned schedule as real-world events occur. 

State engine to user interface. The state engine publishes high-level states, such as home, commuting, pre-flight, boarding, taxi out, en route, approach, arrived, layover, offline. The user interface reacts to these state changes by updating animations, sounds, and display modules.
