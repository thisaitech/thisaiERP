# Comprehensive Script to Preserve ALL Changes
# This ensures nothing is lost during merge/deploy

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PRESERVE ALL CHANGES SCRIPT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check current status
Write-Host "[1/8] Checking current git status..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "Found uncommitted changes:" -ForegroundColor Yellow
    git status
    Write-Host ""
} else {
    Write-Host "No uncommitted changes found" -ForegroundColor Green
    Write-Host ""
}

# Step 2: Create comprehensive backup
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupBranch = "backup-all-changes-$timestamp"
Write-Host "[2/8] Creating comprehensive backup branch: $backupBranch" -ForegroundColor Yellow

# Save current branch
$currentBranch = git branch --show-current
Write-Host "Current branch: $currentBranch" -ForegroundColor Cyan

# Create backup branch from current state
git checkout -b $backupBranch

# Stage ALL changes (including untracked files)
git add -A

# Check if there are changes to commit
$changesToCommit = git diff --cached --quiet
if (-not $changesToCommit) {
    # There are changes, commit them
    git commit -m "Backup: All changes preserved - $timestamp

This backup includes:
- All uncommitted changes
- All modified files
- All new files
- Complete state before any merge operations

Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Branch: $currentBranch"
    Write-Host "Backup committed successfully" -ForegroundColor Green
} else {
    Write-Host "No changes to commit in backup" -ForegroundColor Yellow
}

Write-Host "Backup branch created: $backupBranch" -ForegroundColor Green
Write-Host ""

# Step 3: Return to original branch
Write-Host "[3/8] Returning to original branch: $currentBranch" -ForegroundColor Yellow
git checkout $currentBranch
Write-Host ""

# Step 4: Commit any uncommitted changes on current branch
Write-Host "[4/8] Committing any uncommitted changes..." -ForegroundColor Yellow
$uncommitted = git status --porcelain
if ($uncommitted) {
    git add -A
    git commit -m "Save current work in progress - $timestamp"
    Write-Host "Uncommitted changes committed" -ForegroundColor Green
} else {
    Write-Host "No uncommitted changes to commit" -ForegroundColor Green
}
Write-Host ""

# Step 5: Fetch latest from remote
Write-Host "[5/8] Fetching latest changes from remote..." -ForegroundColor Yellow
git fetch origin --all --prune
Write-Host "Fetch complete" -ForegroundColor Green
Write-Host ""

# Step 6: Compare local vs remote
Write-Host "[6/8] Comparing local vs remote..." -ForegroundColor Yellow
$localCommit = git rev-parse HEAD
$remoteCommit = git rev-parse origin/main 2>$null

if ($remoteCommit) {
    if ($localCommit -eq $remoteCommit) {
        Write-Host "Local and remote are in sync" -ForegroundColor Green
    } else {
        $localAhead = (git rev-list --left-right --count origin/main...HEAD).Split("`t")
        Write-Host "Local commits ahead: $($localAhead[1])" -ForegroundColor Yellow
        Write-Host "Remote commits ahead: $($localAhead[0])" -ForegroundColor Yellow
        
        if ([int]$localAhead[0] -gt 0) {
            Write-Host ""
            Write-Host "Remote has new commits. Here are the commits you're missing:" -ForegroundColor Yellow
            git log HEAD..origin/main --oneline --decorate
            Write-Host ""
        }
        
        if ([int]$localAhead[1] -gt 0) {
            Write-Host ""
            Write-Host "You have local commits not in remote:" -ForegroundColor Yellow
            git log origin/main..HEAD --oneline --decorate
            Write-Host ""
        }
    }
} else {
    Write-Host "Remote branch not found or not accessible" -ForegroundColor Red
}
Write-Host ""

# Step 7: Show recent commit history
Write-Host "[7/8] Recent commit history (last 15 commits):" -ForegroundColor Yellow
git log --oneline --graph --decorate --all -15
Write-Host ""

# Step 8: Summary and recommendations
Write-Host "[8/8] Summary and Recommendations" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "BACKUP CREATED:" -ForegroundColor Green
Write-Host "  Branch: $backupBranch" -ForegroundColor White
Write-Host "  To view: git checkout $backupBranch" -ForegroundColor White
Write-Host "  To restore: git checkout $backupBranch && git checkout -b recovery-branch" -ForegroundColor White
Write-Host ""

if ($remoteCommit -and $localCommit -ne $remoteCommit) {
    Write-Host "NEXT STEPS:" -ForegroundColor Yellow
    Write-Host "  1. Review the commits shown above" -ForegroundColor White
    Write-Host "  2. Merge remote changes: git merge origin/main --no-ff" -ForegroundColor White
    Write-Host "  3. Resolve any conflicts if they occur" -ForegroundColor White
    Write-Host "  4. Test your application" -ForegroundColor White
    Write-Host "  5. Push your changes: git push origin main" -ForegroundColor White
} else {
    Write-Host "STATUS: Everything is in sync!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To push your changes:" -ForegroundColor Yellow
    Write-Host "  git push origin main" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All changes have been preserved!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

