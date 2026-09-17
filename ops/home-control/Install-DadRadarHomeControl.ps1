param(
  [string]$RepoPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$OpsRoot = "C:\DadRadarOps"
$StateRoot = Join-Path $OpsRoot "state"
$ConfigPath = Join-Path $OpsRoot "config.json"
$RemoteSource = Join-Path $PSScriptRoot "DadRadarRemote.ps1"
$RefreshSource = Join-Path $PSScriptRoot "Refresh-DadRadarDisplay.ps1"
$RemoteTarget = Join-Path $OpsRoot "DadRadarRemote.ps1"
$RefreshTarget = Join-Path $OpsRoot "Refresh-DadRadarDisplay.ps1"
$DisplayTaskName = "Dad Radar Remote Display Refresh"
$ServerTaskName = "Dad Radar Family Beta"
$RunnerServiceAccount = "NT AUTHORITY\NETWORK SERVICE"
$Branch = "agent/mobile-companion"
$Remote = "origin"
$HealthUrl = "http://127.0.0.1:4173/api/health"

function Assert-Administrator {
  $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object System.Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Open PowerShell as Administrator before running this installer."
  }
}

function Require-Command([string]$Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $command) {
    throw "Required command was not found: $Name"
  }
  return $command.Source
}

function Resolve-RepoPath([string]$Provided) {
  if (-not [string]::IsNullOrWhiteSpace($Provided)) {
    return (Resolve-Path -LiteralPath $Provided).Path
  }

  return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
}

function Grant-RunnerModifyAccess([string]$Path) {
  & icacls.exe $Path /grant "${RunnerServiceAccount}:(OI)(CI)M" /T /C | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to grant $RunnerServiceAccount modify access to $Path"
  }
}

function Ensure-SystemGitSafeDirectory([string]$GitPath, [string]$RepoPath) {
  $existing = @(
    & $GitPath config --system --get-all safe.directory 2>$null
  )

  if ($existing -contains $RepoPath) {
    return
  }

  & $GitPath config --system --add safe.directory $RepoPath
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to add the Dad Radar checkout to Git's system safe.directory list."
  }
}

