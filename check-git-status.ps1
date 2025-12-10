# Git Status Check Script
Write-Host "=== Git Repository Status ===" -ForegroundColor Cyan
Write-Host ""

# Current branch
Write-Host "Current Branch:" -ForegroundColor Yellow
git branch --show-current
Write-Host ""

# Git status
Write-Host "=== Git Status ===" -ForegroundColor Yellow
git status
Write-Host ""

# Recent commits
Write-Host "=== Recent Commits (Last 20) ===" -ForegroundColor Yellow
git log --oneline --all --graph --decorate -20
Write-Host ""

# Check remote status
Write-Host "=== Remote Status ===" -ForegroundColor Yellow
git remote -v
Write-Host ""

# Check if local is ahead/behind remote
Write-Host "=== Local vs Remote ===" -ForegroundColor Yellow
git fetch origin
$localCommit = git rev-parse HEAD
$remoteCommit = git rev-parse origin/main
if ($localCommit -eq $remoteCommit) {
    Write-Host "Local and remote are in sync" -ForegroundColor Green
} else {
    $localAhead = git rev-list --left-right --count origin/main...HEAD
    Write-Host "Local commits ahead/behind: $localAhead" -ForegroundColor Yellow
}
Write-Host ""

# List modified files
Write-Host "=== Modified Files ===" -ForegroundColor Yellow
git diff --name-only
Write-Host ""

# List untracked files
Write-Host "=== Untracked Files ===" -ForegroundColor Yellow
git ls-files --others --exclude-standard
Write-Host ""

# Show recent commit details
Write-Host "=== Recent Commit Details ===" -ForegroundColor Yellow
git log --pretty=format:"%h - %an, %ad : %s" --date=short -10
Write-Host ""

