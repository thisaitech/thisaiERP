# Quick Firebase Setup Script
# Run this after enabling authentication in Firebase Console

Write-Host "🔥 Firebase Authentication Setup" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Step 1: Check if authentication is enabled
Write-Host "Step 1: Please complete these tasks in Firebase Console:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to: https://console.firebase.google.com/project/thisai-crm-silver/authentication" -ForegroundColor White
Write-Host "2. Click 'Get started' or 'Sign-in method' tab" -ForegroundColor White
Write-Host "3. Enable 'Email/Password' authentication" -ForegroundColor White
Write-Host "4. Enable 'Google' sign-in (optional)" -ForegroundColor White
Write-Host ""
Write-Host "5. Go to: https://console.firebase.google.com/project/thisai-crm-silver/firestore" -ForegroundColor White
Write-Host "6. Click 'Create database'" -ForegroundColor White
Write-Host "7. Choose 'Test mode' for development (or 'Production mode' with rules)" -ForegroundColor White
Write-Host ""
$confirmation = Read-Host "Have you completed these steps? (y/n)"

if ($confirmation -ne 'y') {
    Write-Host "`n❌ Please enable authentication first, then run this script again." -ForegroundColor Red
    exit
}

# Step 2: Rebuild the application
Write-Host "`n✓ Building application with Firebase configuration..." -ForegroundColor Green
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Build failed! Check errors above." -ForegroundColor Red
    exit
}

# Step 3: Deploy to Firebase
Write-Host "`n✓ Deploying to Firebase Hosting..." -ForegroundColor Green
firebase deploy --only hosting

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Deployment failed! Check errors above." -ForegroundColor Red
    exit
}

Write-Host "`n✅✅✅ SUCCESS! ✅✅✅`n" -ForegroundColor Green
Write-Host "Your app is now live with Firebase Authentication enabled!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 App URL: https://thisai-crm-silver.web.app" -ForegroundColor Cyan
Write-Host "🔐 Auth Console: https://console.firebase.google.com/project/thisai-crm-silver/authentication" -ForegroundColor Cyan
Write-Host ""
Write-Host "Try logging in at your deployed URL!" -ForegroundColor Yellow
