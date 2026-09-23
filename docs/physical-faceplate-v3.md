# Physical-first faceplate v3

Source: Joey's `DadRadar_Physical_First_Layout_v3_VECTOR(1).pdf`, read as vector geometry. The active-image rectangle is 20.0625 x 11.3125 inches; all coordinates below are inches from its upper-left corner, not the monitor bezel or cabinet.

Rollback checkpoint: `archive/pre-physical-faceplate-v3-2026-09-23`, commit `6ebf7e053b33b185fd4f023e118765d08b53d9cf`. Restore by deploying that application commit through the existing home-control workflow, not by resetting unrelated work.

| Opening | Left | Top | Width | Height |
| --- | ---: | ---: | ---: | ---: |
| Poster | 0.500 | 2.350 | 4.400 | 5.028571 |
| Today's Duty | 0.500 | 7.878571 | 4.400 | 2.858929 |
| Map | 5.525 | 2.350 | 10.1875 | 6.5375 |
| Seven-day bank | 5.525 | 9.3875 | 10.1875 | 1.350 |
| Twin clocks | 16.2125 | 0.375 | 3.350 | 1.800 |
| Airspeed face | 16.6375 | 2.746875 | 2.500 | 2.500 |
| Heading face | 16.6375 | 5.618750 | 2.500 | 2.500 |
| Altimeter face | 16.6375 | 8.490625 | 2.500 | 2.500 |

Approved 2.5-inch amendment: the gauge centers are (17.8875, 3.996875), (17.8875, 6.868750), and (17.8875, 9.740625). Clear vertical gaps remain 0.371875 inches. The airspeed center moves up 0.200 inches, heading stays fixed, and altimeter moves down 0.200 inches. These supersede the PDF's 2.300-inch gauge circles only; the original v3 drawing is superseded by the revised cutting templates. All other openings are unchanged.

The four split-flap groups use the four individual rectangles extracted from the PDF, with top 0.500 and height 1.350. The unrounded source geometry is retained in `scripts/physical-faceplate-browser-proof.js`.

Joey confirmed the gauge diameter means the round instrument face, NOT the complete drawn housing. Home-only circular clipping hides the outer housings; existing layers stay registered. Mechanical number wheels are inset to remain visible through the circles. The original image files, flight state, animation, audio, and companion layout are unchanged.

Implementation is isolated in `UI/physical-faceplate-v3.css`, excluded whenever `data-family-full` is present. The compact companion uses its separate document. The map shell has no old eight-pixel inset: the paper and sequence counter occupy the actual new opening.

Browser checks compare opening bounds in inches at multiple viewport sizes, verify number-wheel corners inside circular openings, and retain the existing family and live-artwork checks. These are digital geometry checks, not proof of physical monitor calibration. Before cutting the final faceplate, verify the fullscreen display's active-image dimensions and compare a measured opening on the actual monitor with the full-scale paper template; browser zoom, operating-system scaling, and display overscan must not shift the result.

Approved spacing revision: split-flap top margin is 0.500 inches. Poster/map top is 2.350 inches, leaving 0.500 inches below the 1.350-inch-tall split-flaps. Poster, duty, map and weekly bank move up together by 0.325 inches; their sizes and internal gaps remain unchanged. Duty/weekly bottom margin is now 0.575 inches. Clocks and gauges do not move. Prior deployed layout: `9613c85c2bb239c70a866b33a7331bb873d1a82a`.

Approved horizontal balance revision: all twelve home openings shift left 0.125 inches together. Left poster/flap margin and right clock margin are now both 0.500 inches. Gauge right margin is 0.925 inches, matching the map-to-gauge gap. Sizes, vertical positions and all internal gaps are unchanged. Prior deployed layout: `5c939ea39a7e17f61020f4e75cd754c3e057061e`. Use the v6 balanced-margins cutting template.

Heading dial fit correction: home heading artwork scales to 136.986301% so its approximately 73%-diameter inner dial fills the existing 2.500-inch opening. All image layers remain registered. The wheel readout is compensated to retain its previous visible size and lower-face position. No opening coordinates or cutting-template dimensions change; v6 remains current.
