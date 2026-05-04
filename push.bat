@echo off
setlocal
echo ========================================
echo       Git One-Click Push Script
echo ========================================
echo.

:: Navigate to the script's directory
cd /d "%~dp0"

echo [1/3] Adding changes...
git add .

echo.
set /p commit_msg="Enter commit message (Press Enter for 'Auto Update'): "
if "%commit_msg%"=="" set commit_msg=Auto Update

echo.
echo [2/3] Committing changes...
git commit -m "%commit_msg%"

echo.
echo [3/3] Pushing to remote (origin/main)...
git push origin main

echo.
echo ========================================
echo       Process Completed Successfully!
echo ========================================
pause
