"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

const bundle = fs.readFileSync(
  path.join(
    projectRoot,
    "App",
    "dad-radar-browser.js"
  ),
  "utf8"
);

const html = fs.readFileSync(
  path.join(projectRoot, "index.html"),
  "utf8"
);

assert.match(
  html,
  /<script src="\.\/App\/dad-radar-browser\.js"><\/script>/,
  "The display should load the compatibility bundle."
);

assert.doesNotMatch(
  html,
  /type="module"/,
  "The display must not require module-script support."
);

for (const unsupportedSyntax of [
  {
    label: "optional chaining",
    pattern: /\?\./
  },
  {
    label: "nullish coalescing",
    pattern: /\?\?/
  },
  {
    label: "Array.prototype.at",
    pattern: /\.at\s*\(/
  }
]) {
  assert.doesNotMatch(
    bundle,
    unsupportedSyntax.pattern,
    `The iOS 12 bundle must not contain ${unsupportedSyntax.label}.`
  );
}

assert.match(
  bundle,
  /replaceChildren/,
  "The bundle should install the replaceChildren compatibility fallback."
);

assert.match(
  bundle,
  /root\.globalThis = root/,
  "The bundle should install the globalThis compatibility fallback."
);

console.log(
  "iOS 12 browser compatibility tests passed."
);
