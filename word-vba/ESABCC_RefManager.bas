Attribute VB_Name = "ESABCC_RefManager"
' ============================================================================
' ESABCC Reference Manager for Word (VBA)
' ============================================================================
'
' RECOMMENDED SETUP (one-click, no admin rights, auto-loads in every doc):
'   Double-click install.cmd in this folder.
'   It copies a .dotm into %APPDATA%\Microsoft\Word\STARTUP so the
'   "ESABCC References" tab loads automatically every time Word opens.
'
' MANUAL SETUP (fallback if the installer cannot run):
'   1. Press Alt+F11 to open VBA Editor
'   2. File > Import File > select this .bas file
'   3. Close VBA Editor (Alt+F11)
'   4. Press Alt+F8 > select ESABCC_Start > Run
'   5. The toolbar appears under the Add-Ins tab
'
'   To make it permanent from inside Word:
'     Press Alt+F8 > select ESABCC_MakePermanent > Run
'
' ============================================================================

Option Explicit

' -- Configuration --
Private Const BRIDGE_URL As String = "http://127.0.0.1:8585"
Private Const WEBAPP_URL As String = "https://methodhub.vercel.app"
Private Const CITE_TAG_PREFIX As String = "CITE:"
Private Const TOOLBAR_NAME As String = "ESABCC References"

' -- State --
Private m_UseBridge As Boolean
Private m_Initialized As Boolean
Private m_StyleId As String
Private m_PickedResult As Long      ' popup-menu callback stores user pick here

' -- Form communication (Public so UserForm code can access them) --
Public g_SelectedIndex As Long      ' form result: 0=cancelled, >0=picked
Public g_DOIData As String          ' JSON response from DOI lookup
Public g_GroupMode As Boolean       ' True while the search form is in group-building mode
Public g_GroupDone As Boolean       ' True when the user clicks Done to finalise a group
Public g_EditAction As String       ' edit-dialog result: CONVERT / ADD / REPLACE / DELETE / ""
Public g_EditCiteText As String     ' citation text shown at the top of the edit form
Public g_EditIsShort As Boolean     ' True if the citation is currently in short form
Private m_FormsReady As Boolean     ' True after forms successfully created
Private m_FormsFailed As Boolean    ' True if form creation attempted and failed

' Basket arrays
Private m_BasketIds() As String
Private m_BasketKeys() As String
Private m_BasketAuthors() As String
Private m_BasketYears() As String
Private m_BasketCitations() As String
Private m_BasketDois() As String
Private m_BasketUrls() As String
Private m_BasketCount As Long

' Last search results (parallel arrays)
Private m_ResIds() As String
Private m_ResTitles() As String
Private m_ResAuthors() As String
Private m_ResYears() As String
Private m_ResCiteKeys() As String
Private m_ResCitations() As String
Private m_ResDois() As String
Private m_ResUrls() As String
Private m_ResCount As Long

' Workspace citation state ("Cite from Project Workspace")
Private m_WsProjIds() As String     ' workspace ids from facet=projects
Private m_WsProjNames() As String   ' display names (with doc counts)
Private m_WsProjCount As Long
Private m_WsTagNames() As String    ' tag facet of the last workspace fetch
Private m_WsTagCount As Long
Private m_WsRowMap() As Long        ' form list row -> result index (0 = tier header)
Private m_WsRowCount As Long
Private m_ResTiers() As String      ' per-result source tier (policy/scientific/grey)
Private m_ResTags() As String       ' per-result joined tag names
Private m_ResChapters() As String   ' per-result chapter (report-chapter / sector) names
Private m_ResSummaries() As String  ' per-result whole-document workspace summary
Private m_WsChapterNames() As String ' chapter facet of the last workspace fetch
Private m_WsChapterCount As Long
Private m_WsLastProjId As String     ' last-used workspace id, kept so the picker
                                     ' stays on the project you cited from last
                                     ' instead of resetting to the top on reload

' ============================================================================
' AUTO-RUN HOOKS (no manual setup needed after import)
' ============================================================================

' The installer ships a customUI14.xml ribbon tab ("ESABCC References")
' inside the .dotm/.docm, so the legacy CommandBar under the "Add-ins" tab
' is redundant and just duplicates the UI.
'
' Earlier versions of this module created that CommandBar with
' Temporary:=False, so Word saved it into Normal.dotm. It survives even
' after removing the AutoExec body, which is why the Add-ins tab kept
' showing up. AutoExec now actively deletes the leftover CommandBar on
' Word startup; after one launch with the new template, Normal.dotm is
' clean and the Add-ins tab disappears (unless other add-ins populate it).
'
' If the module is ever imported manually into a doc without the custom
' ribbon (pure Alt+F11 workflow), run ESABCC_Start from Alt+F8 to create
' a classic toolbar under the "Add-ins" tab.

Public Sub AutoExec()
    On Error Resume Next
    Application.CommandBars(TOOLBAR_NAME).Delete
    On Error GoTo 0
End Sub

Public Sub AutoOpen()
    On Error Resume Next
    Application.CommandBars(TOOLBAR_NAME).Delete
    On Error GoTo 0
End Sub

' Builds the search + DOI UserForms (and the ESABCCHelper module) inside the
' project containing this module. Called by the installer AFTER importing
' the .bas so the forms are baked into the .dotm/.docm on disk; users at
' runtime therefore don't need "Trust access to the VBA project object
' model" enabled - the nice picker UI works out of the box.
'
' Writes step-by-step progress to %TEMP%\esabcc-build-forms.log so the
' installer (or a support ticket) can see exactly which step failed if
' something goes wrong. The previous version swallowed errors silently
' via nested On Error handlers in the individual builder functions.
Public Sub ESABCC_BuildForms()
    Dim logPath As String
    logPath = Environ("TEMP") & "\esabcc-build-forms.log"
    Dim f As Integer
    f = FreeFile
    On Error Resume Next
    Open logPath For Output As #f
    If Err.Number <> 0 Then
        f = 0  ' logging disabled, but don't let that stop the build
        Err.Clear
    End If
    On Error GoTo 0

    On Error GoTo Fail

    If f > 0 Then Print #f, "[" & Now & "] ESABCC_BuildForms starting"

    Dim proj As Object
    Set proj = GetVBProject()
    If proj Is Nothing Then
        Err.Raise 515, "ESABCC_BuildForms", _
            "GetVBProject returned Nothing. Enable 'Trust access to the VBA project object model' in Word's Trust Center, then re-run the installer."
    End If
    If f > 0 Then Print #f, "  proj = " & proj.Name

    If Not CompExists(proj, "frmESABCC_Search") Then
        If f > 0 Then Print #f, "  building frmESABCC_Search..."
        If Not BuildSearchForm(proj) Then
            Err.Raise 515, "ESABCC_BuildForms", "BuildSearchForm failed."
        End If
        If f > 0 Then Print #f, "    frmESABCC_Search OK"
    ElseIf f > 0 Then
        Print #f, "  frmESABCC_Search already present"
    End If

    If Not CompExists(proj, "frmESABCC_DOI") Then
        If f > 0 Then Print #f, "  building frmESABCC_DOI..."
        If Not BuildDOIForm(proj) Then
            Err.Raise 515, "ESABCC_BuildForms", "BuildDOIForm failed."
        End If
        If f > 0 Then Print #f, "    frmESABCC_DOI OK"
    ElseIf f > 0 Then
        Print #f, "  frmESABCC_DOI already present"
    End If

    If Not CompExists(proj, "frmESABCC_Edit") Then
        If f > 0 Then Print #f, "  building frmESABCC_Edit..."
        If Not BuildEditForm(proj) Then
            Err.Raise 515, "ESABCC_BuildForms", "BuildEditForm failed."
        End If
        If f > 0 Then Print #f, "    frmESABCC_Edit OK"
    ElseIf f > 0 Then
        Print #f, "  frmESABCC_Edit already present"
    End If

    ' Rebuild the workspace form when it is missing OR when it predates the
    ' chapter filter + summary preview (detected by the absence of the
    ' txtSummary control), so existing installs pick the new layout up too.
    Dim addedWorkspaceForm As Boolean: addedWorkspaceForm = False
    Dim needWorkspace As Boolean: needWorkspace = Not CompExists(proj, "frmESABCC_Workspace")
    If Not needWorkspace Then
        If WorkspaceFormControlMissing(proj, "txtSummary") Then
            If f > 0 Then Print #f, "  removing stale frmESABCC_Workspace for rebuild"
            On Error Resume Next
            proj.VBComponents.Remove proj.VBComponents("frmESABCC_Workspace")
            On Error GoTo Fail
            needWorkspace = True
        End If
    End If
    If needWorkspace Then
        If f > 0 Then Print #f, "  building frmESABCC_Workspace..."
        If Not BuildWorkspaceForm(proj) Then
            Err.Raise 515, "ESABCC_BuildForms", "BuildWorkspaceForm failed."
        End If
        addedWorkspaceForm = True
        If f > 0 Then Print #f, "    frmESABCC_Workspace OK"
    ElseIf f > 0 Then
        Print #f, "  frmESABCC_Workspace already present"
    End If

    ' A helper module from an older install predates ESABCCHelper_ShowWorkspace.
    ' Whenever the workspace form was just added, rebuild the helper so the
    ' dispatcher knows the new form.
    If addedWorkspaceForm And CompExists(proj, "ESABCCHelper") Then
        proj.VBComponents.Remove proj.VBComponents("ESABCCHelper")
        If f > 0 Then Print #f, "  removed stale ESABCCHelper for rebuild"
    End If

    If Not CompExists(proj, "ESABCCHelper") Then
        If f > 0 Then Print #f, "  building ESABCCHelper..."
        If Not BuildHelperModule(proj) Then
            Err.Raise 515, "ESABCC_BuildForms", "BuildHelperModule failed."
        End If
        If f > 0 Then Print #f, "    ESABCCHelper OK"
    ElseIf f > 0 Then
        Print #f, "  ESABCCHelper already present"
    End If

    If f > 0 Then
        Print #f, "[" & Now & "] DONE"
        Close #f
    End If
    Exit Sub

Fail:
    Dim msg As String
    msg = "Err " & Err.Number & " in " & Err.Source & ": " & Err.Description
    If f > 0 Then
        Print #f, "[" & Now & "] FAILED: " & msg
        Close #f
    End If
    Err.Raise Err.Number, Err.Source, Err.Description
End Sub

' ============================================================================
' FIRST-RUN ENTRY POINT
' ============================================================================

' Run this once after importing (Alt+F8 > ESABCC_Start > Run).
' Sets up the permanent toolbar.
Public Sub ESABCC_Start()
    EnsureToolbar
    MsgBox "ESABCC Reference Manager is ready." & vbCrLf & vbCrLf & _
           "The toolbar is now under the Add-Ins tab." & vbCrLf & _
           "It will remain there permanently." & vbCrLf & vbCrLf & _
           "To keep it across sessions, save this document as .docm" & vbCrLf & _
           "or run ESABCC_MakePermanent from the Macros dialog.", _
           vbInformation, "ESABCC Reference Manager"
End Sub

' Run this to force-rebuild the toolbar (e.g. after updating the macro)
Public Sub ESABCC_ResetToolbar()
    On Error Resume Next
    Application.CommandBars(TOOLBAR_NAME).Delete
    On Error GoTo 0
    EnsureToolbar
    MsgBox "Toolbar has been rebuilt with all buttons." & vbCrLf & vbCrLf & _
           "Check the Add-Ins tab.", _
           vbInformation, "ESABCC Reference Manager"
End Sub

' Copies a startup template into Word's STARTUP folder so the toolbar
' is available in every document, every time Word opens.
Public Sub ESABCC_MakePermanent()
    On Error GoTo InstallErr

    Dim startupPath As String
    startupPath = Application.StartupPath

    ' Ensure STARTUP folder exists
    If Dir(startupPath, vbDirectory) = "" Then MkDir startupPath

    Dim tmplPath As String
    tmplPath = startupPath & "\ESABCC_RefManager.dotm"

    ' Check if already installed
    If Dir(tmplPath) <> "" Then
        Dim ans As VbMsgBoxResult
        ans = MsgBox("ESABCC Reference Manager is already installed in:" & vbCrLf & _
                      tmplPath & vbCrLf & vbCrLf & _
                      "Do you want to reinstall (update) it?", _
                      vbQuestion + vbYesNo, "ESABCC Reference Manager")
        If ans = vbNo Then Exit Sub
        On Error Resume Next
        Kill tmplPath
        On Error GoTo InstallErr
    End If

    ' Create a new document, save as .dotm into STARTUP, then close it.
    ' The current module will be exported and reimported into the template.
    Dim tmpBas As String
    tmpBas = Environ("TEMP") & "\ESABCC_RefManager.bas"

    ' Export this module to a temp file
    Dim vbComp As Object
    Set vbComp = Nothing
    Dim proj As Object
    For Each proj In Application.VBE.VBProjects
        On Error Resume Next
        Set vbComp = proj.VBComponents("ESABCC_RefManager")
        On Error GoTo InstallErr
        If Not vbComp Is Nothing Then Exit For
    Next proj

    If vbComp Is Nothing Then
        MsgBox "Could not locate the ESABCC_RefManager module." & vbCrLf & _
               "Make sure it is imported into the current document.", _
               vbExclamation, "ESABCC Reference Manager"
        Exit Sub
    End If

    vbComp.Export tmpBas

    ' Create blank template, import the module, save, close
    Dim tmplDoc As Document
    Set tmplDoc = Documents.Add(DocumentType:=wdNewBlankDocument)
    tmplDoc.VBProject.VBComponents.Import tmpBas
    tmplDoc.SaveAs2 FileName:=tmplPath, FileFormat:=wdFormatXMLTemplateMacroEnabled
    tmplDoc.Close SaveChanges:=wdDoNotSaveChanges

    ' Clean up temp file
    On Error Resume Next
    Kill tmpBas
    On Error GoTo 0

    ' Inject Ribbon XML into the .dotm so the toolbar gets its own named tab
    ' instead of appearing under Add-Ins. Best-effort: if this fails the
    ' template still works (toolbar falls back to the Add-Ins tab via AutoExec).
    Dim ribbonOk As Boolean
    ribbonOk = InjectRibbonXml(tmplPath)

    EnsureToolbar

    If ribbonOk Then
        MsgBox "Installed successfully!" & vbCrLf & vbCrLf & _
               "The template was saved to:" & vbCrLf & _
               tmplPath & vbCrLf & vbCrLf & _
               "The toolbar will appear as a dedicated " & Chr(34) & "ESABCC References" & Chr(34) & vbCrLf & _
               "tab in the ribbon. Restart Word for the change to take effect.", _
               vbInformation, "ESABCC Reference Manager"
    Else
        MsgBox "Installed successfully!" & vbCrLf & vbCrLf & _
               "The template was saved to:" & vbCrLf & _
               tmplPath & vbCrLf & vbCrLf & _
               "The toolbar will appear under the Add-Ins tab." & vbCrLf & _
               "Restart Word for the change to take effect.", _
               vbInformation, "ESABCC Reference Manager"
    End If
    Exit Sub

InstallErr:
    MsgBox "Installation failed." & vbCrLf & vbCrLf & _
           "Error: " & Err.Description & vbCrLf & vbCrLf & _
           "This usually means 'Trust access to the VBA project object model'" & vbCrLf & _
           "is disabled. You can enable it under:" & vbCrLf & _
           "File > Options > Trust Center > Trust Center Settings >" & vbCrLf & _
           "Macro Settings > Trust access to the VBA project object model." & vbCrLf & vbCrLf & _
           "Alternatively, you can manually copy the macro to the Normal template:" & vbCrLf & _
           "Alt+F11 > drag ESABCC_RefManager into Normal > save.", _
           vbExclamation, "ESABCC Reference Manager"
End Sub

' ============================================================================
' RIBBON XML INJECTION (gives the .dotm a dedicated tab in the ribbon)
' ============================================================================

' Injects customUI14.xml into a .dotm file using PowerShell.
' Returns True on success, False on failure (template still works without it).
Private Function InjectRibbonXml(ByVal dotmPath As String) As Boolean
    On Error GoTo RibbonErr
    InjectRibbonXml = False

    ' Write the customUI XML to a temp file
    Dim tmpDir As String
    tmpDir = Environ("TEMP") & "\esabcc_ribbon"
    On Error Resume Next
    MkDir tmpDir
    On Error GoTo RibbonErr

    Dim xmlPath As String
    xmlPath = tmpDir & "\customUI14.xml"

    Dim f As Integer
    f = FreeFile
    Open xmlPath For Output As #f
    Print #f, GetCustomUIXml()
    Close #f

    ' Write the PowerShell script to a temp file
    Dim psPath As String
    psPath = tmpDir & "\inject_ribbon.ps1"

    f = FreeFile
    Open psPath For Output As #f
    Print #f, GetRibbonPsScript()
    Close #f

    ' Run PowerShell to inject the customUI into the .dotm ZIP package
    Dim cmd As String
    cmd = "powershell.exe -ExecutionPolicy Bypass -NoProfile -File " & _
          Chr(34) & psPath & Chr(34) & " " & _
          Chr(34) & dotmPath & Chr(34) & " " & _
          Chr(34) & xmlPath & Chr(34)

    Dim wsh As Object
    Set wsh = CreateObject("WScript.Shell")
    Dim exitCode As Long
    exitCode = wsh.Run(cmd, 0, True)  ' hidden window, wait for completion

    ' Clean up temp files
    On Error Resume Next
    Kill xmlPath
    Kill psPath
    RmDir tmpDir
    On Error GoTo 0

    InjectRibbonXml = (exitCode = 0)
    Exit Function

RibbonErr:
    InjectRibbonXml = False
End Function

' Returns the customUI14.xml content for the ESABCC References ribbon tab.
Private Function GetCustomUIXml() As String
    Dim x As String
    x = "<?xml version=""1.0"" encoding=""UTF-8""?>" & vbCrLf
    x = x & "<customUI xmlns=""http://schemas.microsoft.com/office/2009/07/customui"">" & vbCrLf
    x = x & "  <ribbon><tabs>" & vbCrLf
    x = x & "    <tab id=""ESABCC_Tab"" label=""ESABCC References"">" & vbCrLf
    ' -- Citations group --
    x = x & "      <group id=""grpCite"" label=""Citations"">" & vbCrLf
    x = x & "        <button id=""btnInsert"" label=""Insert Citation"" size=""large"""
    x = x & " imageMso=""Bibliography"" onAction=""Ribbon_InsertCitation"""
    x = x & " screentip=""Search and insert a citation at cursor""/>" & vbCrLf
    x = x & "        <button id=""btnShort"" label=""Short Citation"" size=""large"""
    x = x & " imageMso=""BibliographyEditCitation"" onAction=""Ribbon_InsertShortCitation"""
    x = x & " screentip=""Insert short citation: Author et al. (Year)""/>" & vbCrLf
    x = x & "        <button id=""btnGroup"" label=""Group Citation"" size=""large"""
    x = x & " imageMso=""ContentControlBuildingBlockGallery"" onAction=""Ribbon_GroupCitation"""
    x = x & " screentip=""Build a multi-author citation""/>" & vbCrLf
    x = x & "        <button id=""btnWorkspace"" label=""Cite from Workspace"" size=""large"""
    x = x & " imageMso=""Folder"" onAction=""Ribbon_CiteFromWorkspace"""
    x = x & " screentip=""Cite literature from a project workspace - clustered by policy / scientific / grey, searchable and filterable by tags""/>" & vbCrLf
    x = x & "        <button id=""btnDOI"" label=""Add by DOI"" size=""normal"""
    x = x & " imageMso=""HyperlinkCreate"" onAction=""Ribbon_AddByDOI"""
    x = x & " screentip=""Look up a reference by DOI""/>" & vbCrLf
    x = x & "      </group>" & vbCrLf
    ' -- Bibliography group --
    x = x & "      <group id=""grpBiblio"" label=""Bibliography"">" & vbCrLf
    x = x & "        <button id=""btnBiblio"" label=""Bibliography"" size=""large"""
    x = x & " imageMso=""TableOfContentsInsert"" onAction=""Ribbon_InsertBibliography"""
    x = x & " screentip=""Generate or update bibliography""/>" & vbCrLf
    x = x & "        <button id=""btnRefresh"" label=""Refresh All"" size=""large"""
    x = x & " imageMso=""Refresh"" onAction=""Ribbon_RefreshAll"""
    x = x & " screentip=""Refresh all citations and bibliography""/>" & vbCrLf
    x = x & "      </group>" & vbCrLf
    ' -- Links group --
    x = x & "      <group id=""grpLinks"" label=""Links"">" & vbCrLf
    x = x & "        <button id=""btnAddLinks"" label=""Add Links"" size=""normal"""
    x = x & " imageMso=""HyperlinkInsert"" onAction=""Ribbon_AddAllLinks"""
    x = x & " screentip=""Add DOI/URL links to all citations""/>" & vbCrLf
    x = x & "        <button id=""btnRemoveLinks"" label=""Remove Links"" size=""normal"""
    x = x & " imageMso=""HyperlinkRemove"" onAction=""Ribbon_RemoveAllLinks"""
    x = x & " screentip=""Remove all reference links for publication""/>" & vbCrLf
    x = x & "      </group>" & vbCrLf
    ' -- Tools group --
    x = x & "      <group id=""grpTools"" label=""Tools"">" & vbCrLf
    x = x & "        <button id=""btnSync"" label=""Sync"" size=""normal"""
    x = x & " imageMso=""RecordsRefreshAll"" onAction=""Ribbon_SyncAll"""
    x = x & " screentip=""Sync all DOI citations to web library""/>" & vbCrLf
    x = x & "        <button id=""btnWeb"" label=""Web Manager"" size=""normal"""
    x = x & " imageMso=""WebPagePreview"" onAction=""Ribbon_ShowManager"""
    x = x & " screentip=""Open reference manager in browser""/>" & vbCrLf
    x = x & "        <button id=""btnTest"" label=""Test"" size=""normal"""
    x = x & " imageMso=""SourceControlCheckConnections"" onAction=""Ribbon_TestConnection"""
    x = x & " screentip=""Test connection to reference database""/>" & vbCrLf
    x = x & "      </group>" & vbCrLf
    x = x & "    </tab>" & vbCrLf
    x = x & "  </tabs></ribbon>" & vbCrLf
    x = x & "</customUI>"
    GetCustomUIXml = x
End Function

' Returns the PowerShell script that injects customUI into a .dotm ZIP package.
Private Function GetRibbonPsScript() As String
    Dim s As String
    s = "param([string]$DotmPath, [string]$XmlPath)" & vbCrLf
    s = s & "Add-Type -AssemblyName 'System.IO.Compression.FileSystem'" & vbCrLf
    s = s & "$xml = [IO.File]::ReadAllText($XmlPath)" & vbCrLf
    s = s & "$zip = [IO.Compression.ZipFile]::Open($DotmPath, 'Update')" & vbCrLf
    ' Add customUI/customUI14.xml
    s = s & "$e = $zip.CreateEntry('customUI/customUI14.xml','Optimal')" & vbCrLf
    s = s & "$w = [IO.StreamWriter]::new($e.Open()); $w.Write($xml); $w.Close()" & vbCrLf
    ' Patch [Content_Types].xml
    s = s & "$ct = $zip.GetEntry('[Content_Types].xml')" & vbCrLf
    s = s & "$r = [IO.StreamReader]::new($ct.Open()); $t = $r.ReadToEnd(); $r.Close()" & vbCrLf
    s = s & "$t = $t -replace '</Types>','<Override PartName=""/customUI/customUI14.xml"" ContentType=""application/xml""/></Types>'" & vbCrLf
    s = s & "$ct.Delete()" & vbCrLf
    s = s & "$ct2 = $zip.CreateEntry('[Content_Types].xml','Optimal')" & vbCrLf
    s = s & "$w = [IO.StreamWriter]::new($ct2.Open()); $w.Write($t); $w.Close()" & vbCrLf
    ' Patch _rels/.rels
    s = s & "$re = $zip.GetEntry('_rels/.rels')" & vbCrLf
    s = s & "$r = [IO.StreamReader]::new($re.Open()); $t = $r.ReadToEnd(); $r.Close()" & vbCrLf
    s = s & "$t = $t -replace '</Relationships>','<Relationship Id=""rCustomUI"" Type=""http://schemas.microsoft.com/office/2007/relationships/ui/extensibility"" Target=""customUI/customUI14.xml""/></Relationships>'" & vbCrLf
    s = s & "$re.Delete()" & vbCrLf
    s = s & "$re2 = $zip.CreateEntry('_rels/.rels','Optimal')" & vbCrLf
    s = s & "$w = [IO.StreamWriter]::new($re2.Open()); $w.Write($t); $w.Close()" & vbCrLf
    s = s & "$zip.Dispose()" & vbCrLf
    GetRibbonPsScript = s
End Function

' ============================================================================
' RIBBON CALLBACKS (called by customUI buttons in the .dotm ribbon tab)
' ============================================================================

Public Sub Ribbon_InsertCitation(control As IRibbonControl)
    ESABCC_InsertCitation
End Sub

Public Sub Ribbon_InsertShortCitation(control As IRibbonControl)
    ESABCC_InsertShortCitation
End Sub

Public Sub Ribbon_GroupCitation(control As IRibbonControl)
    ESABCC_GroupCitation
End Sub

Public Sub Ribbon_CiteFromWorkspace(control As IRibbonControl)
    ESABCC_CiteFromWorkspace
End Sub

Public Sub Ribbon_InsertBibliography(control As IRibbonControl)
    ESABCC_InsertBibliography
End Sub

Public Sub Ribbon_RefreshAll(control As IRibbonControl)
    ESABCC_RefreshAll
End Sub

