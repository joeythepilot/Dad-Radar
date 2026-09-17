"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const materialStylesPath = path.join(
  projectRoot,
  "UI",
  "split-flap-matte-v2.css"
);
const tickerStylesPath = path.join(
  projectRoot,
  "UI",
  "weekly-ticker-layout.css"
);
const matteAssetPath = path.join(
  projectRoot,
  "assets",
  "split-flap",
  "split-flap-tile-matte-v2.png"
);

assert.ok(
  fs.existsSync(materialStylesPath),
  "Split-flap material repair stylesheet should exist."
);

assert.ok(
  fs.existsSync(matteAssetPath),
  "Split-flap cards should use the new matte raster asset."
);

const materialStyles = fs.readFileSync(materialStylesPath, "utf8");
const tickerStyles = fs.readFileSync(tickerStylesPath, "utf8");
const png = fs.readFileSync(matteAssetPath);

assert.equal(
  png.toString("ascii", 1, 4),
  "PNG",
  "Split-flap matte asset should be a valid PNG."
);

assert.equal(
  png.readUInt32BE(16),
  64,
  "Split-flap matte asset should retain the intended native-scale source width."
);

assert.equal(
  png.readUInt32BE(20),
  107,
  "Split-flap matte asset should retain the intended native-scale source height."
);

assert.match(
  tickerStyles,
  /^@import\s+url\(["']\.\/split-flap-matte-v2\.css["']\);/,
  "The split-flap material repair should load before ticker geometry rules."
);

assert.match(
  materialStyles,
  /split-flap-tile-matte-v2\.png/,
  "The matte split-flap tile should drive the material override."
);

assert.match(
  materialStyles,
  /\.flap-character[\s\S]*?background:[\s\S]*?split-flap-tile-matte-v2\.png/,
  "Static split-flap cards should use the matte tile."
);

assert.match(
  materialStyles,
  /\.flap-half[\s\S]*?background-image:[\s\S]*?split-flap-tile-matte-v2\.png/,
  "Animated split-flap halves should use the matte tile."
);

assert.match(
  materialStyles,
  /\.flap-character::after\s*\{[\s\S]*?content:\s*none;/,
  "Split-flap cards should disable the old strong specular overlay."
);

assert.match(
  materialStyles,
  /\.flap-character\s*\{[\s\S]*?text-shadow:\s*0\s+1px\s+0\s+rgba\(0,\s*0,\s*0,\s*0\.72\)/,
  "Split-flap lettering should use a restrained printed-ink contact shadow."
);

assert.match(
  materialStyles,
  /\.flap-character::before\s*\{[\s\S]*?height:\s*1px;[\s\S]*?background:\s*rgba\(0,\s*0,\s*0,\s*0\.9\)/,
  "The center split should read as a fine mechanical joint rather than a heavy bar."
);

assert.match(
  materialStyles,
  /\.flight-board::after\s*\{[\s\S]*?background:\s*none;[\s\S]*?border-color:\s*rgba\(214,\s*195,\s*160,\s*0\.12\)/,
  "The flight-board cavity should retain only restrained neutral-warm edge light."
);

assert.doesNotMatch(
  materialStyles,
  /rgba\(255,\s*(?:153|155|181|205|211|221),/,
  "The split-flap material override should not reintroduce amber flood-light values."
);

console.log("Split-flap visual regression tests passed.");
