param(
  [string]$ServerUrl = "https://chess-coach-web-x6vz.onrender.com"
)

$ErrorActionPreference = "Stop"
$frontendRoot = Split-Path -Parent $PSScriptRoot
$jdkRoot = Get-ChildItem -LiteralPath (Join-Path $frontendRoot ".android-tools") `
  -Directory -Filter "jdk-21*" -ErrorAction SilentlyContinue |
  Select-Object -First 1

if (-not $jdkRoot) {
  throw "JDK 21 absent. Installez Java 21 ou placez-le dans frontend/.android-tools."
}

$androidSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
if (-not (Test-Path -LiteralPath $androidSdk)) {
  throw "SDK Android introuvable. Ouvrez Android Studio puis installez le SDK Android 36."
}

$env:JAVA_HOME = $jdkRoot.FullName
$env:ANDROID_HOME = $androidSdk
$env:ANDROID_USER_HOME = Join-Path $frontendRoot ".android-user-home"
$env:GRADLE_USER_HOME = Join-Path $frontendRoot ".gradle-user-home"
$env:CAPACITOR_SERVER_URL = $ServerUrl

Push-Location $frontendRoot
try {
  & npm.cmd run mobile:assets
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & npm.cmd run mobile:sync
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Push-Location (Join-Path $frontendRoot "android")
  try {
    & .\gradlew.bat assembleDebug
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
}

$apkPath = Join-Path $frontendRoot "android\app\build\outputs\apk\debug\app-debug.apk"
Write-Host "APK Chess Clan prêt : $apkPath"
