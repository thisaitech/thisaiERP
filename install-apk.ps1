# Install APK on Android Device Script
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTALL APK ON ANDROID DEVICE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if APK exists
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $apkPath)) {
    Write-Host "❌ APK not found at: $apkPath" -ForegroundColor Red
    Write-Host "Please build the APK first using build-apk.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ APK found: $apkPath" -ForegroundColor Green
$apkSize = [math]::Round((Get-Item $apkPath).Length / 1MB, 2)
Write-Host "   Size: $apkSize MB" -ForegroundColor White
Write-Host ""

# Check if ADB is available
$adbCheck = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adbCheck) {
    Write-Host "⚠ ADB not found in PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To install via USB:" -ForegroundColor Cyan
    Write-Host "  1. Enable USB Debugging on your device" -ForegroundColor White
    Write-Host "  2. Connect device via USB" -ForegroundColor White
    Write-Host "  3. Install Android Platform Tools (ADB)" -ForegroundColor White
    Write-Host "  4. Or transfer APK manually to device" -ForegroundColor White
    Write-Host ""
    Write-Host "Opening APK folder for manual transfer..." -ForegroundColor Cyan
    explorer.exe /select,(Resolve-Path $apkPath)
    exit 0
}

# Check if device is connected
Write-Host "Checking for connected devices..." -ForegroundColor Yellow
$devices = adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "device$" }
if ($devices.Count -eq 0) {
    Write-Host "❌ No Android device detected!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "  1. Enable USB Debugging on your device" -ForegroundColor White
    Write-Host "  2. Connect device via USB" -ForegroundColor White
    Write-Host "  3. Accept USB debugging prompt on device" -ForegroundColor White
    Write-Host "  4. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Opening APK folder for manual transfer..." -ForegroundColor Cyan
    explorer.exe /select,(Resolve-Path $apkPath)
    exit 1
}

Write-Host "✅ Device detected: $($devices.Count) device(s)" -ForegroundColor Green
Write-Host ""

# Install APK
Write-Host "Installing APK on device..." -ForegroundColor Cyan
adb install -r $apkPath

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ APK installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now:" -ForegroundColor Cyan
    Write-Host "  1. Find 'ThisAI CRM' app on your device" -ForegroundColor White
    Write-Host "  2. Launch the app to test" -ForegroundColor White
    Write-Host ""
    
    $launch = Read-Host "Launch app on device? (Y/N)"
    if ($launch -eq "Y" -or $launch -eq "y") {
        Write-Host "Launching app..." -ForegroundColor Cyan
        adb shell monkey -p com.thisai.crm -c android.intent.category.LAUNCHER 1
    }
} else {
    Write-Host ""
    Write-Host "❌ Installation failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "  - App already installed (try: adb uninstall com.thisai.crm)" -ForegroundColor White
    Write-Host "  - Device storage full" -ForegroundColor White
    Write-Host "  - Insufficient permissions" -ForegroundColor White
    Write-Host ""
    Write-Host "Try manual installation:" -ForegroundColor Cyan
    Write-Host "  1. Copy APK to device" -ForegroundColor White
    Write-Host "  2. Open file manager on device" -ForegroundColor White
    Write-Host "  3. Tap APK to install" -ForegroundColor White
    Write-Host ""
    explorer.exe /select,(Resolve-Path $apkPath)
}

Write-Host ""
