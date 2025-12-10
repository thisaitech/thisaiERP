# Pull All Changes Script
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PULLING ALL CHANGES FROM REMOTE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check current status
Write-Host "[1] Current Repository Status" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
$currentBranch = git branch --show-current
Write-Host "Current Branch: $currentBranch" -ForegroundColor White

$status = git status --porcelain
if ($status) {
    Write-Host "⚠ UNCOMMITTED CHANGES FOUND:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    Write-Host "Stashing uncommitted changes..." -ForegroundColor Yellow
    git stash push -m "Auto-stash before pull - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
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

# Step 3: Check local vs remote
Write-Host "[3] Local vs Remote Comparison" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
try {
    $localCommit = git rev-parse HEAD
    $remoteCommit = git rev-parse origin/main 2>$null
    
    if ($remoteCommit) {
        if ($localCommit -eq $remoteCommit) {
            Write-Host "✅ Local and remote are already in sync!" -ForegroundColor Green
            Write-Host "   No changes to pull." -ForegroundColor Green
        } else {
            $aheadBehind = (git rev-list --left-right --count origin/main...HEAD).Split("`t")
            $behind = [int]$aheadBehind[0]
            $ahead = [int]$aheadBehind[1]
            
            Write-Host "Local is $ahead commits ahead, $behind commits behind remote" -ForegroundColor Yellow
            Write-Host ""
            
            if ($behind -gt 0) {
                Write-Host "⚠ REMOTE HAS $behind COMMIT(S) YOU DON'T HAVE:" -ForegroundColor Yellow
                Write-Host "These commits are in remote but not local:" -ForegroundColor Yellow
                git log HEAD..origin/main --oneline
                Write-Host ""
                Write-Host "Pulling changes..." -ForegroundColor Cyan
                git pull origin main --no-edit
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ Successfully pulled $behind commit(s) from remote!" -ForegroundColor Green
                } else {
                    Write-Host "⚠ Pull completed with warnings. Check for conflicts." -ForegroundColor Yellow
                }
            }
            
            if ($ahead -gt 0) {
                Write-Host ""
                Write-Host "⚠ YOU HAVE $ahead LOCAL COMMIT(S) NOT IN REMOTE:" -ForegroundColor Yellow
                Write-Host "These commits are local but not in remote:" -ForegroundColor Yellow
                git log origin/main..HEAD --oneline
                Write-Host ""
                Write-Host "Consider pushing: git push origin main" -ForegroundColor Cyan
            }
        }
    } else {
        Write-Host "⚠ Could not access remote branch" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Error comparing with remote: $_" -ForegroundColor Red
}
Write-Host ""

# Step 4: Restore stashed changes if any
if ($status) {
    Write-Host "[4] Restoring Stashed Changes" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray
    git stash pop 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Stashed changes restored" -ForegroundColor Green
    } else {
        Write-Host "⚠ Could not restore stashed changes (may have conflicts)" -ForegroundColor Yellow
        Write-Host "   Check with: git stash list" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Step 5: Final status
Write-Host "[5] Final Status" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
$finalStatus = git status --porcelain
if ($finalStatus) {
    Write-Host "Current uncommitted changes:" -ForegroundColor White
    git status --short
} else {
    Write-Host "✓ Working directory is clean" -ForegroundColor Green
}

$finalLocalCommit = git rev-parse HEAD
$finalRemoteCommit = git rev-parse origin/main 2>$null
if ($finalRemoteCommit -and $finalLocalCommit -eq $finalRemoteCommit) {
    Write-Host "✅ Local and remote are in sync!" -ForegroundColor Green
} else {
    Write-Host "⚠ Local and remote may still differ" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Recent commits:" -ForegroundColor White
git log --oneline --decorate -5

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PULL COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

