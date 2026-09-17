param(
  [Parameter(Mandatory = $true)]
  [string]$IssueTitle,

  [string]$IssueBody = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$OpsRoot = "C:\DadRadarOps"
$ConfigPath = Join-Path $OpsRoot "config.json"
$StateRoot = Join-Path $OpsRoot "state"
$CurrentGoodPath = Join-Path $StateRoot "current-good-sha.txt"
$PreviousGoodPath = Join-Path $StateRoot "previous-good-sha.txt"
$CommandPattern = '^\[DADRADAR\] (status|test|deploy|restart|logs|rollback)$'
$ShaPattern = '^[0-9a-fA-F]{40}$'

function Write-Section([string]$Title) {
  Write-Host ""
  Write-Host "=== $Title ==="
}

function Require-File([string]$Path, [string]$Description) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "$Description was not found at $Path"
  }
}

function Load-Config {
  Require-File $ConfigPath "Dad Radar home-control config"
  $config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json

  foreach ($name in @("repoPath", "branch", "remote", "serverTask", "displayRefreshTask", "healthUrl", "gitPath", "npmPath")) {
    if (-not $config.PSObject.Properties[$name] -or [string]::IsNullOrWhiteSpace([string]$config.$name)) {
      throw "Missing required home-control config property: $name"
    }
  }

  if (-not (Test-Path -LiteralPath $config.repoPath -PathType Container)) {
    throw "Dad Radar repository path does not exist: $($config.repoPath)"
  }

  Require-File ([string]$config.gitPath) "Configured Git executable"
  Require-File ([string]$config.npmPath) "Configured npm executable"

  return $config
}

function Invoke-External(
  [string]$FilePath,
  [string[]]$Arguments,
  [string]$WorkingDirectory = ""
) {
  if ($WorkingDirectory) {
    Push-Location $WorkingDirectory
  }

  try {
    & $FilePath @Arguments
    $code = $LASTEXITCODE
    if ($code -ne 0) {
      throw "$FilePath exited with code $code"
    }
  }
  finally {
    if ($WorkingDirectory) {
      Pop-Location
    }
  }
}

function Get-GitValue([object]$Config, [string[]]$Arguments) {
  $output = & $Config.gitPath -C $Config.repoPath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') failed with code $LASTEXITCODE"
  }
  return (($output | Out-String).Trim())
}

function Assert-CleanTree([object]$Config) {
  $dirty = Get-GitValue $Config @("status", "--porcelain")
  if (-not [string]::IsNullOrWhiteSpace($dirty)) {
    Write-Host $dirty
    throw "Dad Radar has local changes. Remote deployment is blocked until the checkout is clean."
  }
}

function Fetch-ConfiguredBranch([object]$Config) {
  Invoke-External $Config.gitPath @(
    "-C", $Config.repoPath,
    "fetch", "--prune", $Config.remote, $Config.branch
  )
}

function Assert-DeploySha([object]$Config, [string]$Sha) {
  if ($Sha -notmatch $ShaPattern) {
    throw "Deploy target must be a full 40-character hexadecimal commit SHA."
  }

  & $Config.gitPath -C $Config.repoPath cat-file -e "$Sha^{commit}" 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "Deploy target does not exist in the local Git object database after fetch: $Sha"
  }

  & $Config.gitPath -C $Config.repoPath merge-base --is-ancestor $Sha "$($Config.remote)/$($Config.branch)"
  if ($LASTEXITCODE -ne 0) {
    throw "Deploy target is not in $($Config.remote)/$($Config.branch) history: $Sha"
  }
}

function Get-DadRadarHealth([object]$Config) {
  try {
    $result = Invoke-RestMethod -Uri $Config.healthUrl -Method Get -TimeoutSec 3
    if ($result.ok -eq $true -and $result.service -eq "Dad Radar") {
      return $result
    }
  }
  catch {
    return $null
  }

  return $null
}

function Wait-DadRadarHealth([object]$Config, [int]$Attempts = 40) {
  for ($attempt = 1; $attempt -le $Attempts; $attempt += 1) {
    if ($null -ne (Get-DadRadarHealth $Config)) {
      Write-Host "Dad Radar health check passed on attempt $attempt."
      return $true
    }

    if ($attempt -lt $Attempts) {
      Start-Sleep -Seconds 2
    }
  }

  return $false
}

function Get-RuntimePath([object]$Config, [string]$Name) {
  return Join-Path (Join-Path $Config.repoPath "runtime") $Name
}

function Write-DeploymentVersion([object]$Config, [string]$Sha) {
  if ($Sha -notmatch $ShaPattern) {
    throw "Cannot record an invalid Dad Radar deployment SHA."
  }

  $runtime = Join-Path $Config.repoPath "runtime"
  New-Item -ItemType Directory -Path $runtime -Force | Out-Null

  $path = Get-RuntimePath $Config "deployed-sha.txt"
  Set-Content -LiteralPath $path -Value $Sha.ToLowerInvariant() -Encoding ascii
}

