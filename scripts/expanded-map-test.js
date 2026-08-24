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
assert.match(mapSource, /class="terrain-ridge"/);
assert.match(
  dashboardSource,
  /north-america-caribbean-vintage\.svg\?v=natural-earth-1/
);

console.log(
  "Expanded textured map tests passed."
);
