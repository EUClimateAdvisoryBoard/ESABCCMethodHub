@echo off
setlocal
REM One-click installer for ESABCC "Push to MethodHub" Outlook macro.
REM Double-click this file. It will run the PowerShell installer with
REM ExecutionPolicy Bypass (per-process; no system policy is changed).

echo.
echo ESABCC - Push to MethodHub (Outlook) - Installer
echo -------------------------------------------------
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
set RC=%ERRORLEVEL%

echo.
if %RC% NEQ 0 (
    echo Install failed with exit code %RC%. See messages above.
) else (
    echo Install complete.
)
echo.
pause
endlocal
