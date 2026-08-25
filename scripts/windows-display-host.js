"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DISPLAY_URL = "http://127.0.0.1:4173";
const PROFILE_DIRECTORY = path.join(
  PROJECT_ROOT,
  "runtime",
  "edge-display-profile"
);

const EDGE_ARGUMENTS = Object.freeze([
  `--app=${DISPLAY_URL}`,
  "--start-maximized",
  "--no-first-run",
  "--disable-session-crashed-bubble",
  "--autoplay-policy=no-user-gesture-required",
  `--user-data-dir=${PROFILE_DIRECTORY}`
]);

function edgeCandidates(environment = process.env) {
  return [
    environment["PROGRAMFILES(X86)"],
    environment.PROGRAMFILES,
    environment.LOCALAPPDATA
  ]
    .filter(Boolean)
    .map((directory) =>
      path.win32.join(
        directory,
        "Microsoft",
        "Edge",
        "Application",
        "msedge.exe"
      )
    );
}

function findEdge(options = {}) {
  const exists = options.existsSync ?? fs.existsSync;
  const candidates =
    options.candidates ?? edgeCandidates(options.environment);

  return candidates.find((candidate) => exists(candidate)) ?? null;
}

function healthCheck(options = {}) {
  const request = options.request ?? http.get;
  const timeoutMs = options.timeoutMs ?? 2500;

  return new Promise((resolve) => {
    const client = request(
      `${DISPLAY_URL}/api/health`,
      (response) => {
        response.resume?.();
        resolve(
          response.statusCode >= 200 &&
          response.statusCode < 300
        );
      }
    );

    client.setTimeout?.(timeoutMs, () => {
      client.destroy?.();
      resolve(false);
    });

    client.on?.("error", () => resolve(false));
  });
}

function delay(milliseconds) {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds)
  );
}

async function waitForServer(options = {}) {
  const attempts = options.attempts ?? 40;
  const intervalMs = options.intervalMs ?? 1500;
  const check = options.healthCheck ?? healthCheck;
  const wait = options.delay ?? delay;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await check()) {
      return true;
    }

    if (attempt + 1 < attempts) {
      await wait(intervalMs);
    }
  }

  return false;
}

function launchEdge(edgePath, options = {}) {
  const launch = options.spawn ?? spawn;
  const child = launch(
    edgePath,
    options.arguments ?? EDGE_ARGUMENTS,
    {
      cwd: PROJECT_ROOT,
      detached: true,
      stdio: "ignore",
      windowsHide: true
    }
  );

  child.unref?.();
  return child;
}

async function main() {
  if (process.platform !== "win32") {
    throw new Error(
      "Dad Radar display startup is only available on Windows."
    );
  }

  const edgePath = findEdge();

  if (!edgePath) {
    throw new Error("Microsoft Edge could not be found.");
  }

  const ready = await waitForServer();

  if (!ready) {
    throw new Error(
      "Dad Radar server did not become ready within one minute."
    );
  }

  fs.mkdirSync(PROFILE_DIRECTORY, { recursive: true });
  launchEdge(edgePath);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  DISPLAY_URL,
  EDGE_ARGUMENTS,
  PROFILE_DIRECTORY,
  edgeCandidates,
  findEdge,
  healthCheck,
  launchEdge,
  waitForServer
};
