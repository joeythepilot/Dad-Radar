"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const mapSource = fs.readFileSync(
  path.join(
    projectRoot,
    "assets/maps/north-america-caribbean-vintage.svg"
  ),
  "utf8"
);
const dashboardSource = fs.readFileSync(
  path.join(projectRoot, "index.html"),
  "utf8"
);

for (const country of [
  "Canada",
  "United States of America",
  "Mexico",
  "Bahamas",
  "Cuba",
  "Jamaica",
  "Puerto Rico",
  "Dominican Rep."
]) {
  assert.match(
    mapSource,
    new RegExp(
      `data-country="${country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`
    ),
    `${country} should use real Natural Earth geography.`
  );
}

assert.match(mapSource, /id="land-paper"/);
assert.match(mapSource, /id="land-clip"/);
assert.doesNotMatch(mapSource, /data:image\/png;base64,/);
assert.doesNotMatch(mapSource, /north-america-caribbean-relief-hires\.jpg/);
assert.match(mapSource, /class="state-boundary"/);
assert.match(
  mapSource,
  /class="great-lakes"/,
  "The Great Lakes should use the map's muted water treatment."
);
assert.match(mapSource, /data-boundaries="interior"/,
  "State edges must not redraw a second set of lake shorelines.");
for (const name of ["Superior", "Michigan", "Huron", "Erie", "Ontario"]) {
  assert.match(mapSource, new RegExp(`data-lake="Lake ${name}"`));
}
assert(mapSource.indexOf('class="great-lakes"') > mapSource.indexOf('class="state-boundaries"'),
  "Water must cover administrative edges inside lakes.");

assert.match(
  dashboardSource,
  /north-america-caribbean-vintage\.svg\?v=antique-chart-2/
);
assert.match(
  dashboardSource,
  /class="map-terrain-relief"[\s\S]*?north-america-caribbean-relief-hires\.jpg\?v=terrain-direct-4/,
  "Terrain must be a direct sibling layer in the live map SVG."
);
assert.doesNotMatch(dashboardSource, /map-us-detail/);

console.log(
  "Expanded textured map tests passed."
);
