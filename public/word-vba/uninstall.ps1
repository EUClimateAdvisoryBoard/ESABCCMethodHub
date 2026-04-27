# Removes ESABCC_RefManager.dotm from the Word STARTUP folder, and also
# deletes the legacy "ESABCC References" CommandBar from Normal.dotm so
# the Add-ins tab doesn't keep showing stale buttons after uninstall.

$ErrorActionPreference = 'Continue'

$DotmPath = Join-Path $env:APPDATA 'Microsoft\Word\STARTUP\ESABCC_RefManager.dotm'

if (Test-Path $DotmPath) {
    Remove-Item $DotmPath -Force
    Write-Host "Removed: $DotmPath"
} else {
    Write-Host "Template not found at: $DotmPath (already uninstalled?)"
}

# Drop the legacy CommandBar that older installs persisted into Normal.dotm.
$existingWord = Get-Process WINWORD -ErrorAction SilentlyContinue
if ($existingWord) {
    Write-Host "Closing $($existingWord.Count) running Word process(es)..."
    $existingWord | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

$word = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $removed = $false
    try {
        $bar = $word.CommandBars.Item('ESABCC References')
        if ($bar) {
            $bar.Delete()
            $removed = $true
        }
    } catch {}
    if ($removed) {
        Write-Host "Removed legacy 'ESABCC References' toolbar from Normal.dotm."
    } else {
        Write-Host "No legacy toolbar to remove."
    }
    try { $word.NormalTemplate.Saved = $false; $word.NormalTemplate.Save() } catch {}
} catch {
    Write-Warning "Could not launch Word to clean up the CommandBar: $($_.Exception.Message)"
    Write-Warning "Open Word once and the template's AutoExec will remove it automatically."
}
finally {
    if ($word) {
        try { $word.Quit() } catch {}
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    }
}

Write-Host ""
Write-Host "Uninstall complete. Restart Word to drop the ESABCC References tab."