Public Sub Ribbon_AddByDOI(control As IRibbonControl)
    ESABCC_AddByDOI
End Sub

Public Sub Ribbon_AddAllLinks(control As IRibbonControl)
    ESABCC_AddAllLinks
End Sub

Public Sub Ribbon_RemoveAllLinks(control As IRibbonControl)
    ESABCC_RemoveAllLinks
End Sub

Public Sub Ribbon_SyncAll(control As IRibbonControl)
    ESABCC_SyncAll
End Sub

Public Sub Ribbon_ShowManager(control As IRibbonControl)
    ESABCC_ShowManager
End Sub

Public Sub Ribbon_TestConnection(control As IRibbonControl)
    ESABCC_TestConnection
End Sub

Public Sub Ribbon_EditCitation(control As IRibbonControl)
    ESABCC_EditCitation
End Sub

' ============================================================================
' TOOLBAR (permanent, auto-created on first use)
' ============================================================================

Private Sub EnsureToolbar()
    On Error Resume Next

    ' Check if toolbar already exists
    Dim existing As CommandBar
    Set existing = Application.CommandBars(TOOLBAR_NAME)
    If Not existing Is Nothing Then
        existing.Visible = True
        Exit Sub
    End If
    Err.Clear

    ' Create permanent toolbar (Temporary:=False persists across sessions)
    Dim cbar As CommandBar
    Set cbar = Application.CommandBars.Add(Name:=TOOLBAR_NAME, Position:=msoBarTop, Temporary:=False)
    If cbar Is Nothing Then Exit Sub

    Dim btn As CommandBarButton

    Set btn = cbar.Controls.Add(Type:=msoControlButton)
    btn.Caption = "Insert"
    btn.Style = msoButtonCaption
    btn.OnAction = "ESABCC_InsertCitation"
    btn.TooltipText = "Search and insert a citation at cursor"

    Set btn = cbar.Controls.Add(Type:=msoControlButton)
    btn.Caption = "Short"
    btn.Style = msoButtonCaption
    btn.OnAction = "ESABCC_InsertShortCitation"
    btn.TooltipText = "Insert short citation: Author et al. (Year)"

    Set btn = cbar.Controls.Add(Type:=msoControlButton)
    btn.Caption = "Group"
    btn.Style = msoButtonCaption
    btn.OnAction = "ESABCC_GroupCitation"
    btn.TooltipText = "Build a multi-author citation"

    Set btn = cbar.Controls.Add(Type:=msoControlButton)
    btn.Caption = "Workspace"
    btn.Style = msoButtonCaption
    btn.OnAction = "ESABCC_CiteFromWorkspace"
    btn.TooltipText = "Cite literature from a project workspace (policy / scientific / grey, filter by tags)"

    Set btn = cbar.Controls.Add(Type:=msoControlButton)
    btn.Caption = "Biblio"
    btn.Style = msoButtonCaption
    btn.OnAction = "ESABCC_InsertBibliography"
    btn.TooltipText = "Generate/update bibliography at end of document"

    Set btn = cbar.Controls.Add(Type:=msoControlButton)
    btn.Caption = "Refresh"
    btn.Style = msoButtonCaption
    btn.OnAction = "ESABCC_RefreshAll"
    btn.TooltipText = "Refresh all citations and bibliography"

    Set btn = cbar.Controls.Add(Type:=msoControlButton)
    btn.Caption = "DOI"
    btn.Style = msoButtonCaption
    btn.OnAction = "ESABCC_AddByDOI"
    btn.TooltipText = "Look up a reference by DOI and insert citation"
    btn.BeginGroup = True

    Set btn = cbar.Controls.Add(Type:=msoControlButton)
    btn.Caption = "+Links"
    btn.Style = msoButtonCaption
    btn.OnAction = "ESABCC_AddAllLinks"
    btn.TooltipText = "Add DOI/URL links to all citations"
    btn.BeginGroup = True

    Set btn = cbar.Controls.Add(Type:=msoControlButton)
    btn.Caption = "-Links"
    btn.Style = msoButtonCaption
    btn.OnAction = "ESABCC_RemoveAllLinks"
    btn.TooltipText = "Remove all reference links for final publication"

    Set btn = cbar.Controls.Add(Type:=msoControlButton)
    btn.Caption = "Sync"
    btn.Style = msoButtonCaption
    btn.OnAction = "ESABCC_SyncAll"
    btn.TooltipText = "Sync all DOI citations to web library"
    btn.BeginGroup = True

    Set btn = cbar.Controls.Add(Type:=msoControlButton)
    btn.Caption = "Web"
    btn.Style = msoButtonCaption
    btn.OnAction = "ESABCC_ShowManager"
    btn.TooltipText = "Open reference manager in browser"

    Set btn = cbar.Controls.Add(Type:=msoControlButton)
    btn.Caption = "Test"
    btn.Style = msoButtonCaption
    btn.OnAction = "ESABCC_TestConnection"
    btn.TooltipText = "Test connection to reference database"

    cbar.Visible = True
    On Error GoTo 0
End Sub

' ============================================================================
' TEST CONNECTION
' ============================================================================

Public Sub ESABCC_TestConnection()
    EnsureToolbar
    On Error GoTo TestErr

    Dim http As Object
    Set http = CreateHttpObject()
    http.Open "GET", WEBAPP_URL & "/api/references?q=climate&limit=2", False
    http.setRequestHeader "Accept", "application/json"
    http.send

    If http.Status = 200 Then
        MsgBox "Connected successfully to ESABCC database." & vbCrLf & vbCrLf & _
               "Server responded with " & Len(http.responseText) & " characters." & vbCrLf & _
               "You are ready to search and insert citations.", _
               vbInformation, "ESABCC Reference Manager"
    Else
        MsgBox "Server returned HTTP " & http.Status & "." & vbCrLf & _
               "The reference database may be temporarily unavailable.", _
               vbExclamation, "ESABCC Reference Manager"
    End If
    Exit Sub

TestErr:
    MsgBox "Could not connect to the reference database." & vbCrLf & vbCrLf & _
           "Error: " & Err.Description & vbCrLf & vbCrLf & _
           "Check your network connection or proxy settings.", _
           vbCritical, "ESABCC Reference Manager"
End Sub

' ============================================================================
' HTTP OBJECT FACTORY (handles TLS 1.2)
' ============================================================================

Private Function CreateHttpObject() As Object
    On Error Resume Next

    Set CreateHttpObject = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    If Not CreateHttpObject Is Nothing Then
        On Error GoTo 0
        Exit Function
    End If
    Err.Clear

    Set CreateHttpObject = CreateObject("MSXML2.XMLHTTP.6.0")
    If Not CreateHttpObject Is Nothing Then
        On Error GoTo 0
        Exit Function
    End If
    Err.Clear

    Set CreateHttpObject = CreateObject("MSXML2.XMLHTTP")
    On Error GoTo 0
End Function

' ============================================================================
' INITIALIZATION
' ============================================================================

Private Sub EnsureInit()
    If m_Initialized Then Exit Sub
    EnsureToolbar
    m_StyleId = "apa"
    m_BasketCount = 0
    m_ResCount = 0
    m_UseBridge = TestBridge()
    m_Initialized = True
End Sub

Private Function TestBridge() As Boolean
    On Error GoTo NoBridge
    Dim http As Object
    Set http = CreateHttpObject()
    http.Open "GET", BRIDGE_URL & "/api/status", False
    http.send
    TestBridge = (http.Status = 200)
    Exit Function
NoBridge:
    TestBridge = False
End Function

' ============================================================================
' 1) INSERT SINGLE CITATION
' ============================================================================

Public Sub ESABCC_InsertCitation()
    EnsureInit

    Dim pick As Long
    pick = SearchAndPick( _
        "ESABCC - Insert Citation", _
        "Search by author, title, year, or keyword:" & vbCrLf & vbCrLf & _
        "Examples:" & vbCrLf & _
        "   Edenhofer" & vbCrLf & _
        "   climate adaptation" & vbCrLf & _
        "   IPCC 2022" & vbCrLf & vbCrLf & _
        "Leave empty and press OK to see recently added reference(s).", _
        "ESABCC - Search References")
    If pick = 0 Then Exit Sub

    Dim citeText As String
    citeText = FormatInlineCite(m_ResAuthors(pick), m_ResYears(pick))

    ' Build reference link (DOI preferred, then URL)
    Dim refLink As String: refLink = ""
    If m_ResDois(pick) <> "" Then
        refLink = "https://doi.org/" & m_ResDois(pick)
    ElseIf m_ResUrls(pick) <> "" Then
        refLink = m_ResUrls(pick)
    End If

    InsertCitationAtCursor m_ResIds(pick), m_ResCiteKeys(pick), citeText, refLink
    StoreCiteVar m_ResIds(pick), m_ResCitations(pick)

    ' Store metadata for year disambiguation and update all citations
    StoreRefMeta m_ResIds(pick), GetCiteAuthorLabel(m_ResAuthors(pick)), m_ResYears(pick)
    DisambiguateAllCitations

    Application.StatusBar = "ESABCC: Inserted " & citeText
End Sub

' ============================================================================
' 1b) INSERT SHORT CITATION  —  "Mytton et al. (2020)" style
' ============================================================================

Public Sub ESABCC_InsertShortCitation()
    EnsureInit

    Dim pick As Long
    pick = SearchAndPick( _
        "ESABCC - Insert Short Citation", _
        "Search by author, title, year, or keyword:" & vbCrLf & vbCrLf & _
        "The citation will be inserted in short form:" & vbCrLf & _
        "   Mytton et al. (2020)" & vbCrLf & vbCrLf & _
        "Leave empty and press OK to see recently added reference(s).", _
        "ESABCC - Insert Short Citation")
    If pick = 0 Then Exit Sub

    Dim citeText As String
    citeText = FormatShortCite(m_ResAuthors(pick), m_ResYears(pick))

    ' Build reference link (DOI preferred, then URL)
    Dim refLink As String: refLink = ""
    If m_ResDois(pick) <> "" Then
        refLink = "https://doi.org/" & m_ResDois(pick)
    ElseIf m_ResUrls(pick) <> "" Then
        refLink = m_ResUrls(pick)
    End If

    InsertCitationAtCursor m_ResIds(pick), m_ResCiteKeys(pick), citeText, refLink
    StoreCiteVar m_ResIds(pick), m_ResCitations(pick)

    Application.StatusBar = "ESABCC: Inserted " & citeText
End Sub

' ============================================================================
' 1c) CITE FROM PROJECT WORKSPACE
'     Browse the literature added to a project workspace's Content Analysis
'     corpus - clustered by source type (policy documents / scientific
'     literature / grey literature & reports) with the documents' overall
'     tags, searchable and tag-filterable directly inside Word.
' ============================================================================

Public Sub ESABCC_CiteFromWorkspace()
    EnsureInit
    g_GroupMode = False
    g_SelectedIndex = 0

    ' Ensure the workspace form exists AND is up to date (chapter filter +
    ' summary preview) before showing it, so an older build is rebuilt rather
    ' than shown stale. Cheap when everything is already current.
    EnsureFormsReady

    Dim shown As Boolean
    shown = TryShowWorkspaceForm("ESABCC - Cite from Project Workspace")
    If Not shown Then
        If EnsureFormsReady() Then
            shown = TryShowWorkspaceForm("ESABCC - Cite from Project Workspace")
        End If
    End If

    Dim pick As Long
    If shown Then
        pick = g_SelectedIndex
    Else
        pick = WorkspaceFallbackPick()
    End If
    If pick < 1 Or pick > m_ResCount Then Exit Sub

    Dim citeText As String
    citeText = FormatInlineCite(m_ResAuthors(pick), m_ResYears(pick))

    ' Build reference link (DOI preferred, then URL / EUR-Lex)
    Dim refLink As String: refLink = ""
    If m_ResDois(pick) <> "" Then
        refLink = "https://doi.org/" & m_ResDois(pick)
    ElseIf m_ResUrls(pick) <> "" Then
        refLink = m_ResUrls(pick)
    End If

    InsertCitationAtCursor m_ResIds(pick), m_ResCiteKeys(pick), citeText, refLink
    StoreCiteVar m_ResIds(pick), m_ResCitations(pick)

    ' Store metadata for year disambiguation and update all citations
    StoreRefMeta m_ResIds(pick), GetCiteAuthorLabel(m_ResAuthors(pick)), m_ResYears(pick)
    DisambiguateAllCitations

    Application.StatusBar = "ESABCC: Inserted " & citeText
End Sub

' Fallback picker when the UserForm isn't available: workspace popup ->
' optional keyword InputBox -> the standard results popup. Returns the
' picked result index (1..m_ResCount) or 0 when cancelled.
Private Function WorkspaceFallbackPick() As Long
    WorkspaceFallbackPick = 0

    If Not LoadWorkspaceProjects() Then
        MsgBox "No project workspaces with documents found." & vbCrLf & vbCrLf & _
               "Add literature to a workspace's Content Analysis module first.", _
               vbInformation, "ESABCC - Cite from Workspace"
        Exit Function
    End If

    Dim projPick As Long
    projPick = ShowWorkspaceProjectPicker()
    If projPick < 1 Or projPick > m_WsProjCount Then Exit Function

    Dim query As String
    query = InputBox("Filter by keyword or tag (leave empty to list everything):", _
                     "ESABCC - " & m_WsProjNames(projPick))
    If StrPtr(query) = 0 Then Exit Function  ' Cancel pressed

    Application.StatusBar = "ESABCC: Loading workspace literature..."
    DoEvents
    m_WsLastProjId = m_WsProjIds(projPick)
    FetchWorkspaceItems m_WsProjIds(projPick), "", "", "", Trim(query)
    Application.StatusBar = ""

    If m_ResCount = 0 Then
        MsgBox "No documents matched in this workspace.", vbInformation, _
               "ESABCC - No Results"
        Exit Function
    End If

    ' Citation tracker for the popup fallback: tick the titles of references
    ' already cited in this document. Display-only - inserts use ids/authors.
    Dim citedSet As String: citedSet = BuildCitedIdSet()
    Dim i As Long
    For i = 1 To m_ResCount
        If InStr(citedSet, "|" & m_ResIds(i) & "|") > 0 Then
            m_ResTitles(i) = ChrW(10003) & " " & m_ResTitles(i)
        End If
    Next i

    WorkspaceFallbackPick = ShowResultsPicker()
End Function

' Popup menu listing the project workspaces. Returns 1-based pick or 0.
Private Function ShowWorkspaceProjectPicker() As Long
    ShowWorkspaceProjectPicker = 0
    If m_WsProjCount = 0 Then Exit Function

    m_PickedResult = 0
    On Error Resume Next
    Application.CommandBars("ESABCC_Picker").Delete
    On Error GoTo 0

    Dim popup As CommandBar
    Set popup = Application.CommandBars.Add("ESABCC_Picker", msoBarPopup, , True)

    Dim hdr As CommandBarButton
    Set hdr = popup.Controls.Add(msoControlButton)
    hdr.Caption = "   Pick a project workspace"
    hdr.Enabled = False

    Dim i As Long
    For i = 1 To m_WsProjCount
        Dim item As CommandBarButton
        Set item = popup.Controls.Add(msoControlButton)
        If i = 1 Then item.BeginGroup = True
        item.Caption = "   " & Replace(m_WsProjNames(i), "&", "&&")
        item.Parameter = CStr(i)
        item.OnAction = "ESABCC_OnPickResult"
    Next i

    popup.ShowPopup
    On Error Resume Next
    Application.CommandBars("ESABCC_Picker").Delete
    On Error GoTo 0

    ShowWorkspaceProjectPicker = m_PickedResult
End Function

' Load the workspace list (facet=projects) into m_WsProjIds/m_WsProjNames.
' Returns True when at least one workspace with documents exists.
Private Function LoadWorkspaceProjects() As Boolean
    LoadWorkspaceProjects = False
    m_WsProjCount = 0
    On Error GoTo LoadErr

    Dim http As Object
    Set http = CreateHttpObject()
    http.Open "GET", WEBAPP_URL & "/api/references/project-workspace?facet=projects", False
    http.setRequestHeader "Accept", "application/json"
    http.send
    If http.Status <> 200 Then Exit Function

    Dim arr As String
    arr = ExtractJsonArray(http.responseText, "projects")
    Dim n As Long
    n = CountJsonObjects(arr)
    If n = 0 Then Exit Function

    ReDim m_WsProjIds(1 To n)
    ReDim m_WsProjNames(1 To n)

    Dim pos As Long: pos = 1
    Dim idx As Long: idx = 0
    Do
        Dim objStart As Long
        objStart = InStr(pos, arr, "{")
        If objStart = 0 Then Exit Do
        Dim objEnd As Long
        objEnd = FindClosingBrace(arr, objStart)
        If objEnd = 0 Then Exit Do

        Dim obj As String
        obj = Mid(arr, objStart, objEnd - objStart + 1)
        idx = idx + 1
        If idx > n Then Exit Do

        m_WsProjIds(idx) = JsonVal(obj, "id")
        Dim nm As String: nm = JsonVal(obj, "name")
        If nm = "" Then nm = m_WsProjIds(idx)
        Dim cnt As String: cnt = JsonVal(obj, "count")
        If cnt <> "" Then nm = nm & "  (" & cnt & " docs)"
        m_WsProjNames(idx) = nm

        pos = objEnd + 1
    Loop
    m_WsProjCount = idx
    LoadWorkspaceProjects = (m_WsProjCount > 0)
    Exit Function

LoadErr:
    LoadWorkspaceProjects = False
End Function

