@echo off
chcp 65001 >nul
title Wird - Build
cd /d "%~dp0"

echo Building...
call npm run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo.
echo Done. dist\ is ready.
explorer "%~dp0dist"
pause
