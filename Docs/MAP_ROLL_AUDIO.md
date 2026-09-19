# Dad Radar map-roll audio

The approved map-transport sound is DadRadar map-roll v3, a roughly three-second gearmotor/roller recording synthesized specifically for the electromechanical map transition. The browser controller lives in `App/map-roll-audio.js` and is synchronized with the 2.8-second transport cycle.

The canonical source file is `assets/audio/dadradar-map-roll-v3-gearmotor.mp3` (a delivery encoding of the approved WAV used for broad browser compatibility, including current Safari).

The transport sound begins when the map motor starts. It is intentionally restarted from the beginning for each transport cycle rather than looped. A user interaction unlocks playback using the same browser-audio pattern as the existing split-flap and altitude-chime features.