' Fetch one workspace's literature into the m_Res* arrays (plus m_ResTiers /
' m_ResTags) and its tag facet into m_WsTagNames. tier is ""/policy/
' scientific/grey; tagName "" means no tag filter.
Private Sub FetchWorkspaceItems(projectId As String, tier As String, tagName As String, _
                                chapterName As String, query As String)
    m_ResCount = 0
    m_WsTagCount = 0
    m_WsChapterCount = 0
    On Error GoTo FetchErr

    Dim url As String
    url = WEBAPP_URL & "/api/references/project-workspace?projectId=" & _
          UrlEncode(projectId) & "&limit=500"
    If tier <> "" Then url = url & "&tier=" & tier
    If tagName <> "" Then url = url & "&tag=" & UrlEncode(tagName)
    If chapterName <> "" Then url = url & "&chapter=" & UrlEncode(chapterName)
    If Trim(query) <> "" Then url = url & "&q=" & UrlEncode(Trim(query))

    Dim http As Object
    Set http = CreateHttpObject()
    http.Open "GET", url, False
    http.setRequestHeader "Accept", "application/json"
    http.send
    If http.Status <> 200 Then Exit Sub

    Dim resp As String: resp = http.responseText
    ParseWorkspaceTagFacet ExtractJsonArray(resp, "tags")
    ParseWorkspaceChapterFacet ExtractJsonArray(resp, "chapters")
    ParseWorkspaceItems ExtractJsonArray(resp, "items")
    Exit Sub

FetchErr:
    m_ResCount = 0
End Sub

' Parse the tag facet array [{ "name": "...", "count": N }, ...].
Private Sub ParseWorkspaceTagFacet(arr As String)
    m_WsTagCount = 0
    Dim n As Long: n = CountJsonObjects(arr)
    If n = 0 Then Exit Sub
    ReDim m_WsTagNames(1 To n)

    Dim pos As Long: pos = 1
    Dim idx As Long: idx = 0
    Do
        Dim objStart As Long: objStart = InStr(pos, arr, "{")
        If objStart = 0 Then Exit Do
        Dim objEnd As Long: objEnd = FindClosingBrace(arr, objStart)
        If objEnd = 0 Then Exit Do
        idx = idx + 1
        If idx > n Then Exit Do
        m_WsTagNames(idx) = JsonVal(Mid(arr, objStart, objEnd - objStart + 1), "name")
        pos = objEnd + 1
    Loop
    m_WsTagCount = idx
End Sub

' Parse the chapter facet array [{ "name": "...", "count": N }, ...].
Private Sub ParseWorkspaceChapterFacet(arr As String)
    m_WsChapterCount = 0
    Dim n As Long: n = CountJsonObjects(arr)
    If n = 0 Then Exit Sub
    ReDim m_WsChapterNames(1 To n)

    Dim pos As Long: pos = 1
    Dim idx As Long: idx = 0
    Do
        Dim objStart As Long: objStart = InStr(pos, arr, "{")
        If objStart = 0 Then Exit Do
        Dim objEnd As Long: objEnd = FindClosingBrace(arr, objStart)
        If objEnd = 0 Then Exit Do
        idx = idx + 1
        If idx > n Then Exit Do
        m_WsChapterNames(idx) = JsonVal(Mid(arr, objStart, objEnd - objStart + 1), "name")
        pos = objEnd + 1
    Loop
    m_WsChapterCount = idx
End Sub

' Parse workspace items into the shared m_Res* arrays so the existing
' insert / view / picker machinery works unchanged, plus the workspace-only
' tier and tag columns.
Private Sub ParseWorkspaceItems(json As String)
    m_ResCount = 0

    Dim objCount As Long
    objCount = CountJsonObjects(json)
    If objCount = 0 Then Exit Sub

    ReDim m_ResIds(1 To objCount)
    ReDim m_ResTitles(1 To objCount)
    ReDim m_ResAuthors(1 To objCount)
    ReDim m_ResYears(1 To objCount)
    ReDim m_ResCiteKeys(1 To objCount)
    ReDim m_ResCitations(1 To objCount)
    ReDim m_ResDois(1 To objCount)
    ReDim m_ResUrls(1 To objCount)
    ReDim m_ResTiers(1 To objCount)
    ReDim m_ResTags(1 To objCount)
    ReDim m_ResChapters(1 To objCount)
    ReDim m_ResSummaries(1 To objCount)

    Dim pos As Long: pos = 1
    Dim idx As Long: idx = 0

    Do
        Dim objStart As Long
        objStart = InStr(pos, json, "{")
        If objStart = 0 Then Exit Do

        Dim objEnd As Long
        objEnd = FindClosingBrace(json, objStart)
        If objEnd = 0 Then Exit Do

        Dim obj As String
        obj = Mid(json, objStart, objEnd - objStart + 1)

        idx = idx + 1
        If idx > objCount Then Exit Do

        m_ResIds(idx) = JsonVal(obj, "id")
        m_ResTitles(idx) = JsonVal(obj, "title")
        m_ResAuthors(idx) = JsonVal(obj, "authors")
        m_ResYears(idx) = JsonVal(obj, "year")
        m_ResCiteKeys(idx) = JsonVal(obj, "citation_key")
        m_ResCitations(idx) = JsonVal(obj, "fullCitation")
        m_ResDois(idx) = JsonVal(obj, "doi")
        m_ResUrls(idx) = JsonVal(obj, "url")
        m_ResTiers(idx) = JsonVal(obj, "tier")
        m_ResTags(idx) = JsonVal(obj, "tagsText")
        m_ResChapters(idx) = JsonVal(obj, "chaptersText")
        m_ResSummaries(idx) = JsonVal(obj, "summary")

        If m_ResCitations(idx) = "" Then
            m_ResCitations(idx) = m_ResAuthors(idx) & " (" & m_ResYears(idx) & "). " & m_ResTitles(idx) & "."
        End If
        If m_ResCiteKeys(idx) = "" Then
            m_ResCiteKeys(idx) = m_ResIds(idx)
        End If

        pos = objEnd + 1
    Loop

    m_ResCount = idx
End Sub

' Short display label for a source tier id.
Private Function WorkspaceTierLabel(tier As String) As String
    Select Case tier
        Case "policy": WorkspaceTierLabel = "Policy"
        Case "scientific": WorkspaceTierLabel = "Scientific"
        Case "grey": WorkspaceTierLabel = "Grey"
        Case Else: WorkspaceTierLabel = tier
    End Select
End Function

' ============================================================================
' 2) GROUP CITATION (multi-select)
' ============================================================================

Public Sub ESABCC_GroupCitation()
    EnsureInit
    m_BasketCount = 0
    g_GroupMode = True
    g_GroupDone = False

    ' Try the proper UserForm first - it shows a live basket and a Done
    ' button, so the user picks multiple references without the modal
    ' MsgBox "Add another?" ping-pong that the old flow had.
    If TryShowSearchForm("ESABCC - Group Citation") Then
        g_GroupMode = False
    ElseIf EnsureFormsReady() And TryShowSearchForm("ESABCC - Group Citation") Then
        g_GroupMode = False
    Else
        g_GroupMode = False
        ' Fallback: InputBox + MsgBox-per-pick loop (old code path). This
        ' kicks in only if the UserForm can't be built or run.
        Do
            Dim gTitle As String
            gTitle = "ESABCC - Group Citation"
            If m_BasketCount > 0 Then gTitle = gTitle & " (" & m_BasketCount & " in basket)"

            Dim prompt As String
            prompt = "Group citation basket: " & m_BasketCount & " reference(s)" & vbCrLf
            If m_BasketCount > 0 Then
                prompt = prompt & vbCrLf
                Dim bi As Long
                For bi = 1 To m_BasketCount
                    Dim bAuth As String: bAuth = m_BasketAuthors(bi)
                    If Len(bAuth) > 25 Then bAuth = Left(bAuth, 22) & "..."
                    prompt = prompt & "   " & bi & ". " & bAuth & " (" & m_BasketYears(bi) & ")" & vbCrLf
                Next bi
            End If
            prompt = prompt & vbCrLf & _
                "Type a search term to add another reference," & vbCrLf & _
                "or leave empty and press OK to insert the group."

            Dim pick As Long
            pick = SearchAndPick(gTitle, prompt, "ESABCC - Group Citation")
            If pick = 0 Then Exit Do

            AddToBasket m_ResIds(pick), m_ResCiteKeys(pick), m_ResAuthors(pick), _
                        m_ResYears(pick), m_ResCitations(pick), _
                        m_ResDois(pick), m_ResUrls(pick)
        Loop
    End If

    If m_BasketCount = 0 Then Exit Sub

    Dim parts() As String
    ReDim parts(1 To m_BasketCount)
    Dim i As Long
    For i = 1 To m_BasketCount
        Dim inner As String
        inner = FormatInlineCite(m_BasketAuthors(i), m_BasketYears(i))
        If Left(inner, 1) = "(" And Right(inner, 1) = ")" Then
            inner = Mid(inner, 2, Len(inner) - 2)
        End If
        parts(i) = inner
    Next i

    Dim displayText As String
    displayText = "(" & Join(parts, "; ") & ")"

    Dim allIds As String, allKeys As String
    For i = 1 To m_BasketCount
        If i > 1 Then allIds = allIds & ","
        If i > 1 Then allKeys = allKeys & ", "
        allIds = allIds & m_BasketIds(i)
        allKeys = allKeys & m_BasketKeys(i)
        StoreCiteVar m_BasketIds(i), m_BasketCitations(i)
        StoreRefMeta m_BasketIds(i), GetCiteAuthorLabel(m_BasketAuthors(i)), m_BasketYears(i)
    Next i

    InsertCitationAtCursor allIds, allKeys, displayText

    ' Add one [link] superscript per reference that has a DOI or URL. The
    ' cursor is parked right after the inserted ContentControl, so each
    ' AddLinkAfterSelection call appends " [link]" sequentially:
    '    (Smith et al., 2024; Jones, 2023) [link] [link]
    For i = 1 To m_BasketCount
        Dim link As String: link = BasketLinkAt(i)
        If link <> "" Then
            AddLinkAfterSelection link
            StoreLinkVar m_BasketIds(i), link
        End If
    Next i

    ' Update all citations for year disambiguation
    DisambiguateAllCitations

    m_BasketCount = 0
    Application.StatusBar = "ESABCC: Inserted group citation " & displayText
End Sub

' ============================================================================
' 2b) EDIT CITATION - change format / add refs / replace / delete the
'      citation ContentControl that the cursor is inside.
' ============================================================================

Public Sub ESABCC_EditCitation()
    EnsureInit

    Dim cc As ContentControl
    Set cc = FindCitationCCAtCursor()
    If cc Is Nothing Then
        MsgBox "Place your cursor inside a citation (the light-grey bounding box" & vbCrLf & _
               "around the inserted reference) and try again.", _
               vbInformation, "ESABCC - Edit Citation"
        Exit Sub
    End If

    Dim refIds() As String
    refIds = Split(Mid(cc.Tag, Len(CITE_TAG_PREFIX) + 1), ",")

    Dim isShort As Boolean
    isShort = DetectIsShortFormat(cc.Range.Text)

    ' Try the proper edit UserForm first (buttons). If it isn't baked into
    ' the template (old install), fall through to a numeric InputBox.
    g_EditAction = ""
    g_EditCiteText = cc.Range.Text
    g_EditIsShort = isShort
    Dim formRan As Boolean: formRan = TryShowEditForm()
    If Not formRan Then
        If EnsureFormsReady() Then formRan = TryShowEditForm()
    End If

    Dim action As String: action = g_EditAction

    If Not formRan Then
        ' Numeric InputBox fallback for very old installs.
        Dim menu As String
        menu = "Citation: " & cc.Range.Text & vbCrLf & vbCrLf & _
               "What would you like to do?" & vbCrLf & vbCrLf & _
               "  1. Convert to " & IIf(isShort, "long", "short") & " form" & vbCrLf & _
               "  2. Add more reference(s) to this citation" & vbCrLf & _
               "  3. Replace with a different reference" & vbCrLf & _
               "  4. Delete this citation" & vbCrLf & vbCrLf & _
               "Type 1, 2, 3, or 4 and press OK."

        Dim choice As String
        choice = InputBox(menu, "ESABCC - Edit Citation", "1")
        If StrPtr(choice) = 0 Then Exit Sub
        Select Case Trim(choice)
            Case "1": action = "CONVERT"
            Case "2": action = "ADD"
            Case "3": action = "REPLACE"
            Case "4": action = "DELETE"
            Case Else
                MsgBox "Unrecognised option - please type 1, 2, 3, or 4.", _
                       vbExclamation, "ESABCC - Edit Citation"
                Exit Sub
        End Select
    End If

    Select Case action
        Case "CONVERT"
            EditCitation_ToggleFormat cc, refIds, isShort
        Case "ADD"
            EditCitation_AddReferences cc, refIds
        Case "REPLACE"
            EditCitation_Replace cc
        Case "DELETE"
            EditCitation_Delete cc
        Case ""
            ' User cancelled.
    End Select
End Sub

Private Function TryShowEditForm() As Boolean
    TryShowEditForm = False
    On Error Resume Next
    Application.Run "ESABCCHelper_ShowEdit"
    If Err.Number = 0 Then TryShowEditForm = True
    Err.Clear
End Function

Private Function FindCitationCCAtCursor() As ContentControl
    Dim cc As ContentControl
    Dim selStart As Long, selEnd As Long
    selStart = Selection.Range.Start
    selEnd = Selection.Range.End
    For Each cc In ActiveDocument.ContentControls
        If Left(cc.Tag, Len(CITE_TAG_PREFIX)) = CITE_TAG_PREFIX Then
            If selStart >= cc.Range.Start And selEnd <= cc.Range.End + 1 Then
                Set FindCitationCCAtCursor = cc
                Exit Function
            End If
        End If
    Next cc
End Function

' Short citation renders as "Author (Year)" or "Author et al. (Year)" -
' never starts with "(". Long/group citations render wrapped in "(...)".
Private Function DetectIsShortFormat(text As String) As Boolean
    Dim t As String: t = Trim(text)
    If Len(t) = 0 Then
        DetectIsShortFormat = False
        Exit Function
    End If
    DetectIsShortFormat = (Left(t, 1) <> "(")
End Function

Private Sub EditCitation_ToggleFormat(cc As ContentControl, refIds() As String, isShort As Boolean)
    Dim newText As String
    If isShort Then
        newText = RebuildLongCite(refIds)
    Else
        newText = RebuildShortCite(refIds)
    End If

    If newText = "" Then
        MsgBox "Could not rebuild the citation - the author/year metadata" & vbCrLf & _
               "for this reference isn't stored in the document. Delete the" & vbCrLf & _
               "citation and re-insert it with Insert Citation / Short Citation.", _
               vbExclamation, "ESABCC - Edit Citation"
        Exit Sub
    End If

    cc.LockContents = False
    cc.Range.Text = newText
    Application.StatusBar = "ESABCC: Converted citation to " & IIf(isShort, "long", "short") & " form"
End Sub

Private Sub EditCitation_AddReferences(cc As ContentControl, existingIds() As String)
    ' Pre-seed the basket with the citation's current references, then run
    ' the Group Citation flow to add more. On Done, rebuild the display
    ' text + Tag in place of the existing ContentControl.
    EnsureInit
    m_BasketCount = 0
    Dim i As Long
    For i = LBound(existingIds) To UBound(existingIds)
        Dim id As String: id = Trim(existingIds(i))
        If id <> "" Then
            Dim authorLabel As String: authorLabel = GetRefAuthorLabel(id)
            Dim yr As String: yr = GetRefBaseYear(id)
            Dim fullCite As String: fullCite = GetCiteVar(id)
            ' Preserved link lives in LINK_<id>; split DOI vs raw URL so the
            ' basket can rebuild the same [link] behind the new citation.
            Dim existingLink As String: existingLink = GetLinkVar(id)
            Dim seedDoi As String, seedUrl As String
            If InStr(LCase(existingLink), "doi.org/") > 0 Then
                seedDoi = Mid(existingLink, InStr(LCase(existingLink), "doi.org/") + Len("doi.org/"))
            ElseIf existingLink <> "" Then
                seedUrl = existingLink
            End If
            AddToBasket id, id, authorLabel, yr, fullCite, seedDoi, seedUrl
        End If
    Next i

    g_GroupMode = True
    g_GroupDone = False
    Dim ran As Boolean
    ran = TryShowSearchForm("ESABCC - Add to Citation")
    If Not ran Then
        If EnsureFormsReady() Then ran = TryShowSearchForm("ESABCC - Add to Citation")
    End If
    g_GroupMode = False

    If Not ran Then
        MsgBox "The search UserForm couldn't open. Run install.cmd to rebuild the template.", _
               vbExclamation, "ESABCC - Edit Citation"
        m_BasketCount = 0
        Exit Sub
    End If

    If m_BasketCount = 0 Then Exit Sub

    ' Rebuild display text (long form) from the new basket.
    Dim parts() As String
    ReDim parts(1 To m_BasketCount)
    For i = 1 To m_BasketCount
        Dim inner As String
        inner = FormatInlineCite(m_BasketAuthors(i), m_BasketYears(i))
        If Left(inner, 1) = "(" And Right(inner, 1) = ")" Then
            inner = Mid(inner, 2, Len(inner) - 2)
        End If
        parts(i) = inner
    Next i
    Dim newDisplay As String: newDisplay = "(" & Join(parts, "; ") & ")"

    Dim allIds As String
    For i = 1 To m_BasketCount
        If i > 1 Then allIds = allIds & ","
        allIds = allIds & m_BasketIds(i)
        StoreCiteVar m_BasketIds(i), m_BasketCitations(i)
        StoreRefMeta m_BasketIds(i), GetCiteAuthorLabel(m_BasketAuthors(i)), m_BasketYears(i)
    Next i

    cc.LockContents = False
    cc.Range.Text = newDisplay
    cc.Tag = CITE_TAG_PREFIX & allIds

    ' Park the cursor right after the updated ContentControl so the
    ' AddLinkAfterSelection calls below land in the right spot.
    Dim afterRng As Range
    Set afterRng = cc.Range
    afterRng.Collapse wdCollapseEnd
    afterRng.Select

    ' Strip any pre-existing [link] markers sitting immediately after the
    ' citation so we don't end up with stale links after the edit.
    RemoveTrailingLinkMarkers afterRng

    ' Re-emit one [link] per reference that has a DOI/URL.
    For i = 1 To m_BasketCount
        Dim linkUrl As String: linkUrl = BasketLinkAt(i)
        If linkUrl <> "" Then
            AddLinkAfterSelection linkUrl
            StoreLinkVar m_BasketIds(i), linkUrl
        End If
    Next i

    Dim finalCount As Long: finalCount = m_BasketCount
    m_BasketCount = 0
    Application.StatusBar = "ESABCC: Updated citation to " & finalCount & " reference(s)"
End Sub

Private Sub EditCitation_Replace(cc As ContentControl)
    EnsureInit
    Dim pick As Long
    pick = SearchAndPick("ESABCC - Replace Citation", _
        "Search for the replacement reference:", _
        "ESABCC - Replace Citation")
    If pick = 0 Then Exit Sub

    Dim displayText As String
    displayText = FormatInlineCite(m_ResAuthors(pick), m_ResYears(pick))

    cc.LockContents = False
    cc.Range.Text = displayText
    cc.Tag = CITE_TAG_PREFIX & m_ResIds(pick)
    cc.Title = "Citation: " & m_ResCiteKeys(pick)
    StoreCiteVar m_ResIds(pick), m_ResCitations(pick)
    StoreRefMeta m_ResIds(pick), GetCiteAuthorLabel(m_ResAuthors(pick)), m_ResYears(pick)
    Application.StatusBar = "ESABCC: Replaced citation with " & displayText
End Sub

Private Sub EditCitation_Delete(cc As ContentControl)
    If MsgBox("Delete this citation?" & vbCrLf & vbCrLf & cc.Range.Text, _
              vbYesNo + vbQuestion, "ESABCC - Delete Citation") <> vbYes Then Exit Sub
    cc.LockContents = False
    cc.Range.Delete
    cc.Delete
    Application.StatusBar = "ESABCC: Citation deleted"
End Sub

' Rebuild a multi- or single-ref long/group citation like
' "(Smith et al., 2024; Jones, 2023)" from the stored author/year metadata.
Private Function RebuildLongCite(refIds() As String) As String
    Dim parts() As String
    Dim n As Long: n = UBound(refIds) - LBound(refIds) + 1
    If n < 1 Then Exit Function
    ReDim parts(1 To n)

    Dim i As Long, k As Long: k = 0
    For i = LBound(refIds) To UBound(refIds)
        Dim id As String: id = Trim(refIds(i))
        If id = "" Then GoTo ContinueLoop
        Dim auth As String: auth = GetRefAuthorLabel(id)
        Dim yr As String: yr = GetRefBaseYear(id)
        If auth = "" And yr = "" Then
            RebuildLongCite = ""
            Exit Function
        End If
        Dim inner As String
        inner = FormatInlineCite(auth, yr)
        If Left(inner, 1) = "(" And Right(inner, 1) = ")" Then
            inner = Mid(inner, 2, Len(inner) - 2)
        End If
        k = k + 1
        parts(k) = inner
ContinueLoop:
    Next i

    If k = 0 Then Exit Function
    ReDim Preserve parts(1 To k)
    RebuildLongCite = "(" & Join(parts, "; ") & ")"
End Function

' Rebuild "Author (Year)" short form. For a multi-ref group citation we
' join them with "; " - "Smith et al. (2024); Jones (2023)".
Private Function RebuildShortCite(refIds() As String) As String
    Dim n As Long: n = UBound(refIds) - LBound(refIds) + 1
    If n < 1 Then Exit Function
    Dim parts() As String
    ReDim parts(1 To n)

    Dim i As Long, k As Long: k = 0
    For i = LBound(refIds) To UBound(refIds)
        Dim id As String: id = Trim(refIds(i))
        If id = "" Then GoTo ContinueLoop2
        Dim auth As String: auth = GetRefAuthorLabel(id)
        Dim yr As String: yr = GetRefBaseYear(id)
        If auth = "" And yr = "" Then
            RebuildShortCite = ""
            Exit Function
        End If
        k = k + 1
        parts(k) = FormatShortCite(auth, yr)
ContinueLoop2:
    Next i

    If k = 0 Then Exit Function
    ReDim Preserve parts(1 To k)
    RebuildShortCite = Join(parts, "; ")
End Function

' ============================================================================
' 3) BIBLIOGRAPHY
' ============================================================================

Public Sub ESABCC_InsertBibliography()
    EnsureInit
    On Error GoTo BibErr

    Dim citeIds As Collection
    Set citeIds = ScanCitations()

    If citeIds.count = 0 Then
        MsgBox "No citations found in this document." & vbCrLf & _
               "Use 'Insert Citation' to add some first.", _
               vbInformation, "ESABCC - Bibliography"
        Exit Sub
    End If

    ' Collect unique IDs
    Dim uniqueIds As New Collection
    Dim dup As New Collection
    Dim v As Variant
    For Each v In citeIds
        Dim idParts() As String
        idParts = Split(CStr(v), ",")
        Dim k As Long
        For k = 0 To UBound(idParts)
            Dim oneId As String
            oneId = Trim(idParts(k))
            On Error Resume Next
            dup.Add oneId, oneId
            If Err.Number = 0 Then uniqueIds.Add oneId
            Err.Clear
            On Error GoTo BibErr
        Next k
    Next v

    ' Compute year disambiguation suffix map
    Dim suffMap As Object
    Set suffMap = BuildSuffixMap()

    ' Get full citation text from document variables.  If a variable is
    ' missing (e.g. the document was opened in a fresh session where the
    ' CITE_ doc variables no longer exist), fall back to re-fetching the
    ' citation text from the online library so the bibliography can still
    ' be rebuilt without having to re-insert every citation.
    Dim entries As New Collection
    Dim recoveredCount As Long: recoveredCount = 0
    For Each v In uniqueIds
        Dim fullCite As String
        fullCite = GetCiteVar(CStr(v))
        If fullCite = "" Then
            fullCite = FetchFullCitationById(CStr(v))
            If fullCite <> "" Then
                ' Cache it back into the doc so subsequent runs are fast
                StoreCiteVar CStr(v), fullCite
                recoveredCount = recoveredCount + 1
            End If
        End If
        If fullCite <> "" Then
            ' Inject disambiguation suffix into bibliography entry
            If suffMap.Exists(CStr(v)) Then
                Dim bSuf As String: bSuf = suffMap(CStr(v))
                If bSuf <> "" Then
                    fullCite = InjectYearSuffix(fullCite, GetRefBaseYear(CStr(v)), bSuf)
                End If
            End If
            entries.Add fullCite
        End If
    Next v

    If entries.count = 0 Then
        MsgBox "Citation data not found." & vbCrLf & vbCrLf & _
               "This happens when citations were inserted in a previous session " & _
               "or a different document." & vbCrLf & vbCrLf & _
               "Re-insert your citations to rebuild the bibliography data.", _
               vbExclamation, "ESABCC - Bibliography"
        Exit Sub
    End If

    ' Build bibliography text
    Dim bibText As String
    bibText = ""
    Dim entryText As Variant
    For Each entryText In entries
        If bibText <> "" Then bibText = bibText & vbCrLf
        bibText = bibText & CStr(entryText)
    Next entryText

    ' Find existing bibliography bookmark or create new section
    Dim rng As Range
    Dim bibExists As Boolean: bibExists = False

    On Error Resume Next
    If ActiveDocument.Bookmarks.Exists("ESABCC_Bibliography") Then
        Set rng = ActiveDocument.Bookmarks("ESABCC_Bibliography").Range
        rng.Text = ""
        bibExists = True
    End If
    On Error GoTo BibErr

    If Not bibExists Then
        Set rng = ActiveDocument.content
        rng.Collapse wdCollapseEnd
        rng.InsertParagraphAfter
        rng.Collapse wdCollapseEnd
        rng.Text = "References"
        rng.Font.Name = "Segoe UI"
        rng.Font.Size = 14
        rng.Font.Bold = True
        rng.Font.Color = RGB(0, 0, 0)
        rng.InsertParagraphAfter
        rng.Collapse wdCollapseEnd
    End If

    ' Insert bibliography entries
    rng.Text = bibText
    rng.Font.Name = "Segoe UI"
    rng.Font.Size = 10
    rng.Font.Bold = False
    rng.Font.Color = RGB(0, 0, 0)
    rng.ParagraphFormat.LeftIndent = InchesToPoints(0.5)
    rng.ParagraphFormat.FirstLineIndent = InchesToPoints(-0.5)
    rng.ParagraphFormat.SpaceAfter = 6

    ' Mark with bookmark for future updates
    On Error Resume Next
    ActiveDocument.Bookmarks.Add "ESABCC_Bibliography", rng
    On Error GoTo 0

    Dim bibMsg As String
    bibMsg = entries.count & " references added to bibliography."
    If recoveredCount > 0 Then
        bibMsg = bibMsg & vbCrLf & vbCrLf & _
                 recoveredCount & " citation(s) were recovered from the online" & vbCrLf & _
                 "library because their document data was missing."
    End If
    MsgBox bibMsg, vbInformation, "ESABCC - Bibliography"
    Exit Sub

BibErr:
    MsgBox "Bibliography error " & Err.Number & ": " & Err.Description, _
           vbCritical, "ESABCC - Bibliography"
End Sub

' ============================================================================
' 4) REFRESH ALL
' ============================================================================

Public Sub ESABCC_RefreshAll()
    EnsureInit
    ESABCC_InsertBibliography
End Sub

' ============================================================================
' 5) ADD ALL LINKS / REMOVE ALL LINKS
' ============================================================================

Public Sub ESABCC_AddAllLinks()
    EnsureToolbar

    Dim addedCount As Long: addedCount = 0
    Dim cc As ContentControl

    For Each cc In ActiveDocument.ContentControls
        If Left(cc.Tag, Len(CITE_TAG_PREFIX)) = CITE_TAG_PREFIX Then
            Dim tagContent As String
            tagContent = Mid(cc.Tag, Len(CITE_TAG_PREFIX) + 1)

            ' Check if ANY [link] already exists right after the CC - if so
            ' skip to avoid stacking extra markers on top of old ones. Users
            ' who want a full rebuild run Remove Links first.
            Dim checkStart As Long: checkStart = cc.Range.End
            Dim checkEnd As Long: checkEnd = checkStart + 10
            If checkEnd > ActiveDocument.content.End Then checkEnd = ActiveDocument.content.End
            If checkStart < checkEnd Then
                Dim afterRng As Range
                Set afterRng = ActiveDocument.Range(checkStart, checkEnd)
                Dim afterText As String: afterText = ""
                On Error Resume Next
                afterText = afterRng.Text
                On Error GoTo 0
                If InStr(afterText, "[link]") > 0 Then GoTo NextCC
            End If

            ' Position cursor after the content control.
            Dim insertRng As Range
            Set insertRng = cc.Range.Duplicate
            insertRng.Collapse wdCollapseEnd
            insertRng.Select

            ' Emit ONE [link] per refId in the Tag that has a resolvable URL,
            ' so group citations get e.g. " [link] [link] [link]".
            Dim idParts() As String
            idParts = Split(tagContent, ",")
            Dim emitted As Long: emitted = 0
            Dim pi As Long
            For pi = 0 To UBound(idParts)
                Dim oneId As String: oneId = Trim(idParts(pi))
                If oneId = "" Then GoTo NextId
                Dim linkUrl As String: linkUrl = FindLinkForRef(oneId)
                If linkUrl = "" Then GoTo NextId
                AddLinkAfterSelection linkUrl
                emitted = emitted + 1
NextId:
            Next pi

            If emitted > 0 Then addedCount = addedCount + emitted
NextCC:
        End If
    Next cc

    If addedCount > 0 Then
        MsgBox addedCount & " reference link(s) added." & vbCrLf & vbCrLf & _
               "Each citation now has a clickable [link] for verification.", _
               vbInformation, "ESABCC - Add Links"
    Else
        MsgBox "No citations needed new links." & vbCrLf & _
               "All citations either already have links or have no URL stored.", _
               vbInformation, "ESABCC - Add Links"
    End If
End Sub

' Find a link URL for a given refId, trying multiple strategies.
Private Function FindLinkForRef(refId As String) As String
    FindLinkForRef = ""

    ' 1. Check stored LINK_ doc variable
    FindLinkForRef = GetLinkVar(refId)
    If FindLinkForRef <> "" Then Exit Function

    ' 2. Try to reconstruct DOI from "doi-" prefixed refId
    If Left(refId, 4) = "doi-" Then
        Dim rawDoi As String
        rawDoi = Mid(refId, 5)
        Dim tenDot As Long
        tenDot = InStr(rawDoi, "10.")
        If tenDot > 0 Then
            Dim firstHyp As Long
            firstHyp = InStr(tenDot + 3, rawDoi, "-")
            If firstHyp > 0 Then
                rawDoi = Left(rawDoi, firstHyp - 1) & "/" & Mid(rawDoi, firstHyp + 1)
            End If
        End If
        FindLinkForRef = "https://doi.org/" & rawDoi
        StoreLinkVar refId, FindLinkForRef
        Exit Function
    End If

    ' 3. Check stored full citation for a DOI pattern
    Dim fullCite As String
    fullCite = GetCiteVar(refId)
    If fullCite <> "" Then
        ' Look for "doi.org/" or "DOI: " or "10.xxxx/" pattern
        Dim doiPos As Long
        doiPos = InStr(LCase(fullCite), "doi.org/")
        If doiPos > 0 Then
            Dim doiStr As String
            doiStr = Mid(fullCite, doiPos + 8)
            ' Trim trailing punctuation/spaces
            Dim di As Long
            For di = 1 To Len(doiStr)
                Dim ch As String: ch = Mid(doiStr, di, 1)
                If ch = " " Or ch = "." Or ch = ")" Or ch = "]" Or ch = "," Then
                    doiStr = Left(doiStr, di - 1)
                    Exit For
                End If
            Next di
            If Len(doiStr) > 5 Then
                FindLinkForRef = "https://doi.org/" & doiStr
                StoreLinkVar refId, FindLinkForRef
                Exit Function
            End If
        End If
        ' Look for bare DOI pattern "10.xxxx/"
        doiPos = InStr(fullCite, "10.")
        If doiPos > 0 Then
            Dim candidate As String
            candidate = Mid(fullCite, doiPos)
            If InStr(candidate, "/") > 0 Then
                For di = 1 To Len(candidate)
                    ch = Mid(candidate, di, 1)
                    If ch = " " Or ch = ")" Or ch = "]" Or ch = "," Then
                        candidate = Left(candidate, di - 1)
                        Exit For
                    End If
                Next di
                If InStr(candidate, "/") > 0 And Len(candidate) > 8 Then
                    FindLinkForRef = "https://doi.org/" & candidate
                    StoreLinkVar refId, FindLinkForRef
                    Exit Function
                End If
            End If
        End If
    End If
End Function

Public Sub ESABCC_RemoveAllLinks()
    EnsureToolbar

    Dim answer As VbMsgBoxResult
    answer = MsgBox( _
        "Remove All Links" & vbCrLf & vbCrLf & _
        "This will:" & vbCrLf & _
        "  - Remove all [link] hyperlinks from citations" & vbCrLf & _
        "  - Keep the citation text intact" & vbCrLf & _
        "  - Keep the bibliography unchanged" & vbCrLf & vbCrLf & _
        "This is intended for the final publication stage." & vbCrLf & _
        "You can re-add links later using 'Add Links'." & vbCrLf & vbCrLf & _
        "Continue?", _
        vbYesNo + vbQuestion, "ESABCC - Remove Links")

    If answer <> vbYes Then Exit Sub

    Dim removedCount As Long: removedCount = 0

    ' Remove all [link] hyperlinks associated with ESABCC citations
    ' Work backwards through hyperlinks to avoid index shifting
    Dim h As Long
    For h = ActiveDocument.Hyperlinks.count To 1 Step -1
        Dim hl As Hyperlink
        Set hl = ActiveDocument.Hyperlinks(h)
        On Error Resume Next
        Dim hlText As String
        hlText = hl.Range.Text
        On Error GoTo 0

        ' Check if this is one of our [link] indicators
        If hlText = "[link]" Then
            On Error Resume Next
            ' Get the range before deleting
            Dim hlRange As Range
            Set hlRange = hl.Range.Duplicate

            ' Also delete the space before [link]
            If hlRange.Start > 0 Then
                hlRange.MoveStart wdCharacter, -1
                If Left(hlRange.Text, 1) = " " Then
                    ' Good, include the space
                Else
                    hlRange.MoveStart wdCharacter, 1
                End If
            End If

            ' Delete the hyperlink and its text
            hl.Delete
            hlRange.Text = ""
            removedCount = removedCount + 1
            On Error GoTo 0
        End If
    Next h

    If removedCount > 0 Then
        MsgBox removedCount & " reference link(s) removed." & vbCrLf & vbCrLf & _
               "Your document is ready for publication.", _
               vbInformation, "ESABCC - Remove Links"
    Else
        MsgBox "No reference links found in this document.", _
               vbInformation, "ESABCC - Remove Links"
    End If
End Sub

' ============================================================================
' 6) SYNC ALL CITATIONS TO WEB LIBRARY
' ============================================================================

Public Sub ESABCC_SyncAll()
    EnsureToolbar

    ' Scan all citation content controls and sync DOI-based ones
    Dim syncCount As Long: syncCount = 0
    Dim failCount As Long: failCount = 0
    Dim skipCount As Long: skipCount = 0
    Dim memOnlyCount As Long: memOnlyCount = 0
    Dim lastErr As String: lastErr = ""
    Dim lastDoi As String: lastDoi = ""
    Dim cc As ContentControl

    ' Track refIds we have already synced in this run to avoid duplicate posts
    ' when the same reference is cited multiple times.
    Dim syncedIds As Object
    Set syncedIds = CreateObject("Scripting.Dictionary")

    For Each cc In ActiveDocument.ContentControls
        If Left(cc.Tag, Len(CITE_TAG_PREFIX)) = CITE_TAG_PREFIX Then
            Dim refId As String
            refId = Mid(cc.Tag, Len(CITE_TAG_PREFIX) + 1)

            ' De-duplicate per refId within one sync run
            If syncedIds.Exists(refId) Then GoTo NextSync
            syncedIds.Add refId, True

            On Error GoTo SyncItemErr

            If Left(refId, 4) = "doi-" Then
                ' ── DOI-based reference ───────────────────────────────────
                Dim rawDoi As String
                rawDoi = Mid(refId, 5)
                Dim tenDot As Long
                tenDot = InStr(rawDoi, "10.")
                If tenDot > 0 Then
                    Dim firstHyp As Long
                    firstHyp = InStr(tenDot + 3, rawDoi, "-")
                    If firstHyp > 0 Then
                        rawDoi = Left(rawDoi, firstHyp - 1) & "/" & Mid(rawDoi, firstHyp + 1)
                    End If
                End If

                lastDoi = rawDoi
                Application.StatusBar = "ESABCC: Syncing " & rawDoi & "..."
                DoEvents

                ' Step 1: Look up the DOI to get full metadata
                Dim http As Object
                Set http = CreateHttpObject()
                Dim lookupUrl As String
                lookupUrl = WEBAPP_URL & "/api/references/doi?doi=" & UrlEncode(rawDoi)
                http.Open "GET", lookupUrl, False
                http.setRequestHeader "Accept", "application/json"
                http.send

                If http.Status <> 200 Then
                    lastErr = "DOI lookup HTTP " & http.Status & " for " & rawDoi & vbCrLf & "URL: " & lookupUrl
                    failCount = failCount + 1
                    GoTo NextSync
                End If

                Dim resp As String: resp = http.responseText
                Dim titleVal As String: titleVal = JsonVal(resp, "title")
                Dim authorsVal As String: authorsVal = JsonVal(resp, "authors")
                Dim yearVal As String: yearVal = JsonVal(resp, "year")
                Dim journalVal As String: journalVal = JsonVal(resp, "journal")
                Dim fullCiteVal As String: fullCiteVal = JsonVal(resp, "fullCitation")

                If fullCiteVal = "" Then
                    fullCiteVal = authorsVal & " (" & yearVal & "). " & titleVal & "."
                    If journalVal <> "" Then fullCiteVal = fullCiteVal & " " & journalVal & "."
                    fullCiteVal = fullCiteVal & " https://doi.org/" & rawDoi
                End If

                ' Step 2: POST to library
                Dim http2 As Object
                Set http2 = CreateHttpObject()
                Dim postUrl As String
                postUrl = WEBAPP_URL & "/api/references/library"
                http2.Open "POST", postUrl, False
                http2.setRequestHeader "Content-Type", "application/json"

                Dim postBody As String
                postBody = "{" & _
                    """doi"":""" & EscJson(rawDoi) & """," & _
                    """title"":""" & EscJson(titleVal) & """," & _
                    """authors"":""" & EscJson(authorsVal) & """," & _
                    """year"":""" & EscJson(yearVal) & """," & _
                    """journal"":""" & EscJson(journalVal) & """," & _
                    """type"":""" & EscJson(JsonVal(resp, "type")) & """," & _
                    """volume"":""" & EscJson(JsonVal(resp, "volume")) & """," & _
                    """issue"":""" & EscJson(JsonVal(resp, "issue")) & """," & _
                    """pages"":""" & EscJson(JsonVal(resp, "pages")) & """," & _
                    """url"":""" & EscJson(JsonVal(resp, "url")) & """," & _
                    """fullCitation"":""" & EscJson(fullCiteVal) & """," & _
                    """source"":""vba""}"

                http2.send postBody

                If http2.Status >= 200 And http2.Status < 300 Then
                    syncCount = syncCount + 1
                    If Not JsonBool(http2.responseText, "persisted") Then memOnlyCount = memOnlyCount + 1
                Else
                    lastErr = "POST HTTP " & http2.Status & " for " & rawDoi & vbCrLf & "Response: " & Left(http2.responseText, 200)
                    failCount = failCount + 1
                End If
            Else
                ' ── Non-DOI reference (library pick, manual, custom) ──────
                ' Use the stored full citation text from the document variable.
                Dim storedCite As String
                storedCite = GetCiteVar(refId)

                If storedCite = "" Then
                    ' Nothing to sync – no metadata in doc for this refId
                    skipCount = skipCount + 1
                    GoTo NextSync
                End If

                lastDoi = refId
                Application.StatusBar = "ESABCC: Syncing " & refId & "..."
                DoEvents

                ' Parse a plausible year out of the stored citation (first 4-digit number)
                Dim parsedYear As String: parsedYear = ExtractYearFromCitation(storedCite)

                Dim http3 As Object
                Set http3 = CreateHttpObject()
                http3.Open "POST", WEBAPP_URL & "/api/references/library", False
                http3.setRequestHeader "Content-Type", "application/json"

                Dim body3 As String
                body3 = "{" & _
                    """id"":""" & EscJson(refId) & """," & _
                    """title"":""" & EscJson(storedCite) & """," & _
                    """year"":""" & EscJson(parsedYear) & """," & _
                    """fullCitation"":""" & EscJson(storedCite) & """," & _
                    """type"":""article-journal""," & _
                    """source"":""vba""}"

                http3.send body3

                If http3.Status >= 200 And http3.Status < 300 Then
                    syncCount = syncCount + 1
                    If Not JsonBool(http3.responseText, "persisted") Then memOnlyCount = memOnlyCount + 1
                Else
                    lastErr = "POST HTTP " & http3.Status & " for " & refId & vbCrLf & "Response: " & Left(http3.responseText, 200)
                    failCount = failCount + 1
                End If
            End If

            GoTo NextSync

