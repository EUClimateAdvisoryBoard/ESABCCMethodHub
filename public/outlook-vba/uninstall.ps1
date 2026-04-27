# ESABCC Outlook Feed Sync - uninstaller (per-user, no admin).
#
# Removes the scheduled task and deletes the installed sync script + log.
# Does NOT touch your Outlook inbox, the "Feed" folder, or the "Pushed to
# MethodHub" category on items that were previously pushed.

$ErrorActionPreference = 'Stop'

$TaskName = 'ESABCC Outlook Feed Sync'
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Removing scheduled task '$TaskName'..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
} else {
    Write-Host "Scheduled task not found - already uninstalled."
}

$InstallDir = Join-Path $env:LOCALAPPDATA 'ESABCC'
if (Test-Path $InstallDir) {
    Write-Host "Removing $InstallDir..."
    Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
}

# Remove the desktop shortcut if the installer placed one.
try {
    $desktop = [Environment]::GetFolderPath('Desktop')
    $shortcutPath = Join-Path $desktop 'Push Outlook Feed Now.lnk'
    if (Test-Path $shortcutPath) {
        Remove-Item -Path $shortcutPath -Force -ErrorAction SilentlyContinue
        Write-Host "Removed desktop shortcut: $shortcutPath"
    }
} catch {}

Write-Host ""
Write-Host "Uninstall complete."
Write-Host ""
Write-Host "Clean-up you can do in Outlook if you want (optional):"
Write-Host "  - Delete the 'Feed' subfolder under Inbox."
Write-Host "  - Remove the 'Pushed to MethodHub' category via"
Write-Host "    Home > Categorize > All Categories."
Write-Host "  - Delete your 'Push to MethodHub' Quick Step if you added one."
