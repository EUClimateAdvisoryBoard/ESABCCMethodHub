# ESABCC Reference Manager - one-click installer (per-user, no admin rights).
#
# Usage:
#   Double-click install.cmd, or from PowerShell:
#     powershell -ExecutionPolicy Bypass -File install.ps1
#
# What it does:
#   1. Creates %APPDATA%\Microsoft\Word\STARTUP if missing.
#   2. Temporarily enables "Trust access to the VBA project object model"
#      in HKCU (per-user; no admin rights needed).
#   3. Drives Word via COM: imports ESABCC_RefManager.bas into a new doc and
#      saves it as ESABCC_RefManager.dotm in the Word STARTUP folder.
#   4. Injects customUI14.xml into the .dotm so the ribbon tab appears.
#   5. Restores the original AccessVBOM setting.
#
# After install: close and reopen Word. The "ESABCC References" tab loads
# automatically in every document.

$ErrorActionPreference = 'Stop'

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BasPath    = Join-Path $ScriptDir 'ESABCC_RefManager.bas'
$StartupDir = Join-Path $env:APPDATA 'Microsoft\Word\STARTUP'
$DotmPath   = Join-Path $StartupDir 'ESABCC_RefManager.dotm'

if (-not (Test-Path $BasPath)) {
    throw "Cannot find ESABCC_RefManager.bas next to this script ($BasPath)."
}

if (-not (Test-Path $StartupDir)) {
    New-Item -ItemType Directory -Path $StartupDir -Force | Out-Null
}

# Find an installed Word version under HKCU (no admin needed).
$wordVer = $null
foreach ($v in @('16.0','15.0','14.0')) {
    if (Test-Path "HKCU:\Software\Microsoft\Office\$v\Word") {
        $wordVer = $v
        break
    }
}
if (-not $wordVer) {
    throw "Could not detect Word under HKCU\Software\Microsoft\Office. Is Word installed for this user?"
}

$securityKey = "HKCU:\Software\Microsoft\Office\$wordVer\Word\Security"
if (-not (Test-Path $securityKey)) {
    New-Item -Path $securityKey -Force | Out-Null
}
$originalAccessVBOM = (Get-ItemProperty -Path $securityKey -Name AccessVBOM -ErrorAction SilentlyContinue).AccessVBOM
Set-ItemProperty -Path $securityKey -Name AccessVBOM -Value 1 -Type DWord