SyncItemErr:
            lastErr = "VBA Error #" & Err.Number & ": " & Err.Description & " for ref " & lastDoi
            failCount = failCount + 1
            Resume NextSync

NextSync:
            On Error GoTo 0
        End If
    Next cc

    Application.StatusBar = ""
    Dim msg As String
    msg = "Sync complete:" & vbCrLf & vbCrLf
    msg = msg & "  Synced: " & syncCount & vbCrLf
    If failCount > 0 Then msg = msg & "  Failed: " & failCount & vbCrLf
    If skipCount > 0 Then msg = msg & "  Skipped (no metadata): " & skipCount & vbCrLf

    If failCount > 0 And lastErr <> "" Then
        msg = msg & vbCrLf & "Last error:" & vbCrLf & lastErr
    End If

    If memOnlyCount > 0 Then
        msg = msg & vbCrLf & _
              "Warning: " & memOnlyCount & " reference(s) were accepted by the" & vbCrLf & _
              "server but could NOT be persisted to GitHub." & vbCrLf & _
              "They live only in the current server instance and will" & vbCrLf & _
              "disappear on the next cold start." & vbCrLf & vbCrLf & _
              "Ask the site admin to set the REFS_GITHUB_TOKEN" & vbCrLf & _
              "environment variable on Vercel so references can be" & vbCrLf & _
              "saved permanently."
    End If

    If failCount > 0 Or memOnlyCount > 0 Then
        MsgBox msg, vbExclamation, "ESABCC - Sync"
    Else
        MsgBox msg, vbInformation, "ESABCC - Sync"
    End If
End Sub

' ============================================================================
' 7) OPEN WEB MANAGER
' ============================================================================

Public Sub ESABCC_ShowManager()
    EnsureToolbar
    Dim sh As Object
    Set sh = CreateObject("WScript.Shell")
    sh.Run WEBAPP_URL & "/references"
End Sub

' ============================================================================
' 6) ADD BY DOI (magic wand)
' ============================================================================

Public Sub ESABCC_AddByDOI()
    EnsureInit

    ' ── Try form-based UI ──
    If EnsureFormsReady() Then
        g_SelectedIndex = 0
        g_DOIData = ""
        Dim proj As Object: Set proj = GetVBProject()
        If Not proj Is Nothing Then
            If ShowFormByName(proj, "frmESABCC_DOI", "ESABCC - Add by DOI") Then
                If g_SelectedIndex = 0 Or g_DOIData = "" Then Exit Sub
                ' Extract data from the lookup response stored in g_DOIData
                Dim doiInput As String
                doiInput = Trim(JsonVal(g_DOIData, "doi"))
                If doiInput = "" Then
                    ' Parse from the txtDOI field (stored in g_DOIData won't have it)
                    ' Reconstruct from the full citation or other fields
                End If
                GoTo DoInsert
            End If
        End If
    End If

    ' ── Fallback: InputBox ──
    doiInput = InputBox( _
        "Enter a DOI to look up the reference:" & vbCrLf & vbCrLf & _
        "Example: 10.1038/s41558-020-0783-3" & vbCrLf & vbCrLf & _
        "The title, authors, year and journal will" & vbCrLf & _
        "be fetched automatically from CrossRef.", _
        "ESABCC - Add by DOI")
    If doiInput = "" Then Exit Sub

    ' Clean DOI
    doiInput = Trim(doiInput)
    If Left(doiInput, 4) = "http" Then
        Dim slashPos As Long
        slashPos = InStr(doiInput, "doi.org/")
        If slashPos > 0 Then doiInput = Mid(doiInput, slashPos + 8)
    End If

    Application.StatusBar = "ESABCC: Looking up DOI..."
    DoEvents

    On Error GoTo DoiErr
    Dim http As Object
    Set http = CreateHttpObject()
    Dim url As String
    url = WEBAPP_URL & "/api/references/doi?doi=" & UrlEncode(doiInput)
    http.Open "GET", url, False
    http.setRequestHeader "Accept", "application/json"
    http.send

    Application.StatusBar = ""

    If http.Status <> 200 Then
        MsgBox "Could not find reference for DOI:" & vbCrLf & doiInput & vbCrLf & vbCrLf & _
               "Check the DOI and try again.", _
               vbExclamation, "ESABCC - DOI Lookup"
        Exit Sub
    End If

    Dim resp As String
    resp = http.responseText

    Dim refTitle As String: refTitle = JsonVal(resp, "title")
    Dim refAuthors As String: refAuthors = JsonVal(resp, "authors")
    Dim refYear As String: refYear = JsonVal(resp, "year")
    Dim refJournal As String: refJournal = JsonVal(resp, "journal")
    Dim refFullCite As String: refFullCite = JsonVal(resp, "fullCitation")

    If refTitle = "" Then
        MsgBox "DOI found but no title returned." & vbCrLf & _
               "The reference metadata may be incomplete.", _
               vbExclamation, "ESABCC - DOI Lookup"
        Exit Sub
    End If

    ' Show what was found and ask to insert
    Dim preview As String
    preview = "Found reference:" & vbCrLf & vbCrLf
    preview = preview & "Title: " & refTitle & vbCrLf & vbCrLf
    preview = preview & "Authors: " & refAuthors & vbCrLf
    preview = preview & "Year: " & refYear & vbCrLf
    If refJournal <> "" Then preview = preview & "Journal: " & refJournal & vbCrLf
    preview = preview & "DOI: " & doiInput & vbCrLf & vbCrLf
    preview = preview & "Insert this citation at cursor?"

    Dim answer As VbMsgBoxResult
    answer = MsgBox(preview, vbYesNo + vbQuestion, "ESABCC - DOI Lookup")
    If answer <> vbYes Then Exit Sub

DoInsert:
    ' When arriving from the form, g_DOIData has the JSON and doiInput may be empty
    If resp = "" And g_DOIData <> "" Then
        resp = g_DOIData
        refTitle = JsonVal(resp, "title")
        refAuthors = JsonVal(resp, "authors")
        refYear = JsonVal(resp, "year")
        refJournal = JsonVal(resp, "journal")
        refFullCite = JsonVal(resp, "fullCitation")
        doiInput = JsonVal(resp, "doi")
        If doiInput = "" Then
            ' Reconstruct DOI from URL field
            Dim doiUrl As String: doiUrl = JsonVal(resp, "url")
            If InStr(doiUrl, "doi.org/") > 0 Then doiInput = Mid(doiUrl, InStr(doiUrl, "doi.org/") + 8)
        End If
    End If

    Dim refId As String
    refId = "doi-" & Replace(doiInput, "/", "-")
    Dim citeText As String
    citeText = FormatInlineCite(refAuthors, refYear)

    InsertCitationAtCursor refId, doiInput, citeText, "https://doi.org/" & doiInput

    ' Store full citation for bibliography
    If refFullCite = "" Then
        refFullCite = refAuthors & " (" & refYear & "). " & refTitle & "."
        If refJournal <> "" Then refFullCite = refFullCite & " " & refJournal & "."
        refFullCite = refFullCite & " https://doi.org/" & doiInput
    End If
    StoreCiteVar refId, refFullCite

    ' Store metadata for year disambiguation and update all citations
    StoreRefMeta refId, GetCiteAuthorLabel(refAuthors), refYear
    DisambiguateAllCitations

    ' Sync to website library
    SyncRefToWebsite doiInput, refTitle, refAuthors, refYear, refJournal, refFullCite, resp

    Application.StatusBar = "ESABCC: Inserted " & citeText
    Exit Sub

DoiErr:
    Application.StatusBar = ""
    MsgBox "Error looking up DOI: " & Err.Description, _
           vbCritical, "ESABCC - DOI Lookup"
End Sub

Private Sub SyncRefToWebsite(doiVal As String, titleVal As String, authorsVal As String, _
                              yearVal As String, journalVal As String, fullCiteVal As String, _
                              rawResp As String)
    ' POST the reference to the website shared library
    On Error GoTo SyncErr

    Application.StatusBar = "ESABCC: Syncing to web library..."
    DoEvents

    Dim http As Object
    Set http = CreateHttpObject()
    http.Open "POST", WEBAPP_URL & "/api/references/library", False
    http.setRequestHeader "Content-Type", "application/json"

    Dim volVal As String: volVal = JsonVal(rawResp, "volume")
    Dim issVal As String: issVal = JsonVal(rawResp, "issue")
    Dim pgsVal As String: pgsVal = JsonVal(rawResp, "pages")
    Dim urlVal As String: urlVal = JsonVal(rawResp, "url")
    Dim typeVal As String: typeVal = JsonVal(rawResp, "type")

    Dim postBody As String
    postBody = "{" & _
        """doi"":""" & EscJson(doiVal) & """," & _
        """title"":""" & EscJson(titleVal) & """," & _
        """authors"":""" & EscJson(authorsVal) & """," & _
        """year"":""" & EscJson(yearVal) & """," & _
        """journal"":""" & EscJson(journalVal) & """," & _
        """type"":""" & EscJson(typeVal) & """," & _
        """volume"":""" & EscJson(volVal) & """," & _
        """issue"":""" & EscJson(issVal) & """," & _
        """pages"":""" & EscJson(pgsVal) & """," & _
        """url"":""" & EscJson(urlVal) & """," & _
        """fullCitation"":""" & EscJson(fullCiteVal) & """," & _
        """source"":""vba""}"

    http.send postBody

    If http.Status >= 200 And http.Status < 300 Then
        If JsonBool(http.responseText, "persisted") Then
            Application.StatusBar = "ESABCC: Synced and saved to web library"
        Else
            Dim pMode As String: pMode = JsonVal(http.responseText, "persistence")
            Dim pErr As String: pErr = JsonVal(http.responseText, "persistError")
            Application.StatusBar = "ESABCC: Synced (memory only)"
            MsgBox "The reference was accepted by the web server but could NOT" & vbCrLf & _
                   "be permanently saved to the online library." & vbCrLf & vbCrLf & _
                   "Persistence mode: " & pMode & vbCrLf & _
                   "Server error: " & Left(pErr, 400) & vbCrLf & vbCrLf & _
                   "It will disappear the next time the server cold-starts.", _
                   vbExclamation, "ESABCC - Sync (not persisted)"
        End If
    Else
        Dim pErr2 As String: pErr2 = JsonVal(http.responseText, "persistError")
        Application.StatusBar = "ESABCC: Sync failed (HTTP " & http.Status & ")"
        MsgBox "Sync to web library failed." & vbCrLf & vbCrLf & _
               "HTTP Status: " & http.Status & vbCrLf & _
               "Persist error: " & Left(pErr2, 400) & vbCrLf & _
               "Response: " & Left(http.responseText, 300) & vbCrLf & vbCrLf & _
               "The citation was inserted locally." & vbCrLf & _
               "Use the 'Sync' button to retry later.", _
               vbExclamation, "ESABCC - Sync"
    End If
    Exit Sub

SyncErr:
    Application.StatusBar = "ESABCC: Sync failed - " & Err.Description
    MsgBox "Sync to web library failed." & vbCrLf & vbCrLf & _
           "Error: " & Err.Description & " (#" & Err.Number & ")" & vbCrLf & vbCrLf & _
           "The citation was inserted locally." & vbCrLf & _
           "Use the 'Sync' button to retry later.", _
           vbExclamation, "ESABCC - Sync"
End Sub

