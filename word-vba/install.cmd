@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PS1_PATH=%SCRIPT_DIR%install.ps1"
set "BAS_PATH=%SCRIPT_DIR%ESABCC_RefManager.bas"

if not exist "%PS1_PATH%" goto :NotExtracted
if not exist "%BAS_PATH%" goto :NotExtracted

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1_PATH%"
echo.
pause
exit /b %ERRORLEVEL%

:NotExtracted
echo.
echo ============================================================
echo  ESABCC Reference Manager - installer files missing
echo ============================================================
echo.
echo  It looks like you double-clicked install.cmd from INSIDE the
echo  downloaded ZIP file without extracting it first. Windows only
echo  unpacks the file you clicked, so install.ps1 and the macro
echo  file are not in the same folder - the installer cannot run.
echo.
echo  HOW TO FIX:
echo    1. Close this window.
echo    2. Open your Downloads folder.
echo    3. Right-click "esabcc-word-setup.zip".
echo    4. Choose "Extract All..." and pick a folder (e.g. Desktop).
echo    5. Open the EXTRACTED folder.
echo    6. Double-click install.cmd from inside that folder.
echo.
echo  Looking in: %SCRIPT_DIR%
echo  Missing:    install.ps1 and/or ESABCC_RefManager.bas
echo.
pause
exit /b 1
