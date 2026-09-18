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
assert(moduleSource.includes("daily-schedule-operational-stamp"), "The physical-card renderer must create a live operational stamp for delayed rows.");
assert(moduleSource.includes("daily-schedule-operational-stamp"), "The physical-card renderer must render live operational revision stamps.");
assert(css.includes(".daily-schedule-card-art"), "Duty-card geometry is anchored to the raster artwork.");
assert(css.includes(".daily-schedule-operational-stamp"), "The operational stamp has dedicated physical-overlay geometry.");
assert(css.includes("rgba(139, 32, 25"), "The operational stamp uses aged red dispatch ink.");
assert(css.includes("background: transparent"), "The live overlay stays transparent so CSS does not repaint the physical card.");
assert(css.includes(".daily-schedule-operational-stamp"), "Today’s Duty must include geometry for the operational revision stamp.");
assert(css.includes("rgba(139, 32, 25"), "Operational delay stamps use the muted red dispatch-ink treatment.");
assert(!css.includes("linear-gradient") && !css.includes("radial-gradient"), "CSS does not fabricate card material, lighting, or aging.");
assert(build.includes('"App/daily-duty-card.js"'), "The modern browser bundle includes the physical-card renderer.");
assert(mobileLayout.includes("is-physical-duty-card"), "Mobile Full must detect the physical Today’s Duty card before applying narrow-panel reflow.");
assert(mobileLayoutCss.includes("family-duty-narrow:not(.is-physical-duty-card)"), "Legacy narrow-panel CSS must explicitly exclude the physical Today’s Duty card.");
assert(mobileLayoutCss.includes("--family-duty-row-font-size"), "Mobile Full must define a smaller physical-card row type scale.");
assert(mobileLayoutCss.includes("--family-duty-context-font-size"), "Mobile Full must define a smaller physical-card context type scale.");
assert(mobileLayoutCss.includes("html[data-family-full] .daily-schedule-panel.is-physical-duty-card .daily-schedule-entry"), "Mobile Full must apply its compact type scale only to the physical duty card.");
assert(mobileLayoutCss.includes("--family-duty-context-top"), "Mobile Full must give the status copy a lower safe top inset so glyph ascenders are not clipped.");
assert(mobileLayoutCss.includes("top: var(--family-duty-context-top) !important"), "Mobile Full must apply the status safe inset to the physical duty card context window.");
assert(mobileLayoutCss.includes("--family-duty-context-safety-pad"), "Mobile Full must reserve ascender safety space inside the status text window.");
assert(mobileLayoutCss.includes("--family-duty-date-width"), "Mobile Full must widen the physical-card date field so THU SEP 17 fits without ellipsis.");
assert(mobileLayoutCss.includes("--family-duty-time-column-width"), "Mobile Full must reserve enough width for 11:30 AM/PM without clipping the suffix.");
assert(mobileLayoutCss.includes("text-overflow: clip !important"), "Mobile Full physical-card fields must not replace valid date/time text with ellipses.");
assert(mobileLayoutCss.includes("--family-duty-stamp-font-size"), "Mobile Full must give the operational delay stamp its own compact type scale.");
assert(mobileLayoutCss.includes("html[data-family-full] .daily-schedule-panel.is-physical-duty-card .daily-schedule-operational-stamp"), "Mobile Full must calibrate the operational stamp separately from the desktop card.");
assert(mobileLayoutCss.includes("max-height: 82% !important"), "Mobile Full delay stamp must stay vertically inside its ruled row.");
assert(mobileLayoutCss.includes("rotate(-1.2deg)"), "Mobile Full delay stamp rotation must be shallow enough to avoid clipping.");

function percentVariable(name) {
  const match = mobileLayoutCss.match(new RegExp(`${name}:\\s*([0-9.]+)%`));
  assert(match, `Mobile Full must define ${name} as a percentage.`);
  return Number(match[1]);
}

const contextTop = percentVariable("--family-duty-context-top");
const contextHeight = percentVariable("--family-duty-context-height");
assert(
  contextTop + contextHeight <= 36.5,
  `Mobile Full Current Status window must end above the printed assignment divider; got ${contextTop + contextHeight}%.`
);

console.log("Today's Duty physical-card source contract tests passed.");