Private Function EscJson(s As String) As String
    Dim r As String: r = s
    r = Replace(r, "\", "\\")
    r = Replace(r, """", "\""")
    r = Replace(r, vbCr, "")
    r = Replace(r, vbLf, " ")
    r = Replace(r, vbTab, " ")
    EscJson = r
End Function

' ============================================================================
' SEARCH ENGINE
' ============================================================================

Private Sub DoSearch(query As String, Optional projectName As String = "")
    m_ResCount = 0

    Dim json As String
    json = FetchSearchResults(query, projectName)

    If json = "" Or json = "[]" Then Exit Sub

    ParseResultsJson json
End Sub

' Load the most recently added references from the shared online library.
' Used when the user presses OK on the search dialog with an empty query.
Private Sub LoadLatestAddedRefs()
    m_ResCount = 0

    On Error GoTo LoadErr
    Dim http As Object
    Set http = CreateHttpObject()
    http.Open "GET", WEBAPP_URL & "/api/references/library", False
    http.setRequestHeader "Accept", "application/json"
    http.send

    If http.Status <> 200 Then Exit Sub

    Dim resp As String: resp = http.responseText

    ' Extract the "references" array from { count, references: [...] }
    Dim refsPos As Long
    refsPos = InStr(resp, """references""")
    If refsPos = 0 Then Exit Sub
    Dim arrStart As Long
    arrStart = InStr(refsPos, resp, "[")
    If arrStart = 0 Then Exit Sub
    Dim arrEnd As Long
    arrEnd = InStrRev(resp, "]")
    If arrEnd <= arrStart Then Exit Sub

    Dim arr As String
    arr = Mid(resp, arrStart, arrEnd - arrStart + 1)
    If arr = "" Or arr = "[]" Then Exit Sub

    ' Parse into result arrays (newest first: library/route.ts appends, so
    ' the last item is the most recently added -- we reverse after parse).
    ParseResultsJsonLibrary arr
    Exit Sub

LoadErr:
    m_ResCount = 0
End Sub

' Parse the /api/references/library response into m_Res* arrays, newest first.
Private Sub ParseResultsJsonLibrary(json As String)
    m_ResCount = 0

    Dim objCount As Long
    objCount = CountJsonObjects(json)
    If objCount = 0 Then Exit Sub

    ReDim m_ResIds(1 To objCount)
    ReDim m_ResTitles(1 To objCount)
    ReDim m_ResAuthors(1 To objCount)
    ReDim m_ResYears(1 To objCount)
    ReDim m_ResCiteKeys(1 To objCount)
    ReDim m_ResCitations(1 To objCount)
    ReDim m_ResDois(1 To objCount)
    ReDim m_ResUrls(1 To objCount)

    Dim pos As Long: pos = 1
    Dim idx As Long: idx = 0

    ' Temporary arrays in file order
    Dim tIds() As String, tTitles() As String, tAuthors() As String
    Dim tYears() As String, tKeys() As String, tCites() As String
    Dim tDois() As String, tUrls() As String, tAddedAt() As String
    ReDim tIds(1 To objCount), tTitles(1 To objCount), tAuthors(1 To objCount)
    ReDim tYears(1 To objCount), tKeys(1 To objCount), tCites(1 To objCount)
    ReDim tDois(1 To objCount), tUrls(1 To objCount), tAddedAt(1 To objCount)

    Do
        Dim objStart As Long
        objStart = InStr(pos, json, "{")
        If objStart = 0 Then Exit Do

        Dim objEnd As Long
        objEnd = FindClosingBrace(json, objStart)
        If objEnd = 0 Then Exit Do

        Dim obj As String
        obj = Mid(json, objStart, objEnd - objStart + 1)

        idx = idx + 1
        If idx > objCount Then Exit Do

        tIds(idx) = JsonVal(obj, "id")
        tTitles(idx) = JsonVal(obj, "title")
        tAuthors(idx) = JsonVal(obj, "authors")
        tYears(idx) = JsonVal(obj, "year")
        tKeys(idx) = JsonVal(obj, "id")
        tCites(idx) = JsonVal(obj, "fullCitation")
        tDois(idx) = JsonVal(obj, "doi")
        tUrls(idx) = JsonVal(obj, "url")
        tAddedAt(idx) = JsonVal(obj, "addedAt")

        pos = objEnd + 1
    Loop

    Dim total As Long: total = idx
    If total = 0 Then Exit Sub

    ' Sort indices by addedAt descending (ISO strings sort lexicographically)
    Dim order() As Long
    ReDim order(1 To total)
    Dim k As Long
    For k = 1 To total
        order(k) = k
    Next k

    Dim a As Long, b As Long, tmp As Long
    For a = 1 To total - 1
        For b = a + 1 To total
            If tAddedAt(order(b)) > tAddedAt(order(a)) Then
                tmp = order(a) : order(a) = order(b) : order(b) = tmp
            End If
        Next b
    Next a

    For k = 1 To total
        Dim src As Long: src = order(k)
        m_ResIds(k) = tIds(src)
        m_ResTitles(k) = tTitles(src)
        m_ResAuthors(k) = tAuthors(src)
        m_ResYears(k) = tYears(src)
        m_ResCiteKeys(k) = tKeys(src)
        m_ResCitations(k) = tCites(src)
        m_ResDois(k) = tDois(src)
        m_ResUrls(k) = tUrls(src)
    Next k

    m_ResCount = total
End Sub

Private Function FetchSearchResults(query As String, Optional projectName As String = "") As String
    On Error GoTo FetchErr

    Dim url As String
    If projectName <> "" Then
        ' Project view always uses the web API (the bridge has no concept of
        ' project tags). A higher limit lets the user browse the whole report.
        url = WEBAPP_URL & "/api/references?q=" & UrlEncode(query) & _
              "&project=" & UrlEncode(projectName) & "&limit=200"
    ElseIf m_UseBridge Then
        url = BRIDGE_URL & "/api/references/search?q=" & UrlEncode(query)
    Else
        url = WEBAPP_URL & "/api/references?q=" & UrlEncode(query) & "&limit=30"
    End If

    Dim http As Object
    Set http = CreateHttpObject()
    http.Open "GET", url, False
    http.setRequestHeader "Accept", "application/json"
    http.send

    If http.Status = 200 Then
        Dim resp As String
        resp = http.responseText
        Dim itemsPos As Long
        itemsPos = InStr(resp, """items""")
        If itemsPos > 0 Then
            Dim arrStart As Long
            arrStart = InStr(itemsPos, resp, "[")
            If arrStart > 0 Then
                Dim arrEnd As Long
                arrEnd = InStrRev(resp, "]")
                If arrEnd > arrStart Then
                    resp = Mid(resp, arrStart, arrEnd - arrStart + 1)
                End If
            End If
        End If
        FetchSearchResults = resp
    Else
        FetchSearchResults = "[]"
    End If
    Exit Function

FetchErr:
    FetchSearchResults = "[]"
End Function


Private Sub ParseResultsJson(json As String)
    m_ResCount = 0

    Dim objCount As Long
    objCount = CountJsonObjects(json)
    If objCount = 0 Then Exit Sub

    ReDim m_ResIds(1 To objCount)
    ReDim m_ResTitles(1 To objCount)
    ReDim m_ResAuthors(1 To objCount)
    ReDim m_ResYears(1 To objCount)
    ReDim m_ResCiteKeys(1 To objCount)
    ReDim m_ResCitations(1 To objCount)
    ReDim m_ResDois(1 To objCount)
    ReDim m_ResUrls(1 To objCount)

    Dim pos As Long: pos = 1
    Dim idx As Long: idx = 0

    Do
        Dim objStart As Long
        objStart = InStr(pos, json, "{")
        If objStart = 0 Then Exit Do

        Dim objEnd As Long
        objEnd = FindClosingBrace(json, objStart)
        If objEnd = 0 Then Exit Do

        Dim obj As String
        obj = Mid(json, objStart, objEnd - objStart + 1)

        idx = idx + 1
        If idx > objCount Then Exit Do

        m_ResIds(idx) = JsonVal(obj, "id")
        m_ResTitles(idx) = JsonVal(obj, "title")
        m_ResYears(idx) = JsonVal(obj, "year")
        m_ResCiteKeys(idx) = JsonVal(obj, "citation_key")
        m_ResCitations(idx) = JsonVal(obj, "fullCitation")
        m_ResDois(idx) = JsonVal(obj, "doi")
        m_ResUrls(idx) = JsonVal(obj, "url")

        Dim authStr As String
        authStr = JsonVal(obj, "authors")
        If authStr = "" Then authStr = JsonVal(obj, "author")
        m_ResAuthors(idx) = authStr

        If m_ResCitations(idx) = "" Then
            m_ResCitations(idx) = m_ResAuthors(idx) & " (" & m_ResYears(idx) & "). " & m_ResTitles(idx) & "."
        End If
        If m_ResCiteKeys(idx) = "" Then
            m_ResCiteKeys(idx) = m_ResIds(idx)
        End If

        pos = objEnd + 1
    Loop

    m_ResCount = idx
End Sub

' ============================================================================
' RESULTS PICKER  (clickable popup menu — no more typing numbers!)
' ============================================================================

Private Function ShowResultsPicker() As Long
    ShowResultsPicker = 0
    If m_ResCount = 0 Then Exit Function

    Dim maxShow As Long: maxShow = 25

ReshowPicker:
    m_PickedResult = 0

    On Error Resume Next
    Application.CommandBars("ESABCC_Picker").Delete
    On Error GoTo 0

    Dim popup As CommandBar
    Set popup = Application.CommandBars.Add("ESABCC_Picker", msoBarPopup, , True)

    ' ── Header ──
    Dim hdr As CommandBarButton
    Set hdr = popup.Controls.Add(msoControlButton)
    If m_ResCount <= maxShow Then
        hdr.Caption = "   " & m_ResCount & " result(s)  ---  click to select"
    Else
        hdr.Caption = "   " & m_ResCount & " results (showing first " & maxShow & ")"
    End If
    hdr.Enabled = False

    ' ── Result items ──
    Dim showCount As Long
    showCount = m_ResCount
    If showCount > maxShow Then showCount = maxShow

    Dim i As Long
    For i = 1 To showCount
        Dim item As CommandBarButton
        Set item = popup.Controls.Add(msoControlButton)
        If i = 1 Then item.BeginGroup = True

        Dim authorPart As String
        authorPart = m_ResAuthors(i)
        If Len(authorPart) > 24 Then authorPart = Left(authorPart, 21) & "..."
        authorPart = Replace(authorPart, "&", "&&")

        Dim titlePart As String
        titlePart = m_ResTitles(i)
        If Len(titlePart) > 48 Then titlePart = Left(titlePart, 45) & "..."
        titlePart = Replace(titlePart, "&", "&&")

        item.Caption = "   " & i & ".   " & authorPart & " (" & m_ResYears(i) & ")  -  " & titlePart
        item.Parameter = CStr(i)
        item.OnAction = "ESABCC_OnPickResult"

        ' Tooltip with full reference info (shown on hover)
        Dim tip As String
        tip = m_ResTitles(i)
        If m_ResDois(i) <> "" Then tip = tip & Chr(10) & "DOI: " & m_ResDois(i)
        If m_ResUrls(i) <> "" Then tip = tip & Chr(10) & "URL: " & m_ResUrls(i)
        item.TooltipText = tip

        ' Visual group separators every 6 items
        If i > 1 And ((i - 1) Mod 6 = 0) Then item.BeginGroup = True
    Next i

    ' ── "View in Browser" submenu ──
    Dim viewSub As CommandBarPopup
    Set viewSub = popup.Controls.Add(msoControlPopup)
    viewSub.BeginGroup = True
    viewSub.Caption = "   View in Browser..."

    For i = 1 To showCount
        Dim viewBtn As CommandBarButton
        Set viewBtn = viewSub.Controls.Add(msoControlButton)
        Dim vAuth As String: vAuth = m_ResAuthors(i)
        If Len(vAuth) > 22 Then vAuth = Left(vAuth, 19) & "..."
        vAuth = Replace(vAuth, "&", "&&")
        viewBtn.Caption = "   " & i & ".  " & vAuth & " (" & m_ResYears(i) & ")"
        viewBtn.Parameter = CStr(i)
        viewBtn.OnAction = "ESABCC_OnViewResult"
    Next i

    ' ── Show the popup (blocks until user clicks or dismisses) ──
    popup.ShowPopup

    On Error Resume Next
    Application.CommandBars("ESABCC_Picker").Delete
    On Error GoTo 0

    ' If user only viewed a reference, re-show the picker
    If m_PickedResult = -1 Then GoTo ReshowPicker

    ShowResultsPicker = m_PickedResult
End Function

' Callback: user clicked a result to select it
Public Sub ESABCC_OnPickResult()
    On Error Resume Next
    m_PickedResult = CLng(Application.CommandBars.ActionControl.Parameter)
    On Error GoTo 0
End Sub

' Callback: user clicked "View in Browser" for a result
Public Sub ESABCC_OnViewResult()
    On Error Resume Next
    Dim idx As Long
    idx = CLng(Application.CommandBars.ActionControl.Parameter)
    On Error GoTo 0

    If idx >= 1 And idx <= m_ResCount Then
        Dim viewUrl As String
        If m_ResDois(idx) <> "" Then
            viewUrl = "https://doi.org/" & m_ResDois(idx)
        ElseIf m_ResUrls(idx) <> "" Then
            viewUrl = m_ResUrls(idx)
        Else
            viewUrl = WEBAPP_URL & "/references?q=" & UrlEncode(m_ResAuthors(idx))
        End If
        Dim sh As Object
        Set sh = CreateObject("WScript.Shell")
        sh.Run viewUrl
    End If

    ' Signal to re-show the picker (user browsed but didn't select)
    m_PickedResult = -1
End Sub

' ============================================================================
' SEARCH-AND-PICK  (tries UserForm first, falls back to InputBox + popup)
' ============================================================================

' Invokes the pre-baked search UserForm via Application.Run. Returns True if
' the call succeeded (form shown and closed cleanly) - g_SelectedIndex then
' holds the user's pick or 0 for cancel. Returns False if the helper macro
' wasn't found (i.e. forms aren't in the template) so the caller can fall
' through to a different UI. Does NOT require AccessVBOM.
Private Function TryShowSearchForm(formTitle As String) As Boolean
    TryShowSearchForm = False
    On Error Resume Next
    g_SelectedIndex = 0
    Application.Run "ESABCCHelper_ShowSearch", formTitle
    If Err.Number = 0 Then TryShowSearchForm = True
    Err.Clear
End Function

Private Function TryShowDOIForm(formTitle As String) As Boolean
    TryShowDOIForm = False
    On Error Resume Next
    Application.Run "ESABCCHelper_ShowDOI", formTitle
    If Err.Number = 0 Then TryShowDOIForm = True
    Err.Clear
End Function

Private Function TryShowWorkspaceForm(formTitle As String) As Boolean
    TryShowWorkspaceForm = False
    On Error Resume Next
    g_SelectedIndex = 0
    Application.Run "ESABCCHelper_ShowWorkspace", formTitle
    If Err.Number = 0 Then TryShowWorkspaceForm = True
    Err.Clear
End Function

' Returns picked index (1..N) or 0 if cancelled.
Private Function SearchAndPick(formTitle As String, fallbackPrompt As String, _
                                fallbackTitle As String) As Long
    SearchAndPick = 0

    ' ── Try form-based UI ──
    ' The forms get baked into the .dotm at install time, so at runtime we
    ' just Application.Run the helper that shows them. This path does NOT
    ' need AccessVBOM (unlike EnsureFormsReady, which iterates VBE.VBProjects
    ' to verify / build the forms). If the forms are missing we lazily try
    ' to build them - that branch DOES need AccessVBOM, but failing is fine
    ' because we fall through to the InputBox below.
    If TryShowSearchForm(formTitle) Then
        SearchAndPick = g_SelectedIndex
        Exit Function
    End If
    If EnsureFormsReady() Then
        If TryShowSearchForm(formTitle) Then
            SearchAndPick = g_SelectedIndex
            Exit Function
        End If
    End If

    ' ── Fallback: InputBox + popup menu ──
    Dim query As String
    query = InputBox(fallbackPrompt, fallbackTitle)
    If StrPtr(query) = 0 Then Exit Function  ' Cancel pressed

    Application.StatusBar = "ESABCC: Searching..."
    DoEvents
    If Trim(query) = "" Then
        LoadLatestAddedRefs
    Else
        DoSearch query
    End If
    Application.StatusBar = ""

    If m_ResCount = 0 Then
        If Trim(query) = "" Then
            MsgBox "No recently added references found in the online library." & vbCrLf & vbCrLf & _
                   "Add a reference via the web Reference Manager or" & vbCrLf & _
                   "via 'Add by DOI' first.", _
                   vbInformation, "ESABCC - No Recent References"
        Else
            MsgBox "No results for """ & query & """." & vbCrLf & vbCrLf & _
                   "Try a shorter or different search term.", _
                   vbInformation, "ESABCC - No Results"
        End If
        Exit Function
    End If

    SearchAndPick = ShowResultsPicker()
End Function

' ============================================================================
' USERFORM BRIDGE FUNCTIONS (Public — called by UserForm event handlers)
' ============================================================================

Public Sub FormBridge_Search(query As String, lst As Object, lblStatus As Object, Optional projectName As String = "")
    Application.StatusBar = "ESABCC: Searching..."
    DoEvents

    Dim proj As String: proj = NormalizeProjectChoice(projectName)

    If proj <> "" Then
        ' Project view: scope the whole library to one report (server-filtered),
        ' optionally narrowed further by the query text.
        DoSearch query, proj
    ElseIf Trim(query) = "" Then
        LoadLatestAddedRefs
    Else
        DoSearch query, ""
    End If
    Application.StatusBar = ""

    lst.Clear
    If m_ResCount = 0 Then
        lblStatus.Caption = "No results found."
        lblStatus.ForeColor = RGB(180, 60, 60)
        Exit Sub
    End If

    lblStatus.Caption = m_ResCount & " result(s) found"
    lblStatus.ForeColor = RGB(40, 120, 40)

    Dim i As Long
    For i = 1 To m_ResCount
        Dim authorYr As String: authorYr = m_ResAuthors(i)
        If Len(authorYr) > 26 Then authorYr = Left(authorYr, 23) & "..."
        authorYr = authorYr & " (" & m_ResYears(i) & ")"

        lst.AddItem authorYr

        Dim ttl As String: ttl = m_ResTitles(i)
        If Len(ttl) > 42 Then ttl = Left(ttl, 39) & "..."
        lst.List(lst.ListCount - 1, 1) = ttl

        Dim doiCol As String: doiCol = ""
        If m_ResDois(i) <> "" Then
            doiCol = m_ResDois(i)
            If Len(doiCol) > 22 Then doiCol = Left(doiCol, 19) & "..."
        ElseIf m_ResUrls(i) <> "" Then
            doiCol = "[URL]"
        End If
        lst.List(lst.ListCount - 1, 2) = doiCol
    Next i
End Sub

' The combo's "(All projects)" sentinel and blank both mean "no filter".
Private Function NormalizeProjectChoice(ByVal projectName As String) As String
    Dim p As String: p = Trim(projectName)
    If p = "(All projects)" Then p = ""
    NormalizeProjectChoice = p
End Function

' Populate the search form's Project combo from the live library. Pulls the
' distinct project list (the reports references have been tagged with) from
' /api/references?facet=projects so the user can pick a report and browse just
' its literature -- handy when you remember the report but not the paper title.
Public Sub FormBridge_LoadProjects(cmb As Object)
    On Error GoTo Done
    cmb.Clear
    cmb.AddItem "(All projects)"

    Dim http As Object
    Set http = CreateHttpObject()
    http.Open "GET", WEBAPP_URL & "/api/references?facet=projects", False
    http.setRequestHeader "Accept", "application/json"
    http.send
    If http.Status <> 200 Then GoTo Done

    ' Response shape: { "projects": [ { "name": "...", "count": N }, ... ] }
    Dim resp As String: resp = http.responseText
    Dim pos As Long: pos = 1
    Do
        Dim namestart As Long
        namestart = InStr(pos, resp, """name""")
        If namestart = 0 Then Exit Do
        Dim nm As String
        nm = JsonVal(Mid(resp, namestart, 400), "name")
        If nm <> "" Then cmb.AddItem nm
        pos = namestart + 6
    Loop

Done:
    If cmb.ListCount > 0 Then cmb.ListIndex = 0
End Sub

' Called by the search UserForm's "Add to Group" button. Adds the selected
' result to the basket and leaves the form open.
Public Sub FormBridge_AddToBasket(idx As Long)
    If idx < 1 Or idx > m_ResCount Then Exit Sub
    AddToBasket m_ResIds(idx), m_ResCiteKeys(idx), m_ResAuthors(idx), _
                m_ResYears(idx), m_ResCitations(idx), _
                m_ResDois(idx), m_ResUrls(idx)
End Sub

' Called by the search UserForm to (re)populate its basket list from
' m_BasketAuthors/m_BasketYears.
Public Sub FormBridge_RenderBasket(lst As Object, lbl As Object)
    lst.Clear
    Dim i As Long
    For i = 1 To m_BasketCount
        Dim a As String: a = m_BasketAuthors(i)
        If Len(a) > 30 Then a = Left(a, 27) & "..."
        lst.AddItem a & " (" & m_BasketYears(i) & ")"
    Next i
    If m_BasketCount = 0 Then
        lbl.Caption = "Basket: empty - search and click 'Add to Group'"
    Else
        lbl.Caption = "Basket: " & m_BasketCount & " reference(s) - click 'Done' when finished"
    End If
End Sub

' Called by the search UserForm's "Remove" button on the basket list.
Public Sub FormBridge_RemoveFromBasket(idx As Long)
    If idx < 1 Or idx > m_BasketCount Then Exit Sub
    Dim i As Long
    For i = idx To m_BasketCount - 1
        m_BasketIds(i) = m_BasketIds(i + 1)
        m_BasketKeys(i) = m_BasketKeys(i + 1)
        m_BasketAuthors(i) = m_BasketAuthors(i + 1)
        m_BasketYears(i) = m_BasketYears(i + 1)
        m_BasketCitations(i) = m_BasketCitations(i + 1)
        m_BasketDois(i) = m_BasketDois(i + 1)
        m_BasketUrls(i) = m_BasketUrls(i + 1)
    Next i
    m_BasketCount = m_BasketCount - 1
End Sub

Public Sub FormBridge_ViewInBrowser(idx As Long)
    If idx < 1 Or idx > m_ResCount Then Exit Sub
    Dim vUrl As String
    If m_ResDois(idx) <> "" Then
        vUrl = "https://doi.org/" & m_ResDois(idx)
    ElseIf m_ResUrls(idx) <> "" Then
        vUrl = m_ResUrls(idx)
    Else
        vUrl = WEBAPP_URL & "/references?q=" & UrlEncode(m_ResAuthors(idx))
    End If
    Dim sh As Object: Set sh = CreateObject("WScript.Shell")
    sh.Run vUrl
End Sub

Public Sub FormBridge_DOILookup(doiInput As String, txtPreview As Object, _
                                 btnInsert As Object, lblStatus As Object)
    Dim doi As String: doi = Trim(doiInput)
    If Left(doi, 4) = "http" Then
        Dim sp As Long: sp = InStr(doi, "doi.org/")
        If sp > 0 Then doi = Mid(doi, sp + 8)
    End If
    If doi = "" Then
        lblStatus.Caption = "Please enter a DOI."
        lblStatus.ForeColor = RGB(180, 60, 60)
        Exit Sub
    End If

    lblStatus.Caption = "Looking up DOI..."
    lblStatus.ForeColor = RGB(100, 100, 100)
    Application.StatusBar = "ESABCC: Looking up DOI..."
    DoEvents

    On Error GoTo LookupErr
    Dim http As Object: Set http = CreateHttpObject()
    http.Open "GET", WEBAPP_URL & "/api/references/doi?doi=" & UrlEncode(doi), False
    http.setRequestHeader "Accept", "application/json"
    http.send
    Application.StatusBar = ""

    If http.Status <> 200 Then
        lblStatus.Caption = "Could not find reference for this DOI."
        lblStatus.ForeColor = RGB(180, 60, 60)
        txtPreview.Value = ""
        btnInsert.Enabled = False
        g_DOIData = ""
        Exit Sub
    End If

    g_DOIData = http.responseText
    Dim refTitle As String: refTitle = JsonVal(g_DOIData, "title")
    Dim refAuthors As String: refAuthors = JsonVal(g_DOIData, "authors")
    Dim refYear As String: refYear = JsonVal(g_DOIData, "year")
    Dim refJournal As String: refJournal = JsonVal(g_DOIData, "journal")

    If refTitle = "" Then
        lblStatus.Caption = "DOI found but no title returned."
        lblStatus.ForeColor = RGB(180, 60, 60)
        txtPreview.Value = ""
        btnInsert.Enabled = False
        Exit Sub
    End If

    lblStatus.Caption = "Reference found!"
    lblStatus.ForeColor = RGB(40, 120, 40)

    Dim preview As String
    preview = "Title:      " & refTitle & vbCrLf & vbCrLf
    preview = preview & "Authors:  " & refAuthors & vbCrLf
    preview = preview & "Year:       " & refYear & vbCrLf
    If refJournal <> "" Then preview = preview & "Journal:   " & refJournal & vbCrLf
    preview = preview & "DOI:        " & doi
    txtPreview.Value = preview
    btnInsert.Enabled = True
    Exit Sub

LookupErr:
    Application.StatusBar = ""
    lblStatus.Caption = "Error: " & Err.Description
    lblStatus.ForeColor = RGB(180, 60, 60)
    txtPreview.Value = ""
    btnInsert.Enabled = False
    g_DOIData = ""
End Sub

' ── Workspace form bridges (called by frmESABCC_Workspace event handlers) ──

' Populate the workspace combo from the live project-workspace facet.
Public Sub FormBridge_WS_LoadProjects(cmb As Object, lblStatus As Object)
    cmb.Clear
    If Not LoadWorkspaceProjects() Then
        lblStatus.Caption = "No project workspaces with documents found."
        lblStatus.ForeColor = RGB(180, 60, 60)
        Exit Sub
    End If
    Dim i As Long
    For i = 1 To m_WsProjCount
        cmb.AddItem m_WsProjNames(i)
    Next i

    ' Reopen on the workspace the user last cited from, rather than snapping
    ' back to the top project every time the form reloads after a citation.
    Dim sel As Long: sel = 0
    If m_WsLastProjId <> "" Then
        For i = 1 To m_WsProjCount
            If m_WsProjIds(i) = m_WsLastProjId Then sel = i - 1: Exit For
        Next i
    End If
    cmb.ListIndex = sel
End Sub

' Run a workspace search and render the clustered results. projIndex /
' tierIndex are the combos' 0-based ListIndex; tagChoice is the tag combo
' text ("(All tags)" or blank = no filter). The tag combo is refreshed from
' the response facet so it always lists the tags present in the workspace.
' Each row carries a citation-tracker mark: a check in the first column
' means that reference is already cited somewhere in the active document.
' onlyUncited hides the already-cited rows ("what's left to cite" view).
Public Sub FormBridge_WS_Search(projIndex As Long, tierIndex As Long, tagChoice As String, _
                                query As String, lst As Object, lblStatus As Object, cmbTag As Object, _
                                Optional onlyUncited As Boolean = False, _
                                Optional chapterChoice As String = "", Optional cmbChapter As Object)
    lst.Clear
    m_WsRowCount = 0
    If projIndex < 0 Or projIndex >= m_WsProjCount Then
        lblStatus.Caption = "Pick a project workspace first."
        lblStatus.ForeColor = RGB(180, 60, 60)
        Exit Sub
    End If

    ' Remember the chosen workspace so the picker reopens here next time.
    m_WsLastProjId = m_WsProjIds(projIndex + 1)

    ' Citation-tracker column lives at index 0; configure the list at runtime
    ' so a form built by an older install picks the new layout up too.
    On Error Resume Next
    lst.ColumnCount = 5
    lst.ColumnWidths = "20;52;124;212;88"
    On Error GoTo 0

    Dim tier As String
    Select Case tierIndex
        Case 1: tier = "policy"
        Case 2: tier = "scientific"
        Case 3: tier = "grey"
        Case Else: tier = ""
    End Select

    Dim tagName As String: tagName = Trim(tagChoice)
    If tagName = "(All tags)" Then tagName = ""

    Dim chapterName As String: chapterName = Trim(chapterChoice)
    If chapterName = "(All chapters)" Then chapterName = ""

    Application.StatusBar = "ESABCC: Loading workspace literature..."
    DoEvents
    FetchWorkspaceItems m_WsProjIds(projIndex + 1), tier, tagName, chapterName, query
    Application.StatusBar = ""

    FillWorkspaceTagCombo cmbTag, tagChoice
    If Not cmbChapter Is Nothing Then FillWorkspaceChapterCombo cmbChapter, chapterChoice

    If m_ResCount = 0 Then
        lblStatus.Caption = "No documents matched."
        lblStatus.ForeColor = RGB(180, 60, 60)
        Exit Sub
    End If

    ' Citation tracker: which of these references are already cited in the
    ' active document?
    Dim citedSet As String
    citedSet = BuildCitedIdSet()

    Dim citedCount As Long: citedCount = 0
    Dim i As Long
    For i = 1 To m_ResCount
        If InStr(citedSet, "|" & m_ResIds(i) & "|") > 0 Then citedCount = citedCount + 1
    Next i

    If onlyUncited And citedCount = m_ResCount Then
        lblStatus.Caption = "All " & m_ResCount & " matching document(s) are already cited."
        lblStatus.ForeColor = RGB(40, 120, 40)
        Exit Sub
    End If

    If onlyUncited Then
        lblStatus.Caption = (m_ResCount - citedCount) & " not yet cited (of " & m_ResCount & " matching)"
    Else
        lblStatus.Caption = m_ResCount & " document(s) - " & citedCount & " cited, " & _
                            (m_ResCount - citedCount) & " not yet cited"
    End If
    lblStatus.ForeColor = RGB(40, 120, 40)

    ' Render clustered: a disabled-looking header row opens each source tier;
    ' m_WsRowMap translates list rows back to result indices (0 = header).
    ReDim m_WsRowMap(1 To m_ResCount + 6)

    Dim checkMark As String: checkMark = ChrW(10003)  ' "already cited" tick

    Dim lastTier As String: lastTier = Chr(1)
    For i = 1 To m_ResCount
        Dim isCited As Boolean
        isCited = (InStr(citedSet, "|" & m_ResIds(i) & "|") > 0)
        If onlyUncited And isCited Then GoTo NextItem

        If m_ResTiers(i) <> lastTier Then
            lastTier = m_ResTiers(i)
            lst.AddItem ""
            lst.List(lst.ListCount - 1, 2) = "--- " & UCase(WorkspaceTierLabel(lastTier)) & " ---"
            m_WsRowCount = m_WsRowCount + 1
            m_WsRowMap(m_WsRowCount) = 0
        End If

        Dim authorYr As String: authorYr = m_ResAuthors(i)
        If Len(authorYr) > 20 Then authorYr = Left(authorYr, 17) & "..."
        authorYr = authorYr & " (" & m_ResYears(i) & ")"

        Dim ttl As String: ttl = m_ResTitles(i)
        If Len(ttl) > 40 Then ttl = Left(ttl, 37) & "..."

        Dim tg As String: tg = m_ResTags(i)
        If Len(tg) > 26 Then tg = Left(tg, 23) & "..."

        Dim mark As String: mark = ""
        If isCited Then mark = checkMark

        lst.AddItem mark
        lst.List(lst.ListCount - 1, 1) = WorkspaceTierLabel(m_ResTiers(i))
        lst.List(lst.ListCount - 1, 2) = authorYr
        lst.List(lst.ListCount - 1, 3) = ttl
        lst.List(lst.ListCount - 1, 4) = tg
        m_WsRowCount = m_WsRowCount + 1
        m_WsRowMap(m_WsRowCount) = i
NextItem:
    Next i
End Sub

' Pipe-delimited set of every reference id cited in the active document
' ("|id1|id2|") - the citation tracker's source of truth. Group citations
' (comma-joined CITE: tags) are unpacked into their individual ids. Returns
' just "|" when there is no document / no citations, so InStr probes on
' "|id|" stay safe.
Private Function BuildCitedIdSet() As String
    Dim citedSet As String: citedSet = "|"
    On Error GoTo Done
    Dim cc As ContentControl
    For Each cc In ActiveDocument.ContentControls
        If Left(cc.Tag, Len(CITE_TAG_PREFIX)) = CITE_TAG_PREFIX Then
            Dim ids() As String
            ids = Split(Mid(cc.Tag, Len(CITE_TAG_PREFIX) + 1), ",")
            Dim i As Long
            For i = LBound(ids) To UBound(ids)
                Dim oneId As String: oneId = Trim(ids(i))
                If oneId <> "" Then
                    If InStr(citedSet, "|" & oneId & "|") = 0 Then
                        citedSet = citedSet & oneId & "|"
                    End If
                End If
            Next i
        End If
    Next cc
Done:
    BuildCitedIdSet = citedSet
End Function

' Translate a workspace list row (1-based) to a result index; 0 for headers.
Public Function FormBridge_WS_RowToResult(rowIndex As Long) As Long
    FormBridge_WS_RowToResult = 0
    If rowIndex < 1 Or rowIndex > m_WsRowCount Then Exit Function
    FormBridge_WS_RowToResult = m_WsRowMap(rowIndex)
End Function

' (Re)fill the tag combo from the last fetched facet, keeping the current
' selection when that tag still exists in the workspace.
Private Sub FillWorkspaceTagCombo(cmbTag As Object, currentChoice As String)
    On Error Resume Next
    Dim keep As String: keep = Trim(currentChoice)
    cmbTag.Clear
    cmbTag.AddItem "(All tags)"
    Dim selIdx As Long: selIdx = 0
    Dim i As Long
    For i = 1 To m_WsTagCount
        cmbTag.AddItem m_WsTagNames(i)
        If m_WsTagNames(i) = keep Then selIdx = i
    Next i
    cmbTag.ListIndex = selIdx
    On Error GoTo 0
End Sub

' (Re)fill the chapter combo from the last fetched facet, keeping the current
' selection when that chapter still exists in the workspace.
Private Sub FillWorkspaceChapterCombo(cmbChapter As Object, currentChoice As String)
    On Error Resume Next
    Dim keep As String: keep = Trim(currentChoice)
    cmbChapter.Clear
    cmbChapter.AddItem "(All chapters)"
    Dim selIdx As Long: selIdx = 0
    Dim i As Long
    For i = 1 To m_WsChapterCount
        cmbChapter.AddItem m_WsChapterNames(i)
        If m_WsChapterNames(i) = keep Then selIdx = i
    Next i
    cmbChapter.ListIndex = selIdx
    On Error GoTo 0
End Sub

' Summary + chapters + tags for a workspace list row (1-based), formatted for
' the read-only preview box under the results list. "" for header rows.
Public Function FormBridge_WS_RowSummary(rowIndex As Long) As String
    FormBridge_WS_RowSummary = ""
    If rowIndex < 1 Or rowIndex > m_WsRowCount Then Exit Function
    Dim r As Long: r = m_WsRowMap(rowIndex)
    If r < 1 Or r > m_ResCount Then Exit Function

    Dim out As String
    If m_ResChapters(r) <> "" Then out = "Chapter: " & m_ResChapters(r) & vbCrLf
    If m_ResTags(r) <> "" Then out = out & "Tags: " & m_ResTags(r) & vbCrLf
    If m_ResSummaries(r) <> "" Then
        out = out & vbCrLf & m_ResSummaries(r)
    ElseIf out = "" Then
        out = "(No workspace summary, chapter or tags for this reference.)"
    End If
    FormBridge_WS_RowSummary = out
End Function

' ============================================================================
' DYNAMIC USERFORM CREATION  (requires VBA project trust)
' ============================================================================

Private Function GetVBProject() As Object
    On Error GoTo NoProj
    Set GetVBProject = Nothing
    Dim proj As Object
    For Each proj In Application.VBE.VBProjects
        On Error Resume Next
        Dim comp As Object: Set comp = Nothing
        Set comp = proj.VBComponents("ESABCC_RefManager")
        On Error GoTo NoProj
        If Not comp Is Nothing Then
            Set GetVBProject = proj
            Exit Function
        End If
    Next proj
NoProj:
    Set GetVBProject = Nothing
End Function

Private Function FormExists(proj As Object, formName As String) As Boolean
    On Error Resume Next
    Dim comp As Object: Set comp = Nothing
    Set comp = proj.VBComponents(formName)
    FormExists = (Not comp Is Nothing)
    On Error GoTo 0
End Function

Private Function ShowFormByName(proj As Object, formName As String, formTitle As String) As Boolean
    On Error GoTo ShowErr
    ShowFormByName = False

    Select Case formName
        Case "frmESABCC_Search"
            Application.Run "ESABCCHelper_ShowSearch", formTitle
        Case "frmESABCC_DOI"
            Application.Run "ESABCCHelper_ShowDOI", formTitle
        Case Else
            Exit Function
    End Select

    ShowFormByName = True
    Exit Function

ShowErr:
    ShowFormByName = False
End Function

Private Function CompExists(proj As Object, compName As String) As Boolean
    On Error Resume Next
    Dim c As Object: Set c = Nothing
    Set c = proj.VBComponents(compName)
    CompExists = (Not c Is Nothing)
    On Error GoTo 0
End Function

' True only when the workspace form's designer is readable AND the named
' control is absent (used to spot a pre-chapter-filter build). When the
' designer can't be inspected (no VBOM trust) it returns False, so we never
' force a rebuild we couldn't perform anyway.
Private Function WorkspaceFormControlMissing(proj As Object, ctlName As String) As Boolean
    WorkspaceFormControlMissing = False
    On Error GoTo CleanExit
    Dim comp As Object: Set comp = proj.VBComponents("frmESABCC_Workspace")
    If comp Is Nothing Then Exit Function
    Dim dsn As Object: Set dsn = comp.Designer
    If dsn Is Nothing Then Exit Function
    Dim ctl As Object
    On Error Resume Next
    Set ctl = dsn.Controls(ctlName)
    On Error GoTo CleanExit
    WorkspaceFormControlMissing = (ctl Is Nothing)
    Exit Function
CleanExit:
    WorkspaceFormControlMissing = False
End Function

Private Function EnsureFormsReady() As Boolean
    ' Fast path: every piece already present (and the workspace form carries the
    ' chapter filter + summary preview) -> nothing to do.
    On Error GoTo FormErr
    Dim proj As Object: Set proj = GetVBProject()
    If proj Is Nothing Then GoTo FormErr

    If CompExists(proj, "frmESABCC_Search") _
       And CompExists(proj, "frmESABCC_DOI") _
       And CompExists(proj, "frmESABCC_Workspace") _
       And CompExists(proj, "ESABCCHelper") _
       And Not WorkspaceFormControlMissing(proj, "txtSummary") Then
        EnsureFormsReady = True
        Exit Function
    End If

    ' Slow path: route through ESABCC_BuildForms so the failure mode is
    ' logged to %TEMP%\esabcc-build-forms.log (instead of being silently
    ' swallowed). If it raises we fall through to the InputBox fallback.
    On Error Resume Next
    ESABCC_BuildForms
    Dim buildErr As Long: buildErr = Err.Number
    On Error GoTo 0

    EnsureFormsReady = (buildErr = 0)
    Exit Function
FormErr:
    EnsureFormsReady = False
End Function

Private Function BuildHelperModule(proj As Object) As Boolean
    ' Permanent std-module that dispatches Show/Unload for each form. Built
    ' once by EnsureFormsReady after the forms exist, so the direct form
    ' references compile cleanly.
    On Error GoTo HelperErr
    BuildHelperModule = False

    Dim m As Object
    Set m = proj.VBComponents.Add(1)  ' vbext_ct_StdModule
    m.Name = "ESABCCHelper"

    Dim code As String
    code = "Option Explicit" & vbCrLf & vbCrLf & _
           "Public Sub ESABCCHelper_ShowSearch(ByVal formTitle As String)" & vbCrLf & _
           "    frmESABCC_Search.Caption = formTitle" & vbCrLf & _
           "    frmESABCC_Search.Show 1" & vbCrLf & _
           "    On Error Resume Next" & vbCrLf & _
           "    Unload frmESABCC_Search" & vbCrLf & _
           "End Sub" & vbCrLf & vbCrLf & _
           "Public Sub ESABCCHelper_ShowDOI(ByVal formTitle As String)" & vbCrLf & _
           "    frmESABCC_DOI.Caption = formTitle" & vbCrLf & _
           "    frmESABCC_DOI.Show 1" & vbCrLf & _
           "    On Error Resume Next" & vbCrLf & _
           "    Unload frmESABCC_DOI" & vbCrLf & _
           "End Sub" & vbCrLf & vbCrLf & _
           "Public Sub ESABCCHelper_ShowEdit()" & vbCrLf & _
           "    frmESABCC_Edit.Show 1" & vbCrLf & _
           "    On Error Resume Next" & vbCrLf & _
           "    Unload frmESABCC_Edit" & vbCrLf & _
           "End Sub" & vbCrLf & vbCrLf & _
           "Public Sub ESABCCHelper_ShowWorkspace(ByVal formTitle As String)" & vbCrLf & _
           "    frmESABCC_Workspace.Caption = formTitle" & vbCrLf & _
           "    frmESABCC_Workspace.Show 1" & vbCrLf & _
           "    On Error Resume Next" & vbCrLf & _
           "    Unload frmESABCC_Workspace" & vbCrLf & _
           "End Sub"
    m.CodeModule.AddFromString code

    BuildHelperModule = True
    Exit Function
HelperErr:
    On Error Resume Next
    proj.VBComponents.Remove proj.VBComponents("ESABCCHelper")
    On Error GoTo 0
    BuildHelperModule = False
End Function

Private Function BuildSearchForm(proj As Object) As Boolean
    On Error GoTo BuildErr
    BuildSearchForm = False

    Dim frm As Object
    Set frm = proj.VBComponents.Add(3)  ' vbext_ct_MSForm
    frm.Name = "frmESABCC_Search"

    frm.Properties("Caption") = "ESABCC - Search References"
    frm.Properties("Width") = 534
    frm.Properties("Height") = 540  ' taller to fit the group-mode basket panel
    frm.Properties("StartUpPosition") = 1

    Dim d As Object: Set d = frm.Designer
    Dim c As Object

    ' ── ESABCC branded banner ──
    Set c = d.Controls.Add("Forms.Label.1", "lblBanner", True)
    c.Caption = ""
    c.Left = 0: c.Top = 0: c.Width = 534: c.Height = 46
    c.BackStyle = 1: c.BackColor = RGB(55, 95, 105)

    Set c = d.Controls.Add("Forms.Label.1", "lblBrand", True)
    c.Caption = "ESABCC"
    c.Left = 14: c.Top = 4: c.Width = 200: c.Height = 22
    c.Font.Size = 14: c.Font.Bold = True
    c.ForeColor = RGB(255, 255, 255): c.BackStyle = 0

    Set c = d.Controls.Add("Forms.Label.1", "lblOrg", True)
    c.Caption = "European Scientific Advisory Board on Climate Change"
    c.Left = 14: c.Top = 26: c.Width = 420: c.Height = 14
    c.Font.Size = 8
    c.ForeColor = RGB(190, 210, 215): c.BackStyle = 0

    ' Search box
    Set c = d.Controls.Add("Forms.TextBox.1", "txtSearch", True)
    c.Left = 14: c.Top = 56: c.Width = 400: c.Height = 22
    c.Font.Size = 10

    ' Search button
    Set c = d.Controls.Add("Forms.CommandButton.1", "btnSearch", True)
    c.Caption = "Search"
    c.Left = 420: c.Top = 54: c.Width = 96: c.Height = 26
    c.Font.Size = 10: c.Font.Bold = True

    ' Project filter label
    Set c = d.Controls.Add("Forms.Label.1", "lblProject", True)
    c.Caption = "Project:"
    c.Left = 14: c.Top = 86: c.Width = 48: c.Height = 16
    c.Font.Size = 9: c.ForeColor = RGB(60, 60, 60): c.BackStyle = 0

    ' Project filter combo - scopes the list to one report's literature
    Set c = d.Controls.Add("Forms.ComboBox.1", "cmbProject", True)
    c.Left = 64: c.Top = 84: c.Width = 452: c.Height = 20
    c.Font.Size = 9
    c.Style = 2  ' fmStyleDropDownList - pick from the list only

    ' Hint
    Set c = d.Controls.Add("Forms.Label.1", "lblHint", True)
    c.Caption = "Leave empty and click Search to see recently added references"
    c.Left = 14: c.Top = 110: c.Width = 504: c.Height = 14
    c.Font.Size = 8: c.ForeColor = RGB(120, 120, 120): c.BackStyle = 0

    ' Status
    Set c = d.Controls.Add("Forms.Label.1", "lblStatus", True)
    c.Caption = ""
    c.Left = 14: c.Top = 126: c.Width = 504: c.Height = 16
    c.Font.Size = 9: c.Font.Bold = True
    c.ForeColor = RGB(60, 60, 60): c.BackStyle = 0

    ' Results list (3-column)
    Set c = d.Controls.Add("Forms.ListBox.1", "lstResults", True)
    c.Left = 14: c.Top = 146: c.Width = 504: c.Height = 230
    c.Font.Size = 10
    c.ColumnCount = 3
    c.ColumnWidths = "148;238;115"

    ' Basket label (group mode only - toggled visible in Initialize)
    Set c = d.Controls.Add("Forms.Label.1", "lblBasket", True)
    c.Caption = "Basket: empty - search and click 'Add to Group'"
    c.Left = 14: c.Top = 386: c.Width = 420: c.Height = 14
    c.Font.Size = 9: c.Font.Bold = True
    c.ForeColor = RGB(60, 60, 60): c.BackStyle = 0

    ' Basket "Remove selected" button
    Set c = d.Controls.Add("Forms.CommandButton.1", "btnBasketRemove", True)
    c.Caption = "Remove"
    c.Left = 440: c.Top = 384: c.Width = 78: c.Height = 20
    c.Font.Size = 9

    ' Basket list
    Set c = d.Controls.Add("Forms.ListBox.1", "lstBasket", True)
    c.Left = 14: c.Top = 406: c.Width = 504: c.Height = 60
    c.Font.Size = 10

    ' Insert / Add-to-Group button
    Set c = d.Controls.Add("Forms.CommandButton.1", "btnInsert", True)
    c.Caption = "Insert Citation"
    c.Left = 14: c.Top = 478: c.Width = 130: c.Height = 32
    c.Font.Size = 10: c.Font.Bold = True

    ' View button
    Set c = d.Controls.Add("Forms.CommandButton.1", "btnView", True)
    c.Caption = "View in Browser"
    c.Left = 152: c.Top = 478: c.Width = 120: c.Height = 32
    c.Font.Size = 10

    ' Done button (group mode only)
    Set c = d.Controls.Add("Forms.CommandButton.1", "btnDone", True)
    c.Caption = "Done (insert group)"
    c.Left = 280: c.Top = 478: c.Width = 140: c.Height = 32
    c.Font.Size = 10: c.Font.Bold = True
    c.BackColor = RGB(55, 95, 105)
    c.ForeColor = RGB(255, 255, 255)

    ' Cancel button
    Set c = d.Controls.Add("Forms.CommandButton.1", "btnCancel", True)
    c.Caption = "Cancel"
    c.Left = 428: c.Top = 478: c.Width = 90: c.Height = 32
    c.Font.Size = 10
    c.Cancel = True

    ' Inject event handler code
    Dim s As String
    s = "Private mReady As Boolean" & vbCrLf & vbCrLf & _
        "Private Sub UserForm_Initialize()" & vbCrLf & _
        "    If ESABCC_RefManager.g_GroupMode Then" & vbCrLf & _
        "        Me.btnInsert.Caption = ""Add to Group""" & vbCrLf & _
        "        Me.lblBasket.Visible = True" & vbCrLf & _
        "        Me.lstBasket.Visible = True" & vbCrLf & _
        "        Me.btnBasketRemove.Visible = True" & vbCrLf & _
        "        Me.btnDone.Visible = True" & vbCrLf & _
        "        ESABCC_RefManager.FormBridge_RenderBasket Me.lstBasket, Me.lblBasket" & vbCrLf & _
        "    Else" & vbCrLf & _
        "        Me.btnInsert.Caption = ""Insert Citation""" & vbCrLf & _
        "        Me.lblBasket.Visible = False" & vbCrLf & _
        "        Me.lstBasket.Visible = False" & vbCrLf & _
        "        Me.btnBasketRemove.Visible = False" & vbCrLf & _
        "        Me.btnDone.Visible = False" & vbCrLf & _
        "    End If" & vbCrLf & _
        "    ESABCC_RefManager.FormBridge_LoadProjects Me.cmbProject" & vbCrLf & _
        "    Me.txtSearch.SetFocus" & vbCrLf & _
        "    mReady = True" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub btnSearch_Click()" & vbCrLf & _
        "    Me.lblStatus.Caption = ""Searching...""" & vbCrLf & _
        "    Me.lblStatus.ForeColor = &H808080" & vbCrLf & _
        "    DoEvents" & vbCrLf & _
        "    ESABCC_RefManager.FormBridge_Search Me.txtSearch.Value, Me.lstResults, Me.lblStatus, Me.cmbProject.Value" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub cmbProject_Change()" & vbCrLf & _
        "    If Not mReady Then Exit Sub" & vbCrLf & _
        "    btnSearch_Click" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub txtSearch_KeyDown(ByVal KeyCode As MSForms.ReturnInteger, ByVal Shift As Integer)" & vbCrLf & _
        "    If KeyCode = 13 Then btnSearch_Click" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub btnInsert_Click()" & vbCrLf & _
        "    If Me.lstResults.ListIndex < 0 Then Exit Sub" & vbCrLf & _
        "    If ESABCC_RefManager.g_GroupMode Then" & vbCrLf & _
        "        ESABCC_RefManager.FormBridge_AddToBasket Me.lstResults.ListIndex + 1" & vbCrLf & _
        "        Me.txtSearch.Value = """"" & vbCrLf & _
        "        Me.lstResults.Clear" & vbCrLf & _
        "        Me.lblStatus.Caption = """"" & vbCrLf & _
        "        ESABCC_RefManager.FormBridge_RenderBasket Me.lstBasket, Me.lblBasket" & vbCrLf & _
        "        Me.txtSearch.SetFocus" & vbCrLf & _
        "    Else" & vbCrLf & _
        "        ESABCC_RefManager.g_SelectedIndex = Me.lstResults.ListIndex + 1" & vbCrLf & _
        "        Me.Hide" & vbCrLf & _
        "    End If" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub lstResults_DblClick(ByVal Cancel As MSForms.ReturnBoolean)" & vbCrLf & _
        "    btnInsert_Click" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub btnView_Click()" & vbCrLf & _
        "    If Me.lstResults.ListIndex >= 0 Then" & vbCrLf & _
        "        ESABCC_RefManager.FormBridge_ViewInBrowser Me.lstResults.ListIndex + 1" & vbCrLf & _
        "    End If" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub btnDone_Click()" & vbCrLf & _
        "    ESABCC_RefManager.g_GroupDone = True" & vbCrLf & _
        "    Me.Hide" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub btnBasketRemove_Click()" & vbCrLf & _
        "    If Me.lstBasket.ListIndex < 0 Then Exit Sub" & vbCrLf & _
        "    ESABCC_RefManager.FormBridge_RemoveFromBasket Me.lstBasket.ListIndex + 1" & vbCrLf & _
        "    ESABCC_RefManager.FormBridge_RenderBasket Me.lstBasket, Me.lblBasket" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub btnCancel_Click()" & vbCrLf & _
        "    ESABCC_RefManager.g_SelectedIndex = 0" & vbCrLf & _
        "    Me.Hide" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub UserForm_QueryClose(Cancel As Integer, CloseMode As Integer)" & vbCrLf & _
        "    If CloseMode = 0 Then" & vbCrLf & _
        "        Cancel = True" & vbCrLf & _
        "        ESABCC_RefManager.g_SelectedIndex = 0" & vbCrLf & _
        "        Me.Hide" & vbCrLf & _
        "    End If" & vbCrLf & _
        "End Sub"

    frm.CodeModule.InsertLines frm.CodeModule.CountOfLines + 1, s

    BuildSearchForm = True
    Exit Function
BuildErr:
    On Error Resume Next
    proj.VBComponents.Remove proj.VBComponents("frmESABCC_Search")
    On Error GoTo 0
    BuildSearchForm = False
End Function

' "Cite from Project Workspace" picker: workspace combo + source-type and tag
' filters + search box over a clustered result list (policy / scientific /
' grey literature headers). Built once at install time like the search form.
Private Function BuildWorkspaceForm(proj As Object) As Boolean
    On Error GoTo BuildErr
    BuildWorkspaceForm = False

    Dim frm As Object
    Set frm = proj.VBComponents.Add(3)  ' vbext_ct_MSForm
    frm.Name = "frmESABCC_Workspace"

    frm.Properties("Caption") = "ESABCC - Cite from Project Workspace"
    frm.Properties("Width") = 534
    frm.Properties("Height") = 556
    frm.Properties("StartUpPosition") = 1

    Dim d As Object: Set d = frm.Designer
    Dim c As Object

    ' ── ESABCC branded banner ──
    Set c = d.Controls.Add("Forms.Label.1", "lblBanner", True)
    c.Caption = ""
    c.Left = 0: c.Top = 0: c.Width = 534: c.Height = 46
    c.BackStyle = 1: c.BackColor = RGB(55, 95, 105)

    Set c = d.Controls.Add("Forms.Label.1", "lblBrand", True)
    c.Caption = "ESABCC"
    c.Left = 14: c.Top = 4: c.Width = 200: c.Height = 22
    c.Font.Size = 14: c.Font.Bold = True
    c.ForeColor = RGB(255, 255, 255): c.BackStyle = 0

    Set c = d.Controls.Add("Forms.Label.1", "lblOrg", True)
    c.Caption = "Cite from a project workspace - literature clustered by source type"
    c.Left = 14: c.Top = 26: c.Width = 480: c.Height = 14
    c.Font.Size = 8
    c.ForeColor = RGB(190, 210, 215): c.BackStyle = 0

    ' Workspace picker
    Set c = d.Controls.Add("Forms.Label.1", "lblProject", True)
    c.Caption = "Workspace:"
    c.Left = 14: c.Top = 58: c.Width = 62: c.Height = 16
    c.Font.Size = 9: c.ForeColor = RGB(60, 60, 60): c.BackStyle = 0

    Set c = d.Controls.Add("Forms.ComboBox.1", "cmbProject", True)
    c.Left = 80: c.Top = 56: c.Width = 436: c.Height = 20
    c.Font.Size = 9
    c.Style = 2  ' fmStyleDropDownList - pick from the list only

    ' Source-type (tier) filter
    Set c = d.Controls.Add("Forms.Label.1", "lblTier", True)
    c.Caption = "Type:"
    c.Left = 14: c.Top = 86: c.Width = 32: c.Height = 16
    c.Font.Size = 9: c.ForeColor = RGB(60, 60, 60): c.BackStyle = 0

    Set c = d.Controls.Add("Forms.ComboBox.1", "cmbTier", True)
    c.Left = 50: c.Top = 84: c.Width = 182: c.Height = 20
    c.Font.Size = 9
    c.Style = 2

    ' Tag filter
    Set c = d.Controls.Add("Forms.Label.1", "lblTag", True)
    c.Caption = "Tag:"
    c.Left = 242: c.Top = 86: c.Width = 26: c.Height = 16
    c.Font.Size = 9: c.ForeColor = RGB(60, 60, 60): c.BackStyle = 0

    Set c = d.Controls.Add("Forms.ComboBox.1", "cmbTag", True)
    c.Left = 272: c.Top = 84: c.Width = 244: c.Height = 20
    c.Font.Size = 9
    c.Style = 2

    ' Chapter (report-chapter / sector) filter
    Set c = d.Controls.Add("Forms.Label.1", "lblChapter", True)
    c.Caption = "Chapter:"
    c.Left = 14: c.Top = 114: c.Width = 50: c.Height = 16
    c.Font.Size = 9: c.ForeColor = RGB(60, 60, 60): c.BackStyle = 0

    Set c = d.Controls.Add("Forms.ComboBox.1", "cmbChapter", True)
    c.Left = 66: c.Top = 112: c.Width = 450: c.Height = 20
    c.Font.Size = 9
    c.Style = 2

    ' Search box
    Set c = d.Controls.Add("Forms.TextBox.1", "txtSearch", True)
    c.Left = 14: c.Top = 142: c.Width = 296: c.Height = 22
    c.Font.Size = 10

    ' Citation-tracker filter: hide the rows already cited in this document
    Set c = d.Controls.Add("Forms.CheckBox.1", "chkUncited", True)
    c.Caption = "Not yet cited only"
    c.Left = 318: c.Top = 143: c.Width = 96: c.Height = 18
    c.Font.Size = 8
    c.Value = False

    ' Search button
    Set c = d.Controls.Add("Forms.CommandButton.1", "btnSearch", True)
    c.Caption = "Search"
    c.Left = 420: c.Top = 140: c.Width = 96: c.Height = 26
    c.Font.Size = 10: c.Font.Bold = True

    ' Hint (citation-tracker legend)
    Set c = d.Controls.Add("Forms.Label.1", "lblHint", True)
    c.Caption = ChrW(10003) & " = already cited - clustered by policy / scientific / grey. Filter by chapter or tag; click a row for its summary."
    c.Left = 14: c.Top = 170: c.Width = 504: c.Height = 14
    c.Font.Size = 8: c.ForeColor = RGB(120, 120, 120): c.BackStyle = 0

    ' Status
    Set c = d.Controls.Add("Forms.Label.1", "lblStatus", True)
    c.Caption = ""
    c.Left = 14: c.Top = 186: c.Width = 504: c.Height = 16
    c.Font.Size = 9: c.Font.Bold = True
    c.ForeColor = RGB(60, 60, 60): c.BackStyle = 0

    ' Results list (5-column: cited mark, source, author/year, title, tags)
    Set c = d.Controls.Add("Forms.ListBox.1", "lstResults", True)
    c.Left = 14: c.Top = 206: c.Width = 504: c.Height = 176
    c.Font.Size = 10
    c.ColumnCount = 5
    c.ColumnWidths = "20;52;124;212;88"

    ' Summary / chapter / tags preview for the selected row (read-only)
    Set c = d.Controls.Add("Forms.Label.1", "lblSummaryHdr", True)
    c.Caption = "Summary & classification of selected reference:"
    c.Left = 14: c.Top = 386: c.Width = 504: c.Height = 14
    c.Font.Size = 8: c.Font.Bold = True: c.ForeColor = RGB(90, 90, 90): c.BackStyle = 0

    Set c = d.Controls.Add("Forms.TextBox.1", "txtSummary", True)
    c.Left = 14: c.Top = 402: c.Width = 504: c.Height = 62
    c.Font.Size = 9
    c.MultiLine = True
    c.WordWrap = True
    c.Locked = True
    c.BackColor = RGB(245, 245, 245)
    c.SpecialEffect = 2  ' fmSpecialEffectSunken
    c.ScrollBars = 2     ' fmScrollBarsVertical

    ' Insert button
    Set c = d.Controls.Add("Forms.CommandButton.1", "btnInsert", True)
    c.Caption = "Insert Citation"
    c.Left = 14: c.Top = 474: c.Width = 130: c.Height = 30
    c.Font.Size = 10: c.Font.Bold = True

    ' View button
    Set c = d.Controls.Add("Forms.CommandButton.1", "btnView", True)
    c.Caption = "View in Browser"
    c.Left = 152: c.Top = 474: c.Width = 120: c.Height = 30
    c.Font.Size = 10

    ' Cancel button
    Set c = d.Controls.Add("Forms.CommandButton.1", "btnCancel", True)
    c.Caption = "Cancel"
    c.Left = 428: c.Top = 474: c.Width = 90: c.Height = 30
    c.Font.Size = 10
    c.Cancel = True

    ' Inject event handler code
    Dim s As String
    s = "Private mReady As Boolean" & vbCrLf & _
        "Private mBusy As Boolean" & vbCrLf & vbCrLf & _
        "Private Sub UserForm_Initialize()" & vbCrLf & _
        "    mBusy = True" & vbCrLf & _
        "    Me.cmbTier.Clear" & vbCrLf & _
        "    Me.cmbTier.AddItem ""(All types)""" & vbCrLf & _
        "    Me.cmbTier.AddItem ""Policy documents""" & vbCrLf & _
        "    Me.cmbTier.AddItem ""Scientific literature""" & vbCrLf & _
        "    Me.cmbTier.AddItem ""Grey literature & reports""" & vbCrLf & _
        "    Me.cmbTier.ListIndex = 0" & vbCrLf & _
        "    Me.cmbTag.Clear" & vbCrLf & _
        "    Me.cmbTag.AddItem ""(All tags)""" & vbCrLf & _
        "    Me.cmbTag.ListIndex = 0" & vbCrLf & _
        "    Me.cmbChapter.Clear" & vbCrLf & _
        "    Me.cmbChapter.AddItem ""(All chapters)""" & vbCrLf & _
        "    Me.cmbChapter.ListIndex = 0" & vbCrLf & _
        "    ESABCC_RefManager.FormBridge_WS_LoadProjects Me.cmbProject, Me.lblStatus" & vbCrLf & _
        "    mBusy = False" & vbCrLf & _
        "    mReady = True" & vbCrLf & _
        "    If Me.cmbProject.ListCount > 0 Then RunSearch" & vbCrLf & _
        "    Me.txtSearch.SetFocus" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub RunSearch()" & vbCrLf & _
        "    If mBusy Then Exit Sub" & vbCrLf & _
        "    mBusy = True" & vbCrLf & _
        "    Me.lblStatus.Caption = ""Loading...""" & vbCrLf & _
        "    Me.lblStatus.ForeColor = &H808080" & vbCrLf & _
        "    Me.txtSummary.Value = """"" & vbCrLf & _
        "    DoEvents" & vbCrLf & _
        "    ESABCC_RefManager.FormBridge_WS_Search Me.cmbProject.ListIndex, Me.cmbTier.ListIndex, " & _
                 "Me.cmbTag.Value & """", Me.txtSearch.Value, Me.lstResults, Me.lblStatus, Me.cmbTag, " & _
                 "(Me.chkUncited.Value = True), Me.cmbChapter.Value & """", Me.cmbChapter" & vbCrLf & _
        "    mBusy = False" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub btnSearch_Click()" & vbCrLf & _
        "    RunSearch" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub cmbProject_Change()" & vbCrLf & _
        "    If Not mReady Or mBusy Then Exit Sub" & vbCrLf & _
        "    mBusy = True" & vbCrLf & _
        "    Me.cmbTag.Clear" & vbCrLf & _
        "    Me.cmbTag.AddItem ""(All tags)""" & vbCrLf & _
        "    Me.cmbTag.ListIndex = 0" & vbCrLf & _
        "    Me.cmbChapter.Clear" & vbCrLf & _
        "    Me.cmbChapter.AddItem ""(All chapters)""" & vbCrLf & _
        "    Me.cmbChapter.ListIndex = 0" & vbCrLf & _
        "    mBusy = False" & vbCrLf & _
        "    RunSearch" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub cmbTier_Change()" & vbCrLf & _
        "    If Not mReady Or mBusy Then Exit Sub" & vbCrLf & _
        "    RunSearch" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub cmbTag_Change()" & vbCrLf & _
        "    If Not mReady Or mBusy Then Exit Sub" & vbCrLf & _
        "    RunSearch" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub cmbChapter_Change()" & vbCrLf & _
        "    If Not mReady Or mBusy Then Exit Sub" & vbCrLf & _
        "    RunSearch" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub lstResults_Change()" & vbCrLf & _
        "    If mBusy Then Exit Sub" & vbCrLf & _
        "    If Me.lstResults.ListIndex < 0 Then Me.txtSummary.Value = """": Exit Sub" & vbCrLf & _
        "    Me.txtSummary.Value = ESABCC_RefManager.FormBridge_WS_RowSummary(Me.lstResults.ListIndex + 1)" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub chkUncited_Click()" & vbCrLf & _
        "    If Not mReady Or mBusy Then Exit Sub" & vbCrLf & _
        "    RunSearch" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub txtSearch_KeyDown(ByVal KeyCode As MSForms.ReturnInteger, ByVal Shift As Integer)" & vbCrLf & _
        "    If KeyCode = 13 Then RunSearch" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub btnInsert_Click()" & vbCrLf & _
        "    If Me.lstResults.ListIndex < 0 Then Exit Sub" & vbCrLf & _
        "    Dim r As Long" & vbCrLf & _
        "    r = ESABCC_RefManager.FormBridge_WS_RowToResult(Me.lstResults.ListIndex + 1)" & vbCrLf & _
        "    If r < 1 Then Exit Sub" & vbCrLf & _
        "    ESABCC_RefManager.g_SelectedIndex = r" & vbCrLf & _
        "    Me.Hide" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub lstResults_DblClick(ByVal Cancel As MSForms.ReturnBoolean)" & vbCrLf & _
        "    btnInsert_Click" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub btnView_Click()" & vbCrLf & _
        "    If Me.lstResults.ListIndex < 0 Then Exit Sub" & vbCrLf & _
        "    Dim r As Long" & vbCrLf & _
        "    r = ESABCC_RefManager.FormBridge_WS_RowToResult(Me.lstResults.ListIndex + 1)" & vbCrLf & _
        "    If r >= 1 Then ESABCC_RefManager.FormBridge_ViewInBrowser r" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub btnCancel_Click()" & vbCrLf & _
        "    ESABCC_RefManager.g_SelectedIndex = 0" & vbCrLf & _
        "    Me.Hide" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub UserForm_QueryClose(Cancel As Integer, CloseMode As Integer)" & vbCrLf & _
        "    If CloseMode = 0 Then" & vbCrLf & _
        "        Cancel = True" & vbCrLf & _
        "        ESABCC_RefManager.g_SelectedIndex = 0" & vbCrLf & _
        "        Me.Hide" & vbCrLf & _
        "    End If" & vbCrLf & _
        "End Sub"

    frm.CodeModule.InsertLines frm.CodeModule.CountOfLines + 1, s

    BuildWorkspaceForm = True
    Exit Function
BuildErr:
    On Error Resume Next
    proj.VBComponents.Remove proj.VBComponents("frmESABCC_Workspace")
    On Error GoTo 0
    BuildWorkspaceForm = False
End Function

Private Function BuildDOIForm(proj As Object) As Boolean
    On Error GoTo BuildErr
    BuildDOIForm = False

    Dim frm As Object
    Set frm = proj.VBComponents.Add(3)
    frm.Name = "frmESABCC_DOI"

    frm.Properties("Caption") = "ESABCC - Add by DOI"
    frm.Properties("Width") = 480
    frm.Properties("Height") = 418
    frm.Properties("StartUpPosition") = 1

    Dim d As Object: Set d = frm.Designer
    Dim c As Object

    ' ── ESABCC branded banner ──
    Set c = d.Controls.Add("Forms.Label.1", "lblBanner", True)
    c.Caption = ""
    c.Left = 0: c.Top = 0: c.Width = 480: c.Height = 46
    c.BackStyle = 1: c.BackColor = RGB(55, 95, 105)

    Set c = d.Controls.Add("Forms.Label.1", "lblBrand", True)
    c.Caption = "ESABCC"
    c.Left = 14: c.Top = 4: c.Width = 200: c.Height = 22
    c.Font.Size = 14: c.Font.Bold = True
    c.ForeColor = RGB(255, 255, 255): c.BackStyle = 0

    Set c = d.Controls.Add("Forms.Label.1", "lblOrg", True)
    c.Caption = "European Scientific Advisory Board on Climate Change"
    c.Left = 14: c.Top = 26: c.Width = 420: c.Height = 14
    c.Font.Size = 8
    c.ForeColor = RGB(190, 210, 215): c.BackStyle = 0

    ' DOI textbox
    Set c = d.Controls.Add("Forms.TextBox.1", "txtDOI", True)
    c.Left = 14: c.Top = 56: c.Width = 348: c.Height = 22
    c.Font.Size = 10

    ' Lookup button
    Set c = d.Controls.Add("Forms.CommandButton.1", "btnLookup", True)
    c.Caption = "Look Up"
    c.Left = 370: c.Top = 54: c.Width = 90: c.Height = 26
    c.Font.Size = 10: c.Font.Bold = True

    ' Hint
    Set c = d.Controls.Add("Forms.Label.1", "lblHint", True)
    c.Caption = "Example: 10.1038/s41558-020-0783-3  or paste full DOI URL"
    c.Left = 14: c.Top = 82: c.Width = 446: c.Height = 14
    c.Font.Size = 8: c.ForeColor = RGB(120, 120, 120): c.BackStyle = 0

    ' Status
    Set c = d.Controls.Add("Forms.Label.1", "lblStatus", True)
    c.Caption = ""
    c.Left = 14: c.Top = 98: c.Width = 446: c.Height = 16
    c.Font.Size = 9: c.Font.Bold = True
    c.ForeColor = RGB(60, 60, 60): c.BackStyle = 0

    ' Preview (multiline read-only textbox)
    Set c = d.Controls.Add("Forms.TextBox.1", "txtPreview", True)
    c.Left = 14: c.Top = 118: c.Width = 446: c.Height = 200
    c.Font.Size = 10
    c.MultiLine = True
    c.Locked = True
    c.ScrollBars = 2  ' vertical
    c.BackColor = RGB(245, 245, 245)

    ' Insert button
    Set c = d.Controls.Add("Forms.CommandButton.1", "btnInsert", True)
    c.Caption = "Insert Citation"
    c.Left = 14: c.Top = 332: c.Width = 120: c.Height = 32
    c.Font.Size = 10: c.Font.Bold = True
    c.Enabled = False

    ' Cancel button
    Set c = d.Controls.Add("Forms.CommandButton.1", "btnCancel", True)
    c.Caption = "Cancel"
    c.Left = 340: c.Top = 332: c.Width = 120: c.Height = 32
    c.Font.Size = 10
    c.Cancel = True

    ' Inject event handler code
    Dim s As String
    s = "Private Sub UserForm_Initialize()" & vbCrLf & _
        "    Me.txtDOI.SetFocus" & vbCrLf & _
        "    Me.btnInsert.Enabled = False" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub btnLookup_Click()" & vbCrLf & _
        "    ESABCC_RefManager.FormBridge_DOILookup Me.txtDOI.Value, Me.txtPreview, Me.btnInsert, Me.lblStatus" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub txtDOI_KeyDown(ByVal KeyCode As MSForms.ReturnInteger, ByVal Shift As Integer)" & vbCrLf & _
        "    If KeyCode = 13 Then btnLookup_Click" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub btnInsert_Click()" & vbCrLf & _
        "    ESABCC_RefManager.g_SelectedIndex = 1" & vbCrLf & _
        "    Me.Hide" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub btnCancel_Click()" & vbCrLf & _
        "    ESABCC_RefManager.g_SelectedIndex = 0" & vbCrLf & _
        "    Me.Hide" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub UserForm_QueryClose(Cancel As Integer, CloseMode As Integer)" & vbCrLf & _
        "    If CloseMode = 0 Then" & vbCrLf & _
        "        Cancel = True" & vbCrLf & _
        "        ESABCC_RefManager.g_SelectedIndex = 0" & vbCrLf & _
        "        Me.Hide" & vbCrLf & _
        "    End If" & vbCrLf & _
        "End Sub"

    frm.CodeModule.InsertLines frm.CodeModule.CountOfLines + 1, s

    BuildDOIForm = True
    Exit Function
BuildErr:
    On Error Resume Next
    proj.VBComponents.Remove proj.VBComponents("frmESABCC_DOI")
    On Error GoTo 0
    BuildDOIForm = False
End Function

Private Function BuildEditForm(proj As Object) As Boolean
    On Error GoTo BuildErr
    BuildEditForm = False

    Dim frm As Object
    Set frm = proj.VBComponents.Add(3)  ' vbext_ct_MSForm
    frm.Name = "frmESABCC_Edit"

    frm.Properties("Caption") = "ESABCC - Edit Citation"
    frm.Properties("Width") = 440
    frm.Properties("Height") = 340
    frm.Properties("StartUpPosition") = 1

    Dim d As Object: Set d = frm.Designer
    Dim c As Object

    ' ── Branded banner ──
    Set c = d.Controls.Add("Forms.Label.1", "lblBanner", True)
    c.Caption = ""
    c.Left = 0: c.Top = 0: c.Width = 440: c.Height = 46
    c.BackStyle = 1: c.BackColor = RGB(55, 95, 105)

    Set c = d.Controls.Add("Forms.Label.1", "lblBrand", True)
    c.Caption = "Edit Citation"
    c.Left = 14: c.Top = 6: c.Width = 300: c.Height = 22
    c.Font.Size = 14: c.Font.Bold = True
    c.ForeColor = RGB(255, 255, 255): c.BackStyle = 0

    Set c = d.Controls.Add("Forms.Label.1", "lblOrg", True)
    c.Caption = "Pick an action for the citation at the cursor"
    c.Left = 14: c.Top = 28: c.Width = 400: c.Height = 14
    c.Font.Size = 8
    c.ForeColor = RGB(190, 210, 215): c.BackStyle = 0

    ' Citation preview
    Set c = d.Controls.Add("Forms.Label.1", "lblCite", True)
    c.Caption = ""
    c.Left = 14: c.Top = 58: c.Width = 412: c.Height = 36
    c.Font.Size = 11: c.Font.Italic = True
    c.ForeColor = RGB(40, 40, 40): c.BackStyle = 1
    c.BackColor = RGB(248, 248, 248)

    ' Convert button
    Set c = d.Controls.Add("Forms.CommandButton.1", "btnConvert", True)
    c.Caption = "Convert to long form"
    c.Left = 14: c.Top = 108: c.Width = 412: c.Height = 32
    c.Font.Size = 10: c.Font.Bold = True

    ' Add refs button
    Set c = d.Controls.Add("Forms.CommandButton.1", "btnAdd", True)
    c.Caption = "Add more reference(s) to this citation"
    c.Left = 14: c.Top = 148: c.Width = 412: c.Height = 32
    c.Font.Size = 10

    ' Replace button
    Set c = d.Controls.Add("Forms.CommandButton.1", "btnReplace", True)
    c.Caption = "Replace with a different reference"
    c.Left = 14: c.Top = 188: c.Width = 412: c.Height = 32
    c.Font.Size = 10

    ' Delete button
    Set c = d.Controls.Add("Forms.CommandButton.1", "btnDelete", True)
    c.Caption = "Delete this citation"
    c.Left = 14: c.Top = 228: c.Width = 412: c.Height = 32
    c.Font.Size = 10
    c.ForeColor = RGB(160, 40, 40)

    ' Cancel button
    Set c = d.Controls.Add("Forms.CommandButton.1", "btnCancel", True)
    c.Caption = "Cancel"
    c.Left = 322: c.Top = 276: c.Width = 104: c.Height = 26
    c.Font.Size = 10
    c.Cancel = True

    Dim s As String
    s = "Private Sub UserForm_Initialize()" & vbCrLf & _
        "    Me.lblCite.Caption = ESABCC_RefManager.g_EditCiteText" & vbCrLf & _
        "    If ESABCC_RefManager.g_EditIsShort Then" & vbCrLf & _
        "        Me.btnConvert.Caption = ""Convert to long form""" & vbCrLf & _
        "    Else" & vbCrLf & _
        "        Me.btnConvert.Caption = ""Convert to short form""" & vbCrLf & _
        "    End If" & vbCrLf & _
        "    ESABCC_RefManager.g_EditAction = """"" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub btnConvert_Click()" & vbCrLf & _
        "    ESABCC_RefManager.g_EditAction = ""CONVERT""" & vbCrLf & _
        "    Me.Hide" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub btnAdd_Click()" & vbCrLf & _
        "    ESABCC_RefManager.g_EditAction = ""ADD""" & vbCrLf & _
        "    Me.Hide" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub btnReplace_Click()" & vbCrLf & _
        "    ESABCC_RefManager.g_EditAction = ""REPLACE""" & vbCrLf & _
        "    Me.Hide" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub btnDelete_Click()" & vbCrLf & _
        "    ESABCC_RefManager.g_EditAction = ""DELETE""" & vbCrLf & _
        "    Me.Hide" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub btnCancel_Click()" & vbCrLf & _
        "    ESABCC_RefManager.g_EditAction = """"" & vbCrLf & _
        "    Me.Hide" & vbCrLf & _
        "End Sub" & vbCrLf & vbCrLf
    s = s & "Private Sub UserForm_QueryClose(Cancel As Integer, CloseMode As Integer)" & vbCrLf & _
        "    If CloseMode = 0 Then" & vbCrLf & _
        "        Cancel = True" & vbCrLf & _
        "        ESABCC_RefManager.g_EditAction = """"" & vbCrLf & _
        "        Me.Hide" & vbCrLf & _
        "    End If" & vbCrLf & _
        "End Sub"

    frm.CodeModule.InsertLines frm.CodeModule.CountOfLines + 1, s

    BuildEditForm = True
    Exit Function
BuildErr:
    On Error Resume Next
    proj.VBComponents.Remove proj.VBComponents("frmESABCC_Edit")
    On Error GoTo 0
    BuildEditForm = False
End Function

' ============================================================================
' CITATION INSERTION (Content Controls)
' ============================================================================

Private Sub InsertCitationAtCursor(refId As String, citeKey As String, displayText As String, Optional refLink As String = "")
    Dim rng As Range
    Set rng = Selection.Range

    Dim cc As ContentControl
    Set cc = ActiveDocument.ContentControls.Add(wdContentControlRichText, rng)

    cc.LockContents = False
    cc.Range.Text = displayText
    cc.Tag = CITE_TAG_PREFIX & refId
    cc.Title = "Citation: " & citeKey
    cc.Appearance = wdContentControlBoundingBox
    cc.Range.Font.Color = RGB(0, 0, 0)
    cc.Range.Font.Name = "Segoe UI"
    cc.Range.Font.Size = 10

    ' Store the link URL in a document variable for Add/Remove Links
    If refLink <> "" Then
        StoreLinkVar refId, refLink
    End If

    ' Move cursor after the content control
    Dim afterRange As Range
    Set afterRange = cc.Range
    afterRange.Collapse wdCollapseEnd
    afterRange.Select

    ' Add small hyperlink with DOI/URL if available
    If refLink <> "" Then
        AddLinkAfterSelection refLink
    End If
End Sub

' Walk forward from the current selection, deleting any trailing
' " [link]" markers we previously inserted. Used when an edit action
' replaces a citation's links and we need to clear the old ones first.
Private Sub RemoveTrailingLinkMarkers(startRng As Range)
    On Error Resume Next
    Dim doc As Document: Set doc = ActiveDocument
    Dim cursor As Range: Set cursor = startRng.Duplicate

    Do
        If cursor.End >= doc.Range.End Then Exit Do
        Dim probe As Range
        Set probe = doc.Range(cursor.End, doc.Range.End)
        Dim bs As String
        bs = probe.Text
        If Len(bs) < 7 Then Exit Do
        If Left(bs, 7) <> " [link]" Then Exit Do
        Dim delRng As Range
        Set delRng = doc.Range(cursor.End, cursor.End + 7)
        delRng.Delete
    Loop
    On Error GoTo 0
End Sub

Private Sub AddLinkAfterSelection(refLink As String)
    On Error Resume Next
    Dim linkRange As Range
    Set linkRange = Selection.Range
    linkRange.Text = " "
    linkRange.Collapse wdCollapseEnd

    Dim linkText As String
    linkText = "[link]"
    linkRange.Text = linkText
    linkRange.Font.Name = "Segoe UI"
    linkRange.Font.Size = 8
    linkRange.Font.Color = RGB(80, 80, 180)
    linkRange.Font.Superscript = True

    ActiveDocument.Hyperlinks.Add Anchor:=linkRange, _
        Address:=refLink, _
        TextToDisplay:=linkText, _
        ScreenTip:=refLink

    ' Ensure field codes are hidden so the hyperlink shows as "[link]"
    ' instead of the raw HYPERLINK field code
    ActiveDocument.ActiveWindow.View.ShowFieldCodes = False

    linkRange.Collapse wdCollapseEnd
    linkRange.Font.Superscript = False
    linkRange.Font.Size = 10
    linkRange.Font.Color = RGB(0, 0, 0)
    linkRange.Select
    On Error GoTo 0
End Sub

Private Sub StoreLinkVar(refId As String, linkUrl As String)
    On Error Resume Next
    ActiveDocument.Variables("LINK_" & refId).Delete
    On Error GoTo 0
    If linkUrl <> "" Then
        ActiveDocument.Variables.Add "LINK_" & refId, linkUrl
    End If
End Sub

Private Function GetLinkVar(refId As String) As String
    On Error Resume Next
    GetLinkVar = ActiveDocument.Variables("LINK_" & refId).Value
    If Err.Number <> 0 Then GetLinkVar = ""
    On Error GoTo 0
End Function

' ============================================================================
' INLINE CITATION FORMATTING
' ============================================================================

' Short format: "Mytton et al. (2020)" — author(s) outside, year in parens.
Private Function FormatShortCite(authors As String, yr As String) As String
    Dim surname As String

    If authors = "" Then
        FormatShortCite = "(" & yr & ")"
        Exit Function
    End If

    If InStr(LCase(authors), "et al") > 0 Then
        surname = Trim(Left(authors, InStr(LCase(authors), "et al") - 1))
        If Right(surname, 1) = "," Then surname = Left(surname, Len(surname) - 1)
        If InStr(surname, ",") > 0 Then surname = Trim(Left(surname, InStr(surname, ",") - 1))
        FormatShortCite = Trim(surname) & " et al. (" & yr & ")"
        Exit Function
    End If

    Dim sep As String
    If InStr(authors, ";") > 0 Then
        sep = ";"
    ElseIf InStr(authors, " and ") > 0 Then
        sep = " and "
    ElseIf InStr(authors, " & ") > 0 Then
        sep = " & "
    Else
        sep = ""
    End If

    If sep = "" Then
        surname = authors
        If InStr(surname, ",") > 0 Then
            surname = Trim(Left(surname, InStr(surname, ",") - 1))
        End If
        FormatShortCite = surname & " (" & yr & ")"
    Else
        Dim authorParts() As String
        authorParts = Split(authors, sep)
        Dim first As String
        first = Trim(authorParts(0))
        If InStr(first, ",") > 0 Then first = Trim(Left(first, InStr(first, ",") - 1))

        If UBound(authorParts) = 1 Then
            Dim second As String
            second = Trim(authorParts(1))
            If InStr(second, ",") > 0 Then second = Trim(Left(second, InStr(second, ",") - 1))
            FormatShortCite = first & " & " & second & " (" & yr & ")"
        Else
            FormatShortCite = first & " et al. (" & yr & ")"
        End If
    End If
End Function

Private Function FormatInlineCite(authors As String, yr As String) As String
    Dim surname As String

    If authors = "" Then
        FormatInlineCite = "(" & yr & ")"
        Exit Function
    End If

    If InStr(LCase(authors), "et al") > 0 Then
        surname = Trim(Left(authors, InStr(LCase(authors), "et al") - 1))
        If Right(surname, 1) = "," Then surname = Left(surname, Len(surname) - 1)
        If InStr(surname, ",") > 0 Then surname = Trim(Left(surname, InStr(surname, ",") - 1))
        FormatInlineCite = "(" & Trim(surname) & " et al., " & yr & ")"
        Exit Function
    End If

    Dim sep As String
    If InStr(authors, ";") > 0 Then
        sep = ";"
    ElseIf InStr(authors, " and ") > 0 Then
        sep = " and "
    ElseIf InStr(authors, " & ") > 0 Then
        sep = " & "
    Else
        sep = ""
    End If

    If sep = "" Then
        surname = authors
        If InStr(surname, ",") > 0 Then
            surname = Trim(Left(surname, InStr(surname, ",") - 1))
        End If
        FormatInlineCite = "(" & surname & ", " & yr & ")"
    Else
        Dim authorParts() As String
        authorParts = Split(authors, sep)
        Dim first As String
        first = Trim(authorParts(0))
        If InStr(first, ",") > 0 Then first = Trim(Left(first, InStr(first, ",") - 1))

        If UBound(authorParts) = 1 Then
            Dim second As String
            second = Trim(authorParts(1))
            If InStr(second, ",") > 0 Then second = Trim(Left(second, InStr(second, ",") - 1))
            FormatInlineCite = "(" & first & " & " & second & ", " & yr & ")"
        Else
            FormatInlineCite = "(" & first & " et al., " & yr & ")"
        End If
    End If
End Function

' ============================================================================
' SCAN DOCUMENT FOR CITATIONS
' ============================================================================

Private Function ScanCitations() As Collection
    Dim results As New Collection
    Dim cc As ContentControl
    For Each cc In ActiveDocument.ContentControls
        If Left(cc.Tag, Len(CITE_TAG_PREFIX)) = CITE_TAG_PREFIX Then
            results.Add Mid(cc.Tag, Len(CITE_TAG_PREFIX) + 1)
        End If
    Next cc
    Set ScanCitations = results
End Function

' ============================================================================
' DOCUMENT VARIABLE STORAGE (for bibliography)
' ============================================================================

Private Sub StoreCiteVar(refId As String, fullCitation As String)
    On Error Resume Next
    ActiveDocument.Variables("CITE_" & refId).Delete
    On Error GoTo 0
    If fullCitation <> "" Then
        ActiveDocument.Variables.Add "CITE_" & refId, fullCitation
    End If
End Sub

Private Function GetCiteVar(refId As String) As String
    On Error Resume Next
    GetCiteVar = ActiveDocument.Variables("CITE_" & refId).Value
    If Err.Number <> 0 Then GetCiteVar = ""
    On Error GoTo 0
End Function

' ============================================================================
' YEAR DISAMBIGUATION
' ============================================================================
' Suffix letters (a, b, c...) are assigned dynamically per document when
' multiple cited references share the same author label and base year.
' The suffix is NOT stored in the reference library — it is computed from
' which references are actually cited in the current document.

' Store author label and base year metadata for a cited reference.
Private Sub StoreRefMeta(refId As String, authorLabel As String, baseYear As String)
    On Error Resume Next
    ActiveDocument.Variables("REFA_" & refId).Delete
    ActiveDocument.Variables("REFY_" & refId).Delete
    On Error GoTo 0
    If authorLabel <> "" Then ActiveDocument.Variables.Add "REFA_" & refId, authorLabel
    If baseYear <> "" Then ActiveDocument.Variables.Add "REFY_" & refId, baseYear
End Sub

Private Function GetRefAuthorLabel(refId As String) As String
    On Error Resume Next
    GetRefAuthorLabel = ActiveDocument.Variables("REFA_" & refId).Value
    If Err.Number <> 0 Then GetRefAuthorLabel = ""
    On Error GoTo 0
End Function

Private Function GetRefBaseYear(refId As String) As String
    On Error Resume Next
    GetRefBaseYear = ActiveDocument.Variables("REFY_" & refId).Value
    If Err.Number <> 0 Then GetRefBaseYear = ""
    On Error GoTo 0
End Function

' Extract the author label as it appears in an inline citation (matches
' the output of FormatInlineCite without the year).
' E.g. "Smith, J. and Jones, B." -> "Smith & Jones"
'      "JRC"                     -> "JRC"
'      "Doe, J., et al."        -> "Doe, J. et al."
Private Function GetCiteAuthorLabel(authors As String) As String
    If authors = "" Then
        GetCiteAuthorLabel = ""
        Exit Function
    End If

    If InStr(LCase(authors), "et al") > 0 Then
        Dim sn As String
        sn = Trim(Left(authors, InStr(LCase(authors), "et al") - 1))
        If Right(sn, 1) = "," Then sn = Left(sn, Len(sn) - 1)
        If InStr(sn, ",") > 0 Then sn = Trim(Left(sn, InStr(sn, ",") - 1))
        GetCiteAuthorLabel = Trim(sn) & " et al."
        Exit Function
    End If

    Dim sep As String
    If InStr(authors, ";") > 0 Then
        sep = ";"
    ElseIf InStr(authors, " and ") > 0 Then
        sep = " and "
    ElseIf InStr(authors, " & ") > 0 Then
        sep = " & "
    Else
        sep = ""
    End If

    If sep = "" Then
        Dim s As String: s = authors
        If InStr(s, ",") > 0 Then s = Trim(Left(s, InStr(s, ",") - 1))
        GetCiteAuthorLabel = s
    Else
        Dim parts() As String
        parts = Split(authors, sep)
        Dim first As String: first = Trim(parts(0))
        If InStr(first, ",") > 0 Then first = Trim(Left(first, InStr(first, ",") - 1))

        If UBound(parts) = 1 Then
            Dim sec As String: sec = Trim(parts(1))
            If InStr(sec, ",") > 0 Then sec = Trim(Left(sec, InStr(sec, ",") - 1))
            GetCiteAuthorLabel = first & " & " & sec
        Else
            GetCiteAuthorLabel = first & " et al."
        End If
    End If
End Function

' Build a suffix map (Scripting.Dictionary) for all cited references.
' Key = refId, Value = suffix letter ("a","b",...) or "" if no disambiguation needed.
' Uses document order (position of the first content control citing each refId)
' to assign suffix letters.
Private Function BuildSuffixMap() As Object
    Dim suffMap As Object: Set suffMap = CreateObject("Scripting.Dictionary")

    ' Step 1: Collect unique cited refIds and their first document position
    Dim posDict As Object: Set posDict = CreateObject("Scripting.Dictionary")
    Dim cc As ContentControl
    Dim ccPos As Long: ccPos = 0

    For Each cc In ActiveDocument.ContentControls
        If Left(cc.Tag, Len(CITE_TAG_PREFIX)) = CITE_TAG_PREFIX Then
            ccPos = ccPos + 1
            Dim tagContent As String
            tagContent = Mid(cc.Tag, Len(CITE_TAG_PREFIX) + 1)

            Dim tagIds() As String: tagIds = Split(tagContent, ",")
            Dim ti As Long
            For ti = 0 To UBound(tagIds)
                Dim oneId As String: oneId = Trim(tagIds(ti))
                If oneId <> "" And Not posDict.Exists(oneId) Then
                    posDict(oneId) = ccPos
                End If
            Next ti
        End If
    Next cc

    ' Step 2: Group by authorLabel|baseYear
    Dim groups As Object: Set groups = CreateObject("Scripting.Dictionary")
    Dim refId As Variant
    For Each refId In posDict.Keys
        Dim aLabel As String: aLabel = GetRefAuthorLabel(CStr(refId))
        Dim bYear As String: bYear = GetRefBaseYear(CStr(refId))
        If aLabel = "" Or bYear = "" Then GoTo SkipRef
        Dim gKey As String: gKey = aLabel & "|" & bYear
        If Not groups.Exists(gKey) Then
            groups(gKey) = Array(CStr(refId))
        Else
            Dim arr As Variant: arr = groups(gKey)
            ReDim Preserve arr(UBound(arr) + 1)
            arr(UBound(arr)) = CStr(refId)
            groups(gKey) = arr
        End If
SkipRef:
    Next refId

    ' Step 3: For groups with >1 member, sort by doc position, assign a/b/c...
    Dim gk As Variant
    For Each gk In groups.Keys
        Dim members As Variant: members = groups(gk)
        Dim cnt As Long: cnt = UBound(members) - LBound(members) + 1

        If cnt <= 1 Then
            suffMap(members(LBound(members))) = ""
        Else
            ' Bubble-sort by document position (small arrays)
            Dim si As Long, sj As Long
            For si = LBound(members) To UBound(members) - 1
                For sj = si + 1 To UBound(members)
                    If posDict(members(sj)) < posDict(members(si)) Then
                        Dim tmp As String: tmp = members(si)
                        members(si) = members(sj)
                        members(sj) = tmp
                    End If
                Next sj
            Next si

            For si = LBound(members) To UBound(members)
                suffMap(members(si)) = Chr(97 + si - LBound(members))
            Next si
        End If
    Next gk

    Set BuildSuffixMap = suffMap
End Function

' Scan all citations in the document, compute disambiguation, and update
' the display text of all citation content controls.
Private Sub DisambiguateAllCitations()
    On Error GoTo DisambigErr

    Dim suffMap As Object
    Set suffMap = BuildSuffixMap()

    ' Update content controls
    Dim cc As ContentControl
    For Each cc In ActiveDocument.ContentControls
        If Left(cc.Tag, Len(CITE_TAG_PREFIX)) = CITE_TAG_PREFIX Then
            Dim tagContent As String
            tagContent = Mid(cc.Tag, Len(CITE_TAG_PREFIX) + 1)

            If InStr(tagContent, ",") = 0 Then
                ' --- Single citation ---
                If Not suffMap.Exists(tagContent) Then GoTo NextCC
                Dim al As String: al = GetRefAuthorLabel(tagContent)
                Dim byr As String: byr = GetRefBaseYear(tagContent)
                If al = "" Or byr = "" Then GoTo NextCC

                Dim suf As String: suf = suffMap(tagContent)
                Dim newDisp As String
                ' Detect short citation format: "Author (Year)" vs "(Author, Year)"
                Dim isShort As Boolean
                isShort = (Len(cc.Range.Text) > 0 And Left(cc.Range.Text, 1) <> "(")
                If al = "" Then
                    newDisp = "(" & byr & suf & ")"
                ElseIf isShort Then
                    newDisp = al & " (" & byr & suf & ")"
                Else
                    newDisp = "(" & al & ", " & byr & suf & ")"
                End If
                cc.LockContents = False
                If cc.Range.Text <> newDisp Then
                    cc.Range.Text = newDisp
                    cc.Range.Font.Color = RGB(0, 0, 0)
                    cc.Range.Font.Name = "Segoe UI"
                    cc.Range.Font.Size = 10
                End If
            Else
                ' --- Group citation ---
                Dim gIds() As String: gIds = Split(tagContent, ",")
                Dim gParts() As String
                ReDim gParts(0 To UBound(gIds))
                Dim gi As Long
                Dim anyMeta As Boolean: anyMeta = False
                For gi = 0 To UBound(gIds)
                    Dim gId As String: gId = Trim(gIds(gi))
                    Dim gal As String: gal = GetRefAuthorLabel(gId)
                    Dim gbyr As String: gbyr = GetRefBaseYear(gId)
                    Dim gsuf As String: gsuf = ""
                    If suffMap.Exists(gId) Then gsuf = suffMap(gId)

                    If gal <> "" And gbyr <> "" Then
                        gParts(gi) = gal & ", " & gbyr & gsuf
                        anyMeta = True
                    Else
                        gParts(gi) = ""
                    End If
                Next gi

                If anyMeta Then
                    Dim groupText As String: groupText = ""
                    For gi = 0 To UBound(gParts)
                        If gParts(gi) <> "" Then
                            If groupText <> "" Then groupText = groupText & "; "
                            groupText = groupText & gParts(gi)
                        End If
                    Next gi
                    If groupText <> "" Then
                        groupText = "(" & groupText & ")"
                        cc.LockContents = False
                        If cc.Range.Text <> groupText Then
                            cc.Range.Text = groupText
                            cc.Range.Font.Color = RGB(0, 0, 0)
                            cc.Range.Font.Name = "Segoe UI"
                            cc.Range.Font.Size = 10
                        End If
                    End If
                End If
            End If
NextCC:
        End If
    Next cc
    Exit Sub

DisambigErr:
    ' Disambiguation is non-critical — do not block the user
    Debug.Print "DisambiguateAllCitations error: " & Err.Description
End Sub

' Inject a disambiguation suffix into a fullCitation string for bibliography.
' Replaces the first ", YEAR," with ", YEARsuffix,".
Private Function InjectYearSuffix(fullCite As String, baseYear As String, suffix As String) As String
    If suffix = "" Or baseYear = "" Then
        InjectYearSuffix = fullCite
        Exit Function
    End If

    Dim needle As String: needle = ", " & baseYear & ","
    Dim pos As Long: pos = InStr(fullCite, needle)
    If pos > 0 Then
        InjectYearSuffix = Left(fullCite, pos + 1) & baseYear & suffix & Mid(fullCite, pos + 2 + Len(baseYear))
    Else
        ' Fallback: try "(YEAR)" pattern
        needle = "(" & baseYear & ")"
        pos = InStr(fullCite, needle)
        If pos > 0 Then
            InjectYearSuffix = Left(fullCite, pos) & baseYear & suffix & ")" & Mid(fullCite, pos + Len(needle))
        Else
            InjectYearSuffix = fullCite
        End If
    End If
End Function

' Look up a reference's full citation text from the online library when the
' local CITE_ doc variable is missing (e.g. the document was opened in a new
' session where the variables were never stored).
'
' For "doi-*" refIds we reconstruct the DOI and hit /api/references/doi.
' For anything else we hit /api/references/library and match by id.
Private Function FetchFullCitationById(refId As String) As String
    FetchFullCitationById = ""
    If refId = "" Then Exit Function

    On Error GoTo FetchErr

    Dim http As Object
    Set http = CreateHttpObject()

    If Left(refId, 4) = "doi-" Then
        ' Reconstruct the DOI: "doi-10.1038-s41558-020-0783-3" -> "10.1038/s41558-020-0783-3"
        Dim rawDoi As String
        rawDoi = Mid(refId, 5)
        Dim tenDot As Long
        tenDot = InStr(rawDoi, "10.")
        If tenDot > 0 Then
            Dim firstHyp As Long
            firstHyp = InStr(tenDot + 3, rawDoi, "-")
            If firstHyp > 0 Then
                rawDoi = Left(rawDoi, firstHyp - 1) & "/" & Mid(rawDoi, firstHyp + 1)
            End If
        End If

        http.Open "GET", WEBAPP_URL & "/api/references/doi?doi=" & UrlEncode(rawDoi), False
        http.setRequestHeader "Accept", "application/json"
        http.send
        If http.Status <> 200 Then Exit Function

        Dim resp As String: resp = http.responseText
        Dim fullCite As String: fullCite = JsonVal(resp, "fullCitation")
        If fullCite = "" Then
            Dim t As String: t = JsonVal(resp, "title")
            Dim a As String: a = JsonVal(resp, "authors")
            Dim y As String: y = JsonVal(resp, "year")
            Dim j As String: j = JsonVal(resp, "journal")
            fullCite = a & " (" & y & "). " & t & "."
            If j <> "" Then fullCite = fullCite & " " & j & "."
            fullCite = fullCite & " https://doi.org/" & rawDoi
        End If
        FetchFullCitationById = fullCite
        Exit Function
    End If

    ' Non-DOI ids: try the exact-id lookup first. It resolves everything the
    ' flat reference list serves - including the policy-* entries (EU policies
    ' as special reference-manager entries) and workspace-cited references.
    http.Open "GET", WEBAPP_URL & "/api/references?id=" & UrlEncode(refId), False
    http.setRequestHeader "Accept", "application/json"
    http.send
    If http.Status = 200 Then
        Dim idCite As String
        idCite = JsonVal(http.responseText, "fullCitation")
        If idCite <> "" Then
            FetchFullCitationById = idCite
            Exit Function
        End If
    End If

    ' Fall back: pull the library and match by id
    Set http = CreateHttpObject()
    http.Open "GET", WEBAPP_URL & "/api/references/library", False
    http.setRequestHeader "Accept", "application/json"
    http.send
    If http.Status <> 200 Then Exit Function

    Dim body As String: body = http.responseText
    Dim needle As String
    needle = """id"":""" & refId & """"
    Dim idPos As Long
    idPos = InStr(body, needle)
    If idPos = 0 Then Exit Function

    ' Walk back to the start of this object and forward to its matching '}'
    Dim objStart As Long: objStart = idPos
    Do While objStart > 1 And Mid(body, objStart, 1) <> "{"
        objStart = objStart - 1
    Loop
    If Mid(body, objStart, 1) <> "{" Then Exit Function

    Dim objEnd As Long
    objEnd = FindClosingBrace(body, objStart)
    If objEnd <= objStart Then Exit Function

    Dim obj As String
    obj = Mid(body, objStart, objEnd - objStart + 1)

    Dim cite As String
    cite = JsonVal(obj, "fullCitation")
    If cite = "" Then
        Dim ttl As String: ttl = JsonVal(obj, "title")
        Dim auth As String: auth = JsonVal(obj, "authors")
        Dim yr As String: yr = JsonVal(obj, "year")
        Dim jrn As String: jrn = JsonVal(obj, "journal")
        If ttl <> "" Then
            cite = auth & " (" & yr & "). " & ttl & "."
            If jrn <> "" Then cite = cite & " " & jrn & "."
        End If
    End If
    FetchFullCitationById = cite
    Exit Function

FetchErr:
    FetchFullCitationById = ""
End Function

' Pull the first plausible 4-digit year (1900-2099) from a citation string.
Private Function ExtractYearFromCitation(s As String) As String
    ExtractYearFromCitation = ""
    Dim i As Long
    For i = 1 To Len(s) - 3
        Dim ch As String: ch = Mid(s, i, 4)
        If IsNumeric(ch) Then
            Dim n As Long: n = CLng(ch)
            If n >= 1900 And n <= 2099 Then
                ExtractYearFromCitation = ch
                Exit Function
            End If
        End If
    Next i
End Function

' ============================================================================
' BASKET MANAGEMENT
' ============================================================================

Private Sub AddToBasket(refId As String, citeKey As String, authors As String, yr As String, fullCite As String, _
                        Optional doi As String = "", Optional url As String = "")
    m_BasketCount = m_BasketCount + 1
    ReDim Preserve m_BasketIds(1 To m_BasketCount)
    ReDim Preserve m_BasketKeys(1 To m_BasketCount)
    ReDim Preserve m_BasketAuthors(1 To m_BasketCount)
    ReDim Preserve m_BasketYears(1 To m_BasketCount)
    ReDim Preserve m_BasketCitations(1 To m_BasketCount)
    ReDim Preserve m_BasketDois(1 To m_BasketCount)
    ReDim Preserve m_BasketUrls(1 To m_BasketCount)
    m_BasketIds(m_BasketCount) = refId
    m_BasketKeys(m_BasketCount) = citeKey
    m_BasketAuthors(m_BasketCount) = authors
    m_BasketYears(m_BasketCount) = yr
    m_BasketCitations(m_BasketCount) = fullCite
    m_BasketDois(m_BasketCount) = doi
    m_BasketUrls(m_BasketCount) = url
End Sub

' Returns DOI if present, else URL, else "" for basket entry i.
Private Function BasketLinkAt(i As Long) As String
    If i < 1 Or i > m_BasketCount Then Exit Function
    If m_BasketDois(i) <> "" Then
        BasketLinkAt = "https://doi.org/" & m_BasketDois(i)
    Else
        BasketLinkAt = m_BasketUrls(i)
    End If
End Function

' ============================================================================
' JSON HELPERS
' ============================================================================

Private Function CountJsonObjects(json As String) As Long
    Dim count As Long: count = 0
    Dim depth As Long: depth = 0
    Dim insideStr As Boolean: insideStr = False
    Dim i As Long
    Dim c As String
    Dim prev As String
    For i = 1 To Len(json)
        c = Mid(json, i, 1)
        If c = """" Then
            If i = 1 Then
                insideStr = Not insideStr
            Else
                prev = Mid(json, i - 1, 1)
                If prev <> "\" Then insideStr = Not insideStr
            End If
        End If
        If Not insideStr Then
            If c = "{" Then
                If depth = 1 Then count = count + 1
                depth = depth + 1
            ElseIf c = "}" Then
                depth = depth - 1
            ElseIf c = "[" And depth = 0 Then
                depth = 1
            End If
        End If
    Next i
    CountJsonObjects = count
End Function

Private Function FindClosingBrace(s As String, startPos As Long) As Long
    Dim depth As Long: depth = 0
    Dim insideStr As Boolean: insideStr = False
    Dim i As Long
    Dim c As String
    Dim prev As String
    For i = startPos To Len(s)
        c = Mid(s, i, 1)
        If c = """" Then
            If i = 1 Then
                insideStr = Not insideStr
            Else
                prev = Mid(s, i - 1, 1)
                If prev <> "\" Then insideStr = Not insideStr
            End If
        End If
        If Not insideStr Then
            If c = "{" Then depth = depth + 1
            If c = "}" Then
                depth = depth - 1
                If depth = 0 Then
                    FindClosingBrace = i
                    Exit Function
                End If
            End If
        End If
    Next i
    FindClosingBrace = 0
End Function

' Pull the JSON array value of `key` out of a response body ("key": [ ... ]).
' Bracket-matching and string-aware, so nested arrays inside the objects
' (e.g. each item's "tags" list) don't truncate the extraction.
Private Function ExtractJsonArray(json As String, key As String) As String
    ExtractJsonArray = "[]"
    Dim kp As Long
    kp = InStr(json, """" & key & """")
    If kp = 0 Then Exit Function
    Dim arrStart As Long
    arrStart = InStr(kp, json, "[")
    If arrStart = 0 Then Exit Function

    Dim depth As Long: depth = 0
    Dim insideStr As Boolean: insideStr = False
    Dim i As Long
    Dim c As String
    For i = arrStart To Len(json)
        c = Mid(json, i, 1)
        If c = """" Then
            If i = 1 Then
                insideStr = Not insideStr
            ElseIf Mid(json, i - 1, 1) <> "\" Then
                insideStr = Not insideStr
            End If
        End If
        If Not insideStr Then
            If c = "[" Then depth = depth + 1
            If c = "]" Then
                depth = depth - 1
                If depth = 0 Then
                    ExtractJsonArray = Mid(json, arrStart, i - arrStart + 1)
                    Exit Function
                End If
            End If
        End If
    Next i
End Function

Private Function JsonVal(obj As String, key As String) As String
    Dim search As String
    search = """" & key & """"

    Dim kp As Long
    kp = InStr(obj, search)
    If kp = 0 Then
        JsonVal = ""
        Exit Function
    End If

    Dim cp As Long
    cp = InStr(kp + Len(search), obj, ":")
    If cp = 0 Then JsonVal = "": Exit Function

    Dim vs As Long: vs = cp + 1
    Do While vs <= Len(obj) And (Mid(obj, vs, 1) = " " Or Mid(obj, vs, 1) = vbTab)
        vs = vs + 1
    Loop
    If vs > Len(obj) Then JsonVal = "": Exit Function

    Dim fc As String: fc = Mid(obj, vs, 1)

    If fc = """" Then
        Dim ve As Long: ve = vs + 1
        Do While ve <= Len(obj)
            If Mid(obj, ve, 1) = """" Then
                Dim backslashes As Long: backslashes = 0
                Dim bs As Long: bs = ve - 1
                Do While bs >= vs And Mid(obj, bs, 1) = "\"
                    backslashes = backslashes + 1
                    bs = bs - 1
                Loop
                If backslashes Mod 2 = 0 Then Exit Do
            End If
            ve = ve + 1
        Loop
        JsonVal = Mid(obj, vs + 1, ve - vs - 1)
        JsonVal = Replace(JsonVal, "\""", """")
        JsonVal = Replace(JsonVal, "\\", "\")
        JsonVal = Replace(JsonVal, "\/", "/")
        JsonVal = Replace(JsonVal, "\n", " ")
        JsonVal = Replace(JsonVal, "\r", "")
        JsonVal = Replace(JsonVal, "\t", " ")
    ElseIf fc = "n" Then
        JsonVal = ""
    ElseIf fc = "[" Or fc = "{" Then
        JsonVal = ""
    Else
        ve = vs
        Do While ve <= Len(obj)
            Dim ch As String: ch = Mid(obj, ve, 1)
            If ch = "," Or ch = "}" Or ch = "]" Or ch = " " Then Exit Do
            ve = ve + 1
        Loop
        JsonVal = Trim(Mid(obj, vs, ve - vs))
    End If
End Function

' Parse a JSON boolean field.  Returns True only when the value is literally
' `true`.  Used to read { "persisted": true/false } from server responses.
Private Function JsonBool(obj As String, key As String) As Boolean
    JsonBool = (LCase(JsonVal(obj, key)) = "true")
End Function

Private Function UrlEncode(str As String) As String
    Dim i As Long, result As String
    For i = 1 To Len(str)
        Dim c As String: c = Mid(str, i, 1)
        If (c >= "A" And c <= "Z") Or (c >= "a" And c <= "z") Or _
           (c >= "0" And c <= "9") Or c = "-" Or c = "_" Or c = "." Or c = "~" Then
            result = result & c
        ElseIf c = " " Then
            result = result & "%20"
        Else
            result = result & "%" & Right("0" & Hex(Asc(c)), 2)
        End If
    Next i
    UrlEncode = result
End Function
