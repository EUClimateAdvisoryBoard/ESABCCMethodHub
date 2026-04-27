@echo off
title ESABCC Reference Manager Bridge
echo Starting ESABCC Reference Manager Bridge Service...
echo.

set PATH=%~dp0node;%PATH%
cd /d "%~dp0"

if not exist "node_modules" (
  echo Installing dependencies...
  node\node.exe node\npm install --production
  echo.
)

echo Starting bridge on http://127.0.0.1:8585
echo Press Ctrl+C to stop.
echo.

node\node.exe dist\server.js

pause
