@echo off
setlocal
title Dog ID - local server
cd /d "%~dp0"

set PORT=8788

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Download it from https://nodejs.org and run this again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies, this only happens once...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Preparing local database...
call npx wrangler d1 migrations apply indie-tracker --local <nul >nul
if errorlevel 1 (
  echo Could not set up the local database.
  pause
  exit /b 1
)

echo.
echo   Admin:      http://localhost:%PORT%/admin/
echo   Caretakers: http://localhost:%PORT%/portal/  (sign in with a login link from the admin)
echo   Home:       http://localhost:%PORT%/
echo   Press Ctrl+C to stop the server.
echo.

if not defined NO_BROWSER start "" "http://localhost:%PORT%/admin/"

call npx wrangler dev --var DEV_BYPASS:1 --port %PORT%
pause
