Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$OpsRoot = "C:\DadRadarOps"
$ConfigPath = Join-Path $OpsRoot "config.json"

if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
  throw "Dad Radar home-control config was not found at $ConfigPath"
}

$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$repoPath = [string]$config.repoPath
$nodePath = [string]$config.nodePath

if ([string]::IsNullOrWhiteSpace($repoPath) -or -not (Test-Path -LiteralPath $repoPath -PathType Container)) {
  throw "Dad Radar repository path is invalid."
}

if ([string]::IsNullOrWhiteSpace($nodePath) -or -not (Test-Path -LiteralPath $nodePath -PathType Leaf)) {
  throw "Configured Node executable is unavailable: $nodePath"
}

$profilePath = Join-Path $repoPath "runtime\edge-display-profile"
$hostScript = Join-Path $repoPath "scripts\windows-display-host.js"

if (-not (Test-Path -LiteralPath $hostScript -PathType Leaf)) {
  throw "Dad Radar display host is unavailable: $hostScript"
}

Write-Host "Refreshing Dad Radar display for interactive user $env:USERNAME"
Write-Host "Dedicated Edge profile: $profilePath"

$dadRadarEdge = Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" |
  Where-Object {
    $_.CommandLine -and
    $_.CommandLine.IndexOf($profilePath, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
  }

foreach ($process in $dadRadarEdge) {
  Write-Host "Stopping Dad Radar Edge process $($process.ProcessId)"
  Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Milliseconds 900

Write-Host "Launching Dad Radar display host."
Start-Process `
  -FilePath $nodePath `
  -ArgumentList @("`"$hostScript`"") `
  -WorkingDirectory $repoPath `
  -WindowStyle Hidden

Write-Host "Dad Radar display refresh requested."
