# Quick APK Generation Script

Write-Host "📱 Android APK Generation Setup" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check if build exists
if (-not (Test-Path "dist")) {
    Write-Host "Building project first..." -ForegroundColor Yellow
    npm run build
}

# Install Capacitor if not already installed
Write-Host "`nStep 1: Installing Capacitor..." -ForegroundColor Cyan
npm install @capacitor/core @capacitor/cli @capacitor/android

# Initialize Capacitor (if not already done)
if (-not (Test-Path "capacitor.config.ts")) {
    Write-Host "`nStep 2: Initializing Capacitor..." -ForegroundColor Cyan
    Write-Host "Use these values when prompted:" -ForegroundColor Yellow
    Write-Host "  App name: ThisAI CRM" -ForegroundColor Yellow
    Write-Host "  App ID: com.thisai.crm" -ForegroundColor Yellow
    Write-Host "  Web directory: dist`n" -ForegroundColor Yellow
    npx cap init
}

# Add Android platform
if (-not (Test-Path "android")) {
    Write-Host "`nStep 3: Adding Android platform..." -ForegroundColor Cyan
    npx cap add android
}

# Sync assets
Write-Host "`nStep 4: Syncing web assets..." -ForegroundColor Cyan
npx cap sync android

# Open in Android Studio
Write-Host "`nStep 5: Opening in Android Studio..." -ForegroundColor Cyan
Write-Host "After Android Studio opens:" -ForegroundColor Yellow
Write-Host "  1. Wait for Gradle sync to complete" -ForegroundColor Yellow
Write-Host "  2. Go to: Build → Build Bundle(s) / APK(s) → Build APK(s)" -ForegroundColor Yellow
Write-Host "  3. APK will be at: android/app/build/outputs/apk/debug/app-debug.apk`n" -ForegroundColor Yellow

npx cap open android

Write-Host "`n✅ Android Studio should be opening..." -ForegroundColor Green
Write-Host "Follow the steps above to build your APK!" -ForegroundColor Green
