# Dad Radar Home Control Design

## Goal

Allow Joey to ask ChatGPT to inspect, test, deploy, restart, collect logs from, and roll back the Dad Radar home PC while away from home without exposing RDP, SSH, or an arbitrary remote shell to the internet.

## Architecture

Dad Radar remains in the public `joeythepilot/Dad-Radar` repository. A separate private repository named `joeythepilot/dad-radar-home-control` is the only repository allowed to target the home self-hosted GitHub Actions runner.

The private control repository uses GitHub Issues as a command bus because the ChatGPT GitHub connector can create issues and inspect Actions runs. An issue with a strict title such as `[DADRADAR] status` or `[DADRADAR] deploy` triggers a workflow on the private repository. That workflow does not execute issue text as shell code. It passes the issue title/body as environment variables to a fixed local PowerShell script at `C:\DadRadarOps\DadRadarRemote.ps1`.

The local script performs only an allowlisted set of operations and validates all inputs before touching the Dad Radar checkout. No arbitrary command execution is exposed through issue content.

## Security boundaries

- The self-hosted runner MUST be registered only to the private `dad-radar-home-control` repository.
- The public `Dad-Radar` repository MUST NOT have a self-hosted runner attached to it.
- The private control repository should have no collaborators other than Joey unless explicitly intended.
- No Dad Radar `.env`, Google credentials, provider keys, or other secrets are copied to the control repository.
- The control workflow does not use `pull_request` or execute repository-provided scripts from untrusted branches.
- The control workflow calls a fixed local script from `C:\DadRadarOps`.
- Supported commands are exactly: `status`, `test`, `deploy`, `restart`, `logs`, `rollback`.
- Deploy SHA input must be a full 40-character hexadecimal commit SHA.
- A deploy target must exist locally after fetch and must be an ancestor of `origin/agent/mobile-companion`.
- Deployment refuses to proceed if the Dad Radar working tree has unexpected local modifications.
- The remote script never edits or prints `.env`, OAuth files, provider keys, or credential files.

## Windows execution model

The GitHub Actions runner is installed to `C:\actions-runner` and configured as a Windows service using Joey's Windows account rather than the default Network Service account. This gives the runner access to the Dad Radar checkout and permission to manage the existing `Dad Radar Family Beta` scheduled task.

The runner service itself cannot reliably display GUI windows in Joey's interactive desktop session. Therefore setup also creates a separate Windows scheduled task named `Dad Radar Remote Display Refresh` using an Interactive logon token. The remote service requests that task when the visible Edge display needs to be refreshed after deployment.

The interactive refresh task runs `C:\DadRadarOps\Refresh-DadRadarDisplay.ps1`, which terminates only the Edge process using Dad Radar's dedicated `runtime\edge-display-profile`, then launches the existing `scripts\windows-display-host.js` in the logged-in desktop session.

## Local files

- `C:\DadRadarOps\DadRadarRemote.ps1`: allowlisted command executor.
- `C:\DadRadarOps\Refresh-DadRadarDisplay.ps1`: interactive Dad Radar Edge refresh helper.
- `C:\DadRadarOps\config.json`: local paths/task names only. No secrets.
- `C:\DadRadarOps\state\current-good-sha.txt`: last verified deployed SHA.
- `C:\DadRadarOps\state\previous-good-sha.txt`: prior verified SHA for rollback.

These are installed from templates stored under `ops/home-control/` in the public Dad Radar repository.

## Command contract

### `[DADRADAR] status`
Reports the installed SHA, branch, clean/dirty state, upstream branch SHA, server task state, health endpoint result, display refresh task presence, and runner service state.

### `[DADRADAR] test`
Runs `npm.cmd test` in the Dad Radar checkout. It does not deploy or restart anything.

### `[DADRADAR] deploy`
Issue body must contain exactly `sha=<40 hex chars>`.

Deployment sequence:
1. Verify the checkout is clean.
2. Fetch `origin/agent/mobile-companion`.
3. Verify the target SHA exists and belongs to that branch history.
4. Record the pre-deploy SHA.
5. Move the local `agent/mobile-companion` branch to the exact target SHA.
6. Run `npm.cmd ci`.
7. Run `npm.cmd test`.
8. Restart the existing `Dad Radar Family Beta` scheduled task.
9. Wait for `http://127.0.0.1:4173/api/health` to return healthy.
10. Run `Dad Radar Remote Display Refresh` to reload the visible display.
11. Record current/previous known-good SHAs.

If validation or tests fail before restart, the deploy is rejected. If the new server fails health after restart, the script attempts to restore the pre-deploy SHA and restart the last known build before returning failure.

### `[DADRADAR] restart`
Restarts the existing Dad Radar background-server scheduled task, waits for health, then requests an interactive display refresh.

### `[DADRADAR] logs`
Returns the tail of `runtime\family-beta.log`. Optional issue body: `lines=N`, where N is constrained to 20-500 and defaults to 200.

### `[DADRADAR] rollback`
Deploys the SHA in `previous-good-sha.txt` using the same validation/test/restart path as a normal deployment.

## Private control workflow

The private repository contains `.github/workflows/home-ops.yml` with:

- trigger: `issues` / `opened` only;
- job condition: title begins with `[DADRADAR]`;
- runner labels: `[self-hosted, Windows, X64, dad-radar-home]`;
- least-privilege repository permissions;
- no repository checkout required;
- issue title/body passed through environment variables, never interpolated into PowerShell source;
- command execution delegated only to `C:\DadRadarOps\DadRadarRemote.ps1`.

## Expected ChatGPT workflow

When Joey is away, ChatGPT can create a command issue in the private repo, watch the corresponding Actions run, inspect its logs, report the result, and close the command issue. For deploys, ChatGPT first completes and verifies the public Dad Radar commit, then sends that exact verified SHA to the home-control repository.
