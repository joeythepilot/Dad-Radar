const assert = require("node:assert/strict");

const {
  app,
  startServer
} = require("./index");

async function runTests() {
  const server = app.listen(
    0,
    "127.0.0.1"
  );

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  const baseUrl =
    `http://127.0.0.1:${address.port}`;

  try {
    for (const publicPath of [
      "/",
      "/display",
      "/mobile",
      "/Mobile/mobile.js",
      "/Mobile/manifest.webmanifest",
      "/Mobile/icon.png",
      "/api/health",
      "/App/dad-radar-browser.js",
      "/App/main.js",
      "/App/airport-surface-map.js",
      "/UI/styles.css",
      "/config/settings.js",
      "/assets/ui/airport-placard-enamel-v10.css",
      "/assets/destinations/asheville-poster-7x8-baseline.png"
    ]) {
      const response = await fetch(
        `${baseUrl}${publicPath}`
      );

      assert.equal(
        response.status,
        200,
        `${publicPath} should be available to the family display.`
      );
    }

    for (const privatePath of [
      "/.env",
      "/token.json",
      "/credentials.json",
      "/package.json",
      "/server/index.js",
      "/runtime/airport-maps/AVL.json",
      "/Docs/Project-decisions.md"
    ]) {
      const response = await fetch(
        `${baseUrl}${privatePath}`
      );

      assert.equal(
        response.status,
        404,
        `${privatePath} must not be exposed on the home network.`
      );
    }

    const displayResponse = await fetch(
      `${baseUrl}/display`
    );
    const displayHtml =
      await displayResponse.text();

    assert.match(
      displayHtml,
      /airport-placard-enamel-v10\.css\?v=10\.0/,
      "The display should load the dark enamel airport placards."
    );

    const mobile = await (await fetch(`${baseUrl}/mobile`)).text();
    assert.match(mobile, /id="arrival-time"/);
    assert.match(mobile, /id="route-map-svg"/);
    const fullResponse = await fetch(`${baseUrl}/mobile/full`);
    const full = await fullResponse.text();
    assert.match(full, /data-family-full/);
    assert.match(full, /<base href="\/">/);
    assert.match(full, /id="dashboard"/);
    assert.match(full, /Mobile\/family-auth.js/);
    assert.match(full, /Mobile\/layout.js/);
    assert.match(fullResponse.headers.get("cache-control"), /no-store/);
    assert(!displayHtml.includes('data-family-full'), 'Home console stays independent of family layout choice');
    const worker = await fetch(`${baseUrl}/Mobile/sw.js`);
    assert.equal(worker.headers.get("service-worker-allowed"), "/mobile");
    const api = await fetch(`${baseUrl}/api/health`);
    assert.match(api.headers.get("cache-control"), /no-store/);

    const collisionServer = startServer({
      port: address.port,
      host: "127.0.0.1"
    });

    const collisionError =
      await new Promise((resolve) => {
        collisionServer.once(
          "error",
          resolve
        );
      });

    assert.equal(
      collisionError.code,
      "EADDRINUSE",
      "A duplicate start should report that Dad Radar is already running."
    );
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  console.log(
    "Family beta web server tests passed."
  );
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
