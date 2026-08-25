"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DISPLAY_HOST = path.join(
  PROJECT_ROOT,
  "scripts",
  "windows-display-host.js"
);
const STARTUP_FILE_NAME = "Dad Radar Display.vbs";

function requireWindows(platform = process.platform) {
  if (platform !== "win32") {
    throw new Error(
      "Dad Radar display startup can only be installed on Windows."
    );
  }
}

function startupDirectory(environment = process.env) {
  if (!environment.APPDATA) {
    throw new Error("Windows APPDATA directory is unavailable.");
  }

  return path.win32.join(
    environment.APPDATA,
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Startup"
  );
}

function startupFilePath(environment = process.env) {
  return path.win32.join(
    startupDirectory(environment),
    STARTUP_FILE_NAME
  );
}

function quoteVbs(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function createLauncherVbs(options = {}) {
  const nodePath = options.nodePath ?? process.execPath;
  const hostPath = options.hostPath ?? DISPLAY_HOST;
  const command = `"${nodePath}" "${hostPath}"`;

  return `Option Explicit\r\nDim shell\r\nSet shell = CreateObject("WScript.Shell")\r\nshell.Run ${quoteVbs(command)}, 0, False\r\n`;
}

function writeStartupLauncher(options = {}) {
  const target =
    options.startupFile ?? startupFilePath(options.environment);

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, createLauncherVbs(options), "utf8");
  return target;
}

function launchDisplay(options = {}) {
  const launch = options.spawn ?? spawn;
  const child = launch(
    process.execPath,
    [DISPLAY_HOST],
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

function removeStartupLauncher(options = {}) {
  const target =
    options.startupFile ?? startupFilePath(options.environment);

  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }

  return target;
}

function isInstalled(options = {}) {
  const target =
    options.startupFile ?? startupFilePath(options.environment);

  return fs.existsSync(target);
}

function printStatus(installed) {
  console.log("DAD RADAR DISPLAY STARTUP STATUS");
  console.log(
    installed
      ? "[PASS] Edge display startup: Installed"
      : "[FAIL] Edge display startup: Not installed"
  );
  console.log("[INFO] Display mode: Edge application window");
  console.log("[INFO] Address: http://127.0.0.1:4173");
}

function main() {
  requireWindows();
  const action = String(process.argv[2] ?? "status").toLowerCase();

  if (action === "install") {
    const target = writeStartupLauncher();
    launchDisplay();
    console.log("Dad Radar display startup installed.");
    console.log(`Startup file: ${target}`);
    console.log("The Edge display will open automatically after Windows sign-in.");
    return;
  }

  if (action === "start" || action === "restart") {
    launchDisplay();
    console.log("Opening the Dad Radar Edge display...");
    return;
  }

  if (action === "remove") {
    removeStartupLauncher();
    console.log("Dad Radar display startup removed.");
    return;
  }

  if (action === "status") {
    printStatus(isInstalled());
    return;
  }

  throw new Error(`Unknown display action: ${action}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Display startup failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  STARTUP_FILE_NAME,
  createLauncherVbs,
  isInstalled,
  launchDisplay,
  quoteVbs,
  removeStartupLauncher,
  requireWindows,
  startupDirectory,
  startupFilePath,
  writeStartupLauncher
};
