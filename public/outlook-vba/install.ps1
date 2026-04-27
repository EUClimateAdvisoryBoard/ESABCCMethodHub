# ESABCC Outlook Feed Sync - installer (per-user, no admin).
#
# Installs a Windows Scheduled Task that runs OutlookFeedSync.ps1 once
# an hour while you're logged in. The task reads your Outlook inbox via
# COM (no VBA, no Trust Center fiddling) and POSTs matching emails to
# the News Feed webhook.
#
# The task is routed through a VBScript wrapper (run-hidden.vbs) so it
# runs completely invisibly - no PowerShell console window ever flashes.
# It also drops a "Push Outlook Feed Now" shortcut on your Desktop so
# you can flush matches between hourly ticks with one click.
#
# Usage:
#   Double-click install.cmd, or from PowerShell:
#     powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = 'Stop'

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Definition
$SyncSrc     = Join-Path $ScriptDir 'OutlookFeedSync.ps1'
$HiddenVbSrc = Join-Path $ScriptDir 'run-hidden.vbs'

if (-not (Test-Path $SyncSrc)) {
    throw "Cannot find OutlookFeedSync.ps1 next to this script ($SyncSrc)."
}
if (-not (Test-Path $HiddenVbSrc)) {
    throw "Cannot find run-hidden.vbs next to this script ($HiddenVbSrc)."
}

# Sanity check: classic desktop Outlook must be installed for this user.
# We don't launch Outlook - we just need to know that Outlook.Application
# will be resolvable when the scheduled task actually runs.
$outlookVer = $null
foreach ($v in @('16.0','15.0','14.0')) {
    if (Test-Path "HKCU:\Software\Microsoft\Office\$v\Outlook") {
        $outlookVer = $v
        break
    }
}
if (-not $outlookVer) {
    throw "Could not detect Outlook under HKCU\Software\Microsoft\Office. Is the classic desktop Outlook installed for this user? (The 'new Outlook' and outlook.com in the browser cannot be automated this way.)"
}
Write-Host "Detected Outlook version: $outlookVer"

# Copy the sync script + hidden launcher into a stable per-user location.
$InstallDir = Join-Path $env:LOCALAPPDATA 'ESABCC'
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}
$SyncDst     = Join-Path $InstallDir 'OutlookFeedSync.ps1'
$HiddenVbDst = Join-Path $InstallDir 'run-hidden.vbs'
Copy-Item -Path $SyncSrc     -Destination $SyncDst     -Force
Copy-Item -Path $HiddenVbSrc -Destination $HiddenVbDst -Force
Write-Host "Installed sync script:    $SyncDst"
Write-Host "Installed hidden wrapper: $HiddenVbDst"

# (Re)register the scheduled task. LogonType Interactive + RunLevel Limited
# = runs as the current user, no admin, no stored credentials.
# We invoke wscript.exe + run-hidden.vbs instead of powershell.exe directly
# so no console window is ever created (not even the brief flash that
# -WindowStyle Hidden lets through).
$TaskName = 'ESABCC Outlook Feed Sync'

$action = New-ScheduledTaskAction `
    -Execute 'wscript.exe' `
    -Argument "`"$HiddenVbDst`" `"$SyncDst`""

# Trigger: fire a minute from now, then repeat every 60 minutes for a
# year (renewed on re-install). Task Scheduler silently no-ops if
# Outlook isn't running (the script exits early in that case).
$trigger = New-ScheduledTaskTrigger `
    -Once -At ((Get-Date).AddMinutes(1)) `
    -RepetitionInterval (New-TimeSpan -Minutes 60) `
    -RepetitionDuration (New-TimeSpan -Days 365)

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -Hidden `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Limited

# Remove any previous version before registering.
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Removing previous task..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask `
    -TaskName $TaskName `
    -Description 'Pushes matching Outlook emails to the ESABCC MethodHub News Feed once per hour. Runs invisibly via a VBS launcher - no console window flash.' `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Force | Out-Null

Write-Host "Registered scheduled task: '$TaskName' (runs hourly while Outlook is open, no window)."

# Desktop shortcut: easy manual trigger between hourly runs. Clicking it
# runs the same hidden VBS wrapper directly, so there's no console
# window and no waiting for the next tick.
try {
    $desktop = [Environment]::GetFolderPath('Desktop')
    $shortcutPath = Join-Path $desktop 'Push Outlook Feed Now.lnk'
    $wsh = New-Object -ComObject WScript.Shell
    $sc = $wsh.CreateShortcut($shortcutPath)
    $sc.TargetPath       = 'wscript.exe'
    $sc.Arguments        = "`"$HiddenVbDst`" `"$SyncDst`""
    $sc.WorkingDirectory = $InstallDir
    $sc.WindowStyle      = 7    # Minimized - wscript itself still shows no UI
    $sc.IconLocation     = 'imageres.dll,76'
    $sc.Description      = 'Flush any pending Outlook Feed items to the News Feed immediately.'
    $sc.Save()
    Write-Host "Desktop shortcut:         $shortcutPath"
} catch {
    Write-Host "Note: could not create desktop shortcut ($($_.Exception.Message)). You can still trigger manually via Task Scheduler."
}

# Fire the first run immediately so the user sees something happen.
try {
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "Kicked off a first sync run."
} catch {
    Write-Host "Note: could not kick off a first run automatically - it will start on the next hourly tick."
}

Write-Host ""
Write-Host "====================================================================="
Write-Host " Install complete."
Write-Host "====================================================================="
Write-Host ""
Write-Host " How to push a mail to the News Feed:"
Write-Host "   1. In Outlook, right-click Inbox > New Folder > call it 'Feed'."
Write-Host "   2. Drag any mail into that 'Feed' folder."
Write-Host "   3. It appears in the News Feed within the next hour, or"
Write-Host "      double-click 'Push Outlook Feed Now' on your Desktop to"
Write-Host "      flush immediately."
Write-Host ""
Write-Host " Optional one-click button in Outlook (Quick Step):"
Write-Host "   1. Outlook Home tab > Quick Steps pane > Create New."
Write-Host "   2. Name it 'Push to MethodHub'."
Write-Host "   3. Choose action 'Move to folder' > pick 'Feed'."
Write-Host "   4. Expand 'Options' > assign Shortcut key 'Ctrl+Shift+1'."
Write-Host "   5. Finish. Now select any email, press Ctrl+Shift+1, done."
Write-Host ""
Write-Host " Log file: $InstallDir\outlook-sync.log"
Write-Host ""