# Clean up any leftover Word processes from a previous failed run, so a
# hidden/stuck instance can't block the COM handshake below.
$existingWord = Get-Process WINWORD -ErrorAction SilentlyContinue
if ($existingWord) {
    Write-Host "Closing $($existingWord.Count) running Word process(es)..."
    $existingWord | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Remove any existing STARTUP template BEFORE starting Word. Without this,
# the new Word instance auto-loads the old .dotm as a global template,
# GetVBProject() finds THAT project (with its old forms), and our fresh
# document saves without the new form layout - every re-install silently
# keeps shipping the old forms.
if (Test-Path $DotmPath) {
    Write-Host "Removing existing template so Word loads a clean session..."
    Remove-Item $DotmPath -Force -ErrorAction SilentlyContinue
    if (Test-Path $DotmPath) {
        # Still there - something still has a handle. Kill Word again and retry.
        Get-Process WINWORD -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Remove-Item $DotmPath -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Launching Word to build the template..."

$word = $null
try {
    $word = New-Object -ComObject Word.Application
    # Keep Word visible so any first-run / sign-in / activation dialog can
    # be clicked by the user. A hidden Word instance with a modal dialog
    # hangs forever because the script can't dismiss it.
    $word.Visible = $true
    $word.DisplayAlerts = 0  # wdAlertsNone
    # Block AutoExec/AutoOpen/etc from firing during our COM driven session.
    try { $word.DisableAutoMacros($true) } catch {}
    # msoAutomationSecurityForceDisable - skip macro-enable prompts during automation.
    try { $word.AutomationSecurity = 3 } catch {}
    Write-Host "  Word ready."

    Write-Host "  Creating blank document..."
    $doc = $word.Documents.Add()
    try {
        Write-Host "  Importing ESABCC_RefManager.bas..."
        $null = $doc.VBProject.VBComponents.Import($BasPath)

        # Bake the search + DOI UserForms into the template NOW (while
        # AccessVBOM is temporarily enabled). Runtime clicks then never
        # need VBProject write access, so the nice picker UI appears on
        # first click even with AccessVBOM restored to 0 afterwards.
        Write-Host "  Building picker UserForms..."
        $buildLog = Join-Path $env:TEMP 'esabcc-build-forms.log'
        if (Test-Path $buildLog) { Remove-Item $buildLog -Force -ErrorAction SilentlyContinue }
        $formsOk = $false
        $formsErr = $null
        try {
            $word.Run('ESABCC_BuildForms')
            $have = @{}
            foreach ($c in $doc.VBProject.VBComponents) { $have[$c.Name] = $true }
            $formsOk = $have['frmESABCC_Search'] -and $have['frmESABCC_DOI'] -and $have['frmESABCC_Edit'] -and $have['ESABCCHelper']
            if (-not $formsOk) {
                $formsErr = "Components missing: Search=$([bool]$have['frmESABCC_Search']) DOI=$([bool]$have['frmESABCC_DOI']) Edit=$([bool]$have['frmESABCC_Edit']) Helper=$([bool]$have['ESABCCHelper'])"
            }
        } catch {
            $formsErr = $_.Exception.Message
        }
        if ($formsOk) {
            Write-Host "  UserForms built and ready."
        } else {
            Write-Warning "  Could not build UserForms: $formsErr"
            if (Test-Path $buildLog) {
                Write-Warning "  VBA log ($buildLog):"
                Get-Content $buildLog | ForEach-Object { Write-Warning "    $_" }
            } else {
                Write-Warning "  (No VBA log was written - the sub never reached its logging setup.)"
            }
            Write-Warning "  Forms will be built on first click instead - leaving AccessVBOM enabled so that works."
            $leaveAccessVBOM = $true
        }

        # Save to TEMP first. Writing directly into %APPDATA%\...\STARTUP can
        # hang under Controlled Folder Access / OneDrive / AV scanning; TEMP
        # is always writable and fast. We move the file after Word releases it.
        $TempDotm = Join-Path $env:TEMP ("ESABCC_RefManager_{0}.dotm" -f [Guid]::NewGuid().ToString('N'))
        Write-Host "  Saving template to temp location..."

        # Bring the Word window to the foreground so any modal (sign-in,
        # activation, Document Recovery) isn't hidden behind the terminal.
        try {
            $word.Activate()
            $word.WindowState = 1  # wdWindowStateMaximize
        } catch {}

        # Invoke SaveAs2 via reflection so PowerShell doesn't box the string
        # path as a PSObject (which Word's COM marshaller can't unbox, hanging
        # the call). wdFormatXMLTemplateMacroEnabled = 15.
        $flags = [System.Reflection.BindingFlags]::InvokeMethod
        [void]$doc.GetType().InvokeMember('SaveAs2', $flags, $null, $doc, @([string]$TempDotm, [int]15))
        Write-Host "  Template saved."
    }
    finally {
        $doc.Close(0)  # wdDoNotSaveChanges
    }
}
finally {
    if ($word) {
        $word.Quit()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    }
    # Restore the original AccessVBOM value so we don't leave the setting
    # relaxed - UNLESS the form-build failed during install, in which case
    # the template needs VBProject write access at runtime to lazily build
    # the UserForms on first click (otherwise the user gets the ugly
    # InputBox fallback forever).
    if ($leaveAccessVBOM) {
        Write-Host ""
        Write-Host "NOTE: 'Trust access to the VBA project object model' is being left"
        Write-Host "      enabled so the citation picker can build its UserForm on first"
        Write-Host "      click. To turn it off again: File > Options > Trust Center >"
        Write-Host "      Trust Center Settings > Macro Settings > clear the checkbox."
        # Keep AccessVBOM = 1 (do not restore).
    } elseif ($null -eq $originalAccessVBOM) {
        Remove-ItemProperty -Path $securityKey -Name AccessVBOM -ErrorAction SilentlyContinue
    } else {
        Set-ItemProperty -Path $securityKey -Name AccessVBOM -Value $originalAccessVBOM -Type DWord
    }
}

Write-Host "Injecting ribbon XML..."

$ribbonXml = @'
<?xml version="1.0" encoding="UTF-8"?>
<customUI xmlns="http://schemas.microsoft.com/office/2009/07/customui">
  <ribbon>
    <tabs>
      <tab id="ESABCC_Tab" label="ESABCC References">
        <group id="grpCite" label="Citations">
          <button id="btnInsert" label="Insert Citation" size="large" imageMso="FootnoteInsert" onAction="Ribbon_InsertCitation" screentip="Search and insert a citation at cursor"/>
          <button id="btnShort" label="Short Citation" size="large" imageMso="BibliographyStyle" onAction="Ribbon_InsertShortCitation" screentip="Insert short citation: Author et al. (Year)"/>
          <button id="btnGroup" label="Group Citation" size="large" imageMso="ContentControlBuildingBlockGallery" onAction="Ribbon_GroupCitation" screentip="Build a multi-author citation"/>
          <button id="btnDOI" label="Add by DOI" size="normal" imageMso="HyperlinkCreate" onAction="Ribbon_AddByDOI" screentip="Look up a reference by DOI"/>
          <button id="btnEdit" label="Edit Citation" size="normal" imageMso="ReviewEditDocument" onAction="Ribbon_EditCitation" screentip="Edit the citation at the cursor: convert short/long, add references, replace, or delete"/>
        </group>
        <group id="grpBiblio" label="Bibliography">
          <button id="btnBiblio" label="Bibliography" size="large" imageMso="BibliographyManageSources" onAction="Ribbon_InsertBibliography" screentip="Generate or update bibliography"/>
          <button id="btnRefresh" label="Refresh All" size="large" imageMso="Refresh" onAction="Ribbon_RefreshAll" screentip="Refresh all citations and bibliography"/>
        </group>
        <group id="grpLinks" label="Links">
          <button id="btnAddLinks" label="Add Links" size="normal" imageMso="HyperlinkInsert" onAction="Ribbon_AddAllLinks" screentip="Add DOI/URL links to all citations"/>
          <button id="btnRemoveLinks" label="Remove Links" size="normal" imageMso="HyperlinkRemove" onAction="Ribbon_RemoveAllLinks" screentip="Remove all reference links for publication"/>
        </group>
        <group id="grpTools" label="Tools">
          <button id="btnSync" label="Sync" size="normal" imageMso="Refresh" onAction="Ribbon_SyncAll" screentip="Sync all DOI citations to web library"/>
          <button id="btnWeb" label="Web Manager" size="normal" imageMso="WebPagePreview" onAction="Ribbon_ShowManager" screentip="Open reference manager in browser"/>
          <button id="btnTest" label="Test" size="normal" imageMso="SpellingAndGrammar" onAction="Ribbon_TestConnection" screentip="Test connection to reference database"/>
        </group>
      </tab>
    </tabs>
  </ribbon>
</customUI>
'@

Add-Type -AssemblyName 'System.IO.Compression.FileSystem'
$zip = [IO.Compression.ZipFile]::Open($TempDotm, 'Update')
try {
    $existing = $zip.GetEntry('customUI/customUI14.xml')
    if ($existing) { $existing.Delete() }
    $entry = $zip.CreateEntry('customUI/customUI14.xml', 'Optimal')
    $sw = [IO.StreamWriter]::new($entry.Open())
    $sw.Write($ribbonXml); $sw.Close()

    $ct = $zip.GetEntry('[Content_Types].xml')
    $sr = [IO.StreamReader]::new($ct.Open())
    $ctText = $sr.ReadToEnd(); $sr.Close()
    if ($ctText -notmatch 'customUI14\.xml') {
        $ctText = $ctText -replace '</Types>', '<Override PartName="/customUI/customUI14.xml" ContentType="application/xml"/></Types>'
        $ct.Delete()
        $ct2 = $zip.CreateEntry('[Content_Types].xml', 'Optimal')
        $sw = [IO.StreamWriter]::new($ct2.Open())
        $sw.Write($ctText); $sw.Close()
    }

    $rels = $zip.GetEntry('_rels/.rels')
    $sr = [IO.StreamReader]::new($rels.Open())
    $relsText = $sr.ReadToEnd(); $sr.Close()
    if ($relsText -notmatch 'customUI14\.xml') {
        $relsText = $relsText -replace '</Relationships>', '<Relationship Id="rCustomUI" Type="http://schemas.microsoft.com/office/2007/relationships/ui/extensibility" Target="customUI/customUI14.xml"/></Relationships>'
        $rels.Delete()
        $rels2 = $zip.CreateEntry('_rels/.rels', 'Optimal')
        $sw = [IO.StreamWriter]::new($rels2.Open())
        $sw.Write($relsText); $sw.Close()
    }
}
finally {
    $zip.Dispose()
}

Write-Host "Moving template into Word STARTUP folder..."

# Kill any lingering WINWORD.EXE that still holds a handle on the old
# .dotm (our COM instance should be gone, but Word's background exit can
# be slow and some machines have ghost Word processes from SharePoint
# preview handlers). Without this, Remove-Item throws "being used by
# another process" on the existing STARTUP .dotm.
$lingering = Get-Process WINWORD -ErrorAction SilentlyContinue
if ($lingering) {
    Write-Host "  Closing $($lingering.Count) lingering Word process(es)..."
    $lingering | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

$maxAttempts = 4
$attempt = 0
while ($true) {
    $attempt++
    try {
        if (Test-Path $DotmPath) { Remove-Item $DotmPath -Force -ErrorAction Stop }
        Move-Item -LiteralPath $TempDotm -Destination $DotmPath -Force -ErrorAction Stop
        break
    } catch {
        if ($attempt -ge $maxAttempts) {
            throw "Could not replace $DotmPath after $maxAttempts attempts - still locked. Close any running Word window (including SharePoint preview panes), then re-run install.cmd."
        }
        $wait = [math]::Pow(2, $attempt)
        Write-Host "  File locked, retrying in ${wait}s (attempt $attempt of $maxAttempts)..."
        Start-Sleep -Seconds $wait
        Get-Process WINWORD -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "Installed: $DotmPath"
Write-Host "Close and reopen Word - the ESABCC References tab will load automatically."
