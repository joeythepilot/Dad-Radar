"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const stylesPath = path.join(projectRoot, "UI", "styles.css");
const layoutPath = path.join(projectRoot, "UI", "layout-side-rail.css");
const matteAssetPath = path.join(
  projectRoot,
  "assets",
  "split-flap",
  "split-flap-tile-matte-v2.png"
);

const styles = fs.readFileSync(stylesPath, "utf8");
const layout = fs.readFileSync(layoutPath, "utf8");

assert.ok(
  fs.existsSync(matteAssetPath),
  "Split-flap cards should use the new matte raster asset."
);

assert.doesNotMatch(
  styles,
  /split-flap-tile-lit-v1\.png/,
  "The over-lit split-flap tile must no longer be referenced."
);

assert.match(
  styles,
  /split-flap-tile-matte-v2\.png/,
  "The matte split-flap tile should drive both static and animated halves."
);

assert.doesNotMatch(
  styles,
  /\.flap-character::after\s*\{[\s\S]*?rgba\(\s*255,\s*255,\s*255,\s*0\.075\s*\)/,
  "Split-flap cards should not carry the old strong specular sheen."
);

assert.match(
  styles,
  /\.flap-character\s*\{[\s\S]*?text-shadow:\s*0\s+1px\s+0\s+rgba\([\s\S]*?0\.72[\s\S]*?;/,
  "Split-flap lettering should use a restrained printed-ink contact shadow."
);

assert.doesNotMatch(
  layout,
  /\.flight-board::after\s*\{[\s\S]*?rgba\(255,\s*155,\s*38,\s*0\.07\)/,
  "The flight-board cavity should not retain the old amber flood-light gradient."
);

assert.match(
  layout,
  /\.flight-board::after\s*\{[\s\S]*?border-color:\s*rgba\(214,\s*195,\s*160,\s*0\.12\)/,
  "The flight-board cavity should retain only a restrained neutral-warm edge light."
);

console.log("Split-flap visual regression tests passed.");
