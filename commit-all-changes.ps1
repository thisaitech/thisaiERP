# Quick script to commit and preserve all current changes
Write-Host "Committing all current changes..." -ForegroundColor Yellow

# Stage all changes
git add -A

# Check what will be committed
$status = git status --short
if ($status) {
    Write-Host "Changes to be committed:" -ForegroundColor Cyan
    git status
    Write-Host ""
    
    # Create commit
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Preserve all changes - $timestamp

This commit preserves all current work including:
- Modified files
- New files  
- All uncommitted changes

Timestamp: $timestamp"
    
    Write-Host ""
    Write-Host "All changes committed successfully!" -ForegroundColor Green
    Write-Host "Commit hash: $(git rev-parse HEAD)" -ForegroundColor Cyan
} else {
    Write-Host "No changes to commit" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Current branch: $(git branch --show-current)" -ForegroundColor Cyan
Write-Host "Latest commit: $(git log -1 --oneline)" -ForegroundColor Cyan

