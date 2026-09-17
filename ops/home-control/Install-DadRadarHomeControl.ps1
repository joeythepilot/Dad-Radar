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

if (-not (Test-Path -LiteralPath $RemoteSource -PathType Leaf)) {
  throw "Remote executor source is missing: $RemoteSource"
}
if (-not (Test-Path -LiteralPath $RefreshSource -PathType Leaf)) {
  throw "Display refresh source is missing: $RefreshSource"
}

$serverTask = Get-ScheduledTask -TaskName $ServerTaskName -ErrorAction SilentlyContinue
if (-not $serverTask) {
  throw "Existing '$ServerTaskName' scheduled task was not found. Keep the current Dad Radar server autostart installed before enabling remote control."
}

$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
Write-Host "Installing Dad Radar home control for $identity"
Write-Host "Dad Radar checkout: $resolvedRepo"
Write-Host "Git:  $gitPath"
Write-Host "Node: $nodePath"
Write-Host "npm:  $npmPath"

New-Item -ItemType Directory -Path $OpsRoot -Force | Out-Null
New-Item -ItemType Directory -Path $StateRoot -Force | Out-Null

Copy-Item -LiteralPath $RemoteSource -Destination $RemoteTarget -Force
Copy-Item -LiteralPath $RefreshSource -Destination $RefreshTarget -Force

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

$currentSha = (& git -C $resolvedRepo rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $currentSha -notmatch '^[0-9a-fA-F]{40}$') {
  throw "Unable to determine the current Dad Radar Git SHA."
}

Set-Content -LiteralPath (Join-Path $StateRoot "current-good-sha.txt") -Value $currentSha -Encoding ascii
if (-not (Test-Path -LiteralPath (Join-Path $StateRoot "previous-good-sha.txt"))) {
  Set-Content -LiteralPath (Join-Path $StateRoot "previous-good-sha.txt") -Value $currentSha -Encoding ascii
}

Write-Host ""
Write-Host "[PASS] Local control scripts installed in $OpsRoot"
Write-Host "[PASS] Local non-secret config written to $ConfigPath"
Write-Host "[PASS] Interactive display task registered: $DisplayTaskName"
Write-Host "[PASS] Current known-good SHA recorded: $currentSha"
Write-Host ""
Write-Host "Running local status self-test..."

& $RemoteTarget -IssueTitle "[DADRADAR] status"
if ($LASTEXITCODE -ne 0) {
  throw "Dad Radar home-control local status self-test failed."
}

Write-Host ""
Write-Host "Dad Radar local home-control installation is ready for the private GitHub runner."