function Write-RestartRequest([object]$Config, [string]$Sha) {
  if ($Sha -notmatch $ShaPattern) {
    throw "Cannot request restart for an invalid Dad Radar deployment SHA."
  }

  $runtime = Join-Path $Config.repoPath "runtime"
  New-Item -ItemType Directory -Path $runtime -Force | Out-Null

  $path = Get-RuntimePath $Config "remote-restart-request.json"
  $temporaryPath = "$path.tmp"
  $payload = @{
    action = "restart"
    sha = $Sha.ToLowerInvariant()
    requestedAt = (Get-Date).ToUniversalTime().ToString("o")
  } | ConvertTo-Json -Compress

  Set-Content -LiteralPath $temporaryPath -Value $payload -Encoding ascii
  Move-Item -LiteralPath $temporaryPath -Destination $path -Force
}

function Request-DadRadarRestart(
  [object]$Config,
  [string]$ExpectedSha,
  [int]$Attempts = 60
) {
  $before = Get-DadRadarHealth $Config
  $beforeInstance = if ($null -ne $before) { [string]$before.instanceId } else { "" }

  Write-Section "Requesting Dad Radar background restart"
  Write-DeploymentVersion $Config $ExpectedSha
  Write-RestartRequest $Config $ExpectedSha

  for ($attempt = 1; $attempt -le $Attempts; $attempt += 1) {
    Start-Sleep -Seconds 2
    $current = Get-DadRadarHealth $Config

    if ($null -ne $current) {
      $currentVersion = [string]$current.version
      $currentInstance = [string]$current.instanceId
      $instanceChanged = [string]::IsNullOrWhiteSpace($beforeInstance) -or $currentInstance -ne $beforeInstance

      if (
        $currentVersion -eq $ExpectedSha.ToLowerInvariant() -and
        -not [string]::IsNullOrWhiteSpace($currentInstance) -and
        $instanceChanged
      ) {
        Write-Host "Dad Radar restarted on deployment $currentVersion (instance $currentInstance)."
        return $true
      }
    }
  }

  return $false
}

function Restore-Checkout([object]$Config, [string]$Sha) {
  if ($Sha -notmatch $ShaPattern) {
    return
  }

  Write-Section "Restoring previous checkout"
  Invoke-External $Config.gitPath @("-C", $Config.repoPath, "checkout", "-q", $Config.branch)
  Invoke-External $Config.gitPath @("-C", $Config.repoPath, "reset", "--hard", $Sha)
  Invoke-External $Config.npmPath @("ci") $Config.repoPath
}

function Record-GoodDeployment([string]$PreviousSha, [string]$CurrentSha) {
  New-Item -ItemType Directory -Path $StateRoot -Force | Out-Null
  Set-Content -LiteralPath $PreviousGoodPath -Value $PreviousSha -Encoding ascii
  Set-Content -LiteralPath $CurrentGoodPath -Value $CurrentSha -Encoding ascii
}

function Deploy-Sha([object]$Config, [string]$TargetSha) {
  Assert-CleanTree $Config
  Fetch-ConfiguredBranch $Config
  Assert-DeploySha $Config $TargetSha

  $TargetSha = $TargetSha.ToLowerInvariant()
  $beforeSha = (Get-GitValue $Config @("rev-parse", "HEAD")).ToLowerInvariant()
  $movedCheckout = $false

  Write-Section "Deploying Dad Radar $TargetSha"

  try {
    Invoke-External $Config.gitPath @("-C", $Config.repoPath, "checkout", "-q", $Config.branch)
    Invoke-External $Config.gitPath @("-C", $Config.repoPath, "reset", "--hard", $TargetSha)
    $movedCheckout = $true

    Invoke-External $Config.npmPath @("ci") $Config.repoPath
    Invoke-External $Config.npmPath @("test") $Config.repoPath

    if (-not (Request-DadRadarRestart $Config $TargetSha)) {
      throw "Dad Radar did not restart on deployment $TargetSha within the verification window."
    }

    $previousGood = $beforeSha
    if (Test-Path -LiteralPath $CurrentGoodPath -PathType Leaf) {
      $recorded = (Get-Content -LiteralPath $CurrentGoodPath -Raw).Trim()
      if ($recorded -match $ShaPattern) {
        $previousGood = $recorded.ToLowerInvariant()
      }
    }

    Record-GoodDeployment $previousGood $TargetSha

    Write-Section "Deployment complete"
    Write-Host "Previous good SHA: $previousGood"
    Write-Host "Current good SHA:  $TargetSha"
  }
  catch {
    $deployError = $_
    Write-Host "Deployment failed: $($deployError.Exception.Message)"

    if ($movedCheckout -and $beforeSha -match $ShaPattern) {
      try {
        Restore-Checkout $Config $beforeSha
        if (-not (Request-DadRadarRestart $Config $beforeSha)) {
          throw "Dad Radar did not confirm the restored deployment $beforeSha."
        }
        Write-Host "Previous checkout was restored after the failed deployment."
      }
      catch {
        Write-Host "WARNING: automatic restore also failed: $($_.Exception.Message)"
      }
    }

    throw $deployError
  }
}

