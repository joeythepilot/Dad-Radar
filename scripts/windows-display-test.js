"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const display = require("./windows-display");
const host = require("./windows-display-host");

assert.throws(
  () => display.requireWindows("linux"),
  /only be installed on Windows/
);
assert.doesNotThrow(() => display.requireWindows("win32"));

const environment = {
  APPDATA: "C:\\Users\\Joey\\AppData\\Roaming",
  "PROGRAMFILES(X86)": "C:\\Program Files (x86)",
  PROGRAMFILES: "C:\\Program Files",
  LOCALAPPDATA: "C:\\Users\\Joey\\AppData\\Local"
};

assert.match(
  display.startupFilePath(environment),
  /Startup[\\/]Dad Radar Display\.vbs$/
);

const launcher = display.createLauncherVbs({
  nodePath: "C:\\Program Files\\nodejs\\node.exe",
  hostPath: "C:\\Dad Radar\\display-host.js"
});

assert.match(launcher, /WScript\.Shell/);
assert.match(launcher, /shell\.Run/);
assert.match(launcher, /, 0, False/);
assert.match(launcher, /Dad Radar/);

assert.deepEqual(
  host.edgeCandidates(environment),
  [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Users\\Joey\\AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe"
  ]
);

assert.equal(
  host.findEdge({
    candidates: ["first", "second"],
    existsSync(candidate) {
      return candidate === "second";
    }
  }),
  "second"
);

for (const argument of [
  "--app=http://127.0.0.1:4173",
  "--start-fullscreen",
  "--autoplay-policy=no-user-gesture-required"
]) {
  assert.ok(host.EDGE_ARGUMENTS.includes(argument));
}

assert.equal(
  host.EDGE_ARGUMENTS.includes(
    "--start-maximized"
  ),
  false
);

assert.match(
  host.displayProcessQueryScript(
    "C:\\Dad Radar\\edge-profile"
  ),
  /Get-CimInstance Win32_Process/
);
assert.match(
  host.displayProcessQueryScript(
    "C:\\Dad Radar\\edge-profile"
  ),
  /edge-profile/
);

assert.equal(
  host.isDisplayRunning({
    spawnSync() {
      return { status: 0 };
    }
  }),
  true
);

assert.equal(
  host.isDisplayRunning({
    spawnSync() {
      return { status: 1 };
    }
  }),
  false
);

async function testWaitForServer() {
  const states = [false, false, true];
  let waits = 0;

  const ready = await host.waitForServer({
    attempts: 4,
    intervalMs: 25,
    healthCheck: async () => states.shift(),
    delay: async (milliseconds) => {
      assert.equal(milliseconds, 25);
      waits += 1;
    }
  });

  assert.equal(ready, true);
  assert.equal(waits, 2);
}

const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), "dad-radar-display-test-")
);
const startupFile = path.join(temporaryDirectory, "display.vbs");

display.writeStartupLauncher({
  startupFile,
  nodePath: "node.exe",
  hostPath: "display-host.js"
});
assert.equal(display.isInstalled({ startupFile }), true);
display.removeStartupLauncher({ startupFile });
assert.equal(display.isInstalled({ startupFile }), false);

testWaitForServer()
  .then(() => {
    fs.rmSync(temporaryDirectory, {
      recursive: true,
      force: true
    });
    console.log("Windows display startup tests passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
