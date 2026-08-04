# Dad Radar Project Decisions

This document records important design and engineering decisions.

It exists so future work always builds on previous decisions instead of repeating old discussions.

---

## 2026-07-24

### Project Organization

✓ Documentation-first workflow adopted.

✓ Major design decisions must be documented before implementation.

---

### Product Identity

✓ Dad Radar is a physical product first.

✓ Software exists to power the physical console.

✓ Vintage airline operations console selected as the permanent design direction.

---

### User Interface

✓ Generic dashboard concept retired.

✓ Modular console layout adopted.

✓ UI mirrors the physical hardware modules.

---

### Design Language

✓ Mid-century modern aesthetic selected.

✓ Walnut, brass, leather, and matte black established as core materials.

✓ Split-flap display becomes the primary information display.

✓ Vintage destination posters become a permanent feature.

✓ Analog flight instruments included as decorative information modules.

---

### Development Process

✓ Documentation precedes coding whenever practical.

✓ Architecture decisions recorded before implementation.

✓ Design Canon established as the project's primary design reference.

---

## 2026-08-04

### Calendar Schedule Integration

✓ Google Calendar is the source of truth for the planned pilot schedule.

✓ Google authentication remains on the local backend. OAuth credentials and tokens are never committed to GitHub.

✓ Calendar events are normalized into flights, commutes, layovers, duty-free periods, and other events before they reach the interface.

✓ Airport-local roster times are converted to UTC for comparison and Eastern Time for the family display.

✓ A dedicated schedule-state model translates normalized events into Dad Radar display modes.

✓ Calendar-only operation may estimate route progress from scheduled time, but it must not invent airspeed, altitude, heading, or other live telemetry.

✓ The mock flight service remains available only as an explicit development data source.
