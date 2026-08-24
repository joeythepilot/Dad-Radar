"use strict";

const fs = require("fs");
const path = require("path");
const topojson = require("topojson-client");
const world = require("world-atlas/countries-50m.json");

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

const mountainRanges = [
  { width: 58, angle: 54, points: [[-125,58],[-120,53],[-116,49],[-112,45],[-109,41],[-106,37],[-105,33]] },
  { width: 38, angle: 74, points: [[-123,49],[-122,44],[-120,39],[-118,35],[-116,32]] },
  { width: 32, angle: -48, points: [[-84,34],[-82,37],[-80,40],[-77,43],[-74,46]] },
  { width: 48, angle: 55, points: [[-109,30],[-106,27],[-103,23],[-100,19],[-98,16]] },
  { width: 34, angle: 48, points: [[-103,29],[-100,25],[-97,21],[-94,18]] }
];

const relief = mountainRanges.flatMap((range, rangeIndex) =>
  range.points.map((coordinate, pointIndex) => {
    const point = project(coordinate);
    const height = range.width * 0.42;
    return `<g class="terrain-ridge-field terrain-${rangeIndex}" transform="translate(${point[0].toFixed(1)} ${point[1].toFixed(1)}) rotate(${range.angle})"><ellipse class="terrain-ridge-shadow" rx="${range.width}" ry="${height.toFixed(1)}"/><path class="terrain-ridge-light" d="M${(-range.width * .72).toFixed(1)} 0 Q0 ${(-height * .7).toFixed(1)} ${(range.width * .72).toFixed(1)} 0"/><path class="terrain-ridge-line" d="M${(-range.width * .58).toFixed(1)} ${(height * .2).toFixed(1)} Q0 ${(-height * .35).toFixed(1)} ${(range.width * .58).toFixed(1)} ${(height * .2).toFixed(1)}"/></g>`;
  })
).join("\n    ");

const landClipPaths = features.map((feature) =>
  `<path d="${geometryPath(feature.geometry)}"/>`
).join("");

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
    <radialGradient id="ridge-shade" cx="46%" cy="42%" rx="54%" ry="58%">
      <stop offset="0" stop-color="#5f583c" stop-opacity=".34"/>
      <stop offset=".58" stop-color="#7b704b" stop-opacity=".17"/>
      <stop offset="1" stop-color="#7b704b" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="land-clip" fill-rule="evenodd">${landClipPaths}</clipPath>
  </defs>
  <g class="countries" fill-rule="evenodd">
    ${landPaths}
  </g>
  <g class="terrain" clip-path="url(#land-clip)">
    ${relief}
  </g>
  <style>
    .country{fill:url(#land-paper);stroke:#6a583d;stroke-width:1.25;vector-effect:non-scaling-stroke}
    .terrain-ridge-shadow{fill:url(#ridge-shade)}
    .terrain-ridge-light{fill:none;stroke:#eee1b7;stroke-width:2.2;opacity:.22}
    .terrain-ridge-line{fill:none;stroke:#584d34;stroke-width:1.2;opacity:.19}
  </style>
</svg>\n`;

fs.writeFileSync(outputPath, svg, "utf8");
console.log(`Generated ${path.relative(projectRoot, outputPath)} from Natural Earth geography.`);
