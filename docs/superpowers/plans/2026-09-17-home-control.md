# Dad Radar Home Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the fixed local control scripts and private-repository workflow template that let ChatGPT safely operate the Dad Radar home PC through a private self-hosted GitHub Actions runner.

**Architecture:** The public Dad Radar repository stores only the reusable local-install/control scripts and documentation. A separate private `dad-radar-home-control` repository owns the runner and issue-triggered command workflow. The private workflow passes validated issue metadata to a fixed local PowerShell allowlist script; no arbitrary remote shell is exposed.

**Tech Stack:** PowerShell 5+/Windows Scheduled Tasks, Git, Node/npm, GitHub Actions self-hosted Windows runner, GitHub Issues.

**Spec:** `docs/superpowers/specs/2026-09-17-home-control-design.md`

## Global Constraints

- Never attach the self-hosted runner to the public `Dad-Radar` repository.
- Never copy Dad Radar credentials, `.env`, OAuth files, or provider keys into the control repo.
- Supported remote actions are only `status`, `test`, `deploy`, `restart`, `logs`, and `rollback`.
- Deployment SHA must be a full 40-character hexadecimal commit and belong to `origin/agent/mobile-companion` history.
- Refuse deploy on a dirty working tree.
- The display refresh runs through a dedicated Interactive-token Windows Scheduled Task.
- Remote issue text is data, never executable PowerShell.

---

### Task 1: Add source-contract regression coverage

**Files:**
- Create: `ops/home-control/home-control-contract-test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: design requirements from the spec.
- Produces: source-level guarantees for the installer, local executor, refresh helper, and workflow template.

- [ ] **Step 1: Write the failing contract test**

The test reads the planned PowerShell/YAML files and asserts that the allowlist, strict SHA validation, clean-tree guard, branch-ancestry guard, fixed local script path, private issue trigger, runner label, and credential-exclusion language are present.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node ops/home-control/home-control-contract-test.js`

Expected: FAIL because the implementation files do not exist yet.

- [ ] **Step 3: Add the test to `npm test`**

Insert `node ops/home-control/home-control-contract-test.js` into the existing `test` chain.

- [ ] **Step 4: Commit the red test**

Commit message: `Test secure home control contract`

---

### Task 2: Implement the fixed local allowlist executor

**Files:**
- Create: `ops/home-control/DadRadarRemote.ps1`
- Test: `ops/home-control/home-control-contract-test.js`

**Interfaces:**
- Consumes: `C:\DadRadarOps\config.json`, issue title/body from environment/parameters.
- Produces: validated status/test/deploy/restart/logs/rollback operations and console output for Actions logs.

- [ ] **Step 1: Implement strict command parsing**

Accept `-IssueTitle` and optional `-IssueBody`. Title must match `^\[DADRADAR\] (status|test|deploy|restart|logs|rollback)$` case-insensitively.

- [ ] **Step 2: Implement local configuration loading**

Require `C:\DadRadarOps\config.json` with repoPath, branch, remote, serverTask, displayRefreshTask, healthUrl, gitPath, nodePath, and npmPath.

- [ ] **Step 3: Implement deploy guards**

Reject dirty checkout. Require a full 40-hex SHA. Fetch only the configured branch. Verify the commit exists and `git merge-base --is-ancestor <sha> origin/<branch>` succeeds.

- [ ] **Step 4: Implement deploy/test/restart/health flow**

Run `npm.cmd ci`, `npm.cmd test`, manage the existing server scheduled task directly, wait for `/api/health`, and invoke the interactive display-refresh task.

- [ ] **Step 5: Implement rollback state**

Maintain `current-good-sha.txt` and `previous-good-sha.txt`; attempt source rollback if the newly restarted build does not become healthy.

- [ ] **Step 6: Implement status and bounded log tail**

Status prints local/upstream SHAs, cleanliness, task state, health, runner service state. Logs reads only `runtime\family-beta.log`; `lines=N` is restricted to 20-500.

- [ ] **Step 7: Run contract test**

Run: `node ops/home-control/home-control-contract-test.js`

Expected: still FAIL until installer/workflow helper files exist.

- [ ] **Step 8: Commit**

Commit message: `Add allowlisted Dad Radar remote executor`

---

### Task 3: Implement the interactive display-refresh helper and installer

