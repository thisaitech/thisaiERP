# Git Changes Preservation - Quick Reference

## The Problem
When you deploy, changes get lost because merges aren't preserving all work.

## The Solution
Always follow this process:

### Before Any Merge/Deploy:
1. **BACKUP** → Create backup branch
2. **COMMIT** → Commit all your work
3. **FETCH** → Get remote changes
4. **MERGE** → Merge with --no-ff
5. **RESOLVE** → Fix conflicts if any
6. **TEST** → Verify everything works
7. **PUSH** → Push to remote

## Quick Commands

```powershell
# 1. Backup
git checkout -b backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')
git add -A && git commit -m "Backup"
git checkout main

# 2. Commit your work
git add -A && git commit -m "My changes"

# 3. Fetch & Merge
git fetch origin
git merge origin/main --no-ff

# 4. Push
git push origin main
```

## Or Use the Script

```powershell
powershell -ExecutionPolicy Bypass -File ensure-all-changes-preserved.ps1
```

This does everything automatically!

## Why Changes Get Lost

- Merging without `--no-ff` loses history
- Force pushing overwrites remote
- Not fetching before merging
- Conflicts resolved incorrectly
- Not committing before merge

## Prevention

✅ Always backup first
✅ Always fetch before merge  
✅ Always use `--no-ff`
✅ Always test after merge
✅ Never force push to main
✅ Communicate with team

## Recovery

If changes are lost:
```powershell
git reflog  # Find lost commits
git checkout <commit-hash>  # Restore
git checkout -b recovery  # Create branch
# Fix and merge back
```

