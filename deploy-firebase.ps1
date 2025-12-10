# Quick Firebase Setup Script

# Step 1: Login to Firebase
Write-Host "Step 1: Logging in to Firebase..." -ForegroundColor Cyan
firebase login

# Step 2: Add your Firebase project
Write-Host "`nStep 2: Select your Firebase project..." -ForegroundColor Cyan
Write-Host "If you haven't created one yet, go to https://console.firebase.google.com" -ForegroundColor Yellow
firebase use --add

# Step 3: Build the project (already done, but just in case)
Write-Host "`nStep 3: Building project..." -ForegroundColor Cyan
npm run build

# Step 4: Deploy to Firebase
Write-Host "`nStep 4: Deploying to Firebase Hosting..." -ForegroundColor Cyan
firebase deploy --only hosting

Write-Host "`n✅ Deployment Complete!" -ForegroundColor Green
Write-Host "Your app is now live!" -ForegroundColor Green
