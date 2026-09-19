"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const {observeBrowserErrors} = require("./browser-error-proof");
const {chromium, webkit} = require("playwright");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "artifacts", "map-hardware");
fs.mkdirSync(output, {recursive: true});

const stamp = new Date().toISOString();
const payload = {
  ok: true,
  revision: 1,
  publishedAt: stamp,
  calendarOk: true,
  liveOk: true,
  calendarAt: stamp,
  liveAt: stamp,
  resolved: {
    mode: "HOME",
    state: {
      status: "HOME",
      message: "DADDY IS HOME",
      locationAirport: "AVL",
      flight: null
    },
    event: null
  }
};
const schedule = {ok: true, events: []};
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json"
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");

  if (url.pathname.startsWith("/api/")) {
    if (url.pathname.startsWith("/api/weather")) {
      response.writeHead(204);
      response.end();
      return;
    }

    response.setHeader("Content-Type", "application/json");

    if (url.pathname === "/api/calendar/upcoming") {
      response.end(JSON.stringify(schedule));
      return;
    }

    response.end(
      JSON.stringify(
        url.pathname.includes("/surface")
          ? {pending: true, retryAfterMs: 3600000}
          : payload
      )
    );
    return;
  }

  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const file = path.resolve(root, "." + requested);

  if (
    !file.startsWith(root + path.sep) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  ) {
    response.writeHead(404);
    response.end();
    return;
  }

  response.setHeader(
    "Content-Type",
    types[path.extname(file)] || "application/octet-stream"
  );
  fs.createReadStream(file).pipe(response);
});

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;

  try {
    for (const [engine, type] of [["chromium", chromium], ["webkit", webkit]]) {
      const browser = await type.launch({headless: true});

      try {
        const page = await browser.newPage({
          viewport: {width: 1920, height: 1080},
          serviceWorkers: "block"
        });
        const assertBrowserSettled = observeBrowserErrors(page);
        await page.route("**/*", route => {
          const requestUrl = route.request().url();
          return requestUrl.startsWith(origin) || requestUrl.startsWith("blob:")
            ? route.continue()
            : route.abort();
        });

        await page.goto(origin + "/", {waitUntil: "load"});
        await page.waitForSelector("#dashboard:not([hidden])", {timeout: 12000});
        await page.waitForSelector(".flap-character", {timeout: 5000});

        const evidence = await page.evaluate(() => {
          const flap = document.querySelector(".flap-character");
          const board = document.querySelector(".flight-board");
          const style = getComputedStyle(flap);
          const seam = getComputedStyle(flap, "::before");
          const sheen = getComputedStyle(flap, "::after");
          const boardLight = getComputedStyle(board, "::after");

          return {
            backgroundImage: style.backgroundImage,
            color: style.color,
            textShadow: style.textShadow,
            seamHeight: seam.height,
            seamBackground: seam.backgroundColor,
            sheenBackgroundImage: sheen.backgroundImage,
            boardBackgroundImage: boardLight.backgroundImage,
            boardBorderColor: boardLight.borderColor,
            boardBoxShadow: boardLight.boxShadow
          };
        });

        assert.match(
          evidence.backgroundImage,
          /split-flap-tile-matte-v2\.svg/,
          `${engine}: matte split-flap asset should be active`
        );
        assert.equal(
          evidence.seamHeight,
          "1px",
          `${engine}: split joint should be a one-pixel mechanical break`
        );
        assert.match(
          evidence.textShadow,
          /rgba?\(0, 0, 0, 0\.46\)/,
          `${engine}: lettering should use the restrained contact shadow`
        );
        assert.doesNotMatch(
          evidence.textShadow,
          /0\.18/,
          `${engine}: the old warm glyph glow should not be present`
        );
        assert.match(
          evidence.sheenBackgroundImage,
          /linear-gradient/,
          `${engine}: the remaining surface treatment should be a restrained grazing gradient`
        );
        assert.match(
          evidence.boardBackgroundImage,
          /linear-gradient/,
          `${engine}: the board should retain only the retuned cavity gradient`
        );
        assert.ok(
          evidence.boardBorderColor === "rgba(205, 177, 121, 0.09)" ||
            evidence.boardBorderColor === "rgba(205, 177, 121, 0.09)",
          `${engine}: board edge light should remain at the restrained calibrated value`
        );
        await assertBrowserSettled(engine);

        await page.locator(".flight-strip-module").screenshot({
          path: path.join(output, `split-flap-matte-${engine}.png`)
        });
        fs.writeFileSync(
          path.join(output, `split-flap-matte-${engine}.json`),
          JSON.stringify(evidence, null, 2)
        );

        console.log(`${engine}: split-flap matte material passed`);
        await page.close();
      } finally {
        await browser.close();
      }
    }
  } finally {
    server.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
