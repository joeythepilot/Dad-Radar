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

## Altimeter behavior

The altimeter uses the conventional three-pointer relationship:

- The long, slender pointer indicates hundreds of feet and completes one revolution per 1,000 feet.
- The short, broad pointer indicates thousands of feet and completes one revolution per 10,000 feet.
- The small triangular pointer indicates tens of thousands of feet and completes one revolution per 100,000 feet.
- The digital altitude readout supplies the complete value for quick family-facing confirmation.

All three pointers use continuous, unwrapped rotations so climbs and descents can pass through thousand-foot boundaries without a backward snap. At 17,100 feet, the long pointer sits on 1, the short broad pointer sits at 7.1, and the triangular pointer sits at 1.71 just below 2.
