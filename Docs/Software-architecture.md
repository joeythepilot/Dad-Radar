# Dad Radar Software Architecture

## Core Philosophy

Dad Radar is event-driven.

The software does not continuously redraw the interface.

Instead, it responds to meaningful events.

Examples:

- Flight scheduled
- Flight delayed
- Boarding begins
- Aircraft departs
- Aircraft climbs
- Aircraft descends below 10,000 feet
- Aircraft lands
- Layover begins
- Commute begins
- Dad arrives home

Every event causes the UI to update naturally.

---

## Major Systems

### Flight State Engine
Determines Dad's current state.

### Calendar Service
Reads upcoming trips.

### Flight Data Service
Retrieves live flight status and aircraft position.

### Weather Service
Retrieves destination weather.

### UI Renderer
Updates the instrument panel.

### Audio Engine
Plays startup sounds, split-flap effects, cabin chime, and shutdown audio.

### Poster Engine
Displays the correct destination artwork.

### Map Engine
Displays the current aircraft position or layover location.

---

## Design Principle

No component should know how another component works.

Each system simply publishes or receives events.

The result should feel calm, reliable, and timeless.
