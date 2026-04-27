' ESABCC Outlook Feed Sync - invisible launcher.
'
' WScript.Shell .Run with windowStyle=0 starts the process without ever
' creating a visible console window. Running powershell.exe directly
' from Task Scheduler - even with -WindowStyle Hidden - briefly flashes
' a black console window, which is the "annoying" behaviour users see.
' Routing through wscript.exe + this VBS removes that flash entirely.
'
' Arguments (all optional):
'   path to the .ps1 to run (default: OutlookFeedSync.ps1 next to this file)
'
' Example (from a Scheduled Task or shortcut):
'   wscript.exe "C:\Users\...\ESABCC\run-hidden.vbs"

Option Explicit

Dim shell, fso, here, psScript, cmd

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Resolve the folder this .vbs lives in, so the installer can put it next
' to OutlookFeedSync.ps1 without hard-coding a path.
here = fso.GetParentFolderName(WScript.ScriptFullName)

If WScript.Arguments.Count >= 1 Then
    psScript = WScript.Arguments(0)
Else
    psScript = fso.BuildPath(here, "OutlookFeedSync.ps1")
End If

If Not fso.FileExists(psScript) Then
    ' Log to the same folder so the user has a breadcrumb if the shortcut
    ' stops working after a move. Failing silently is intentional - this
    ' runs from Task Scheduler and MUST NOT pop a dialog.
    Dim logPath, f
    logPath = fso.BuildPath(here, "run-hidden-error.log")
    On Error Resume Next
    Set f = fso.OpenTextFile(logPath, 8, True)
    f.WriteLine Now & "  Missing script: " & psScript
    f.Close
    WScript.Quit 1
End If

cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & psScript & """"

' 0 = SW_HIDE, False = don't wait for it to finish.
shell.Run cmd, 0, False
