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

const TASK_NAME =
  "Dad Radar Family Beta";

const TASK_DESCRIPTION =
  "Starts the Dad Radar family display server after Windows boots.";

const HOST_SCRIPT = path.join(
  PROJECT_ROOT,
  "scripts",
  "family-beta-host.js"
);

const RUNTIME_DIRECTORY = path.join(
  PROJECT_ROOT,
  "runtime"
);

const TASK_XML_PATH = path.join(
  RUNTIME_DIRECTORY,
  "dad-radar-family-beta-task.xml"
);

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createTaskXml(options = {}) {
  const nodePath =
    options.nodePath ??
    process.execPath;

  const hostScript =
    options.hostScript ??
    HOST_SCRIPT;

  const workingDirectory =
    options.workingDirectory ??
    PROJECT_ROOT;

  const description =
    options.description ??
    TASK_DESCRIPTION;

  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.3" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>${escapeXml(description)}</Description>
    <URI>\\${escapeXml(TASK_NAME)}</URI>
  </RegistrationInfo>
  <Triggers>
    <BootTrigger>
      <Enabled>true</Enabled>
      <Delay>PT20S</Delay>
    </BootTrigger>
  </Triggers>
  <Principals>
    <Principal id="System">
      <UserId>S-1-5-18</UserId>
      <RunLevel>HighestAvailable</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <RestartOnFailure>
      <Interval>PT1M</Interval>
      <Count>10</Count>
    </RestartOnFailure>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="System">
    <Exec>
      <Command>${escapeXml(nodePath)}</Command>
      <Arguments>&quot;${escapeXml(hostScript)}&quot;</Arguments>
      <WorkingDirectory>${escapeXml(workingDirectory)}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
`;
}

function encodePowerShell(script) {
  return Buffer
    .from(script, "utf16le")
    .toString("base64");
}

function quotePowerShellLiteral(value) {
  return `'${String(value).replaceAll(
    "'",
    "''"
  )}'`;
}

function elevatedTaskScript(
  action,
  options = {}
) {
  const taskName =
    options.taskName ?? TASK_NAME;

  const taskXmlPath =
    options.taskXmlPath ??
    TASK_XML_PATH;

  const nameLiteral =
    quotePowerShellLiteral(taskName);

  const xmlLiteral =
    quotePowerShellLiteral(taskXmlPath);

  if (action === "install") {
    return `$ErrorActionPreference = 'Stop'
$taskTool = Join-Path $env:SystemRoot 'System32\\schtasks.exe'
& $taskTool /Create /TN ${nameLiteral} /XML ${xmlLiteral} /F
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $taskTool /Run /TN ${nameLiteral}
exit 0`;
  }

  if (action === "restart") {
    return `$ErrorActionPreference = 'Stop'
$taskTool = Join-Path $env:SystemRoot 'System32\\schtasks.exe'
& $taskTool /End /TN ${nameLiteral} 2>$null
Start-Sleep -Seconds 1
& $taskTool /Run /TN ${nameLiteral}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
exit 0`;
  }

  if (action === "remove") {
    return `$ErrorActionPreference = 'Stop'
$taskTool = Join-Path $env:SystemRoot 'System32\\schtasks.exe'
& $taskTool /End /TN ${nameLiteral} 2>$null
& $taskTool /Delete /TN ${nameLiteral} /F
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
exit 0`;
  }

  throw new TypeError(
    `Unsupported elevated task action: ${action}`
  );
}

function runElevatedTaskAction(
  action,
  options = {}
) {
  const spawn =
    options.spawnSync ?? spawnSync;

  const innerScript =
    elevatedTaskScript(
      action,
      options
    );

  const innerCommand =
    encodePowerShell(innerScript);

  const outerScript = `$ErrorActionPreference = 'Stop'
$powerShell = Join-Path $env:SystemRoot 'System32\\WindowsPowerShell\\v1.0\\powershell.exe'
$arguments = '-NoProfile -ExecutionPolicy Bypass -EncodedCommand ${innerCommand}'
$process = Start-Process -FilePath $powerShell -ArgumentList $arguments -Verb RunAs -Wait -PassThru
exit $process.ExitCode`;

  return spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-EncodedCommand",
      encodePowerShell(outerScript)
    ],
    {
      stdio: "inherit",
      windowsHide: true
    }
  );
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
      stdio: "inherit",
      windowsHide: true
    }
  );
}

