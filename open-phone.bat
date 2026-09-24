@echo off
chcp 65001 >nul
title Wird - Install on Phone
cd /d "%~dp0"

echo ============================================
echo   Wird - open / install on your phone
echo ============================================
echo.

if not exist "node_modules" (
  echo [1/5] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo Failed to install dependencies.
    pause
    exit /b 1
  )
)

echo [2/5] Building app...
call npm run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo [3/5] Detecting PC IP address...
set "LAN_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  for /f "tokens=* delims= " %%b in ("%%a") do (
    if not defined LAN_IP set "LAN_IP=%%b"
  )
)

if not defined LAN_IP (
  echo Could not detect IP. Using 127.0.0.1 only.
  set "LAN_IP=127.0.0.1"
)

set "APP_URL=http://%LAN_IP%:4173/"

echo.
echo ==================================================
echo   On your PHONE (same Wi-Fi as this PC):
echo.
echo     1. Open Chrome
echo     2. Go to:
echo.
echo        %APP_URL%
echo.
echo     3. Menu (three dots) -> "Add to Home screen"
echo        or "Install app"
echo ==================================================
echo.

netsh advfirewall firewall add rule name="Wird Phone Install 4173" dir=in action=allow protocol=TCP localport=4173 >nul 2>&1

echo [4/5] Starting server on all network interfaces...
start "Wird server - keep open" cmd /k npm run preview -- --host 0.0.0.0 --port 4173 --open none

timeout /t 3 /nobreak >nul

echo [5/5] Opening QR page + app in browser...
start "" "http://127.0.0.1:4173/qr.html?url=%APP_URL%"
start "" "%APP_URL%"

echo.
echo Server is running in another window. Keep it open.
echo.
echo If the phone cannot connect:
echo   - Phone and PC must be on the same Wi-Fi
echo   - Disable VPN on the phone
echo   - Allow the firewall prompt if Windows asks
echo.
echo Press any key to stop everything...
pause >nul
taskkill /fi "WINDOWTITLE eq Wird server*" /f >nul 2>&1
