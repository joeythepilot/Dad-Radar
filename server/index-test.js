const assert = require("node:assert/strict");

const { app } = require("./index");

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
      "/api/health",
      "/App/dad-radar-browser.js",
      "/App/main.js",
      "/UI/styles.css",
      "/config/settings.js",
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
