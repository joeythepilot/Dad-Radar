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
const reliefAssetPath = path.join(
  projectRoot,
  "assets",
  "maps",
  "north-america-caribbean-relief.png"
);
const reliefDataUrl =
  `data:image/png;base64,${fs.readFileSync(reliefAssetPath).toString("base64")}`;

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

const greatLakes = [
  [
    [-92.1, 46.6], [-91.5, 47.1], [-90.7, 47.6], [-89.8, 47.9],
    [-88.8, 48.1], [-87.7, 48.0], [-86.8, 47.7], [-85.8, 47.2],
    [-84.8, 46.9], [-84.7, 46.5], [-85.6, 46.6], [-86.5, 46.8],
    [-87.4, 46.7], [-88.4, 46.3], [-89.5, 46.2], [-90.5, 46.4],
    [-91.4, 46.4]
  ],
  [
    [-87.8, 45.9], [-87.1, 45.8], [-86.6, 45.4], [-86.2, 44.8],
    [-86.1, 44.1], [-86.2, 43.3], [-86.3, 42.6], [-86.7, 42.0],
    [-87.2, 41.8], [-87.5, 42.3], [-87.7, 43.1], [-87.8, 44.0],
    [-87.9, 44.8]
  ],
  [
    [-84.9, 46.2], [-84.1, 46.1], [-83.4, 45.9], [-82.8, 45.4],
    [-82.5, 44.8], [-82.2, 44.3], [-82.4, 43.5], [-82.9, 43.0],
    [-83.6, 43.4], [-84.1, 44.0], [-84.5, 44.6], [-84.8, 45.3]
  ],
  [
    [-83.4, 42.2], [-82.6, 41.9], [-81.7, 41.7], [-80.8, 41.7],
    [-79.9, 41.9], [-78.9, 42.2], [-79.4, 42.6], [-80.4, 42.8],
    [-81.5, 42.7], [-82.5, 42.5]
  ],
  [
    [-79.8, 43.3], [-79.0, 43.2], [-78.2, 43.3], [-77.4, 43.4],
    [-76.6, 43.7], [-76.1, 44.0], [-76.8, 44.2], [-77.8, 44.1],
    [-78.8, 43.9], [-79.5, 43.6]
  ]
];

const greatLakePaths = greatLakes
  .map((lake) =>
    `<path d="${reliefPath(lake, true)}"/>`
  )
  .join("\n    ");

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
    <image href="${reliefDataUrl}" x="315" y="45" width="570" height="560" preserveAspectRatio="none"/>
  </g>
  <g class="great-lakes">
    ${greatLakePaths}
  </g>
  <g class="state-boundaries" fill="none">
    ${statePaths}
  </g>
  <style>
    .country{fill:url(#land-paper);stroke:#6a583d;stroke-width:1.25;vector-effect:non-scaling-stroke}
    .terrain-relief{opacity:.42;mix-blend-mode:multiply}
    .great-lakes{fill:#71827b;stroke:#5f6254;stroke-width:1.2;opacity:.96}
    .state-boundary{stroke:#665438;stroke-width:.82;opacity:.82;vector-effect:non-scaling-stroke}
  </style>
</svg>\n`;

fs.writeFileSync(outputPath, svg, "utf8");
console.log(`Generated ${path.relative(projectRoot, outputPath)} from Natural Earth geography.`);
