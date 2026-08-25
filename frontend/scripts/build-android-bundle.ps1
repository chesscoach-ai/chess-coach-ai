param(
  [string]$ServerUrl = "https://chess-coach-web-x6vz.onrender.com"
)

$ErrorActionPreference = "Stop"
$frontendRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $frontendRoot "android"
$keystoreProperties = Join-Path $androidRoot "keystore-release.properties"
$jdkRoot = Get-ChildItem -LiteralPath (Join-Path $frontendRoot ".android-tools") `
  -Directory -Filter "jdk-21*" -ErrorAction SilentlyContinue |
  Select-Object -First 1

if (-not $jdkRoot) {
  throw "JDK 21 absent. Installez Java 21 ou placez-le dans frontend/.android-tools."
}
if (-not (Test-Path -LiteralPath $keystoreProperties)) {
  throw "Signature absente : android/keystore-release.properties est requis."
}

$androidSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
if (-not (Test-Path -LiteralPath $androidSdk)) {
  throw "SDK Android introuvable. Ouvrez Android Studio puis installez le SDK Android 36."
}

$env:JAVA_HOME = $jdkRoot.FullName
$env:ANDROID_HOME = $androidSdk
$env:ANDROID_USER_HOME = Join-Path $frontendRoot ".android-user-home"
$env:GRADLE_USER_HOME = Join-Path $frontendRoot ".gradle-beta-home"
$env:CAPACITOR_SERVER_URL = $ServerUrl

Push-Location $frontendRoot
try {
  & npm.cmd run mobile:assets
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & npm.cmd run mobile:sync
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Push-Location $androidRoot
  try {
    & .\gradlew.bat --stop
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & .\gradlew.bat clean bundleRelease --no-daemon
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
}

$bundlePath = Join-Path $androidRoot "app\build\outputs\bundle\release\app-release.aab"
if (-not (Test-Path -LiteralPath $bundlePath)) {
  throw "Le bundle Android n'a pas été généré."
}

Write-Host "Android App Bundle Knightly signé : $bundlePath"