function Test-ServerTaskUsesBrokerHost([object]$Task, [string]$ExpectedHostScript) {
  if (-not $Task) {
    return $false
  }

  foreach ($action in @($Task.Actions)) {
    $arguments = [string]$action.Arguments
    if (
      -not [string]::IsNullOrWhiteSpace($arguments) -and
      $arguments.IndexOf($ExpectedHostScript, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
    ) {
      return $true
    }
  }

  return $false
}

function Invoke-NpmScript([string]$NpmPath, [string]$WorkingDirectory, [string]$ScriptName) {
  Push-Location $WorkingDirectory
  try {
    & $NpmPath run $ScriptName
    if ($LASTEXITCODE -ne 0) {
      throw "npm run $ScriptName failed with code $LASTEXITCODE"
    }
  }
  finally {
    Pop-Location
  }
}

function Ensure-BrokerAwareServerTask(
  [string]$NpmPath,
  [string]$RepoPath,
  [string]$ExpectedHostScript,
  [string]$RestartRequestPath
) {
  $task = Get-ScheduledTask -TaskName $ServerTaskName -ErrorAction SilentlyContinue
  if (Test-ServerTaskUsesBrokerHost $task $ExpectedHostScript) {
    Write-Host "[PASS] SYSTEM startup task already uses family-beta-host.js"
    return
  }

  Write-Host "[INFO] Repairing Dad Radar SYSTEM startup task for brokered remote restarts..."
  Remove-Item -LiteralPath $RestartRequestPath -Force -ErrorAction SilentlyContinue

  Invoke-NpmScript $NpmPath $RepoPath "beta:autostart:install"
  Invoke-NpmScript $NpmPath $RepoPath "beta:autostart:restart"

  Start-Sleep -Seconds 2
  $updatedTask = Get-ScheduledTask -TaskName $ServerTaskName -ErrorAction SilentlyContinue
  if (-not (Test-ServerTaskUsesBrokerHost $updatedTask $ExpectedHostScript)) {
    throw "Dad Radar SYSTEM startup task was not updated to family-beta-host.js."
  }

  Write-Host "[PASS] SYSTEM startup task repaired and broker-aware host activated"
}

Assert-Administrator

$resolvedRepo = Resolve-RepoPath $RepoPath
$gitPath = Require-Command "git.exe"
$nodePath = Require-Command "node.exe"
$npmPath = Require-Command "npm.cmd"

if (-not (Test-Path -LiteralPath (Join-Path $resolvedRepo ".git") -PathType Container)) {
  throw "RepoPath is not a Git checkout: $resolvedRepo"
}

if (-not (Test-Path -LiteralPath (Join-Path $resolvedRepo "scripts\windows-display-host.js") -PathType Leaf)) {
  throw "RepoPath does not look like the Dad Radar checkout: $resolvedRepo"
}

$serverHostScript = Join-Path $resolvedRepo "scripts\family-beta-host.js"
if (-not (Test-Path -LiteralPath $serverHostScript -PathType Leaf)) {
  throw "Broker-aware Dad Radar background host is missing: $serverHostScript"
}

if (-not (Test-Path -LiteralPath $RemoteSource -PathType Leaf)) {
  throw "Remote executor source is missing: $RemoteSource"
}
if (-not (Test-Path -LiteralPath $RefreshSource -PathType Leaf)) {
  throw "Display refresh source is missing: $RefreshSource"
}

$currentSha = (& $gitPath -C $resolvedRepo rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $currentSha -notmatch '^[0-9a-fA-F]{40}$') {
  throw "Unable to determine the current Dad Radar Git SHA."
}
$currentSha = $currentSha.ToLowerInvariant()

$runtimeRoot = Join-Path $resolvedRepo "runtime"
$restartRequestPath = Join-Path $runtimeRoot "remote-restart-request.json"
New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
Remove-Item -LiteralPath $restartRequestPath -Force -ErrorAction SilentlyContinue
Set-Content -LiteralPath (Join-Path $runtimeRoot "deployed-sha.txt") -Value $currentSha -Encoding ascii

$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
Write-Host "Installing Dad Radar home control for $identity"
Write-Host "Dad Radar checkout: $resolvedRepo"
Write-Host "Git:  $gitPath"
Write-Host "Node: $nodePath"
Write-Host "npm:  $npmPath"
Write-Host "Persistent runner service identity: $RunnerServiceAccount"

New-Item -ItemType Directory -Path $OpsRoot -Force | Out-Null
New-Item -ItemType Directory -Path $StateRoot -Force | Out-Null

Copy-Item -LiteralPath $RemoteSource -Destination $RemoteTarget -Force
Copy-Item -LiteralPath $RefreshSource -Destination $RefreshTarget -Force

# GitHub's Windows runner uses Network Service as its default passwordless service
# identity. Grant only the application/control directories it needs to deploy Dad
# Radar, and mark the user-owned checkout safe for Git when invoked by that service.
Grant-RunnerModifyAccess $resolvedRepo
Grant-RunnerModifyAccess $OpsRoot
Ensure-SystemGitSafeDirectory $gitPath $resolvedRepo

# Existing family-beta installations can predate the broker-aware background host.
# Repair those through Dad Radar's canonical task installer, then explicitly restart
# the task so Task Scheduler is running the new action rather than an old process.
Ensure-BrokerAwareServerTask $npmPath $resolvedRepo $serverHostScript $restartRequestPath

$config = [ordered]@{
  repoPath = $resolvedRepo
  branch = $Branch
  remote = $Remote
  serverTask = $ServerTaskName
  displayRefreshTask = $DisplayTaskName
  healthUrl = $HealthUrl
  gitPath = $gitPath
  nodePath = $nodePath
  npmPath = $npmPath
  interactiveUser = $identity
  runnerServiceAccount = $RunnerServiceAccount
}

$config | ConvertTo-Json | Set-Content -LiteralPath $ConfigPath -Encoding utf8

$powerShellPath = Join-Path $PSHOME "powershell.exe"
if (-not (Test-Path -LiteralPath $powerShellPath -PathType Leaf)) {
  $powerShellPath = (Get-Command powershell.exe).Source
}

$taskArguments = "-NoProfile -ExecutionPolicy Bypass -File `"$RefreshTarget`""
$taskAction = New-ScheduledTaskAction -Execute $powerShellPath -Argument $taskArguments
$taskPrincipal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
$taskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 2)

Unregister-ScheduledTask -TaskName $DisplayTaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask `
  -TaskName $DisplayTaskName `
  -Action $taskAction `
  -Principal $taskPrincipal `
  -Settings $taskSettings `
  -Description "Refreshes the visible Dad Radar Edge application in the logged-in desktop session." | Out-Null

Set-Content -LiteralPath (Join-Path $StateRoot "current-good-sha.txt") -Value $currentSha -Encoding ascii
if (-not (Test-Path -LiteralPath (Join-Path $StateRoot "previous-good-sha.txt"))) {
  Set-Content -LiteralPath (Join-Path $StateRoot "previous-good-sha.txt") -Value $currentSha -Encoding ascii
}

Write-Host ""
Write-Host "[PASS] Local control scripts installed in $OpsRoot"
Write-Host "[PASS] Local non-secret config written to $ConfigPath"
Write-Host "[PASS] Network Service modify access prepared for Dad Radar and home-control state"
Write-Host "[PASS] Dad Radar checkout added to Git system safe.directory"
Write-Host "[PASS] SYSTEM startup task verified: family-beta-host.js"
Write-Host "[PASS] Interactive display task registered: $DisplayTaskName"
Write-Host "[PASS] Running-server deployment marker seeded: $currentSha"
Write-Host "[PASS] Current known-good SHA recorded: $currentSha"
Write-Host ""
Write-Host "Running local status self-test..."

& $RemoteTarget -IssueTitle "[DADRADAR] status"
if ($LASTEXITCODE -ne 0) {
  throw "Dad Radar home-control local status self-test failed."
}

Write-Host ""
Write-Host "Dad Radar local home-control installation is ready for the private GitHub runner."
