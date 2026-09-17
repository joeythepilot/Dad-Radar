"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const bundle = fs.readFileSync(path.join(projectRoot, "App", "dad-radar-browser.js"), "utf8");
const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const build = fs.readFileSync(path.join(projectRoot, "scripts", "build-browser.js"), "utf8");

assert.match(html, /dad-radar-browser\.js\?v=weather-detail-1/, "The display loads the browser bundle.");
assert.doesNotMatch(html, /data-dad-radar-legacy/, "Retired browser-specific layout markers must be removed.");
assert.match(build, /targets:\s*["']> 0\.5%, not dead["']/, "The browser build must target the supported modern browser baseline.");
assert.match(bundle, /loadVisibleDestinationPoster/, "Destination poster recovery remains in the browser bundle.");
assert.match(bundle, /showDestinationPosterBackground/, "Approved poster rendering remains in the browser bundle.");
assert.match(bundle, /dadRadarWeeklyTicker/, "Weekly ticker remains in the browser bundle.");
assert.match(html, /id="destination-poster"[\s\S]*?hidden[\s\S]*?id="destination-poster-fallback"[\s\S]*?aria-live=/, "Poster fallback remains present at boot.");

console.log("Modern browser bundle integrity tests passed.");
