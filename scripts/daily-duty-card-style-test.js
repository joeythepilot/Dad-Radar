"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "UI", "layout-side-rail.css"), "utf8");
const main = fs.readFileSync(path.join(root, "App", "main.js"), "utf8");
const asset = path.join(root, "assets", "ui", "today-duty-card-v2.png");

assert(fs.existsSync(asset), "Today's Duty physical card raster exists.");
assert(fs.statSync(asset).size > 1000000, "Today's Duty uses the full-resolution physical card artwork.");
assert(html.includes('src="/assets/ui/today-duty-card-v2.png"'), "The live dashboard installs the physical Today's Duty card artwork as an image.");
assert(html.includes('id="daily-schedule-footer"'), "The card exposes a live bottom status field.");
assert(!html.includes('class="daily-schedule-now"'), "The old NOW web-badge is removed from Today's Duty.");
assert(css.includes('.daily-schedule-card-art'), "Duty-card geometry is anchored to the raster artwork.");
assert(css.includes('background: transparent'), "The duty overlay stays transparent so CSS does not repaint the physical card.");
assert(main.includes('buildDutyCardView'), "The renderer consumes the dedicated duty-card view model.");
assert(main.includes('dailyScheduleFooter.textContent'), "The renderer updates the physical card's live bottom status field.");

console.log("Today's Duty physical-card source contract tests passed.");