function Get-TaskState([string]$TaskName) {
  try {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = & schtasks.exe /Query /TN $TaskName /FO LIST /V 2>&1
    $exitCode = $LASTEXITCODE
  }
  catch {
    return "UNAVAILABLE"
  }
  finally {
    $ErrorActionPreference = $previousPreference
  }

  if ($exitCode -ne 0) {
    return "UNAVAILABLE"
  }

  $state = $output | Where-Object { $_ -match '^Status:' } | Select-Object -First 1
  if ($state) {
    return (($state -replace '^Status:\s*', '').Trim())
  }

  return "PRESENT"
}

function Show-Status([object]$Config) {
  Write-Section "Dad Radar home status"
  Fetch-ConfiguredBranch $Config

  $head = Get-GitValue $Config @("rev-parse", "HEAD")
  $branch = Get-GitValue $Config @("rev-parse", "--abbrev-ref", "HEAD")
  $upstream = Get-GitValue $Config @("rev-parse", "$($Config.remote)/$($Config.branch)")
  $dirty = Get-GitValue $Config @("status", "--porcelain")
  $workingTreeState = if ([string]::IsNullOrWhiteSpace($dirty)) { "CLEAN" } else { "DIRTY" }

  Write-Host "Repo:          $($Config.repoPath)"
  Write-Host "Branch:        $branch"
  Write-Host "Installed SHA: $head"
  Write-Host "Upstream SHA:  $upstream"
  Write-Host "Working tree:  $workingTreeState"
  Write-Host "Server task:   $(Get-TaskState $Config.serverTask)"
  Write-Host "Display task:  $(Get-TaskState $Config.displayRefreshTask)"

  $health = Get-DadRadarHealth $Config
  if ($null -ne $health) {
    Write-Host "Health:        HEALTHY"
    Write-Host "Running SHA:   $([string]$health.version)"
    Write-Host "Server instance: $([string]$health.instanceId)"
  }
  else {
    Write-Host "Health:        UNREACHABLE"
  }

  $runner = Get-Service -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -like "actions.runner.*" -or $_.Name -like "actionsrunner.*"
  } | Select-Object -First 1

  if ($runner) {
    Write-Host "Runner service: $($runner.Status) ($($runner.Name))"
  }
  else {
    Write-Host "Runner service: NOT FOUND"
  }
}

function Run-Tests([object]$Config) {
  Write-Section "Running Dad Radar tests"
  Assert-CleanTree $Config
  Invoke-External $Config.npmPath @("test") $Config.repoPath
}

function Show-Logs([object]$Config, [string]$Body) {
  $lines = 200
  if (-not [string]::IsNullOrWhiteSpace($Body)) {
    $match = [regex]::Match($Body.Trim(), '^lines=(\d{1,3})$')
    if (-not $match.Success) {
      throw "Logs body must be empty or exactly lines=N."
    }
    $lines = [int]$match.Groups[1].Value
  }

  if ($lines -lt 20 -or $lines -gt 500) {
    throw "Log line count must be between 20 and 500."
  }

  $logPath = Join-Path $Config.repoPath "runtime\family-beta.log"
  Require-File $logPath "Dad Radar family beta log"

  Write-Section "Last $lines Dad Radar log lines"
  Get-Content -LiteralPath $logPath -Tail $lines
}

function Parse-DeploySha([string]$Body) {
  $match = [regex]::Match($Body.Trim(), '^sha=([0-9a-fA-F]{40})$')
  if (-not $match.Success) {
    throw "Deploy issue body must be exactly sha=<40-character SHA>."
  }
  return $match.Groups[1].Value.ToLowerInvariant()
}

function Read-PreviousGoodSha {
  Require-File $PreviousGoodPath "Previous-good deployment state"
  $sha = (Get-Content -LiteralPath $PreviousGoodPath -Raw).Trim()
  if ($sha -notmatch $ShaPattern) {
    throw "Previous-good deployment state is invalid."
  }
  return $sha.ToLowerInvariant()
}

function Restart-CurrentDeployment([object]$Config) {
  Assert-CleanTree $Config
  $sha = (Get-GitValue $Config @("rev-parse", "HEAD")).ToLowerInvariant()

  if (-not (Request-DadRadarRestart $Config $sha)) {
    throw "Dad Radar did not complete the requested restart."
  }
}

$titleMatch = [regex]::Match($IssueTitle.Trim(), $CommandPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
if (-not $titleMatch.Success) {
  throw "Unsupported Dad Radar command title."
}

$action = $titleMatch.Groups[1].Value.ToLowerInvariant()
$config = Load-Config

Write-Host "Dad Radar remote action: $action"
Write-Host "Machine: $env:COMPUTERNAME"
Write-Host "Identity: $([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)"

switch ($action) {
  "status" {
    Show-Status $config
  }
  "test" {
    Run-Tests $config
  }
  "deploy" {
    Deploy-Sha $config (Parse-DeploySha $IssueBody)
  }
  "restart" {
    Restart-CurrentDeployment $config
  }
  "logs" {
    Show-Logs $config $IssueBody
  }
  "rollback" {
    Deploy-Sha $config (Read-PreviousGoodSha)
  }
  default {
    throw "Unsupported Dad Radar remote action."
  }
}
