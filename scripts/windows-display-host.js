"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const {
  spawn,
  spawnSync
} = require("node:child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DISPLAY_URL = "http://127.0.0.1:4173";
const PROFILE_DIRECTORY = path.join(
  PROJECT_ROOT,
  "runtime",
  "edge-display-profile"
);

const EDGE_ARGUMENTS = Object.freeze([
  `--app=${DISPLAY_URL}`,
  "--start-fullscreen",
  "--no-first-run",
  "--disable-session-crashed-bubble",
  "--autoplay-policy=no-user-gesture-required",
  `--user-data-dir=${PROFILE_DIRECTORY}`
]);

function quotePowerShellLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function displayProcessQueryScript(
  profileDirectory = PROFILE_DIRECTORY
) {
  const profileLiteral =
    quotePowerShellLiteral(profileDirectory);

  return `$ErrorActionPreference = 'SilentlyContinue'
$profile = ${profileLiteral}
$process = Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" |
  Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($profile, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 } |
  Select-Object -First 1
if ($null -ne $process) { exit 0 }
exit 1`;
}

function isDisplayRunning(options = {}) {
  const query = options.spawnSync ?? spawnSync;
  const result = query(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      displayProcessQueryScript(
        options.profileDirectory
      )
    ],
    {
      stdio: "ignore",
      windowsHide: true
    }
  );

  return result.status === 0;
}

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

  if (isDisplayRunning()) {
    return;
  }

  const ready = await waitForServer();

  if (!ready) {
    throw new Error(
      "Dad Radar server did not become ready within one minute."
    );
  }

  // Recheck after the readiness wait so two startup
  // triggers cannot create duplicate display windows.
  if (isDisplayRunning()) {
    return;
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
  displayProcessQueryScript,
  edgeCandidates,
  findEdge,
  healthCheck,
  isDisplayRunning,
  launchEdge,
  waitForServer,
  quotePowerShellLiteral
};
