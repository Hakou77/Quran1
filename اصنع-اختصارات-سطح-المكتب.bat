@echo off
chcp 65001 >nul
title Wird - Desktop shortcuts
cd /d "%~dp0"

echo Creating shortcuts on Desktop...

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0make-shortcuts.ps1"
if errorlevel 1 (
  echo Failed to create shortcuts.
  pause
  exit /b 1
)

echo.
echo Done. Look for on your Desktop:
echo   - Wird - Open.lnk
echo   - Wird - Phone Install.lnk
echo.
pause