function writeTaskXml(options = {}) {
  const taskXmlPath =
    options.taskXmlPath ??
    TASK_XML_PATH;

  fs.mkdirSync(
    path.dirname(taskXmlPath),
    { recursive: true }
  );

  const xml = createTaskXml(options);

  fs.writeFileSync(
    taskXmlPath,
    `\uFEFF${xml}`,
    "utf16le"
  );

  return taskXmlPath;
}

function queryTask(options = {}) {
  const spawn =
    options.spawnSync ?? spawnSync;

  return spawn(
    "schtasks.exe",
    [
      "/Query",
      "/TN",
      options.taskName ?? TASK_NAME,
      "/FO",
      "LIST",
      "/V"
    ],
    {
      encoding: "utf8",
      windowsHide: true
    }
  );
}

function checkHealth(options = {}) {
  const port =
    options.port ??
    (
      Number(process.env.PORT) ||
      4173
    );

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

function interpretCalendarHealth(
  statusCode,
  payload
) {
  if (
    statusCode === 200 &&
    payload?.ok === true
  ) {
    return {
      ok: true,
      authorizationRequired: false
    };
  }

  return {
    ok: false,
    authorizationRequired:
      payload?.code ===
      "calendar-authorization-required"
  };
}

function checkCalendarHealth(options = {}) {
  const port =
    options.port ??
    (Number(process.env.PORT) || 4173);

  const timeoutMs =
    options.timeoutMs ?? 10000;

  return new Promise((resolve) => {
    const request = http.get(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/calendar/upcoming?days=1",
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
            resolve(
              interpretCalendarHealth(
                response.statusCode,
                JSON.parse(body)
              )
            );
          } catch (_error) {
            resolve({
              ok: false,
              authorizationRequired: false
            });
          }
        });
      }
    );

    request.on("timeout", () => {
      request.destroy();
      resolve({
        ok: false,
        authorizationRequired: false
      });
    });

    request.on("error", () => {
      resolve({
        ok: false,
        authorizationRequired: false
      });
    });
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function waitForHealth(options = {}) {
  const healthCheck =
    options.healthCheck ??
    checkHealth;

  const wait =
    options.delay ?? delay;

  const attempts =
    options.attempts ?? 15;

  const intervalMs =
    options.intervalMs ?? 1000;

  for (
    let attempt = 0;
    attempt < attempts;
    attempt += 1
  ) {
    if (await healthCheck(options)) {
      return true;
    }

    if (attempt < attempts - 1) {
      await wait(intervalMs);
    }
  }

  return false;
}

function loadEnvironment() {
  require("dotenv").config({
    path: path.join(
      PROJECT_ROOT,
      ".env"
    ),
    quiet: true
  });
}

function requireWindows(platform = process.platform) {
  if (platform !== "win32") {
    throw new Error(
      "Dad Radar automatic startup can only be installed on Windows."
    );
  }
}

function assertSucceeded(
  result,
  description
) {
  if (
    result?.error ||
    result?.status !== 0
  ) {
    throw new Error(
      `${description} failed or the Windows permission prompt was canceled.`
    );
  }
}

async function install(options = {}) {
  requireWindows(
    options.platform ?? process.platform
  );

  console.log(
    "DAD RADAR AUTOMATIC STARTUP"
  );
  console.log(
    "Building the family display..."
  );

  const buildResult = buildBrowser(options);

  assertSucceeded(
    buildResult,
    "Browser build"
  );

  const taskXmlPath = writeTaskXml(options);

  console.log(
    "Windows will ask for permission once. Choose Yes to install the background startup task."
  );

  const installResult =
    runElevatedTaskAction(
      "install",
      {
        ...options,
        taskXmlPath
      }
    );

  assertSucceeded(
    installResult,
    "Automatic startup installation"
  );

  loadEnvironment();

  const healthy = await waitForHealth(
    options
  );

  console.log("");
  console.log(
    "[PASS] Dad Radar will start automatically after Windows boots."
  );
  console.log(
    healthy
      ? "[PASS] Dad Radar is responding on this PC."
      : "[WARN] The startup task was installed, but the server is still starting. Check its status in a moment."
  );
  console.log(
    "Check it at any time with: npm.cmd run beta:autostart:status"
  );
}

