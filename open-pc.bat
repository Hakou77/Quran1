@echo off
chcp 65001 >nul
title Wird - Open on PC
cd /d "%~dp0"

if not exist "node_modules" (
  echo [1/3] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo Failed to install dependencies.
    pause
    exit /b 1
  )
)

if not exist "dist\index.html" (
  echo [2/3] Building app...
  call npm run build
  if errorlevel 1 (
    echo.
    echo Build failed.
    pause
    exit /b 1
  )
) else (
  echo [2/3] Build found.
)

echo [3/3] Opening Wird on this PC...
start "" "http://127.0.0.1:4173"
call npm run preview -- --host 127.0.0.1 --port 4173 --open none
pause
