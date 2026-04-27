@echo off
setlocal
echo.
echo ESABCC - Push to MethodHub (Outlook) - Uninstaller
echo ---------------------------------------------------
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1"

echo.
pause
endlocal
