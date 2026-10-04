"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const asset = path.join(root, "assets", "ui", "today-duty-card-weekly-paper.png");
const modulePath = path.join(root, "App", "daily-duty-card.js");
const cssPath = path.join(root, "UI", "daily-duty-card.css");
const build=fs.readFileSync(path.join(root,'scripts/build-browser.js'),'utf8');
assert(fs.existsSync(asset),'Approved physical duty raster exists');
const pixels=fs.readFileSync(asset);
assert.equal(pixels.readUInt32BE(16),1864);
assert.equal(pixels.readUInt32BE(20),843);
assert(fs.existsSync(modulePath)&&fs.existsSync(cssPath),'Physical card renderer and overlay stylesheet exist');
assert(build.includes('"App/daily-duty-card.js"'),'Physical duty renderer is bundled');
// CSS declaration spelling is not a behavior contract. The two-engine duty
// browser proof owns row/time/stamp/status fitting on kiosk and family layouts.
console.log("Duty-card asset and bundle contracts passed; visible fit belongs to browsers.");
