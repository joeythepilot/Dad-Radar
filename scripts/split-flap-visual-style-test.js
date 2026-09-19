const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const layoutPath = path.join(root, "UI", "weekly-ticker-layout.css");
const mattePath = path.join(root, "UI", "split-flap-matte.css");
const assetPath = path.join(root, "assets", "split-flap", "split-flap-tile-matte-v2.svg");

const layout = fs.readFileSync(layoutPath, "utf8");
assert(
  layout.includes('@import url("./split-flap-matte.css?v=2");'),
  "full layout must import the matte split-flap override"
);
assert(fs.existsSync(mattePath), "matte split-flap stylesheet must exist");
assert(fs.existsSync(assetPath), "matte split-flap asset must exist");

const css = fs.readFileSync(mattePath, "utf8");
assert(css.includes("split-flap-tile-matte-v2.svg"), "matte asset must drive flap surfaces");
assert(!css.includes("split-flap-tile-lit-v1.png"), "matte override must not reuse the lit raster");
assert(css.includes("background-blend-mode: normal"), "matte asset must not be multiplied into artificial bronze lighting");
assert(css.includes(".flight-board::after"), "board lamp overlay must be explicitly retuned");
assert(css.includes("height: 1px"), "center seam must be reduced to a hairline");
assert(css.includes("0 1px 0 rgba(0, 0, 0, 0.46)"), "glyph treatment must use a restrained contact shadow");
assert(!css.includes("rgba(255, 248, 225, 0.18)"), "glyph treatment must not restore the old glow");

console.log("split-flap visual style test passed");
