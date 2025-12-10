@echo off
echo ========================================
echo   PRESERVING ALL CHANGES
echo ========================================
echo.

echo [1] Creating backup branch...
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set timestamp=%datetime:~0,8%-%datetime:~8,6%
git checkout -b backup-%timestamp%
git add -A
git commit -m "BACKUP: All changes preserved - %timestamp%"
git checkout main
echo Backup created: backup-%timestamp%
echo.

echo [2] Committing all current changes...
git add -A
git commit -m "Preserve all current work - Payment fixes, spacing, auth, etc"
echo.

echo [3] Fetching remote changes...
git fetch origin
echo.

echo [4] Comparing local vs remote...
git log HEAD..origin/main --oneline
git log origin/main..HEAD --oneline
echo.

echo [5] Recent commits:
git log --oneline -10
echo.

echo ========================================
echo   PRESERVATION COMPLETE
echo ========================================
echo.
echo Next: Run 'git merge origin/main --no-ff' if remote has changes
echo Then: Run 'git push origin main' to push your changes
echo.

pause

