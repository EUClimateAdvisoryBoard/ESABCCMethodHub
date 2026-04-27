@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PS1_PATH=%SCRIPT_DIR%embed-in-file.ps1"
set "BAS_PATH=%SCRIPT_DIR%ESABCC_RefManager.bas"

if not exist "%PS1_PATH%" goto :NotExtracted
if not exist "%BAS_PATH%" goto :NotExtracted

REM If the user dragged a file onto this .cmd, %~1 is the file path.
REM Otherwise the .ps1 shows a file picker.
if "%~1"=="" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1_PATH%"
) else (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1_PATH%" "%~1"
)
echo.
pause
exit /b %ERRORLEVEL%

:NotExtracted
echo.
echo ============================================================
echo  ESABCC Reference Manager - installer files missing
echo ============================================================
echo.
echo  Run this from the extracted folder (not from inside the ZIP).
echo  Right-click esabcc-word-setup.zip, choose "Extract All...",
echo  then double-click embed-in-file.cmd from the extracted folder.
echo.
pause
exit /b 1
