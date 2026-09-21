"use strict";

const fs = require("fs");
const path = require("path");
const topojson = require("topojson-client");
const zlib = require("node:zlib");
const geography = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.resolve(__dirname,"../data/map-geography.json.gz"))));
const unitedStates = require("us-atlas/states-10m.json");

const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(
  projectRoot,
  "assets",
  "maps",
  "north-america-caribbean-vintage.svg"
);

const bounds = {
  west: -135,
  east: -55,
  south: 5,
  north: 62
};

const frame = {
  left: 315,
  right: 885,
  top: 45,
  bottom: 605
};

function project(coordinate) {
  const longitude = coordinate[0];
  const latitude = coordinate[1];
  return [
    frame.left +
      ((longitude - bounds.west) /
        (bounds.east - bounds.west)) *
        (frame.right - frame.left),
    frame.top +
      ((bounds.north - latitude) /
        (bounds.north - bounds.south)) *
        (frame.bottom - frame.top)
  ];
}

function ringPath(ring, precision = 3) {
  return ring.map((coordinate, index) => {
    const point = project(coordinate);
    return `${index === 0 ? "M" : "L"}${point[0].toFixed(precision)} ${point[1].toFixed(precision)}`;
  }).join("") + "Z";
}

function geometryPath(geometry, precision = 3) {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map(ring => ringPath(ring, precision)).join("");
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .flatMap((polygon) => polygon.map(ring => ringPath(ring, precision)))
      .join("");
  }
  return "";
}

function reliefPath(points, close = false) {
  return points.map((point, index) => {
    const projected = project(point);
    return `${index === 0 ? "M" : "L"}${projected[0].toFixed(3)} ${projected[1].toFixed(3)}`;
  }).join("") + (close ? "Z" : "");
}

const greatLakes = require("../data/great-lakes-50m.json");
const greatLakePaths = greatLakes.features.map(lake =>
  `<path data-lake="${lake.properties.name}" fill-rule="evenodd" d="${geometryPath(lake.geometry, 3)}"/>`
).join("\n    ");

const features = geography.land.map(country => ({properties:{name:country.name},geometry:{type:"MultiPolygon",coordinates:country.polygons}}));
const riverPaths = geography.rivers.map(river => `<path data-river="${String(river.name || "").replace(/&/g,"&amp;")}" d="${river.lines.map(line => reliefPath(line)).join("")}"/>`).join("\n");
const gridPaths = [];
for(let longitude=-134;longitude<=-56;longitude+=2) gridPaths.push(`<path d="${reliefPath([[longitude,5],[longitude,62]])}"/>`);
for(let latitude=6;latitude<=62;latitude+=2) gridPaths.push(`<path d="${reliefPath([[-135,latitude],[-55,latitude]])}"/>`);

const landPaths = features.map((feature, index) =>
  `<path class="country country-${index}" data-country="${String(feature.properties.name).replace(/&/g, "&amp;").replace(/\"/g, "&quot;")}" d="${geometryPath(feature.geometry)}"/>`
).join("\n    ");

const landClipPaths = features.map((feature) =>
  `<path d="${geometryPath(feature.geometry)}"/>`
).join("");

// Interior administrative edges only. Per-state outer rings redraw shorelines
// from a different dataset and create duplicate outlines beside the lake fills.
const stateMesh = topojson.mesh(unitedStates, unitedStates.objects.states, (a, b) => a !== b);
const statePaths = `<path class="state-boundary" data-boundaries="interior" d="${stateMesh.coordinates
  .map(line => reliefPath(line)).join("")}"/>`;

// Only edges shared with the US: never stroke a country's whole coastline.
const edgeKey = (a, b) => [a.join(','), b.join(',')].sort().join('|');
const usEdges = new Set();
for (const polygon of geography.land.find(country => country.name === 'United States of America').polygons) {
  for (const ring of polygon) for (let i=1;i<ring.length;i++) usEdges.add(edgeKey(ring[i-1],ring[i]));
}
const internationalPaths = ['Canada','Mexico'].map(name => {
  const lines=[];
  for (const polygon of geography.land.find(country => country.name === name).polygons) {
    for (const ring of polygon) {
      let line=[];
      for (let i=1;i<ring.length;i++) {
        if (usEdges.has(edgeKey(ring[i-1],ring[i]))) {
          if (!line.length) line.push(ring[i-1]);
          line.push(ring[i]);
        } else if (line.length) { lines.push(line); line=[]; }
      }
      if (line.length) lines.push(line);
    }
  }
  return `<path data-us-border="${name}" d="${lines.map(line=>reliefPath(line)).join('')}"/>`;
}).join('\n');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated from Natural Earth 1:10m geography; source provenance in assets/maps/README.md. -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 650" preserveAspectRatio="none">
  <defs>
    <radialGradient id="land-paper"><stop offset="0" stop-color="#e0cda7"/><stop offset="1" stop-color="#d2bd96"/></radialGradient>
    <clipPath id="land-clip" fill-rule="evenodd">${landClipPaths}</clipPath>
  </defs>
  <rect width="1200" height="650" fill="#456f8a"/>
  <g class="countries" fill-rule="evenodd">
    ${landPaths}
  </g>
  <g class="state-boundaries" fill="none">
    ${statePaths}
  </g>
  <g class="great-lakes">
    ${greatLakePaths}
  </g>
  <g class="chart-rivers" fill="none">${riverPaths}</g>
  <g class="chart-grid" fill="none">${gridPaths.join("")}</g>
  <g class="us-international-boundaries" fill="none">${internationalPaths}</g>
  <style>
    .country{fill:url(#land-paper);stroke:#728177;stroke-width:.055}
    .great-lakes{fill:#456f8a;stroke:#667e78;stroke-width:.065}
    .state-boundary{stroke:#776f53;stroke-width:.12;stroke-dasharray:.58 .20 .10 .20;opacity:.65}
    .chart-rivers{stroke:#658e97;stroke-width:.065;opacity:.72;stroke-linecap:round;stroke-linejoin:round}
    .chart-grid{stroke:#92937b;stroke-width:.045;opacity:.28}
    .us-international-boundaries{stroke:#6b5134;stroke-width:.32;stroke-dasharray:1.15 .32 .16 .32;stroke-linecap:round;stroke-linejoin:round;opacity:.88}
  </style>
</svg>\n`;

fs.writeFileSync(outputPath, svg, "utf8");
console.log(`Generated ${path.relative(projectRoot, outputPath)} from Natural Earth geography.`);

// Transparent-water land mask prevents the relief raster edge appearing over
// open ocean when the camera extends beyond the geographic source frame.
const mask = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 650" preserveAspectRatio="none"><defs><mask id="land"><rect width="1200" height="650" fill="black"/><g fill="white" fill-rule="evenodd">${landClipPaths}</g><g fill="black">${greatLakePaths}</g></mask></defs><rect width="1200" height="650" fill="white" mask="url(#land)"/></svg>\n`;
fs.writeFileSync(path.join(projectRoot,'assets/maps/chart-land-mask.svg'), mask);
