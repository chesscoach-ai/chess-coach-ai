$ErrorActionPreference = "Stop"
$frontendRoot = Split-Path -Parent $PSScriptRoot
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
$apk = Join-Path $frontendRoot "android\app\build\outputs\apk\debug\app-debug.apk"
$env:ANDROID_USER_HOME = Join-Path $frontendRoot ".android-user-home"

if (-not (Test-Path -LiteralPath $adb)) {
  throw "ADB introuvable. Installez Android SDK Platform-Tools depuis Android Studio."
}
if (-not (Test-Path -LiteralPath $apk)) {
  throw "APK absent. Lancez d’abord npm run mobile:build:android."
}

$devices = & $adb devices
$connected = $devices | Where-Object { $_ -match "\tdevice$" }
if (-not $connected) {
  throw "Aucun téléphone ou émulateur Android détecté."
}

& $adb install -r $apk
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $adb shell monkey -p com.chessclan.app -c android.intent.category.LAUNCHER 1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
