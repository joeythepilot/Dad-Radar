# Dad Radar Home Control

This toolkit lets the Dad Radar home PC accept a small, allowlisted set of remote maintenance commands through a **private** GitHub repository and a repository-level self-hosted GitHub Actions runner.

## Critical security rule

The self-hosted runner belongs only to the private `joeythepilot/dad-radar-home-control` repository. The public `joeythepilot/Dad-Radar` repository must not have this runner attached to it. Never enable the public Dad Radar repository to target the home runner.

Do not store Dad Radar `.env`, Google authorization files, provider keys, or other credentials in the control repository.

## Components

- `DadRadarRemote.ps1` is the fixed local allowlist executor.
- `Refresh-DadRadarDisplay.ps1` refreshes only the Edge process using Dad Radar's dedicated profile.
- `Install-DadRadarHomeControl.ps1` installs the local files/config and registers the interactive display-refresh task.
- `home-ops.yml` is copied into the private control repo as `.github/workflows/home-ops.yml`.
- Runner custom label: `dad-radar-home`.

## Supported commands

Create issues in the private control repository using one of these exact titles:

- `[DADRADAR] status`
- `[DADRADAR] test`
- `[DADRADAR] deploy`
- `[DADRADAR] restart`
- `[DADRADAR] logs`
- `[DADRADAR] rollback`

For deploy, the issue body must be exactly:

```text
sha=0123456789abcdef0123456789abcdef01234567
```

For logs, the body may be empty or use a bounded line count:

```text
lines=200
```

The executor does not provide an arbitrary shell command.

## Local Windows installation

After pulling the branch containing this toolkit, open **Windows PowerShell as Administrator** and run:

```powershell
cd C:\Users\cfijo\Dad-Radar
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\home-control\Install-DadRadarHomeControl.ps1
```

The installer verifies the Dad Radar checkout, Git, Node, npm, and the existing `Dad Radar Family Beta` server task. It installs fixed local files under `C:\DadRadarOps`, writes a non-secret local config file, and registers an on-demand scheduled task named `Dad Radar Remote Display Refresh` using the logged-in user's Interactive token.

## Private control repository

Create `joeythepilot/dad-radar-home-control` as a **private** repository. Do not initialize it with secrets.

Copy `home-ops.yml` to:

```text
.github/workflows/home-ops.yml
```

The workflow runs only for newly opened issues whose title starts with `[DADRADAR]`. It does not check out repository code on the home PC. It passes the issue title/body as environment data to the fixed local `C:\DadRadarOps\DadRadarRemote.ps1` script.

## Runner setup

In the private repository, open:

**Settings → Actions → Runners → New self-hosted runner**

Select **Windows** and **x64**. GitHub will display current download/configuration commands containing a time-limited registration token. Use those commands rather than copying an old runner version from documentation.

Install the runner under:

```text
C:\actions-runner
```

During `config.cmd`:

- runner name: `dad-radar-home`
- additional label: `dad-radar-home`
- work folder: accept `_work`
- run as service: **Yes**
- service account: use Joey's normal Windows account, not the default Network Service account

The selected Windows account must be able to access the Dad Radar checkout and manage the existing `Dad Radar Family Beta` scheduled task. GitHub runner registration tokens are time-limited, so complete configuration soon after generating the commands.

## First live checks

1. Confirm the runner shows **Idle** in the private repo's Runners page.
2. Open an issue titled `[DADRADAR] status`.
3. Confirm the `Dad Radar Home Ops` workflow runs on `dad-radar-home` and reports the installed SHA, clean/dirty state, server task, display task, health, and runner service.
4. Open `[DADRADAR] test` and confirm the full Dad Radar test suite completes on the actual home PC.
5. Test a deployment using the exact SHA already installed on the machine. This validates the deploy/test/restart/display-refresh path without changing versions.

## Recovery

Remote deployment refuses a dirty working tree and rejects SHAs that are not in `origin/agent/mobile-companion` history. A successful deploy records current and previous known-good SHAs under `C:\DadRadarOps\state`.

`[DADRADAR] rollback` deploys the recorded previous-good SHA through the same validation/test/restart path.

If GitHub remote control ever needs to be disabled immediately, stop the GitHub Actions runner service in Windows Services. Dad Radar's normal `Dad Radar Family Beta` scheduled task and local display remain independent of the runner.
