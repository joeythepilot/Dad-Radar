# DadRadar paper charts

The approved aged-relief study is applied to every live regional chart and airport surface sheet, including kiosk, full family and compact mobile displays. The chart is a period-inspired treatment of modern geographic data, not a historical navigation chart.

## Shared appearance

`UI/map-paper-chart.css` supplies deeper muted blue water, warm cream land, fine administrative boundaries/rivers, sparse printed lettering, and the approved aged rag-paper surface. Regional maps retain the existing 4800×3420 terrain relief, composited directly in the live SVG at opacity .48 with grayscale/contrast/sepia treatment. `chart-land-mask.svg` clips this raster to the actual land and removes its rectangular ocean edge on wide cameras. This preserves individual ridges and valleys rather than replacing relief with broad colored areas.

`aged-chart-paper.png` is the exact 1536×1024 paper texture from the user-approved September 2026 aged-relief study. It was generated as blank photographic paper, without geographic content. Its fibers, mottling and foxing are shared by every sheet, at .48 opacity with a lighter, less brown treatment that matches the other paper surfaces. Regional paper is aligned to the visible camera so its physical grain stays consistent at different geographic scales. Airport sheets use the same texture behind their actual projected geometry.

`App/map-cartography.js` lays out the offline labels from `data/map-labels.js`, reserving the compass, airport plaques and active-sequence housing. Labels are selected by scale and priority, kept inside the aperture, and decluttered on smaller displays. Geographic lettering uses IM FELL English Roman/Italic letter outlines from `App/chart-glyphs.js`, with original advances and kerning. Mixed-case city names and restrained country labels replace the previous modern-looking tracked capitals. Letter shapes render directly as SVG paths, without browser font substitution. The typeface carries its own irregular printed edges. Matching local WOFF subsets cover the dynamic airport sheet and compass north letter. See `FONT-LICENSE.txt` (SIL OFL 1.1) for redistribution terms.

Asheville is a persistent home reference at its actual city coordinates, independent of the route or flight status. It takes priority over normal city density limits and tries alternate placements around plaques. It remains geographically clipped when outside the camera, and never changes the flight camera to force itself onto another region. The generic chart title is removed. The compass retains its existing vector design and placement, with the softening filter removed for crisp scaling.

Historical recorded tracks use a fine graphite-gray dashed stroke. Their opacity is applied once to the whole history layer, so overlapping legs do not accumulate darker ink. Open reference circles mark the catalog locations of airports belonging to recorded prior legs; an unfinished leg does not mark its planned destination. Shared airports are marked once, and circle size stays fixed as the camera changes. The same styling loads in compact mobile. `scripts/graphite-history-browser-test.js` checks the actual rendering, prior/current separation and resize behavior.

Routes, aircraft/airport coordinates, camera rules, roll transport, weather, telemetry and airport selection remain owned by the existing controllers. OpenStreetMap runway/taxiway/terminal/apron geometry and attribution are unchanged. Open runway/taxiway paths retain `fill:none`.

## Geographic library and sources

- `north-america-caribbean-vintage.svg`: shared live regional map, covering longitude −135 to −55 and latitude 5 to 62. Its existing projection remains x315–885 / y45–605 inside a 1200×650 SVG. Natural Earth 1:10m geography supplies detailed coastlines and major rivers. Existing us-atlas interior state boundaries and Great Lakes data retain their correct layering.
- `north-america-caribbean-relief-hires.jpg`: existing live relief, unchanged bytes and geographic registration.
- `north-america-caribbean-relief.png`: retained legacy relief source, not a live renderer. Relief imagery is combined with the shared style at runtime; it is not recolored destructively.
- `contiguous-us-vintage.svg`: retained legacy vector map, not referenced by current runtime entrypoints. Its original geometry/projection is preserved and its land/border palette is harmonized with the shared chart treatment.
- `data/map-geography.json.gz`: offline clipped Natural Earth geometry, deterministic gzip timestamp. No new runtime provider or network dependency.
- `data/map-labels.js`: geographic city/country/state/province labels plus a small set of conventional water/terrain names. Regional placements preserve the approved Midwest study where applicable. Labels are sparse by design rather than a gazetteer of every settlement.

Natural Earth sources are public domain: <https://www.naturalearthdata.com/about/terms-of-use/>. GeoJSON inputs were obtained from <https://github.com/nvkelso/natural-earth-vector/tree/master/geojson>:

- `ne_10m_admin_0_countries.geojson`
- `ne_10m_admin_1_states_provinces.geojson`
- `ne_10m_rivers_lake_centerlines.geojson`
- `ne_10m_populated_places.geojson`

Exact input and artwork SHA-256 values are recorded in `source-hashes.json`. Existing US boundaries come from the installed `us-atlas/states-10m.json`; lake geometry remains `data/great-lakes-50m.json`.

## Rebuilding and verification

With the four source GeoJSON files in one directory, run:

```sh
python scripts/prepare-map-data.py /path/to/natural-earth-geojson
node scripts/generate-expanded-map.js
npm run build:browser
npm test
```

The checked-in outputs are sufficient for normal builds; source downloads are only needed when regenerating cartography. Lettering sources are `IMFeENrm28P.ttf` and `IMFeENit28P.ttf` by Igino Marini, from <https://github.com/google/fonts/tree/main/ofl/imfellenglish>. Rebuild with `python scripts/generate-chart-lettering.py /path/to/imfellenglish` (fontTools required). The source directory must also contain `OFL.txt`. This produces outlined Roman/Italic glyphs and matching WOFF subsets for the label character set, preserving source licensing. Original source hashes are in `source-hashes.json`.

`App/map-cartography-test.js` checks priority, density, collisions, clipping, responsive layout, home-label priority and invalidation when hardware moves without a camera change. `scripts/paper-chart-browser-test.js` exercises actual regional cameras across the Midwest, western US, Canada, Mexico and Caribbean; HOME, resizing, kiosk/full/compact, outlined letter bounds, persistent Asheville, crisp compass, and a fictional airport surface-to-regional roll. Browser fixtures never call flight providers. `scripts/approved-artwork-browser-test.js` checks that the surrounding approved hardware remains intact.

## Visible stock correction — September 21, 2026

Rollback baseline: `4bb695785310bcfae1f26c72e7b6a9a8db1a3625`. Its CSS background changes were hidden behind the regional SVG's opaque fills. The generator and checked-in SVG now use cream land stops `#e0cda7` / `#d2bd96` and deep blue ocean/Great Lakes `#456f8a`. Both full and compact viewers request the new SVG version. Terrain, paper texture, labels, weather, routes and physical hardware are retained. Browser proof samples pixels from the actual referenced SVG after its display filter, so a hidden-background-only change cannot pass.
