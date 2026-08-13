# Dad Radar Console Layout

## Purpose

This document defines the physical layout of the Dad Radar console.

It is the master reference for how every visual module fits together.

Any future UI work should conform to this layout unless the Design Canon is intentionally revised.

---

# Design Intent

The console should feel like a restored airline dispatch console from the golden age of aviation.

It is not a computer monitor.

It is not a dashboard.

It is an object that belongs in a living room and feels equally at home beside a leather chair, a record player, and a shelf of travel books.

The display should invite curiosity without demanding attention.

---

# Primary Display Zones

The console is divided into six permanent modules.

```
┌───────────────────────────────────────────────────────────────┐
│                     Split-Flap Flight Board                   │
├───────────────────┬───────────────────────────────────────────┤
│                   │                                           │
│ Destination       │             Moving Map                    │
│ Poster            │                                           │
│ Today's Duty      │                                           │
├───────────────────┴───────────────────────────────────────────┤
│ Flight Instruments                  │ Power / Status Module   │
└─────────────────────────────────────┴─────────────────────────┘
```

These module locations are considered permanent.

Future versions may improve the contents of each module, but the overall composition should remain recognizable.

---

# Visual Hierarchy

The eye should naturally move in this order:

1. Split-Flap Flight Board
2. Moving Map
3. Destination Poster
4. Today's Duty
5. Flight Instruments
6. Power / Status Module

No module should compete for attention.

---

# Module Responsibilities

## Split-Flap Flight Board

Primary flight information.

Always visible.

Highest priority.

The four active fields use a 4 : 3 : 3 : 8.5 grid for FLIGHT, FROM, TO, and STATUS. This follows the actual character counts, keeps the flight number close to the left edge, and preserves a clear visual break between TO and STATUS.

---

## Moving Map

Shows where Dad is right now.

Animated only when necessary.

Should feel calm rather than busy.

---

## Destination Poster

Provides personality.

Displays vintage travel artwork for the current destination or layover.

Should rotate slowly between approved artwork when appropriate.

---

## Today's Duty

Provides a compact textual view of Daddy's complete Eastern Time schedule for the current day.

The poster-and-schedule column occupies 27 percent of the lower console. Within that column, the poster receives 75 percent of the height and Today's Duty receives 25 percent, providing legible family-room viewing without cropping the poster artwork.

The current activity receives the strongest emphasis. Completed items recede, while upcoming items remain readable.

Context uses Delaney's natural family language, such as “Daddy is flying to Greensboro,” rather than operational jargon.

The panel is derived from the same normalized Calendar schedule as the primary state and must not become a second source of truth.

---

## Flight Instruments

Adds aviation character.

Supports immersion.

Decorative unless live aircraft data becomes available.

---

## Power / Status Module

Communicates console state.

Examples:

• Online

• Offline

• Syncing

• Last Updated

• Power Indicator

This module should remain visually understated.

---

# Layout Principles

Every module should have breathing room.

Consistent spacing.

Consistent borders.

Minimal ornamentation.

Nothing should appear randomly placed.

The composition should feel balanced from every viewing distance.

---

# Future Expansion

Additional modules should only be added if they clearly improve the family experience.

The layout should resist feature creep.

Empty space is preferable to clutter.

---

# Success Criteria

Someone walking into the room should immediately recognize:

• This is aviation.

• This is beautifully made.

• This belongs here.

Only after looking closer should they begin discovering the details.
