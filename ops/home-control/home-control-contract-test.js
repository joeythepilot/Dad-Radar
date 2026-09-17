"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const files = {
  remote: path.join(__dirname, "DadRadarRemote.ps1"),
  refresh: path.join(__dirname, "Refresh-DadRadarDisplay.ps1"),
  installer: path.join(__dirname, "Install-DadRadarHomeControl.ps1"),
  workflow: path.join(__dirname, "home-ops.yml"),
  readme: path.join(__dirname, "README.md")
};

for (const [name, file] of Object.entries(files)) {
  assert(fs.existsSync(file), `${name} implementation file must exist`);
}

const remote = fs.readFileSync(files.remote, "utf8");
const refresh = fs.readFileSync(files.refresh, "utf8");
const installer = fs.readFileSync(files.installer, "utf8");
const workflow = fs.readFileSync(files.workflow, "utf8");
const readme = fs.readFileSync(files.readme, "utf8");

assert.match(
  remote,
  /\^\\\[DADRADAR\\\] \(status\|test\|deploy\|restart\|logs\|rollback\)\$/,
  "remote executor must use an exact allowlist command-title regex"
);
assert.match(remote, /\^\[0-9a-fA-F\]\{40\}\$/, "deploy SHA must be full 40-character hex");
assert.match(remote, /\("status",\s*"--porcelain"\)/, "deploy must inspect the working tree for local changes");
assert.match(remote, /merge-base[^\r\n]+--is-ancestor/, "deploy must prove the SHA belongs to the configured branch history");
assert.match(remote, /Config\.gitPath/, "remote executor must use the installer-recorded absolute Git path");
assert.match(remote, /Config\.npmPath/, "remote executor must use the installer-recorded absolute npm path");
assert.doesNotMatch(remote, /Invoke-External\s+"git"/, "remote executor must not depend on the runner service PATH for Git");
assert.doesNotMatch(remote, /Invoke-External\s+"npm\.cmd"/, "remote executor must not depend on the runner service PATH for npm");
assert.match(remote, /npmPath[^\r\n]*@\("ci"\)|Config\.npmPath[^\r\n]*@\("ci"\)/i, "deploy must restore dependencies with npm ci");
assert.match(remote, /npmPath[^\r\n]*@\("test"\)|Config\.npmPath[^\r\n]*@\("test"\)/i, "deploy must run the full Dad Radar tests");
assert.match(remote, /deployed-sha\.txt/, "remote deployment must record the exact installed SHA for the running server");
assert.match(remote, /remote-restart-request\.json/, "remote deployment must request restart through the local SYSTEM host marker");
assert.match(remote, /instanceId/, "remote deployment must verify that a new server instance came online");
assert.match(remote, /version/, "remote deployment must verify the running server reports the target SHA");
assert.doesNotMatch(remote, /schtasks\.exe[\s\S]{0,120}\/(?:End|Run)/i, "remote executor must not require permission to stop or start SYSTEM scheduled tasks");
assert.match(remote, /function Get-TaskState[\s\S]*try[\s\S]*schtasks\.exe[\s\S]*catch[\s\S]*UNAVAILABLE/i, "status must degrade gracefully when the runner cannot inspect a protected Windows task");
assert.match(remote, /family-beta\.log/, "logs command must read the bounded Dad Radar runtime log");
assert.doesNotMatch(remote, /Invoke-Expression|\biex\b/i, "remote executor must not use arbitrary expression execution");
assert.doesNotMatch(remote, /\.env|credentials\.json|token\.json/i, "remote executor must never read or print Dad Radar credential files");
assert.doesNotMatch(remote, /\?\s*["']|\?\?/, "remote executor must stay compatible with Windows PowerShell 5.1 syntax");

assert.match(refresh, /edge-display-profile/, "display refresh must target Dad Radar's dedicated Edge profile");
assert.match(refresh, /windows-display-host\.js/, "display refresh must relaunch the existing Dad Radar display host");
assert.doesNotMatch(refresh, /taskkill\s+\/im\s+msedge\.exe/i, "display refresh must not kill every Edge process on the PC");

assert.match(installer, /C:\\DadRadarOps/, "installer must use the fixed local operations directory");
assert.match(installer, /New-ScheduledTaskPrincipal/, "installer must create the interactive display task with Task Scheduler APIs");
assert.match(installer, /-LogonType\s+Interactive/, "display task must run in an existing interactive user session");
assert.match(installer, /Dad Radar Remote Display Refresh/, "installer must register the dedicated display refresh task");
assert.match(installer, /config\.json/, "installer must create local non-secret configuration");
assert.match(installer, /gitPath\s*=\s*\$gitPath/, "installer must persist the exact Git executable path");
assert.match(installer, /npmPath\s*=\s*\$npmPath/, "installer must persist the exact npm executable path");
assert.match(installer, /deployed-sha\.txt/, "installer must seed the running-server deployment version marker");
assert.match(installer, /NT AUTHORITY\\NETWORK SERVICE/i, "installer must prepare the supported passwordless Windows runner service identity");
assert.match(installer, /icacls\.exe[\s\S]*\$resolvedRepo/i, "installer must grant the runner service modify access to the Dad Radar checkout");
assert.match(installer, /icacls\.exe[\s\S]*\$OpsRoot/i, "installer must grant the runner service access to fixed home-control state");
assert.match(installer, /safe\.directory/i, "installer must mark the user-owned Dad Radar checkout safe for the Network Service Git process");

assert.match(workflow, /issues:\s*[\s\S]*types:\s*\[opened\]/, "control workflow must trigger only on opened issues");
assert.match(workflow, /startsWith\(github\.event\.issue\.title, '\[DADRADAR\]'\)/, "workflow must ignore non-Dad-Radar issues");
assert.match(workflow, /self-hosted[\s\S]*Windows[\s\S]*X64[\s\S]*dad-radar-home/, "workflow must target the dedicated Windows home runner label");
assert.match(workflow, /shell:\s*powershell[^\r\n]*-ExecutionPolicy\s+Bypass/i, "home runner workflow must bypass restrictive machine execution policy per process");
assert.match(workflow, /C:\\DadRadarOps\\DadRadarRemote\.ps1/, "workflow must call the fixed local executor");
assert.match(workflow, /DADRADAR_ISSUE_TITLE/, "issue title must be passed as data through an environment variable");
assert.match(workflow, /DADRADAR_ISSUE_BODY/, "issue body must be passed as data through an environment variable");
assert.doesNotMatch(workflow, /pull_request:/, "private control workflow must not run from pull requests");
assert.doesNotMatch(workflow, /actions\/checkout/, "control workflow must not execute repository checkout content on the home runner");

assert.match(readme, /private/i, "operator README must require a private control repository");
assert.match(readme, /never.*public.*runner|public.*must not/i, "operator README must explicitly prohibit attaching the runner to the public Dad Radar repository");
assert.match(readme, /dad-radar-home/, "operator README must document the custom runner label");
assert.match(readme, /NETWORK SERVICE/i, "operator README must document the passwordless Network Service runner identity");
assert.match(readme, /remote-restart-request\.json/, "operator README must document the low-privilege restart broker");

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
assert(
  packageJson.scripts.test.includes("node ops/home-control/home-control-contract-test.js"),
  "full npm test must include the home-control security contract"
);

console.log("Dad Radar home-control security contract passed.");
