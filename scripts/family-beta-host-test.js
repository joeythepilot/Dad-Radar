"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  createLogger,
  resolvePort,
  rotateLog,
  waitForManualServer
} = require("./family-beta-host");

assert.equal(
  resolvePort({ PORT: "4173" }),
  4173
);
assert.equal(
  resolvePort({ PORT: "8080" }),
  8080
);
assert.equal(
  resolvePort({ PORT: "invalid" }),
  4173
);
assert.equal(
  resolvePort({ PORT: "70000" }),
  4173
);

async function testManualTakeover() {
  const healthStates = [
    true,
    true,
    false,
    false
  ];

  let delayCalls = 0;

  await waitForManualServer({
    port: 4173,
    healthCheck: async ({ port }) => {
      assert.equal(port, 4173);
      return healthStates.shift();
    },
    delay: async (milliseconds) => {
      assert.equal(milliseconds, 25);
      delayCalls += 1;
    },
    intervalMs: 25
  });

  assert.equal(
    healthStates.length,
    0
  );
  assert.equal(delayCalls, 3);
}

function testLogging() {
  const temporaryDirectory =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "dad-radar-host-"
      )
    );

  try {
    const logPath = path.join(
      temporaryDirectory,
      "family-beta.log"
    );

    const previousLogPath = path.join(
      temporaryDirectory,
      "family-beta.previous.log"
    );

    const log = createLogger({
      logPath,
      previousLogPath,
      maxLogBytes: 1024,
      now: () =>
        new Date(
          "2026-08-14T12:00:00.000Z"
        )
    });

    log(
      "Dad Radar",
      { state: "ready" }
    );

    assert.equal(
      fs.readFileSync(
        logPath,
        "utf8"
      ),
      "[2026-08-14T12:00:00.000Z] Dad Radar {\"state\":\"ready\"}\n"
    );

    fs.writeFileSync(
      logPath,
      "1234567890",
      "utf8"
    );

    assert.equal(
      rotateLog({
        logPath,
        previousLogPath,
        maxLogBytes: 5
      }),
      true
    );

    assert.equal(
      fs.readFileSync(
        previousLogPath,
        "utf8"
      ),
      "1234567890"
    );
    assert.equal(
      fs.existsSync(logPath),
      false
    );
  } finally {
    fs.rmSync(
      temporaryDirectory,
      {
        recursive: true,
        force: true
      }
    );
  }
}

Promise.resolve()
  .then(testManualTakeover)
  .then(testLogging)
  .then(() => {
    console.log(
      "Family beta background-host tests passed."
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
