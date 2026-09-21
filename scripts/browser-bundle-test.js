"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const bundle = fs.readFileSync(path.join(projectRoot, "App", "dad-radar-browser.js"), "utf8");
const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const build = fs.readFileSync(path.join(projectRoot, "scripts", "build-browser.js"), "utf8");
const desktopStyles = fs.readFileSync(path.join(projectRoot, "UI", "styles.css"), "utf8");
const mobileStyles = fs.readFileSync(path.join(projectRoot, "Mobile", "mobile.css"), "utf8");

assert.match(html, /dad-radar-browser\.js\?v=home-paper-1/, "The main display loads the generated browser bundle.");
assert.match(build, /targets:\s*["']> 0\.5%, not dead["']/, "The browser build targets the supported modern browser baseline.");
assert.match(bundle, /loadVisibleDestinationPoster/, "Destination poster recovery remains in the browser bundle.");
assert.match(bundle, /dadRadarWeeklyTicker/, "Weekly ticker remains in the browser bundle.");
assert.match(html, /north-america-caribbean-vintage\.svg\?v=antique-chart-4-us-borders/, "The sharpened map artwork remains wired into the display.");
assert.match(html, /class="map-terrain-relief"[\s\S]*?north-america-caribbean-relief-hires\.jpg\?v=terrain-direct-4/, "Terrain loads directly in the live SVG rather than through a nested SVG image.");
assert.match(html, /id="destination-poster"[\s\S]*?hidden[\s\S]*?id="destination-poster-fallback"[\s\S]*?aria-live=/, "Poster fallback remains present at boot.");
const desktopCityText = desktopStyles.match(/\.map-city-reference text\s*\{([\s\S]*?)\}/)?.[1] ?? "";
const desktopCityDot = desktopStyles.match(/\.map-city-reference circle\s*\{([\s\S]*?)\}/)?.[1] ?? "";
const mobileCityText = mobileStyles.match(/\.map-city-reference text\s*\{([\s\S]*?)\}/)?.[1] ?? "";
const mobileCityDot = mobileStyles.match(/\.map-city-reference circle\s*\{([\s\S]*?)\}/)?.[1] ?? "";

for (const [name, block] of [
  ["desktop city text", desktopCityText],
  ["desktop city dot", desktopCityDot],
  ["mobile city text", mobileCityText],
  ["mobile city dot", mobileCityDot]
]) {
  assert.doesNotMatch(block, /vector-effect:\s*non-scaling-stroke/, `${name} must scale its outline with the counter-scaled city label.`);
}
assert.match(desktopCityText, /stroke-width:\s*1\.35px/, "Desktop city halo stays restrained.");
assert.match(mobileCityText, /stroke-width:\s*1\.35px/, "Mobile city halo stays restrained.");
assert.match(desktopCityText, /paint-order:\s*stroke fill/, "Desktop label fill must repaint cleanly over its halo.");
assert.match(mobileCityText, /paint-order:\s*stroke fill/, "Mobile label fill must repaint cleanly over its halo.");


console.log("Modern browser bundle integrity tests passed.");
