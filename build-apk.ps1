# Build Android APK Script
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BUILDING ANDROID APK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build the web app
Write-Host "[1] Building Web Application..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
if (Test-Path "dist") {
    Write-Host "Cleaning old build..." -ForegroundColor White
    Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
}
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Please fix errors and try again." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Web build complete!" -ForegroundColor Green
Write-Host ""

# Step 2: Sync Capacitor
Write-Host "[2] Syncing Capacitor..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Capacitor sync failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Capacitor sync complete!" -ForegroundColor Green
Write-Host ""

# Step 3: Build APK using Gradle
Write-Host "[3] Building APK with Gradle..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "This may take a few minutes..." -ForegroundColor White
Write-Host ""

# Change to android directory
Push-Location android

# Build debug APK
Write-Host "Building Debug APK..." -ForegroundColor Cyan
.\gradlew.bat assembleDebug
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ APK build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Build release APK (unsigned)
Write-Host "Building Release APK (unsigned)..." -ForegroundColor Cyan
.\gradlew.bat assembleRelease
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Release APK build failed (this is okay if you don't have signing keys)" -ForegroundColor Yellow
} else {
    Write-Host "✅ Release APK built!" -ForegroundColor Green
}

Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  APK BUILD COMPLETE!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Find APK files
$debugApk = Get-ChildItem -Path "android\app\build\outputs\apk\debug" -Filter "*.apk" -ErrorAction SilentlyContinue | Select-Object -First 1
$releaseApk = Get-ChildItem -Path "android\app\build\outputs\apk\release" -Filter "*.apk" -ErrorAction SilentlyContinue | Select-Object -First 1

Write-Host "📱 APK Files Generated:" -ForegroundColor Green
Write-Host ""

if ($debugApk) {
    $debugSize = [math]::Round($debugApk.Length / 1MB, 2)
    Write-Host "  ✅ Debug APK:" -ForegroundColor Green
    Write-Host "     Location: $($debugApk.FullName)" -ForegroundColor White
    Write-Host "     Size: $debugSize MB" -ForegroundColor White
    Write-Host ""
}

if ($releaseApk) {
    $releaseSize = [math]::Round($releaseApk.Length / 1MB, 2)
    Write-Host "  ✅ Release APK (unsigned):" -ForegroundColor Green
    Write-Host "     Location: $($releaseApk.FullName)" -ForegroundColor White
    Write-Host "     Size: $releaseSize MB" -ForegroundColor White
    Write-Host ""
    Write-Host "  ⚠ Note: Release APK is unsigned. For Play Store, you need to sign it." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Install Debug APK on your device for testing" -ForegroundColor White
Write-Host "  2. For production, sign the Release APK" -ForegroundColor White
Write-Host "  3. Or use Android Studio: Build → Generate Signed Bundle / APK" -ForegroundColor White
Write-Host ""

# Option to open APK folder
$openFolder = Read-Host "Open APK folder? (Y/N)"
if ($openFolder -eq "Y" -or $openFolder -eq "y") {
    if ($debugApk) {
        explorer.exe /select,$debugApk.FullName
    } else {
        explorer.exe "android\app\build\outputs\apk"
    }
}

Write-Host ""
Write-Host "✅ Done!" -ForegroundColor Green
