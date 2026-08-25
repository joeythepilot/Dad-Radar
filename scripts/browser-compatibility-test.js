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

const baseStyles = fs.readFileSync(
  path.join(projectRoot, "UI", "styles.css"),
  "utf8"
);

const layoutStyles = fs.readFileSync(
  path.join(
    projectRoot,
    "UI",
    "layout-side-rail.css"
  ),
  "utf8"
);

assert.match(
  html,
  /<script[\s\S]*?src="\.\/App\/dad-radar-browser\.js\?v=ipad-es5-16"[\s\S]*?><\/script>/,
  "The display should load the compatibility bundle."
);

assert.doesNotMatch(
  html,
  /type="module"/,
  "The display must not require module-script support."
);

assert.match(
  html,
  /IPAD-ES5-8/,
  "The display should expose its old-Safari boot diagnostic version."
);

for (const stylesheetPath of [
  "styles.css",
  "map.css",
  "layout-side-rail.css"
]) {
  assert.match(
    html,
    new RegExp(
      `\\.\\/UI\\/${stylesheetPath.replace(
        ".",
        "\\."
      )}\\?v=ipad-es5-13`
    ),
    `${stylesheetPath} should bypass the old iPad cache.`
  );
}

assert.match(
  baseStyles,
  /--flap-width:\s*45px;/,
  "The flap board should retain a pre-clamp tile-width fallback."
);

assert.match(
  baseStyles,
  /\.flap-character\s*\+\s*\.flap-character\s*\{[\s\S]*?margin-left:[\s\S]*?var\(--flap-gap\)/,
  "The flap board should not depend on unsupported Safari 12 flex gap."
);

for (const legacyGaugeText of [
  ["instrument-label", "0\\.25rem"],
  ["instrument-value", "0\\.62rem"],
  ["instrument-unit", "0\\.22rem"]
]) {
  assert.match(
    baseStyles,
    new RegExp(
      `\\.${legacyGaugeText[0]}\\s*\\{[\\s\\S]*?font-size:\\s*${legacyGaugeText[1]};[\\s\\S]*?font-size:\\s*clamp\\(`
    ),
    `${legacyGaugeText[0]} should retain a Safari 12 font-size fallback.`
  );
}

assert.match(
  layoutStyles,
  /\.instrument-slot \.instrument\s*\{[\s\S]*?width:\s*13vw\s*!important;[\s\S]*?height:\s*13vw\s*!important;/,
  "The instruments should have square Safari 12 fallback dimensions."
);

assert.match(
  html,
  /data-dad-radar-legacy/,
  "The ES5 boot path should mark browsers that need the hard visual fallback."
);

assert.match(
  layoutStyles,
  /html\[data-dad-radar-legacy="true"\][\s\S]*?#flight-number[\s\S]*?flex:\s*0 0 186px\s*!important;/,
  "The legacy split-flap board should use explicit group dimensions."
);

assert.match(
  layoutStyles,
  /html\[data-dad-radar-legacy="true"\][\s\S]*?\.instrument-slot \.instrument[\s\S]*?width:\s*132px\s*!important;[\s\S]*?height:\s*132px\s*!important;/,
  "The legacy instrument rail should use explicit square dimensions."
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
  },
  {
    label: "arrow functions",
    pattern: /=>/
  },
  {
    label: "const declarations",
    pattern: /\bconst\s+/
  },
  {
    label: "let declarations",
    pattern: /\blet\s+/
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

assert.match(
  bundle,
  /ipad-poster-7/,
  "The legacy bundle should request versioned destination posters."
);

assert.match(
  bundle,
  /loadVisibleDestinationPoster/,
  "Destination posters should retry on the visible image element."
);

assert.match(
  bundle,
  /showDestinationPosterBackground/,
  "Approved posters should render without depending on an image load event."
);

assert.match(
  html,
  /id="destination-poster"[\s\S]*?hidden[\s\S]*?id="destination-poster-fallback"[\s\S]*?aria-live=/,
  "The display should start with the poster fallback visible behind the hidden image."
);

assert.match(
  bundle,
  /groundAirport[\s\S]*?destination:[\s\S]*?groundAirport/,
  "A layover airport should take priority when selecting the destination poster."
);

assert.match(
  bundle,
  /retry/,
  "The legacy bundle should include poster cache-bypass retries."
);

console.log(
  "iOS 12 browser compatibility tests passed."
);
