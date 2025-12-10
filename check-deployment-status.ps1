# Deployment Status Check Script
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT STATUS CHECK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Current branch and status
Write-Host "[1] Current Repository Status" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
$currentBranch = git branch --show-current
Write-Host "Current Branch: $currentBranch" -ForegroundColor White
$status = git status --porcelain
if ($status) {
    Write-Host "⚠ UNCOMMITTED CHANGES FOUND:" -ForegroundColor Red
    git status
} else {
    Write-Host "✓ No uncommitted changes" -ForegroundColor Green
}
Write-Host ""

# Step 2: Fetch latest from remote
Write-Host "[2] Fetching Latest from Remote" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
git fetch origin --all --prune 2>&1 | Out-Null
Write-Host "✓ Remote fetched" -ForegroundColor Green
Write-Host ""

# Step 3: Compare local vs remote
Write-Host "[3] Local vs Remote Comparison" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
try {
    $localCommit = git rev-parse HEAD
    $remoteCommit = git rev-parse origin/main 2>$null
    
    if ($remoteCommit) {
        if ($localCommit -eq $remoteCommit) {
            Write-Host "✓ Local and remote are in sync" -ForegroundColor Green
            Write-Host "✓ Everything is deployed!" -ForegroundColor Green
        } else {
            $aheadBehind = (git rev-list --left-right --count origin/main...HEAD).Split("`t")
            $behind = [int]$aheadBehind[0]
            $ahead = [int]$aheadBehind[1]
            
            Write-Host "Local is $ahead commits ahead, $behind commits behind remote" -ForegroundColor Yellow
            Write-Host ""
            
            if ($ahead -gt 0) {
                Write-Host "⚠ YOU HAVE LOCAL COMMITS NOT DEPLOYED:" -ForegroundColor Red
                Write-Host "These commits need to be pushed:" -ForegroundColor Yellow
                git log origin/main..HEAD --oneline
                Write-Host ""
                Write-Host "To deploy, run: git push origin main" -ForegroundColor Cyan
            }
            
            if ($behind -gt 0) {
                Write-Host "⚠ REMOTE HAS COMMITS YOU DON'T HAVE:" -ForegroundColor Yellow
                Write-Host "These commits are in remote but not local:" -ForegroundColor Yellow
                git log HEAD..origin/main --oneline
                Write-Host ""
                Write-Host "To get them, run: git merge origin/main --no-ff" -ForegroundColor Cyan
            }
        }
    } else {
        Write-Host "⚠ Could not access remote branch" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not compare with remote" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Recent commits
Write-Host "[4] Recent Commits (Last 10)" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
git log --oneline --decorate -10
Write-Host ""

# Step 5: Summary
Write-Host "[5] Deployment Summary" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
try {
    $localCommit = git rev-parse HEAD
    $remoteCommit = git rev-parse origin/main 2>$null
    
    if ($remoteCommit -and $localCommit -eq $remoteCommit) {
        Write-Host ""
        Write-Host "✅ DEPLOYMENT STATUS: COMPLETE" -ForegroundColor Green
        Write-Host "   All changes are deployed to remote!" -ForegroundColor Green
    } else {
        $aheadBehind = (git rev-list --left-right --count origin/main...HEAD).Split("`t")
        $ahead = [int]$aheadBehind[1]
        
        if ($ahead -gt 0) {
            Write-Host ""
            Write-Host "⚠ DEPLOYMENT STATUS: PENDING" -ForegroundColor Red
            Write-Host "   You have $ahead commit(s) that need to be pushed" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "NEXT STEPS:" -ForegroundColor Cyan
            Write-Host "1. Merge remote changes if any: git merge origin/main --no-ff" -ForegroundColor White
            Write-Host "2. Push your changes: git push origin main" -ForegroundColor White
            Write-Host "3. Deploy to Firebase: firebase deploy" -ForegroundColor White
        } else {
            Write-Host ""
            Write-Host "⚠ DEPLOYMENT STATUS: NEEDS UPDATE" -ForegroundColor Yellow
            Write-Host "   Remote has changes you need to pull first" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "⚠ Could not determine deployment status" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

