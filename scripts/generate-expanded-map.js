"use strict";

const fs = require("fs");
const path = require("path");
const topojson = require("topojson-client");
const world = require("world-atlas/countries-50m.json");
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

function ringPath(ring) {
  return ring.map((coordinate, index) => {
    const point = project(coordinate);
    return `${index === 0 ? "M" : "L"}${point[0].toFixed(1)} ${point[1].toFixed(1)}`;
  }).join("") + "Z";
}

function geometryPath(geometry) {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map(ringPath).join("");
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .flatMap((polygon) => polygon.map(ringPath))
      .join("");
  }
  return "";
}

function coordinatesOf(geometry) {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.flat();
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flat(2);
  }
  return [];
}

function intersectsMap(feature) {
  return coordinatesOf(feature.geometry).some((coordinate) =>
    coordinate[0] >= bounds.west &&
    coordinate[0] <= bounds.east &&
    coordinate[1] >= bounds.south &&
    coordinate[1] <= bounds.north
  );
}

function reliefPath(points, close = false) {
  return points.map((point, index) => {
    const projected = project(point);
    return `${index === 0 ? "M" : "L"}${projected[0].toFixed(1)} ${projected[1].toFixed(1)}`;
  }).join("") + (close ? "Z" : "");
}

const features = topojson
  .feature(world, world.objects.countries)
  .features
  .filter(intersectsMap);

const landPaths = features.map((feature, index) =>
  `<path class="country country-${index}" data-country="${String(feature.properties.name).replace(/&/g, "&amp;").replace(/\"/g, "&quot;")}" d="${geometryPath(feature.geometry)}"/>`
).join("\n    ");

const landClipPaths = features.map((feature) =>
  `<path d="${geometryPath(feature.geometry)}"/>`
).join("");

const statePaths = topojson
  .feature(
    unitedStates,
    unitedStates.objects.states
  )
  .features
  .filter(intersectsMap)
  .map((feature) =>
    `<path class="state-boundary" data-fips="${feature.id}" d="${geometryPath(feature.geometry)}"/>`
  )
  .join("\n    ");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated from world-atlas 2.0.2 / Natural Earth 1:50m country boundaries. -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 650" preserveAspectRatio="none">
  <defs>
    <pattern id="land-paper" width="52" height="38" patternUnits="userSpaceOnUse">
      <rect width="52" height="38" fill="#cfb77e"/>
      <path d="M-8 10 C7 3 17 17 31 10 S51 4 62 11 M-6 29 C8 23 18 35 34 28 S52 25 61 30" fill="none" stroke="#705e41" stroke-width=".7" opacity=".065"/>
      <circle cx="9" cy="22" r=".8" fill="#6c583d" opacity=".10"/>
      <circle cx="40" cy="5" r=".55" fill="#f2e5bd" opacity=".32"/>
    </pattern>
    <clipPath id="land-clip" fill-rule="evenodd">${landClipPaths}</clipPath>
  </defs>
  <g class="countries" fill-rule="evenodd">
    ${landPaths}
  </g>
  <g class="terrain-relief" clip-path="url(#land-clip)">
    <image href="north-america-caribbean-relief.png" x="315" y="45" width="570" height="560" preserveAspectRatio="none"/>
  </g>
  <g class="state-boundaries" fill="none">
    ${statePaths}
  </g>
  <style>
    .country{fill:url(#land-paper);stroke:#6a583d;stroke-width:1.25;vector-effect:non-scaling-stroke}
    .terrain-relief{opacity:.42;mix-blend-mode:multiply}
    .state-boundary{stroke:#665438;stroke-width:.82;opacity:.82;vector-effect:non-scaling-stroke}
  </style>
</svg>\n`;

fs.writeFileSync(outputPath, svg, "utf8");
console.log(`Generated ${path.relative(projectRoot, outputPath)} from Natural Earth geography.`);
