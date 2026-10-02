# Flight Instrument Module

## Purpose

The instrument rail turns live flight information into calm, tactile aviation motion that can be understood from across the room.

## Live motion

- Flightradar24 is the source of observed groundspeed, heading, vertical speed, and altitude.
- Dad Radar receives a new provider snapshot approximately once per minute.
- The visual-state controller linearly interpolates the displayed values for 52 seconds between snapshots.
- Digital readouts and analog needles use the same interpolated visual state and therefore move together.
- The interpolation is presentation-only. It does not alter, replace, or claim to be a newly observed Flightradar24 position.
- A new operational phase such as Approach updates immediately; only the telemetry motion is eased.
- Reduced-motion system preferences disable the long interpolation and update the display immediately.

Groundspeed may drive the speed instrument because no indicated-airspeed source is available, but the readout must continue to say Ground Speed.

## Home bearing pointer

The orange pointer in the heading instrument uses home airport as its pivot and aims toward the aircraft's reported position. Its angle is the great-circle bearing from home to the aircraft, minus the heading shown by the rotating card, so it reads as a relative direction beneath the fixed airplane symbol. It is a family display cue, not navigation equipment.

The current home anchor is AVL from `config/settings.js`. The pointer uses observed coordinates during flight. When a ground location is confirmed, it uses that airport's coordinates; within roughly one mile of home it rests upright, independent of any retained arrival heading. When no position is known, the pointer is hidden rather than pointing at a scheduled destination. The supplied orange needle art is stored unchanged in `assets/instruments/heading/home-bearing-needle.png`.

## Altimeter behavior

The altimeter uses the conventional three-pointer relationship:

- The long, slender pointer indicates hundreds of feet and completes one revolution per 1,000 feet.
- The short, broad pointer indicates thousands of feet and completes one revolution per 10,000 feet.
- The small triangular pointer indicates tens of thousands of feet and completes one revolution per 100,000 feet.
- The digital altitude readout supplies the complete value for quick family-facing confirmation.

All three pointers use continuous, unwrapped rotations so climbs and descents can pass through thousand-foot boundaries without a backward snap. At 17,100 feet, the long pointer sits on 1, the short broad pointer sits at 7.1, and the triangular pointer sits at 1.71 just below 2.
