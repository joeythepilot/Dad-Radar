"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const asset = path.join(root, "assets", "ui", "today-duty-card-v2.png");
const modulePath = path.join(root, "App", "daily-duty-card.js");
const cssPath = path.join(root, "UI", "daily-duty-card.css");
const mobileLayoutPath = path.join(root, "Mobile", "layout.js");
const mobileLayoutCssPath = path.join(root, "Mobile", "layout.css");
const build = fs.readFileSync(path.join(root, "scripts", "build-browser.js"), "utf8");

assert(fs.existsSync(asset), "Today's Duty physical card raster exists.");
assert(fs.statSync(asset).size > 1000000, "Today's Duty uses the full-resolution physical card artwork.");
assert(fs.existsSync(modulePath), "Today's Duty has a dedicated physical-card renderer.");
assert(fs.existsSync(cssPath), "Today's Duty has geometry-only overlay CSS.");

const moduleSource = fs.readFileSync(modulePath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");
const mobileLayout = fs.readFileSync(mobileLayoutPath, "utf8");
const mobileLayoutCss = fs.readFileSync(mobileLayoutCssPath, "utf8");

assert(moduleSource.includes("/assets/ui/today-duty-card-v2.png"), "The renderer installs the approved physical card raster.");
assert(moduleSource.includes("daily-schedule-footer"), "The renderer exposes a live bottom status field.");
assert(moduleSource.includes("daily-schedule-now"), "The renderer explicitly removes the old NOW web-badge.");
assert(moduleSource.includes("buildDutyCardView"), "The renderer consumes the dedicated duty-card view model.");
assert(moduleSource.includes("data-family-full"), "The physical duty-card renderer must recognize Mobile Full mode.");
assert(moduleSource.includes("rowCapacity"), "Mobile Full must request the physical card's full ruled-row capacity.");
assert(css.includes(".daily-schedule-card-art"), "Duty-card geometry is anchored to the raster artwork.");
assert(css.includes("background: transparent"), "The live overlay stays transparent so CSS does not repaint the physical card.");
assert(!css.includes("linear-gradient") && !css.includes("radial-gradient"), "CSS does not fabricate card material, lighting, or aging.");
assert(build.includes('"App/daily-duty-card.js"'), "The modern browser bundle includes the physical-card renderer.");
assert(mobileLayout.includes("is-physical-duty-card"), "Mobile Full must detect the physical Today’s Duty card before applying narrow-panel reflow.");
assert(mobileLayoutCss.includes("family-duty-narrow:not(.is-physical-duty-card)"), "Legacy narrow-panel CSS must explicitly exclude the physical Today’s Duty card.");

console.log("Today's Duty physical-card source contract tests passed.");