**Files:**
- Create: `ops/home-control/Refresh-DadRadarDisplay.ps1`
- Create: `ops/home-control/Install-DadRadarHomeControl.ps1`
- Test: `ops/home-control/home-control-contract-test.js`

**Interfaces:**
- Refresh helper consumes local config and manages only the Edge instance using Dad Radar's dedicated profile.
- Installer consumes the current checkout and creates `C:\DadRadarOps`, config/state files, and `Dad Radar Remote Display Refresh` scheduled task.

- [ ] **Step 1: Implement display refresh helper**

Locate only `msedge.exe` processes whose command line contains the configured Dad Radar Edge profile path; terminate those processes; invoke the configured Node executable with `scripts\windows-display-host.js`.

- [ ] **Step 2: Implement elevated installer checks**

Require administrator PowerShell, verify repo path, Git, Node, npm, existing `Dad Radar Family Beta` task, and current Windows identity.

- [ ] **Step 3: Install local fixed scripts/config**

Copy executor/refresh helper to `C:\DadRadarOps`, create state directory, write config JSON with no secrets.

- [ ] **Step 4: Register interactive refresh task**

Use `New-ScheduledTaskPrincipal -LogonType Interactive` for the currently logged-in user and register an on-demand task named `Dad Radar Remote Display Refresh`.

- [ ] **Step 5: Self-test the local installation**

Invoke executor status locally and print explicit PASS/FAIL guidance.

- [ ] **Step 6: Run contract test**

Run: `node ops/home-control/home-control-contract-test.js`

Expected: still FAIL until workflow template exists.

- [ ] **Step 7: Commit**

Commit message: `Install Dad Radar home control helpers`

---

### Task 4: Add the private control-repository workflow template

**Files:**
- Create: `ops/home-control/home-ops.yml`
- Create: `ops/home-control/README.md`
- Test: `ops/home-control/home-control-contract-test.js`

**Interfaces:**
- Consumes: private GitHub issue events and self-hosted runner labels.
- Produces: execution of only `C:\DadRadarOps\DadRadarRemote.ps1` with issue title/body passed as environment variables.

- [ ] **Step 1: Add issue-triggered workflow template**

Trigger only on `issues: types: [opened]`. Job condition requires `[DADRADAR]` title prefix. Use `runs-on: [self-hosted, Windows, X64, dad-radar-home]`. Do not checkout repository content. Pass issue title/body via env. Call only the fixed local script.

- [ ] **Step 2: Add setup/operator README**

Document private-repo creation, runner registration, Windows service account choice, labels, local install command, test issue formats, and recovery/removal steps.

- [ ] **Step 3: Run source-contract test**

Run: `node ops/home-control/home-control-contract-test.js`

Expected: PASS.

- [ ] **Step 4: Run full Dad Radar test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `Add private home control workflow template`

---

### Task 5: Bootstrap the private control repository and real runner

**Files in private repository:**
- Create: `.github/workflows/home-ops.yml`
- Create: `README.md`

**Interfaces:**
- Consumes: the template files from Task 4 and the locally installed runner.
- Produces: a private command bus usable by the ChatGPT GitHub connector.

- [ ] **Step 1: Joey creates `joeythepilot/dad-radar-home-control` as a private repository**

No README/license/gitignore is required at creation.

- [ ] **Step 2: Joey grants the ChatGPT GitHub connection access to the new private repository**

Confirm the connector can read/write the repository.

- [ ] **Step 3: ChatGPT writes workflow and README into the private repository**

Use the verified templates from Task 4.

- [ ] **Step 4: Joey adds a repository-level Windows x64 self-hosted runner**

Install to `C:\actions-runner`, label it `dad-radar-home`, and configure it as a Windows service under Joey's Windows account.

- [ ] **Step 5: Run a status command issue**

Create `[DADRADAR] status`, inspect the Actions run/log, and verify the actual home machine reports its SHA, health, scheduled tasks, and runner status.

- [ ] **Step 6: Run a no-op test command issue**

Create `[DADRADAR] test` and verify `npm test` completes on the home PC.

- [ ] **Step 7: Verify remote deploy with current known-good SHA**

Create `[DADRADAR] deploy` with `sha=<current verified SHA>`. Confirm tests, server task restart, health recovery, and interactive display refresh all succeed.
