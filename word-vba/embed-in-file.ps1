# Embeds ESABCC Reference Manager macros + ribbon into a specific Word file.
#
# Usage:
#   Drag a .docx/.docm onto embed-in-file.cmd, or double-click embed-in-file.cmd
#   (a file picker appears). Output is written next to the input as
#   "<original>_esabcc.docm".
#
# Intended for: a shared Word file on SharePoint / OneDrive. Run this once on
# the downloaded copy, re-upload the _esabcc.docm as the canonical file, and
# every teammate who opens it gets the "ESABCC References" ribbon - no
# per-user install needed.

param(
    [Parameter(Position = 0)]
    [string]$InputFile
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BasPath   = Join-Path $ScriptDir 'ESABCC_RefManager.bas'

if (-not (Test-Path $BasPath)) {
    throw "Cannot find ESABCC_RefManager.bas next to this script ($BasPath)."
}

if (-not $InputFile) {
    Add-Type -AssemblyName System.Windows.Forms
    $dlg = New-Object System.Windows.Forms.OpenFileDialog
    $dlg.Title  = 'Pick the Word file to embed ESABCC macros into'
    $dlg.Filter = 'Word documents (*.docx;*.docm)|*.docx;*.docm'
    if ($dlg.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
        Write-Host "Cancelled."
        return
    }
    $InputFile = $dlg.FileName
}

if (-not (Test-Path $InputFile)) {
    throw "File not found: $InputFile"
}

$InputFile = (Resolve-Path $InputFile).Path
$InputDir  = Split-Path -Parent $InputFile
$InputName = [IO.Path]::GetFileNameWithoutExtension($InputFile)
$OutFile   = Join-Path $InputDir ("{0}_esabcc.docm" -f $InputName)

$existingWord = Get-Process WINWORD -ErrorAction SilentlyContinue
if ($existingWord) {
    Write-Host "Closing $($existingWord.Count) running Word process(es)..."
    $existingWord | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

$wordVer = $null
foreach ($v in @('16.0', '15.0', '14.0')) {
    if (Test-Path "HKCU:\Software\Microsoft\Office\$v\Word") { $wordVer = $v; break }
}
if (-not $wordVer) {
    throw "Could not detect Word under HKCU\Software\Microsoft\Office. Is Word installed for this user?"
}

$securityKey = "HKCU:\Software\Microsoft\Office\$wordVer\Word\Security"
if (-not (Test-Path $securityKey)) { New-Item -Path $securityKey -Force | Out-Null }
$originalAccessVBOM = (Get-ItemProperty -Path $securityKey -Name AccessVBOM -ErrorAction SilentlyContinue).AccessVBOM
Set-ItemProperty -Path $securityKey -Name AccessVBOM -Value 1 -Type DWord

Write-Host "Embedding ESABCC macros into:"
Write-Host "  $InputFile"

$word = $null
$TempDocm = Join-Path $env:TEMP ("ESABCC_Embed_{0}.docm" -f [Guid]::NewGuid().ToString('N'))

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $true
    $word.DisplayAlerts = 0
    try { $word.DisableAutoMacros($true) } catch {}
    try { $word.AutomationSecurity = 3 } catch {}
    Write-Host "  Word ready."

    Write-Host "  Opening document..."
    $doc = $word.Documents.Open($InputFile, $false, $true)  # ConfirmConversions=false, ReadOnly=true
    try {
        Write-Host "  Importing ESABCC_RefManager.bas..."
        $null = $doc.VBProject.VBComponents.Import($BasPath)

        Write-Host "  Building picker UserForms..."
        $buildLog = Join-Path $env:TEMP 'esabcc-build-forms.log'
        if (Test-Path $buildLog) { Remove-Item $buildLog -Force -ErrorAction SilentlyContinue }
        $formsOk = $false
        $formsErr = $null
        try {
            $word.Run('ESABCC_BuildForms')
            $have = @{}
            foreach ($c in $doc.VBProject.VBComponents) { $have[$c.Name] = $true }
            $formsOk = $have['frmESABCC_Search'] -and $have['frmESABCC_DOI'] -and $have['ESABCCHelper']
            if (-not $formsOk) {
                $formsErr = "Components missing: Search=$([bool]$have['frmESABCC_Search']) DOI=$([bool]$have['frmESABCC_DOI']) Helper=$([bool]$have['ESABCCHelper'])"
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
            }
            Write-Warning "  Citation picker will fall back to the basic InputBox UI at runtime."
        }

        Write-Host "  Saving as macro-enabled .docm to temp..."
        try {
            $word.Activate()
            $word.WindowState = 1
        } catch {}
        # Invoke SaveAs2 via reflection to avoid PSObject boxing hang.
        # wdFormatXMLDocumentMacroEnabled = 13
        $flags = [System.Reflection.BindingFlags]::InvokeMethod
        [void]$doc.GetType().InvokeMember('SaveAs2', $flags, $null, $doc, @([string]$TempDocm, [int]13))
        Write-Host "  Saved."
    }
    finally {
        $doc.Close(0)
    }
}
finally {
    if ($word) {
        $word.Quit()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    }
    if ($null -eq $originalAccessVBOM) {
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
          <button id="btnWorkspace" label="Cite from Workspace" size="large" imageMso="Folder" onAction="Ribbon_CiteFromWorkspace" screentip="Cite literature from a project workspace - clustered by policy / scientific / grey, searchable and filterable by tags"/>
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
$zip = [IO.Compression.ZipFile]::Open($TempDocm, 'Update')
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

if (Test-Path $OutFile) { Remove-Item $OutFile -Force }
Move-Item -LiteralPath $TempDocm -Destination $OutFile -Force

Write-Host ""
Write-Host "============================================================"
Write-Host " Done. Macro-enabled file written:"
Write-Host "   $OutFile"
Write-Host "============================================================"
Write-Host ""
Write-Host " Next steps:"
Write-Host "   1. Open SharePoint and upload $([IO.Path]::GetFileName($OutFile))"
Write-Host "      (replacing the original, or keeping it as the new canonical file)."
Write-Host "   2. When anyone opens it, Word shows a yellow 'Enable Macros'"
Write-Host "      banner. Click Enable. The 'ESABCC References' tab appears."
Write-Host ""
