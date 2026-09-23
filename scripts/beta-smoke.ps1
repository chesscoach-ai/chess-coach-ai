param(
  [string]$FrontendUrl = "http://localhost:3000",
  [string]$BackendUrl = "http://localhost:8000",
  [switch]$AllowUnconfiguredLocalDatabase
)

$ErrorActionPreference = "Stop"

function Invoke-Status {
  param(
    [string]$Url,
    [string]$Method = "GET",
    [string]$Body = "",
    [string]$ContentType = "application/json"
  )
  try {
    $parameters = @{ Uri = $Url; UseBasicParsing = $true; Method = $Method }
    if ($Body) {
      $parameters.Body = $Body
      $parameters.ContentType = $ContentType
    }
    return [int](Invoke-WebRequest @parameters).StatusCode
  } catch [System.Net.WebException] {
    if ($_.Exception.Response) {
      return [int]$_.Exception.Response.StatusCode
    }
    throw
  }
}

$checks = @(
  @{ Name = "Backend health"; Url = "$BackendUrl/health"; Codes = @(200) },
  @{ Name = "Backend ready"; Url = "$BackendUrl/ready"; Codes = @(200) },
  @{ Name = "Frontend"; Url = $FrontendUrl; Codes = @(200) },
  @{ Name = "Frontend health"; Url = "$FrontendUrl/api/health"; Codes = $(if ($AllowUnconfiguredLocalDatabase) { @(200, 503) } else { @(200) }) },
  @{ Name = "Auth providers"; Url = "$FrontendUrl/api/auth/providers"; Codes = @(200) },
  @{ Name = "PWA manifest"; Url = "$FrontendUrl/manifest.webmanifest"; Codes = @(200) },
  @{ Name = "Nox Squire"; Url = "$FrontendUrl/brand/nox-final/nox-squire-256.webp"; Codes = @(200) },
  @{ Name = "DEV diagnostics hidden"; Url = "$FrontendUrl/dev/diagnostics"; Codes = @(404) }
)

$failed = $false
foreach ($check in $checks) {
  try {
    $statusCode = Invoke-Status -Url $check.Url
    $ok = $check.Codes -contains $statusCode
    $status = if ($ok) { "OK" } else { "FAIL" }
    Write-Host "[$status] $($check.Name): HTTP $statusCode"
    if (-not $ok) { $failed = $true }
  } catch {
    Write-Host "[FAIL] $($check.Name): $($_.Exception.Message)"
    $failed = $true
  }
}

try {
  $protectedStatus = Invoke-Status -Url "$FrontendUrl/api/analysis-engine/analyze-position" -Method POST -Body '{"fen":"invalid"}'
  $protectedOk = $protectedStatus -in @(400, 401, 403)
  Write-Host "[$(if ($protectedOk) { 'OK' } else { 'FAIL' })] Analysis protected: HTTP $protectedStatus"
  if (-not $protectedOk) { $failed = $true }
} catch {
  Write-Host "[FAIL] Analysis protected: $($_.Exception.Message)"
  $failed = $true
}

if ($failed) { exit 1 }
Write-Host "Smoke test Knightly beta: PASS"
