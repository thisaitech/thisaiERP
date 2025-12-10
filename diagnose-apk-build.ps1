# Diagnose APK Build Issues
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DIAGNOSING APK BUILD ISSUES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check 1: Web build
Write-Host "[1] Checking Web Build..." -ForegroundColor Yellow
if (Test-Path "dist\index.html") {
    Write-Host "✅ dist/index.html exists" -ForegroundColor Green
} else {
    Write-Host "❌ dist/index.html missing - need to build web app" -ForegroundColor Red
    Write-Host "   Run: npm run build" -ForegroundColor Yellow
}
Write-Host ""

# Check 2: Capacitor sync
Write-Host "[2] Checking Capacitor..." -ForegroundColor Yellow
if (Test-Path "android\app\src\main\assets\public") {
    Write-Host "✅ Capacitor assets synced" -ForegroundColor Green
} else {
    Write-Host "⚠ Capacitor assets may not be synced" -ForegroundColor Yellow
    Write-Host "   Run: npx cap sync android" -ForegroundColor Yellow
}
Write-Host ""

# Check 3: Android SDK
Write-Host "[3] Checking Android SDK..." -ForegroundColor Yellow
if (Test-Path "android\local.properties") {
    $sdkPath = (Get-Content "android\local.properties" | Select-String "sdk.dir").ToString().Split("=")[1].Trim()
    if (Test-Path $sdkPath) {
        Write-Host "✅ Android SDK found: $sdkPath" -ForegroundColor Green
    } else {
        Write-Host "❌ Android SDK path invalid: $sdkPath" -ForegroundColor Red
    }
} else {
    Write-Host "❌ android/local.properties missing" -ForegroundColor Red
    Write-Host "   Create it with: sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk" -ForegroundColor Yellow
}
Write-Host ""

# Check 4: Java
Write-Host "[4] Checking Java..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "✅ Java found: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Java not found in PATH" -ForegroundColor Red
    Write-Host "   Install JDK 17 or higher" -ForegroundColor Yellow
}
Write-Host ""

# Check 5: Gradle
Write-Host "[5] Testing Gradle..." -ForegroundColor Yellow
Push-Location android
try {
    $gradleVersion = .\gradlew.bat --version 2>&1 | Select-String "Gradle" | Select-Object -First 1
    if ($gradleVersion) {
        Write-Host "✅ Gradle working: $gradleVersion" -ForegroundColor Green
    } else {
        Write-Host "⚠ Gradle may have issues" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Gradle test failed" -ForegroundColor Red
}
Pop-Location
Write-Host ""

# Check 6: Previous build outputs
Write-Host "[6] Checking Build Outputs..." -ForegroundColor Yellow
$debugDir = "android\app\build\outputs\apk\debug"
if (Test-Path $debugDir) {
    $files = Get-ChildItem $debugDir -ErrorAction SilentlyContinue
    if ($files.Count -gt 0) {
        Write-Host "Files in debug directory:" -ForegroundColor White
        $files | Format-Table Name, Length, LastWriteTime -AutoSize
    } else {
        Write-Host "⚠ Debug directory exists but is empty" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ Debug directory doesn't exist - build hasn't completed" -ForegroundColor Yellow
}
Write-Host ""

# Recommendation
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RECOMMENDATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Try building in Android Studio:" -ForegroundColor Yellow
Write-Host "  1. Run: npx cap open android" -ForegroundColor White
Write-Host "  2. Wait for Gradle sync" -ForegroundColor White
Write-Host "  3. Build → Build Bundle(s) / APK(s) → Build APK(s)" -ForegroundColor White
Write-Host ""
Write-Host "Or try manual build with verbose output:" -ForegroundColor Yellow
Write-Host "  cd android" -ForegroundColor White
Write-Host "  .\gradlew.bat assembleDebug --stacktrace --info" -ForegroundColor White
Write-Host ""
