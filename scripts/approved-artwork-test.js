"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const manifest = require("../assets/hardware/approved-map-artwork.json");
assert.equal(manifest.files.length, 6);
for (const entry of manifest.files) {
  const bytes = fs.readFileSync(path.join(root, "assets/hardware", entry.file));
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), entry.sha256, `${entry.file}: preserve approved bytes`);
  assert.equal(bytes.readUInt32BE(16), entry.width);
  assert.equal(bytes.readUInt32BE(20), entry.height);
  assert.equal(bytes[25], 6, `${entry.file}: preserve RGBA transparency`);
}
for (const [file, sha256] of Object.entries({
  "clock-drum-mechanism.png": "0962edd06b180ec505b0f770a7196f89af74a3f444f0afc7f18ca3b3326416d4",
  "clock-drum-lighting.png": "fb6e0cb9a5162cc9437d6f289d7904937a2ff47aaeb0fbbc48a0980e1e3279e4"
})) {
  const bytes = fs.readFileSync(path.join(root, "assets/hardware", file));
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), sha256, `${file}: preserve Joey's approved production layer`);
  assert.equal(bytes.readUInt32BE(16), 1825);
  assert.equal(bytes.readUInt32BE(20), 460);
  assert.equal(bytes[25], 6, `${file}: registered transparent PNG`);
}
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.doesNotMatch(html, /instrument-(?:current-time|estimated-arrival)\.png|class="(?:clock-block|eta-block)"/);
for (const id of ["clock-value", "eta-value", "eta-zone"]) {
  assert.equal(html.split(`id="${id}"`).length - 1, 1, `${id}: reuse exactly one runtime output`);
}
console.log("Approved artwork bytes, alpha format and runtime output contracts passed.");
