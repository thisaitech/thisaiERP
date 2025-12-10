# Debug APK Build Script with Full Output
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  REBUILDING APK WITH DEBUG OUTPUT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify dist exists
Write-Host "[1] Checking Web Build..." -ForegroundColor Yellow
if (-not (Test-Path "dist\index.html")) {
    Write-Host "⚠ dist folder missing, building web app..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Web build failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Web build exists" -ForegroundColor Green
}
Write-Host ""

# Step 2: Sync Capacitor
Write-Host "[2] Syncing Capacitor..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Capacitor sync failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Capacitor sync complete" -ForegroundColor Green
Write-Host ""

# Step 3: Clean and rebuild
Write-Host "[3] Cleaning previous build..." -ForegroundColor Yellow
Push-Location android
.\gradlew.bat clean
Pop-Location
Write-Host ""

# Step 4: Build with full output
Write-Host "[4] Building APK (this may take a few minutes)..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Push-Location android

# Build with info level to see what's happening
.\gradlew.bat assembleDebug --info --stacktrace 2>&1 | Tee-Object -FilePath "gradle-build.log"

$buildSuccess = $LASTEXITCODE -eq 0
Pop-Location

Write-Host ""

if ($buildSuccess) {
    Write-Host "✅ Build completed!" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed! Check gradle-build.log for details" -ForegroundColor Red
    Write-Host "Log file: android\gradle-build.log" -ForegroundColor Yellow
}

# Step 5: Check for APK
Write-Host ""
Write-Host "[5] Checking for APK..." -ForegroundColor Yellow
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $apk = Get-Item $apkPath
    $size = [math]::Round($apk.Length / 1MB, 2)
    Write-Host "✅ APK FOUND!" -ForegroundColor Green
    Write-Host "   Location: $($apk.FullName)" -ForegroundColor White
    Write-Host "   Size: $size MB" -ForegroundColor White
    Write-Host "   Created: $($apk.LastWriteTime)" -ForegroundColor White
    explorer.exe /select,$apk.FullName
} else {
    Write-Host "❌ APK NOT FOUND!" -ForegroundColor Red
    Write-Host "   Expected location: $apkPath" -ForegroundColor Yellow
    
    # Check what files exist in the directory
    $debugDir = "android\app\build\outputs\apk\debug"
    if (Test-Path $debugDir) {
        Write-Host ""
        Write-Host "Files in debug directory:" -ForegroundColor Cyan
        Get-ChildItem $debugDir | Format-Table Name, Length, LastWriteTime
    }
    
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check android\gradle-build.log for errors" -ForegroundColor White
    Write-Host "  2. Verify Android SDK is installed" -ForegroundColor White
    Write-Host "  3. Check JAVA_HOME is set correctly" -ForegroundColor White
    Write-Host "  4. Try opening in Android Studio: npx cap open android" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
