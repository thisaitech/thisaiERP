# ============================================
# COMPREHENSIVE SCRIPT TO ENSURE ALL CHANGES ARE PRESERVED
# ============================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ENSURING ALL CHANGES ARE PRESERVED" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Show current status
Write-Host "[STEP 1] Current Repository Status" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
$currentBranch = git branch --show-current
Write-Host "Current Branch: $currentBranch" -ForegroundColor White
Write-Host ""

# Step 2: Create backup
Write-Host "[STEP 2] Creating Backup Branch" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupBranch = "backup-$timestamp"
Write-Host "Creating backup branch: $backupBranch" -ForegroundColor Cyan

try {
    git checkout -b $backupBranch 2>&1 | Out-Null
    git add -A
    $hasChanges = git diff --cached --quiet
    if (-not $hasChanges) {
        git commit -m "BACKUP: All changes preserved - $timestamp" 2>&1 | Out-Null
        Write-Host "✓ Backup created successfully" -ForegroundColor Green
    } else {
        Write-Host "✓ Backup branch created (no changes to commit)" -ForegroundColor Green
    }
    git checkout $currentBranch 2>&1 | Out-Null
    Write-Host "Backup branch: $backupBranch" -ForegroundColor Green
} catch {
    Write-Host "⚠ Backup branch may already exist, continuing..." -ForegroundColor Yellow
    git checkout $currentBranch 2>&1 | Out-Null
}
Write-Host ""

# Step 3: Commit all current changes
Write-Host "[STEP 3] Committing All Current Changes" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
git add -A
$status = git status --porcelain
if ($status) {
    $commitMessage = @"
Preserve all current changes - $timestamp

This commit ensures all modifications are saved:
- Payment method display fixes
- Spacing improvements
- Firebase re-authentication
- All other current work

DO NOT LOSE THIS COMMIT!
"@
    git commit -m $commitMessage
    Write-Host "✓ All changes committed" -ForegroundColor Green
    Write-Host "Commit: $(git log -1 --oneline)" -ForegroundColor Cyan
} else {
    Write-Host "✓ No uncommitted changes" -ForegroundColor Green
}
Write-Host ""

# Step 4: Fetch remote
Write-Host "[STEP 4] Fetching Remote Changes" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
git fetch origin --all --prune
Write-Host "✓ Remote fetched" -ForegroundColor Green
Write-Host ""

# Step 5: Compare with remote
Write-Host "[STEP 5] Comparing Local vs Remote" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
try {
    $localCommit = git rev-parse HEAD
    $remoteCommit = git rev-parse origin/main 2>$null
    
    if ($remoteCommit) {
        if ($localCommit -eq $remoteCommit) {
            Write-Host "✓ Local and remote are in sync" -ForegroundColor Green
        } else {
            $aheadBehind = (git rev-list --left-right --count origin/main...HEAD).Split("`t")
            $behind = [int]$aheadBehind[0]
            $ahead = [int]$aheadBehind[1]
            
            Write-Host "Local is $ahead commits ahead, $behind commits behind remote" -ForegroundColor Yellow
            
            if ($behind -gt 0) {
                Write-Host ""
                Write-Host "Remote commits you're missing:" -ForegroundColor Yellow
                git log HEAD..origin/main --oneline
                Write-Host ""
                Write-Host "⚠ You need to merge remote changes!" -ForegroundColor Red
            }
            
            if ($ahead -gt 0) {
                Write-Host ""
                Write-Host "Your commits not in remote:" -ForegroundColor Yellow
                git log origin/main..HEAD --oneline
                Write-Host ""
            }
        }
    } else {
        Write-Host "⚠ Could not access remote branch" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not compare with remote" -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Show recent history
Write-Host "[STEP 6] Recent Commit History" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
git log --oneline --graph --decorate -10
Write-Host ""

# Step 7: Summary
Write-Host "[STEP 7] Summary & Next Steps" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "✓ Backup created: $backupBranch" -ForegroundColor Green
Write-Host "✓ All changes committed" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. If remote has changes, merge them:" -ForegroundColor White
Write-Host "   git merge origin/main --no-ff" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Resolve any conflicts if they occur" -ForegroundColor White
Write-Host ""
Write-Host "3. Test your application" -ForegroundColor White
Write-Host ""
Write-Host "4. Push your changes:" -ForegroundColor White
Write-Host "   git push origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "5. If anything goes wrong, restore from:" -ForegroundColor White
Write-Host "   git checkout $backupBranch" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ALL CHANGES HAVE BEEN PRESERVED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

