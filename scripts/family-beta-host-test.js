"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  PROJECT_ROOT,
  createLogger,
  createRestartRequestWatcher,
  launchTaskRestartBroker,
  resolvePort,
  rotateLog,
  runTaskRestartBroker,
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

function testRestartMarkerWatcher() {
  const SHA =
    "0123456789abcdef0123456789abcdef01234567";
  let markerExists = true;
  let removals = 0;
  const restarts = [];

  const watcher = createRestartRequestWatcher({
    requestPath: "C:\\temp\\restart.json",
    existsSync: () => markerExists,
    readFileSync: () =>
      JSON.stringify({
        action: "restart",
        sha: SHA,
        requestedAt: "2026-09-17T15:00:00.000Z"
      }),
    rmSync: () => {
      markerExists = false;
      removals += 1;
    },
    onRestart: (request) => {
      restarts.push(request);
    }
  });

  assert.equal(watcher.check(), true);
  assert.equal(removals, 1);
  assert.equal(restarts.length, 1);
  assert.equal(restarts[0].sha, SHA);

  assert.equal(
    watcher.check(),
    false,
    "consumed restart markers must not fire twice"
  );
  assert.equal(restarts.length, 1);
}

function testDetachedRestartBrokerLaunch() {
  assert.equal(
    typeof launchTaskRestartBroker,
    "function",
    "background host must expose the deterministic Task Scheduler restart broker launcher"
  );

  let invocation = null;
  let unrefCalls = 0;
  const child = {
    unref() {
      unrefCalls += 1;
    }
  };

  const result = launchTaskRestartBroker({
    spawn(command, args, options) {
      invocation = {
        command,
        args,
        options
      };
      return child;
    },
    execPath: "C:\\Program Files\\nodejs\\node.exe",
    hostScript: "C:\\Dad-Radar\\scripts\\family-beta-host.js",
    cwd: "C:\\Dad-Radar"
  });

  assert.equal(result, child);
  assert.equal(
    invocation.command,
    "C:\\Program Files\\nodejs\\node.exe"
  );
  assert.deepEqual(
    invocation.args,
    [
      "C:\\Dad-Radar\\scripts\\family-beta-host.js",
      "--restart-broker"
    ]
  );
  assert.deepEqual(
    invocation.options,
    {
      cwd: "C:\\Dad-Radar",
      detached: true,
      stdio: "ignore",
      windowsHide: true
    }
  );
  assert.equal(unrefCalls, 1);
}

async function testRestartBrokerRetriesUntilHealthy() {
  assert.equal(
    typeof runTaskRestartBroker,
    "function",
    "background host must expose the Task Scheduler restart broker"
  );

  let taskRuns = 0;
  let healthChecks = 0;
  const waits = [];

  const restarted = await runTaskRestartBroker({
    port: 4173,
    attempts: 4,
    initialDelayMs: 25,
    intervalMs: 50,
    delay: async (milliseconds) => {
      waits.push(milliseconds);
    },
    runTask: () => {
      taskRuns += 1;
      return true;
    },
    healthCheck: async ({ port }) => {
      assert.equal(port, 4173);
      healthChecks += 1;
      return healthChecks >= 2;
    },
    log: () => {}
  });

  assert.equal(restarted, true);
  assert.equal(taskRuns, 2);
  assert.equal(healthChecks, 2);
  assert.deepEqual(
    waits,
    [25, 50, 50]
  );
}

function testRemoteRestartIsWiredToBroker() {
  const hostSource = fs.readFileSync(
    path.join(__dirname, "family-beta-host.js"),
    "utf8"
  );

  assert.match(
    hostSource,
    /function forceRestart[\s\S]*launchTaskRestartBroker/,
    "remote restart handler must launch the deterministic Task Scheduler broker before exiting"
  );
}

Promise.resolve()
  .then(testManualTakeover)
  .then(testLogging)
  .then(testRestartMarkerWatcher)
  .then(testDetachedRestartBrokerLaunch)
  .then(testRestartBrokerRetriesUntilHealthy)
  .then(testRemoteRestartIsWiredToBroker)
  .then(() => {
    console.log(
      "Family beta background-host tests passed."
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
