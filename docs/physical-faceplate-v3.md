# Physical-first faceplate v3

Source: Joey's `DadRadar_Physical_First_Layout_v3_VECTOR(1).pdf`, read as vector geometry. The active-image rectangle is 20.0625 x 11.3125 inches; all coordinates below are inches from its upper-left corner, not the monitor bezel or cabinet.

Rollback checkpoint: `archive/pre-physical-faceplate-v3-2026-09-23`, commit `6ebf7e053b33b185fd4f023e118765d08b53d9cf`. Restore by deploying that application commit through the existing home-control workflow, not by resetting unrelated work.

| Opening | Left | Top | Width | Height |
| --- | ---: | ---: | ---: | ---: |
| Poster | 0.625 | 2.675 | 4.400 | 5.028571 |
| Today's Duty | 0.625 | 8.203571 | 4.400 | 2.858929 |
| Map | 5.650 | 2.675 | 10.1875 | 6.5375 |
| Seven-day bank | 5.650 | 9.7125 | 10.1875 | 1.350 |
| Twin clocks | 16.3375 | 0.375 | 3.350 | 1.800 |
| Airspeed face | 16.8625 | 3.046875 | 2.300 | 2.300 |
| Heading face | 16.8625 | 5.718750 | 2.300 | 2.300 |
| Altimeter face | 16.8625 | 8.390625 | 2.300 | 2.300 |

The four split-flap groups use the four individual rectangles extracted from the PDF, with top 0.600 and height 1.350. The unrounded source geometry is retained in `scripts/physical-faceplate-browser-proof.js`.

Joey confirmed the gauge diameter means the round instrument face, NOT the complete drawn housing. Home-only circular clipping hides the outer housings; existing layers stay registered. Mechanical number wheels are inset to remain visible through the circles. The original image files, flight state, animation, audio, and companion layout are unchanged.

Implementation is isolated in `UI/physical-faceplate-v3.css`, excluded whenever `data-family-full` is present. The compact companion uses its separate document. The map shell has no old eight-pixel inset: the paper and sequence counter occupy the actual new opening.

Browser checks compare opening bounds in inches at multiple viewport sizes, verify number-wheel corners inside circular openings, and retain the existing family and live-artwork checks. These are digital geometry checks, not proof of physical monitor calibration. Before cutting the final faceplate, verify the fullscreen display's active-image dimensions and compare a measured opening on the actual monitor with the full-scale paper template; browser zoom, operating-system scaling, and display overscan must not shift the result.
