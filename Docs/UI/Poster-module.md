# Destination Poster Module

## Purpose

The destination poster gives each trip a collectible sense of place while preserving the mid-century airline-travel language of Dad Radar.

## Production dimensions

All newly created destination posters use a 7 : 8 aspect ratio to match the current poster opening.

- Archival master: 4200 × 4800 pixels
- Display delivery asset: 2100 × 2400 pixels
- Orientation: portrait
- Minimum safe margin: 5 percent on every side (210 pixels on the archival master; 105 pixels on the display asset)
- Important titles, landmarks, and footer copy must remain inside the safe margin.
- The finished image must include the complete border and footer within the canvas.

DadRadar 1 is accepted against the Maxwell family Raspberry Pi unit's HP 23es display at 1920 × 1080 and 60 Hz. Poster lettering and landmark silhouettes must remain legible at the poster's actual console size on that display, while the archival master preserves enough detail for future displays up to approximately 50 inches.

The browser always uses `object-fit: contain`. Existing traditional 2 : 3 posters may show restrained background margins, but no foreground artwork may be cropped. New 7 : 8 posters should fill the opening naturally.

## Visual direction

- Vintage airline or destination-travel poster rather than modern tourism advertising
- One dominant destination name
- Restrained geographic subtitle when useful
- Local landmarks and landscape treated as a unified illustration
- Warm paper texture and the established brass, oxblood, cream, and deep-blue palette
- Footer copy must remain large enough for family-room viewing
- Architecture is grounded in direct photographic or authoritative architectural references; prominent invented landmarks are not accepted.
- Every destination receives its own sky, cloud silhouette, light direction, and atmospheric character. Reusing another poster's cloud composition is not accepted.

## Baseline

The approved Asheville composition is the visual baseline. It features Asheville City Hall at the center and establishes the title, subtitle, illustration, airport-code footer, tagline, border, and print-texture hierarchy. Other destinations inherit that hierarchy without copying Asheville's skyline, vegetation, weather, cloud shapes, or lighting composition.

Approved destination artwork:

- `AVL`: Asheville baseline with Asheville City Hall centered.
- `ORD`: Chicago Candidate 2.
- `DFW`: Candidate 2, with a right-aligned destination title, Texas twilight sky, Dallas/Fort Worth landmark montage, and stockyard foreground.
- `DCA`: Candidate 2, with a centered National Mall composition, pearlescent spring atmosphere, Potomac water, and cherry-blossom foreground. Candidate 1 was rejected because its canvas was narrower than the collection standard.
- `ROC`: Rochester Candidate 1.
- `MIA`, `CLT`, `PHX`, `XNA`, and `CMH`: pilot batch `pilot-hubs-01`, approved by Joey and his family.

If the current destination or confirmed ground location is absent from the approved library, the display uses a designed vintage placeholder with the catalog city, state or province, and three-letter airport code. It must never substitute another city's poster.

## Batch production

Poster batches are defined in `data/poster-batch-manifest.json`. Each destination record fixes its exact display copy, landmark references, visual profile, weather and light treatment, aircraft placement, and candidate output path before artwork is generated.

The batch workflow is:

1. Research direct photographic or authoritative references and assemble one factual reference board per destination.
2. Assign a distinct sky, light, palette, landmark hierarchy, and aircraft placement in the manifest.
3. Generate one candidate at a time against the approved Asheville collection baseline.
4. Set completed records to `candidate` and run `npm run posters:validate:pilot`.
5. Review the batch as a contact sheet for repeated composition, collection consistency, legibility, text accuracy, and landmark fidelity.
6. Promote only explicitly accepted artwork to an approved baseline and prepare its display and archival derivatives.

The validator checks manifest completeness, unique visual treatments, output naming, candidate dimensions, and the 7 : 8 collection ratio. Human review remains required for architecture, typography rendered inside the bitmap, and overall art direction.

Pilot batch `pilot-hubs-01` contains the approved `MIA`, `CLT`, `PHX`, `XNA`, and `CMH` compositions. Future batches should follow the Maxwell family schedule so missing destinations are filled in order of real use.

## Verification

The entire outer border and all footer lettering must be visible in the console before a poster is accepted. Each candidate is also compared with the approved poster library to catch repeated clouds, landmark arrangements, aircraft placement, and other obvious compositional duplication.
