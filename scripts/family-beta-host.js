"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const {
  spawnSync
} = require("node:child_process");

const PROJECT_ROOT = path.resolve(
  __dirname,
  ".."
);

const RUNTIME_DIRECTORY = path.join(
  PROJECT_ROOT,
  "runtime"
);

const LOG_PATH = path.join(
  RUNTIME_DIRECTORY,
  "family-beta.log"
);

const PREVIOUS_LOG_PATH = path.join(
  RUNTIME_DIRECTORY,
  "family-beta.previous.log"
);

const REMOTE_RESTART_REQUEST_PATH = path.join(
  RUNTIME_DIRECTORY,
  "remote-restart-request.json"
);

const MAX_LOG_BYTES =
  1024 * 1024;

const HEALTH_INTERVAL_MS = 5000;
const RESTART_CHECK_INTERVAL_MS = 2000;
const RESTART_SHA_PATTERN = /^[0-9a-f]{40}$/;

function rotateLog(options = {}) {
  const logPath =
    options.logPath ?? LOG_PATH;

  const previousLogPath =
    options.previousLogPath ??
    PREVIOUS_LOG_PATH;

  const maxLogBytes =
    options.maxLogBytes ??
    MAX_LOG_BYTES;

  try {
    const stats = fs.statSync(logPath);

    if (stats.size < maxLogBytes) {
      return false;
    }

    fs.rmSync(
      previousLogPath,
      { force: true }
    );

    fs.renameSync(
      logPath,
      previousLogPath
    );

    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

function createLogger(options = {}) {
  const logPath =
    options.logPath ?? LOG_PATH;

  const write =
    options.appendFileSync ??
    fs.appendFileSync;

  const now =
    options.now ??
    (() => new Date());

  fs.mkdirSync(
    path.dirname(logPath),
    { recursive: true }
  );

  rotateLog({
    ...options,
    logPath
  });

  return function log(...values) {
    const message = values
      .map((value) => {
        if (value instanceof Error) {
          return value.stack ??
            value.message;
        }

        if (
          typeof value === "object" &&
          value !== null
        ) {
          try {
            return JSON.stringify(value);
          } catch (_error) {
            return String(value);
          }
        }

        return String(value);
      })
      .join(" ");

    write(
      logPath,
      `[${now().toISOString()}] ${message}\n`,
      "utf8"
    );
  };
}

function createRestartRequestWatcher(options = {}) {
  const requestPath =
    options.requestPath ??
    REMOTE_RESTART_REQUEST_PATH;

  const existsSync =
    options.existsSync ?? fs.existsSync;
  const readFileSync =
    options.readFileSync ?? fs.readFileSync;
  const rmSync =
    options.rmSync ?? fs.rmSync;
  const setTimer =
    options.setInterval ?? setInterval;
  const clearTimer =
    options.clearInterval ?? clearInterval;
  const intervalMs =
    options.intervalMs ??
    RESTART_CHECK_INTERVAL_MS;
  const onRestart =
    options.onRestart ?? (() => {});
  const log =
    options.log ?? (() => {});

  let timerId = null;

  function removeRequest() {
    rmSync(requestPath, { force: true });
  }

  function check() {
    if (!existsSync(requestPath)) {
      return false;
    }

    let request;

    try {
      request = JSON.parse(
        readFileSync(requestPath, "utf8")
      );
    } catch (error) {
      log(
        "Discarding unreadable remote restart request.",
        error
      );
      removeRequest();
      return false;
    }

    const sha = String(
      request?.sha ?? ""
    ).trim().toLowerCase();

    if (
      request?.action !== "restart" ||
      !RESTART_SHA_PATTERN.test(sha)
    ) {
      log(
        "Discarding invalid remote restart request."
      );
      removeRequest();
      return false;
    }

    const normalizedRequest = {
      action: "restart",
      sha,
      requestedAt:
        request.requestedAt ?? null
    };

    removeRequest();
    onRestart(normalizedRequest);
    return true;
  }

  function start() {
    if (timerId !== null) {
      return timerId;
    }

    if (check()) {
      return null;
    }

    timerId = setTimer(
      check,
      intervalMs
    );

    timerId?.unref?.();
    return timerId;
  }

  function stop() {
    if (timerId === null) {
      return;
    }

    clearTimer(timerId);
    timerId = null;
  }

  return Object.freeze({
    check,
    start,
    stop
  });
}

function loadRuntimeEnvironment() {
  process.chdir(PROJECT_ROOT);

  require("dotenv").config({
    path: path.join(
      PROJECT_ROOT,
      ".env"
    ),
    quiet: true
  });
}

function resolvePort(env = process.env) {
  const configuredPort = Number(
    env.PORT
  );

  return Number.isInteger(configuredPort) &&
    configuredPort > 0 &&
    configuredPort <= 65535
      ? configuredPort
      : 4173;
}

function buildBrowser(options = {}) {
  const spawn =
    options.spawnSync ?? spawnSync;

  return spawn(
    process.execPath,
    [
      path.join(
        PROJECT_ROOT,
        "scripts",
        "build-browser.js"
      )
    ],
    {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      windowsHide: true
    }
  );
}

function isDadRadarHealthy(options = {}) {
  const port =
    options.port ?? 4173;

  const timeoutMs =
    options.timeoutMs ?? 2000;

  return new Promise((resolve) => {
    const request = http.get(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/health",
        timeout: timeoutMs
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");

        response.on("data", (chunk) => {
          body += chunk;
        });

        response.on("end", () => {
          try {
            const payload = JSON.parse(body);

            resolve(
              response.statusCode === 200 &&
              payload?.ok === true &&
              payload?.service === "Dad Radar"
            );
          } catch (_error) {
            resolve(false);
          }
        });
      }
    );

    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });

    request.on("error", () => {
      resolve(false);
    });
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function waitForManualServer(
  options = {}
) {
  const healthCheck =
    options.healthCheck ??
    isDadRadarHealthy;

  const wait =
    options.delay ?? delay;

  const intervalMs =
    options.intervalMs ??
    HEALTH_INTERVAL_MS;

  const port =
    options.port ?? 4173;

  let failures = 0;

  while (failures < 2) {
    const healthy = await healthCheck({
      port
    });

    failures = healthy
      ? 0
      : failures + 1;

    if (failures < 2) {
      await wait(intervalMs);
    }
  }
}

function installConsoleLogging(log) {
  console.log = (...values) => {
    log("INFO", ...values);
  };

  console.warn = (...values) => {
    log("WARN", ...values);
  };

  console.error = (...values) => {
    log("ERROR", ...values);
  };
}

async function run(options = {}) {
  fs.mkdirSync(
    RUNTIME_DIRECTORY,
    { recursive: true }
  );

  const log =
    options.log ?? createLogger();

  if (!options.keepConsole) {
    installConsoleLogging(log);
  }

  loadRuntimeEnvironment();

  const port = resolvePort();

  process.once(
    "uncaughtException",
    (error) => {
      log(
        "Uncaught background-host error.",
        error
      );
      process.exit(1);
    }
  );

  process.once(
    "unhandledRejection",
    (error) => {
      log(
        "Unhandled background-host rejection.",
        error
      );
      process.exit(1);
    }
  );

  log(
    "Dad Radar background host starting.",
    `Port ${port}.`
  );

  const buildResult =
    (options.buildBrowser ??
      buildBrowser)();

  if (
    buildResult.error ||
    buildResult.status !== 0
  ) {
    log(
      "Browser bundle build failed.",
      buildResult.error ?? "",
      buildResult.stderr ?? ""
    );
    process.exitCode = 1;
    return null;
  }

  if (buildResult.stdout) {
    log(buildResult.stdout.trim());
  }

  const healthCheck =
    options.healthCheck ??
    isDadRadarHealthy;

  if (await healthCheck({ port })) {
    log(
      "A manually started Dad Radar server is already running. The background host will take over if it stops."
    );

    await waitForManualServer({
      healthCheck,
      delay: options.delay,
      intervalMs:
        options.healthIntervalMs,
      port
    });

    log(
      "The manual server stopped. Starting the background server."
    );
  }

  const startServer =
    options.startServer ??
    require("../server/index")
      .startServer;

  const server = startServer({ port });

  let stopping = false;
  let restartWatcher = null;

  function forceRestart(request) {
    if (stopping) {
      return;
    }

    stopping = true;
    restartWatcher?.stop();

    log(
      "Dad Radar accepted remote restart request.",
      `SHA ${request.sha}.`
    );

    server.close(() => {
      process.exit(1);
    });

    setTimeout(() => {
      process.exit(1);
    }, 5000).unref();
  }

  restartWatcher =
    createRestartRequestWatcher({
      requestPath:
        options.restartRequestPath,
      intervalMs:
        options.restartCheckIntervalMs,
      existsSync:
        options.existsSync,
      readFileSync:
        options.readFileSync,
      rmSync:
        options.rmSync,
      setInterval:
        options.setInterval,
      clearInterval:
        options.clearInterval,
      log,
      onRestart: forceRestart
    });

  server.on("error", (error) => {
    log("Server error.", error);

    if (error.code === "EADDRINUSE") {
      log(
        "Port is already in use. Windows will retry the background task automatically."
      );
    }

    process.exit(1);
  });

  server.on("listening", () => {
    log(
      "Dad Radar is running in the background."
    );
    restartWatcher.start();
  });

  server.on("close", () => {
    restartWatcher.stop();

    if (!stopping) {
      log(
        "Dad Radar server closed unexpectedly. Windows will restart the background task."
      );
      process.exit(1);
    }
  });

  const stop = (signal) => {
    stopping = true;
    restartWatcher.stop();

    log(
      `Dad Radar background host received ${signal}.`
    );

    server.close(() => {
      process.exit(0);
    });

    setTimeout(() => {
      process.exit(1);
    }, 5000).unref();
  };

  process.once("SIGINT", () => {
    stop("SIGINT");
  });

  process.once("SIGTERM", () => {
    stop("SIGTERM");
  });

  return server;
}

if (require.main === module) {
  run().catch((error) => {
    const log = createLogger();
    log(
      "Dad Radar background host failed.",
      error
    );
    process.exitCode = 1;
  });
}

module.exports = {
  HEALTH_INTERVAL_MS,
  LOG_PATH,
  MAX_LOG_BYTES,
  PREVIOUS_LOG_PATH,
  PROJECT_ROOT,
  REMOTE_RESTART_REQUEST_PATH,
  RESTART_CHECK_INTERVAL_MS,
  RUNTIME_DIRECTORY,
  buildBrowser,
  createLogger,
  createRestartRequestWatcher,
  isDadRadarHealthy,
  resolvePort,
  rotateLog,
  run,
  waitForManualServer
};