async function status(options = {}) {
  requireWindows(
    options.platform ?? process.platform
  );

  loadEnvironment();

  const taskResult = queryTask(options);
  const installed =
    !taskResult.error &&
    taskResult.status === 0;

  const healthy =
    await checkHealth(options);

  const calendarHealth = healthy
    ? await (
        options.calendarHealthCheck ??
        checkCalendarHealth
      )(options)
    : {
        ok: false,
        authorizationRequired: false
      };

  console.log(
    "DAD RADAR AUTOMATIC STARTUP STATUS"
  );
  console.log(
    `[${installed ? "PASS" : "FAIL"}] Windows startup task: ${installed ? "Installed" : "Not installed"}`
  );
  console.log(
    `[${healthy ? "PASS" : "FAIL"}] Dad Radar server: ${healthy ? "Responding" : "Not responding"}`
  );
  console.log(
    `[${calendarHealth.ok ? "PASS" : "FAIL"}] Google Calendar: ${calendarHealth.ok ? "Authorized" : calendarHealth.authorizationRequired ? "Authorization expired — run npm.cmd run calendar:reauthorize" : "Unavailable"}`
  );

  if (
    !installed ||
    !healthy ||
    !calendarHealth.ok
  ) {
    process.exitCode = 1;
  }
}

async function restart(options = {}) {
  requireWindows(
    options.platform ?? process.platform
  );

  console.log(
    "Restarting the Dad Radar background server..."
  );

  const result = runElevatedTaskAction(
    "restart",
    options
  );

  assertSucceeded(
    result,
    "Automatic startup restart"
  );

  loadEnvironment();

  const healthy = await waitForHealth(
    options
  );

  console.log(
    healthy
      ? "[PASS] Dad Radar restarted and is responding."
      : "[WARN] Dad Radar restart was requested, but the server is still starting."
  );
}

async function remove(options = {}) {
  requireWindows(
    options.platform ?? process.platform
  );

  console.log(
    "Windows will ask for permission to remove the Dad Radar startup task."
  );

  const result = runElevatedTaskAction(
    "remove",
    options
  );

  assertSucceeded(
    result,
    "Automatic startup removal"
  );

  console.log(
    "[PASS] Dad Radar automatic startup was removed."
  );

  fs.rmSync(
    options.taskXmlPath ??
      TASK_XML_PATH,
    { force: true }
  );
}

async function run() {
  const action =
    process.argv[2] ?? "status";

  if (action === "install") {
    await install();
    return;
  }

  if (action === "status") {
    await status();
    return;
  }

  if (action === "restart") {
    await restart();
    return;
  }

  if (action === "remove") {
    await remove();
    return;
  }

  throw new TypeError(
    `Unknown automatic startup action: ${action}`
  );
}

if (require.main === module) {
  run().catch((error) => {
    console.error(
      `Automatic startup failed: ${error.message}`
    );
    process.exitCode = 1;
  });
}

module.exports = {
  HOST_SCRIPT,
  PROJECT_ROOT,
  RUNTIME_DIRECTORY,
  TASK_DESCRIPTION,
  TASK_NAME,
  TASK_XML_PATH,
  assertSucceeded,
  checkCalendarHealth,
  checkHealth,
  createTaskXml,
  elevatedTaskScript,
  encodePowerShell,
  escapeXml,
  interpretCalendarHealth,
  queryTask,
  quotePowerShellLiteral,
  requireWindows,
  runElevatedTaskAction,
  waitForHealth,
  writeTaskXml
};
