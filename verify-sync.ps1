# Verify Git Sync Status
Write-Host "`n=== GIT SYNC VERIFICATION ===" -ForegroundColor Cyan
Write-Host ""

# Get current branch
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "Current Branch: $branch" -ForegroundColor White

# Fetch latest
Write-Host "`nFetching from remote..." -ForegroundColor Yellow
git fetch origin 2>&1 | Out-Null

# Get commit hashes
$localCommit = git rev-parse HEAD
$remoteCommit = git rev-parse origin/$branch 2>$null

Write-Host "Local Commit:  $localCommit" -ForegroundColor White
Write-Host "Remote Commit: $remoteCommit" -ForegroundColor White
Write-Host ""

if ($localCommit -eq $remoteCommit) {
    Write-Host "✅ LOCAL AND REMOTE ARE IN SYNC!" -ForegroundColor Green
    Write-Host "   No changes to pull." -ForegroundColor Green
} else {
    Write-Host "⚠ LOCAL AND REMOTE DIFFER" -ForegroundColor Yellow
    
    # Check commits behind
    $behind = (git rev-list --count HEAD..origin/$branch 2>$null)
    if ($behind -gt 0) {
        Write-Host "`nYou are $behind commit(s) behind remote" -ForegroundColor Yellow
        Write-Host "Pulling changes..." -ForegroundColor Cyan
        git pull origin $branch --no-edit
        Write-Host "✅ Pull complete!" -ForegroundColor Green
    }
    
    # Check commits ahead
    $ahead = (git rev-list --count origin/$branch..HEAD 2>$null)
    if ($ahead -gt 0) {
        Write-Host "`nYou are $ahead commit(s) ahead of remote" -ForegroundColor Yellow
        Write-Host "Consider pushing: git push origin $branch" -ForegroundColor Cyan
    }
}

Write-Host "`n=== RECENT COMMITS ===" -ForegroundColor Cyan
git log --oneline --graph --decorate -10

Write-Host "`n=== STATUS ===" -ForegroundColor Cyan
git status --short

Write-Host ""

