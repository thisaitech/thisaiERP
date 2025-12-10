# Complete Deployment Verification and Deployment Script
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT VERIFICATION & DEPLOY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Git Status
Write-Host "[1] Git Repository Status" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
$currentBranch = git branch --show-current
Write-Host "Current Branch: $currentBranch" -ForegroundColor White

$uncommitted = git status --porcelain
if ($uncommitted) {
    Write-Host "⚠ UNCOMMITTED CHANGES FOUND:" -ForegroundColor Red
    git status --short
    Write-Host ""
    Write-Host "These changes are NOT deployed yet!" -ForegroundColor Red
    Write-Host "Commit them first: git add -A && git commit -m 'Your message'" -ForegroundColor Yellow
} else {
    Write-Host "✓ No uncommitted changes" -ForegroundColor Green
}
Write-Host ""

# Step 2: Check Local vs Remote
Write-Host "[2] Local vs Remote Comparison" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
git fetch origin --all --prune 2>&1 | Out-Null

$localCommit = git rev-parse HEAD
$remoteCommit = git rev-parse origin/main 2>$null

if ($remoteCommit) {
    if ($localCommit -eq $remoteCommit) {
        Write-Host "✅ GIT DEPLOYMENT: COMPLETE" -ForegroundColor Green
        Write-Host "   Local and remote are in sync" -ForegroundColor Green
        Write-Host "   All commits are in GitHub" -ForegroundColor Green
    } else {
        $aheadBehind = (git rev-list --left-right --count origin/main...HEAD).Split("`t")
        $ahead = [int]$aheadBehind[1]
        $behind = [int]$aheadBehind[0]
        
        if ($ahead -gt 0) {
            Write-Host "⚠ GIT DEPLOYMENT: PENDING" -ForegroundColor Red
            Write-Host "   You have $ahead commit(s) NOT in remote" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "   Commits to push:" -ForegroundColor Yellow
            git log origin/main..HEAD --oneline
            Write-Host ""
            Write-Host "   Run: git push origin main" -ForegroundColor Cyan
        }
        
        if ($behind -gt 0) {
            Write-Host "⚠ Remote has $behind commit(s) you don't have" -ForegroundColor Yellow
            Write-Host "   Run: git merge origin/main --no-ff" -ForegroundColor Cyan
        }
    }
} else {
    Write-Host "⚠ Could not access remote" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Check if dist folder exists and is built
Write-Host "[3] Build Status" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
if (Test-Path "dist") {
    $distFiles = Get-ChildItem -Path "dist" -Recurse -File | Measure-Object
    Write-Host "✓ dist folder exists with $($distFiles.Count) files" -ForegroundColor Green
    
    $distIndex = Test-Path "dist\index.html"
    if ($distIndex) {
        Write-Host "✓ dist/index.html exists" -ForegroundColor Green
    } else {
        Write-Host "⚠ dist/index.html missing - need to build" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ dist folder does not exist - need to build" -ForegroundColor Yellow
    Write-Host "   Run: npm run build" -ForegroundColor Cyan
}
Write-Host ""

# Step 4: Firebase Deployment Status
Write-Host "[4] Firebase Deployment" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
if (Test-Path ".firebaserc") {
    Write-Host "✓ Firebase project configured" -ForegroundColor Green
    $firebaseConfig = Get-Content ".firebaserc" | ConvertFrom-Json
    $projectId = $firebaseConfig.projects.default
    Write-Host "   Project: $projectId" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠ Firebase hosting needs deployment:" -ForegroundColor Yellow
    Write-Host "   1. Build: npm run build" -ForegroundColor White
    Write-Host "   2. Deploy: firebase deploy --only hosting" -ForegroundColor White
} else {
    Write-Host "⚠ Firebase not configured" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Summary
Write-Host "[5] DEPLOYMENT SUMMARY" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""

$gitDeployed = ($localCommit -eq $remoteCommit) -and (-not $uncommitted)
$buildReady = Test-Path "dist\index.html"

if ($gitDeployed -and $buildReady) {
    Write-Host "✅ STATUS: Ready to deploy to Firebase!" -ForegroundColor Green
    Write-Host ""
    Write-Host "NEXT STEP:" -ForegroundColor Cyan
    Write-Host "   firebase deploy --only hosting" -ForegroundColor White
} elseif ($gitDeployed) {
    Write-Host "✅ Git: Deployed to GitHub" -ForegroundColor Green
    Write-Host "⚠ Build: Need to build first" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "NEXT STEPS:" -ForegroundColor Cyan
    Write-Host "   1. npm run build" -ForegroundColor White
    Write-Host "   2. firebase deploy --only hosting" -ForegroundColor White
} else {
    Write-Host "⚠ Git: Not fully deployed" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "NEXT STEPS:" -ForegroundColor Cyan
    Write-Host "   1. Commit changes: git add -A && git commit -m 'Your message'" -ForegroundColor White
    Write-Host "   2. Push to GitHub: git push origin main" -ForegroundColor White
    Write-Host "   3. Build: npm run build" -ForegroundColor White
    Write-Host "   4. Deploy: firebase deploy --only hosting" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

