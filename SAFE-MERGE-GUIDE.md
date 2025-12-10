# Safe Merge Guide - Preserving All Changes

## Problem
When deploying changes, sometimes other changes (yours or your colleague's) get lost because merges aren't being done properly.

## Solution: Safe Merge Process

### Step 1: Create a Backup (ALWAYS DO THIS FIRST)
```powershell
# Create a backup branch with timestamp
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
git checkout -b backup-before-merge-$timestamp
git add -A
git commit -m "Backup: All current changes before merge"
git checkout main
```

### Step 2: Fetch Latest Changes
```powershell
git fetch origin
```

### Step 3: Check What's Different
```powershell
# See your local commits not in remote
git log origin/main..HEAD --oneline

# See remote commits not in local
git log HEAD..origin/main --oneline
```

### Step 4: Merge (Preserve All Changes)
```powershell
# Merge with --no-ff to preserve history
git merge origin/main --no-ff -m "Merge remote changes"
```

### Step 5: Resolve Conflicts (if any)
```powershell
# Check for conflicts
git status

# If conflicts exist, resolve them manually, then:
git add <resolved-files>
git commit -m "Resolve merge conflicts"
```

### Step 6: Push Your Changes
```powershell
git push origin main
```

## Quick Script
Run the provided `backup-and-merge.ps1` script:
```powershell
powershell -ExecutionPolicy Bypass -File backup-and-merge.ps1
```

## Important Notes

1. **ALWAYS create a backup branch first** - This ensures you can recover if something goes wrong
2. **Use `--no-ff` when merging** - This preserves the merge history and makes it clear when merges happened
3. **Never force push to main** - Use `git push --force-with-lease` only if absolutely necessary and coordinate with your team
4. **Check status before pushing** - Always run `git status` and `git log` before pushing

## Recovery
If something goes wrong:
```powershell
# Find your backup branch
git branch | grep backup

# Restore from backup
git checkout backup-before-merge-YYYYMMDD-HHMMSS
git checkout -b recovery-branch
# Make your fixes, then merge back to main
```

## Best Practices

1. **Pull before you start working**: `git pull origin main`
2. **Commit frequently**: Small, logical commits are easier to merge
3. **Communicate with your team**: Let them know when you're deploying
4. **Test after merge**: Always test after merging to ensure nothing broke
5. **Keep backup branches for a few days**: Don't delete backup branches immediately

