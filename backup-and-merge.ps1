# Comprehensive Backup and Merge Script
# This script ensures all changes are preserved

Write-Host "=== Starting Backup and Merge Process ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create a backup branch with current state
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupBranch = "backup-before-merge-$timestamp"
Write-Host "Step 1: Creating backup branch: $backupBranch" -ForegroundColor Yellow
git checkout -b $backupBranch
git add -A
git commit -m "Backup: All current changes before merge - $timestamp"
Write-Host "Backup branch created successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Return to main branch
Write-Host "Step 2: Returning to main branch" -ForegroundColor Yellow
git checkout main
Write-Host ""

# Step 3: Fetch latest from remote
Write-Host "Step 3: Fetching latest changes from remote" -ForegroundColor Yellow
git fetch origin
Write-Host ""

# Step 4: Check what's different
Write-Host "Step 4: Checking differences between local and remote" -ForegroundColor Yellow
$localCommits = git log origin/main..HEAD --oneline
$remoteCommits = git log HEAD..origin/main --oneline

if ($localCommits) {
    Write-Host "Local commits not in remote:" -ForegroundColor Yellow
    $localCommits
    Write-Host ""
}

if ($remoteCommits) {
    Write-Host "Remote commits not in local:" -ForegroundColor Yellow
    $remoteCommits
    Write-Host ""
}

# Step 5: Merge remote changes (no fast-forward to preserve history)
Write-Host "Step 5: Merging remote changes" -ForegroundColor Yellow
git merge origin/main --no-ff -m "Merge remote changes from origin/main - $timestamp"
Write-Host ""

# Step 6: If there are conflicts, list them
Write-Host "Step 6: Checking for merge conflicts" -ForegroundColor Yellow
$conflicts = git diff --name-only --diff-filter=U
if ($conflicts) {
    Write-Host "Merge conflicts detected in:" -ForegroundColor Red
    $conflicts
    Write-Host ""
    Write-Host "Please resolve conflicts manually, then run:" -ForegroundColor Yellow
    Write-Host "  git add <resolved-files>" -ForegroundColor Yellow
    Write-Host "  git commit -m 'Resolve merge conflicts'" -ForegroundColor Yellow
} else {
    Write-Host "No merge conflicts detected" -ForegroundColor Green
}
Write-Host ""

# Step 7: Show final status
Write-Host "Step 7: Final status" -ForegroundColor Yellow
git status
Write-Host ""

# Step 8: List all branches including backup
Write-Host "Step 8: All branches (including backup)" -ForegroundColor Yellow
git branch -a
Write-Host ""

Write-Host "=== Process Complete ===" -ForegroundColor Cyan
Write-Host "Backup branch: $backupBranch" -ForegroundColor Green
Write-Host "If anything goes wrong, you can restore from: git checkout $backupBranch" -ForegroundColor Yellow

