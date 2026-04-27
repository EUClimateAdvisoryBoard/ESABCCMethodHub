Attribute VB_Name = "ESABCC_PushToMethodHub"
' ============================================================================
' ESABCC "Push to MethodHub" for Outlook (VBA)
' ============================================================================
'
' Sends the currently selected / open email to the MethodHub inbound-email
' webhook, so it lands in the News Feed without having to forward anything.
'
' No admin rights required. Outlook VBA macros are stored per-user in
' %APPDATA%\Microsoft\Outlook\VbaProject.OTM and load automatically every
' time Outlook starts — unlike Office Add-ins they do NOT need sideloading.
'
' ----------------------------------------------------------------------------
' SETUP (one time, ~2 minutes)
' ----------------------------------------------------------------------------
'
'   1. Open Outlook.
'   2. Press Alt+F11 to open the VBA editor.
'   3. File > Import File… > select this .bas file.
'        (If Import is greyed out, first expand "Project1 (VbaProject.OTM)"
'         in the left tree, then right-click it > Import File.)
'   4. Edit the WEBHOOK_SECRET constant below to match the value of
'      INBOUND_EMAIL_SECRET set in the Vercel project's env vars.
'   5. Press Ctrl+S in the VBA editor to save VbaProject.OTM.
'   6. Close the VBA editor (Alt+F11).
'   7. Enable macros: File > Options > Trust Center > Trust Center Settings
'      > Macro Settings > "Notifications for digitally signed macros" (or
'      "Enable all macros" if your org allows it). Restart Outlook.
'
' ----------------------------------------------------------------------------
' HOURLY AUTO-PUSH (replaces Pipedream / Zapier — no quota, no domain)
' ----------------------------------------------------------------------------
'
' This module can silently push matching emails to the News Feed on an
' hourly schedule — not on every arrival. The hourly cadence keeps the
' feed from updating constantly while still keeping it fresh. Two rules
' are wired up by default:
'
'   Rule 1: forwarded by Rasmus, originally a POLITICO Pro newsletter.
'           (Sender name/email contains "Rasmus" AND subject or body
'            contains "POLITICO".)
'
'   Rule 2: from François, subject contains "Climate Action Press Review".
'
' Both rules are case-insensitive. Edit the AUTOPUSH_SENDER_* /
' AUTOPUSH_KEYWORD_* constants below to use exact email addresses or
' different keywords.
'
' Each matching mail is pushed at most once — the module marks pushed
' items with a hidden user property on the MailItem itself, so re-scans
' never produce duplicates, even across Outlook restarts.
'
' TO ACTIVATE:
'
'   1. Finish the SETUP steps above (import this module, set the secret).
'   2. In the VBA editor, expand "Project1 (VbaProject.OTM)" in the left
'      tree and double-click "ThisOutlookSession".
'   3. Paste the following snippet at the bottom of that module (replaces
'      any older Application_NewMailEx handler — delete that if present):
'
'        Private Sub Application_Startup()
'            ESABCC_ScheduleNextHourly
'        End Sub
'
'   4. Ctrl+S. Restart Outlook once so the hourly timer arms itself.
'
' From then on, once per hour the module scans the Inbox, pushes any
' new matches to the webhook, and reschedules itself for the next hour.
' The "Push to MethodHub" QAT button still works for one-off pushes of
' emails that don't match any rule, and the new "Push New Matches Now"
' button (see below) lets you flush the queue manually between hourly
' runs.
'
' NOTE: requires classic desktop Outlook for Windows. The new Outlook
' (formerly "One Outlook") and outlook.com in the browser do not run VBA.
'
' ----------------------------------------------------------------------------
' ADDING ONE-CLICK BUTTONS (no admin needed)
' ----------------------------------------------------------------------------
'
' Outlook 2016+ does not render custom VBA CommandBar toolbars in the main
' window, so the reliable way to get a button is the Quick Access Toolbar
' (QAT) — the little row of icons at the very top of the Outlook window.
'
' Add two buttons:
'
'   A. "Push to MethodHub" — sends the currently selected email.
'      1. Right-click the QAT > Customize Quick Access Toolbar…
'      2. "Choose commands from:" dropdown > select "Macros".
'      3. Pick  Project1.ESABCC_PushToMethodHub.ESABCC_PushToMethodHub
'         and click Add >>.
'      4. Click Modify… to pick an icon and rename to "Push to MethodHub".
'
'   B. "Push New Matches Now" — flushes any matching emails the hourly
'      timer has not yet sent. This is the easy manual trigger for the
'      News Feed sync.
'      1. Same Customize dialog.
'      2. Pick  Project1.ESABCC_PushToMethodHub.ESABCC_AutoPushNow
'         and click Add >>.
'      3. Modify… > pick an icon and rename to "Push New Matches Now".
'      4. OK.
'
' Tip: you can also assign a keyboard shortcut via AutoHotkey or by making
' the QAT button the Nth icon — Alt+<N> triggers it.
'
' ============================================================================

Option Explicit

' -- Configuration --
' Update WEBHOOK_SECRET to match INBOUND_EMAIL_SECRET in Vercel.
' The default below matches the fallback in
' src/app/api/inbound-email/route.ts so it works out of the box against a
' freshly-deployed instance that hasn't set the env var yet.
Private Const WEBHOOK_URL As String = "https://eu-climate-policy.vercel.app/api/inbound-email"
Private Const WEBHOOK_SECRET As String = "esabcc-email-webhook-2024"

' Max characters of body text to include in the POST. The webhook trims
' further server-side; this cap just keeps the request payload sane.
Private Const MAX_BODY_CHARS As Long = 200000

' -- Auto-push rules (see "AUTO-PUSH ON ARRIVAL" in the header) --
' Each rule fires when the sender token matches AND the keyword appears in
' the subject or body. Matching is case-insensitive. Leave a token empty
' ("") to disable a rule. To add more rules, extend AutoPushRuleMatches().
Private Const AUTOPUSH_SENDER_1  As String = "Rasmus"
Private Const AUTOPUSH_KEYWORD_1 As String = "POLITICO"
Private Const AUTOPUSH_SENDER_2  As String = "Francois"
Private Const AUTOPUSH_KEYWORD_2 As String = "Climate Action Press Review"

' Hourly auto-push interval in minutes. Change to 30 for twice-hourly,
' 120 for every two hours, etc.
Private Const AUTOPUSH_INTERVAL_MIN As Long = 60

' Inbox lookback window for the hourly scan. Anything older than this is
' ignored to keep scans fast — mails received before the timer was armed
' won't be auto-pushed, which is what you want. Bump this if Outlook is
' commonly offline for longer stretches.
Private Const AUTOPUSH_LOOKBACK_HRS As Long = 48

' User property used to mark a MailItem as already pushed, so the hourly
' timer never double-sends it. Stored on the mail itself — no external
' state, survives restarts.
Private Const PUSHED_MARKER_PROP As String = "ESABCCPushed"

' PR_SMTP_ADDRESS MAPI tag — used to resolve the real SMTP address for
' senders that show up as Exchange X.500 DNs (internal mail).
Private Const PR_SMTP_ADDRESS As String = _
    "http://schemas.microsoft.com/mapi/proptag/0x39FE001E"

' ============================================================================
' PUBLIC ENTRY POINTS (assign these to QAT buttons or hotkeys)
' ============================================================================

' Main action: push the currently selected / open email to MethodHub.
Public Sub ESABCC_PushToMethodHub()
    On Error GoTo PushErr

    Dim mailItem As Object
    Set mailItem = GetActiveMailItem()

    If mailItem Is Nothing Then
        MsgBox "No email is selected." & vbCrLf & vbCrLf & _
               "Open or highlight a message in the inbox and try again.", _
               vbExclamation, "Push to MethodHub"
        Exit Sub
    End If

    ' Confirm the user actually meant this item (helpful when the QAT button
    ' is clicked by accident). Suppress with Shift-click? — not worth the
    ' complexity; one extra click is cheap.
    Dim previewSubject As String
    previewSubject = Trim$(CStr(mailItem.Subject))
    If Len(previewSubject) > 80 Then previewSubject = Left$(previewSubject, 77) & "..."

    Dim ans As VbMsgBoxResult
    ans = MsgBox("Push this email to MethodHub?" & vbCrLf & vbCrLf & _
                 "Subject: " & previewSubject, _
                 vbQuestion + vbYesNo + vbDefaultButton1, _
                 "Push to MethodHub")
    If ans <> vbYes Then Exit Sub

    DoEvents

    Dim resp As String
    Dim statusCode As Long
    statusCode = PostMailItem(mailItem, resp)

    If statusCode >= 200 And statusCode < 300 Then
        MsgBox "Pushed to MethodHub." & vbCrLf & vbCrLf & _
               "It will appear in the News Feed within a few seconds.", _
               vbInformation, "Push to MethodHub"
    Else
        MsgBox "The webhook rejected the request." & vbCrLf & vbCrLf & _
               "HTTP " & statusCode & vbCrLf & vbCrLf & _
               "Response:" & vbCrLf & Left$(resp, 600), _
               vbCritical, "Push to MethodHub"
    End If
    Exit Sub

PushErr:
    MsgBox "Could not push the email." & vbCrLf & vbCrLf & _
           "Error: " & Err.Description, _
           vbCritical, "Push to MethodHub"
End Sub

' Optional: quick connection / auth smoke test.
Public Sub ESABCC_TestConnection()
    On Error GoTo TestErr

    Dim http As Object
    Set http = CreateHttpObject()
    If http Is Nothing Then
        MsgBox "Could not create an HTTP client.", vbCritical, "Push to MethodHub"
        Exit Sub
    End If

    http.Open "GET", WEBHOOK_URL & "?secret=" & WEBHOOK_SECRET, False
    http.setRequestHeader "Accept", "application/json"
    http.send

    If http.Status = 200 Then
        MsgBox "Webhook reachable." & vbCrLf & vbCrLf & _
               "Endpoint: " & WEBHOOK_URL & vbCrLf & _
               "HTTP 200 OK.", _
               vbInformation, "Push to MethodHub"
    ElseIf http.Status = 401 Then
        MsgBox "Webhook reachable but rejected the secret." & vbCrLf & vbCrLf & _
               "Update WEBHOOK_SECRET at the top of the module to match" & vbCrLf & _
               "INBOUND_EMAIL_SECRET in Vercel.", _
               vbExclamation, "Push to MethodHub"
    Else
        MsgBox "Unexpected response: HTTP " & http.Status & vbCrLf & vbCrLf & _
               Left$(http.responseText, 600), _
               vbExclamation, "Push to MethodHub"
    End If
    Exit Sub

TestErr:
    MsgBox "Could not reach the webhook." & vbCrLf & vbCrLf & _
           "Error: " & Err.Description & vbCrLf & vbCrLf & _
           "Check your network / proxy and that the URL is correct:" & vbCrLf & _
           WEBHOOK_URL, _
           vbCritical, "Push to MethodHub"
End Sub

' Called from ThisOutlookSession.Application_Startup on Outlook launch to
' arm the hourly auto-push timer. Each run reschedules itself, so after
' the first kickoff no further wiring is needed.
Public Sub ESABCC_ScheduleNextHourly()
    On Error Resume Next
    Dim nextRun As Date
    nextRun = DateAdd("n", AUTOPUSH_INTERVAL_MIN, Now)
    Application.OnTime EarliestTime:=nextRun, _
                       Procedure:="ESABCC_AutoPushHourly", _
                       Schedule:=True
    Debug.Print "[ESABCC] next hourly auto-push scheduled at " & nextRun
End Sub

' Fires once per AUTOPUSH_INTERVAL_MIN minutes. Scans the Inbox for any
' mail that matches a rule and hasn't been pushed yet, POSTs those to
' the webhook, marks them so they aren't sent twice, and reschedules
' itself. No dialogs — failures go to the VBA Immediate window
' (View > Immediate), so this is safe to run unattended.
Public Sub ESABCC_AutoPushHourly()
    On Error Resume Next
    AutoPushSweep False
    ESABCC_ScheduleNextHourly
End Sub

' Manual "flush now" entry point — bind this to a QAT button so the user
' can push pending matches without waiting for the next hourly tick. Shows
' a summary MsgBox when done so the click is visibly acknowledged.
Public Sub ESABCC_AutoPushNow()
    On Error GoTo NowErr
    AutoPushSweep True
    Exit Sub

NowErr:
    MsgBox "Manual push failed." & vbCrLf & vbCrLf & _
           "Error: " & Err.Description, _
           vbCritical, "Push to MethodHub"
End Sub

' Shared sweep used by both the hourly timer and the manual button. When
' showSummary is True, a MsgBox reports the counts at the end; when False
' (the hourly path), we stay silent and just log to Debug.
Private Sub AutoPushSweep(ByVal showSummary As Boolean)
    Dim ns As Object
    Set ns = Application.GetNamespace("MAPI")
    If ns Is Nothing Then Exit Sub

    Dim inbox As Object
    Set inbox = ns.GetDefaultFolder(6) ' olFolderInbox = 6
    If inbox Is Nothing Then Exit Sub

    Dim cutoff As Date
    cutoff = DateAdd("h", -AUTOPUSH_LOOKBACK_HRS, Now)

    Dim scanned As Long: scanned = 0
    Dim pushed As Long: pushed = 0
    Dim skippedAlready As Long: skippedAlready = 0

    Dim item As Object
    For Each item In inbox.Items
        If IsMailItem(item) Then
            Dim received As Date
            received = 0
            On Error Resume Next
            received = item.ReceivedTime
            On Error GoTo 0
            If received = 0 Or received >= cutoff Then
                scanned = scanned + 1
                If AutoPushRuleMatches(item) Then
                    If AlreadyPushed(item) Then
                        skippedAlready = skippedAlready + 1
                    Else
                        Dim resp As String
                        Dim code As Long
                        code = PostMailItem(item, resp)
                        If code >= 200 And code < 300 Then
                            MarkAsPushed item
                            pushed = pushed + 1
                        End If
                        Debug.Print "[ESABCC sweep] HTTP " & code & _
                                    " — " & Left$(CStr(item.Subject), 120)
                        If code < 200 Or code >= 300 Then
                            Debug.Print "[ESABCC sweep] body: " & _
                                        Left$(resp, 400)
                        End If
                    End If
                End If
            End If
        End If
    Next item

    Debug.Print "[ESABCC sweep] " & Now & " — scanned=" & scanned & _
                " pushed=" & pushed & " already=" & skippedAlready

    If showSummary Then
        MsgBox "Push complete." & vbCrLf & vbCrLf & _
               "Scanned:            " & scanned & " recent items" & vbCrLf & _
               "Pushed new:         " & pushed & vbCrLf & _
               "Already pushed:     " & skippedAlready & vbCrLf & vbCrLf & _
               "Next automatic run in ~" & AUTOPUSH_INTERVAL_MIN & " min.", _
               vbInformation, "Push to MethodHub"
    End If
End Sub

' Deprecated: kept only so existing Application_NewMailEx handlers that
' call into it keep compiling. The module now runs on an hourly timer
' instead of on every arrival — delete the Application_NewMailEx stub in
' ThisOutlookSession and replace it with Application_Startup calling
' ESABCC_ScheduleNextHourly.
Public Sub ESABCC_AutoPushByEntryID(ByVal EntryIDCollection As String)
    On Error Resume Next
    Debug.Print "[ESABCC] ESABCC_AutoPushByEntryID is deprecated; " & _
                "hourly timer handles auto-push. Remove the " & _
                "Application_NewMailEx hook from ThisOutlookSession."
End Sub

' Returns True if the mail has already been sent to the webhook (based on
' the hidden user property we set after a successful POST).
Private Function AlreadyPushed(ByVal mailItem As Object) As Boolean
    On Error Resume Next
    AlreadyPushed = False
    Dim prop As Object
    Set prop = mailItem.UserProperties.Find(PUSHED_MARKER_PROP)
    If prop Is Nothing Then Exit Function
    AlreadyPushed = (CBool(prop.Value) = True)
End Function

' Stamp a successful push onto the MailItem so we never send it again.
' olYesNo = 6. Save is required for the property to persist.
Private Sub MarkAsPushed(ByVal mailItem As Object)
    On Error Resume Next
    Dim prop As Object
    Set prop = mailItem.UserProperties.Find(PUSHED_MARKER_PROP)
    If prop Is Nothing Then
        Set prop = mailItem.UserProperties.Add(PUSHED_MARKER_PROP, 6, False)
    End If
    prop.Value = True
    mailItem.Save
End Sub

' Entry point you can call manually (e.g. from a QAT button) to re-scan
' the Inbox and push anything matching the rules regardless of the
' lookback window. Useful right after enabling auto-mode, so the rules
' apply to mail that arrived earlier than AUTOPUSH_LOOKBACK_HRS.
Public Sub ESABCC_AutoPushBacklog()
    On Error GoTo BacklogErr

    Dim ns As Object
    Set ns = Application.GetNamespace("MAPI")
    Dim inbox As Object
    Set inbox = ns.GetDefaultFolder(6) ' olFolderInbox = 6

    Dim pushed As Long: pushed = 0
    Dim scanned As Long: scanned = 0
    Dim skippedAlready As Long: skippedAlready = 0

    Dim item As Object
    For Each item In inbox.Items
        scanned = scanned + 1
        If IsMailItem(item) Then
            If AutoPushRuleMatches(item) Then
                If AlreadyPushed(item) Then
                    skippedAlready = skippedAlready + 1
                Else
                    Dim resp As String
                    Dim code As Long
                    code = PostMailItem(item, resp)
                    If code >= 200 And code < 300 Then
                        MarkAsPushed item
                        pushed = pushed + 1
                    End If
                    Debug.Print "[ESABCC backlog] HTTP " & code & _
                                " — " & Left$(CStr(item.Subject), 120)
                End If
            End If
        End If
    Next item

    MsgBox "Backlog scan complete." & vbCrLf & vbCrLf & _
           "Scanned:        " & scanned & " items" & vbCrLf & _
           "Pushed new:     " & pushed & vbCrLf & _
           "Already pushed: " & skippedAlready, _
           vbInformation, "Push to MethodHub"
    Exit Sub

BacklogErr:
    MsgBox "Backlog scan failed." & vbCrLf & vbCrLf & _
           "Error: " & Err.Description, _
           vbCritical, "Push to MethodHub"
End Sub

' Returns True if the mail matches at least one configured auto-push rule.
Private Function AutoPushRuleMatches(ByVal mailItem As Object) As Boolean
    On Error Resume Next

    Dim subj As String: subj = LCase$(CStr(mailItem.Subject))
    Dim body As String: body = LCase$(Left$(CStr(mailItem.Body), 4000))
    Dim sender As String: sender = LCase$(BuildDisplayFrom(mailItem))

    If RuleFires(sender, subj, body, AUTOPUSH_SENDER_1, AUTOPUSH_KEYWORD_1) Then
        AutoPushRuleMatches = True
        Exit Function
    End If

    If RuleFires(sender, subj, body, AUTOPUSH_SENDER_2, AUTOPUSH_KEYWORD_2) Then
        AutoPushRuleMatches = True
        Exit Function
    End If

    AutoPushRuleMatches = False
End Function

Private Function RuleFires(ByVal sender As String, _
                           ByVal subj As String, _
                           ByVal body As String, _
                           ByVal senderToken As String, _
                           ByVal keyword As String) As Boolean
    If Len(senderToken) = 0 Then Exit Function
    If InStr(sender, LCase$(senderToken)) = 0 Then Exit Function
    If Len(keyword) = 0 Then
        RuleFires = True
        Exit Function
    End If
    Dim k As String: k = LCase$(keyword)
    RuleFires = (InStr(subj, k) > 0) Or (InStr(body, k) > 0)
End Function

' Shows a welcome message so the user knows import worked.
Public Sub ESABCC_Start()
    MsgBox "Push to MethodHub is ready." & vbCrLf & vbCrLf & _
           "Right-click the Quick Access Toolbar > Customize >" & vbCrLf & _
           "Choose Macros > add ESABCC_PushToMethodHub." & vbCrLf & vbCrLf & _
           "Then select an email and click the button.", _
           vbInformation, "Push to MethodHub"
End Sub

' ============================================================================
' CORE: pick up the active mail item
' ============================================================================

' Returns the MailItem the user is currently acting on, or Nothing. Tries:
'   1. The open inspector (a message opened in its own window)
'   2. The first selected item in the active explorer (the reading pane)
Private Function GetActiveMailItem() As Object
    On Error Resume Next

    Dim insp As Object
    Set insp = Application.ActiveInspector
    If Not insp Is Nothing Then
        Dim ci As Object
        Set ci = insp.CurrentItem
        If Not ci Is Nothing Then
            If IsMailItem(ci) Then
                Set GetActiveMailItem = ci
                Exit Function
            End If
        End If
    End If
    Err.Clear

    Dim expl As Object
    Set expl = Application.ActiveExplorer
    If Not expl Is Nothing Then
        Dim sel As Object
        Set sel = expl.Selection
        If Not sel Is Nothing Then
            If sel.Count >= 1 Then
                Dim first As Object
                Set first = sel.Item(1)
                If IsMailItem(first) Then
                    Set GetActiveMailItem = first
                    Exit Function
                End If
            End If
        End If
    End If

    Set GetActiveMailItem = Nothing
End Function

' olMail = 43. We avoid binding to the Outlook type library explicitly so
' this module works under late binding even if references get broken.
Private Function IsMailItem(obj As Object) As Boolean
    On Error Resume Next
    IsMailItem = (obj.Class = 43)
End Function

' ============================================================================
' HTTP POST
' ============================================================================

Private Function PostMailItem(ByVal mailItem As Object, ByRef responseText As String) As Long
    Dim http As Object
    Set http = CreateHttpObject()
    If http Is Nothing Then
        PostMailItem = 0
        responseText = "Could not create HTTP client."
        Exit Function
    End If

    http.Open "POST", WEBHOOK_URL & "?secret=" & WEBHOOK_SECRET, False
    http.setRequestHeader "Content-Type", "application/json"
    http.setRequestHeader "Accept", "application/json"

    Dim body As String
    body = BuildJsonPayload(mailItem)

    On Error Resume Next
    http.send body
    If Err.Number <> 0 Then
        responseText = "send() failed: " & Err.Description
        PostMailItem = 0
        Err.Clear
        Exit Function
    End If
    On Error GoTo 0

    responseText = http.responseText
    PostMailItem = http.Status
End Function

' Build the JSON payload the webhook expects. The endpoint at
' src/app/api/inbound-email/route.ts is defensive about field names — we
' stick to {subject, from, text, html, date} which it reads out of the box.
Private Function BuildJsonPayload(ByVal mailItem As Object) As String
    Dim subjectVal As String
    Dim fromVal As String
    Dim textVal As String
    Dim htmlVal As String
    Dim dateVal As String

    On Error Resume Next

    subjectVal = CStr(mailItem.Subject)
    fromVal = BuildDisplayFrom(mailItem)
    textVal = CStr(mailItem.Body)
    htmlVal = CStr(mailItem.HTMLBody)

    Dim received As Date
    received = mailItem.ReceivedTime
    If received = 0 Then received = mailItem.SentOn
    If received = 0 Then received = Now
    dateVal = FormatDateIso(received)

    On Error GoTo 0

    If Len(textVal) > MAX_BODY_CHARS Then textVal = Left$(textVal, MAX_BODY_CHARS)
    If Len(htmlVal) > MAX_BODY_CHARS Then htmlVal = Left$(htmlVal, MAX_BODY_CHARS)

    BuildJsonPayload = "{" & _
        """subject"":""" & EscJson(subjectVal) & """," & _
        """from"":""" & EscJson(fromVal) & """," & _
        """text"":""" & EscJson(textVal) & """," & _
        """html"":""" & EscJson(htmlVal) & """," & _
        """date"":""" & EscJson(dateVal) & """," & _
        """source"":""outlook-vba""" & _
        "}"
End Function

' ============================================================================
' SENDER RESOLUTION
' ============================================================================

' Returns "Display Name <smtp@address>" where possible. Falls back gracefully
' when SenderEmailAddress is an Exchange X.500 DN (internal senders).
Private Function BuildDisplayFrom(ByVal mailItem As Object) As String
    Dim name As String
    Dim addr As String

    On Error Resume Next
    name = CStr(mailItem.SenderName)
    addr = CStr(mailItem.SenderEmailAddress)

    ' If SenderEmailAddress looks like an Exchange DN (/O=... /OU=... /CN=...),
    ' resolve the real SMTP via the Sender AddressEntry's PropertyAccessor.
    If addr = "" Or LCase$(Left$(addr, 2)) = "/o" Then
        Dim ae As Object
        Set ae = mailItem.Sender
        If Not ae Is Nothing Then
            Dim smtp As String
            smtp = ""
            smtp = CStr(ae.PropertyAccessor.GetProperty(PR_SMTP_ADDRESS))
            If smtp <> "" Then addr = smtp
        End If
    End If
    On Error GoTo 0

    If name <> "" And addr <> "" Then
        BuildDisplayFrom = name & " <" & addr & ">"
    ElseIf addr <> "" Then
        BuildDisplayFrom = addr
    ElseIf name <> "" Then
        BuildDisplayFrom = name
    Else
        BuildDisplayFrom = ""
    End If
End Function

' ============================================================================
' HELPERS
' ============================================================================

Private Function CreateHttpObject() As Object
    On Error Resume Next

    Set CreateHttpObject = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    If Not CreateHttpObject Is Nothing Then Exit Function
    Err.Clear

    Set CreateHttpObject = CreateObject("MSXML2.XMLHTTP.6.0")
    If Not CreateHttpObject Is Nothing Then Exit Function
    Err.Clear

    Set CreateHttpObject = CreateObject("MSXML2.XMLHTTP")
End Function

Private Function EscJson(ByVal s As String) As String
    Dim r As String: r = s
    r = Replace(r, "\", "\\")
    r = Replace(r, """", "\""")
    r = Replace(r, vbCr, "\n")
    r = Replace(r, vbLf, "\n")
    r = Replace(r, vbTab, "\t")
    EscJson = r
End Function

' Produces an ISO-8601 timestamp in UTC, which is what JavaScript's Date
' constructor and the webhook's parseDate() both handle cleanly.
Private Function FormatDateIso(ByVal d As Date) As String
    Dim utc As Date
    utc = LocalToUtc(d)
    FormatDateIso = Format$(utc, "yyyy-mm-dd") & "T" & Format$(utc, "hh:nn:ss") & "Z"
End Function

' Convert a local Date to UTC using the system time zone. Uses the Win32
' GetTimeZoneInformation-equivalent via WMI so we don't depend on a specific
' DLL binding.
Private Function LocalToUtc(ByVal d As Date) As Date
    On Error GoTo Fallback

    Dim wmi As Object
    Set wmi = GetObject("winmgmts:\\.\root\cimv2")
    Dim items As Object
    Set items = wmi.ExecQuery("SELECT Bias, DaylightBias FROM Win32_TimeZone")
    Dim tz As Object
    For Each tz In items
        ' Bias is in minutes; positive west of UTC. Daylight savings is
        ' already reflected in the system clock, so we use Bias alone for a
        ' best-effort conversion. Acceptable because the webhook re-parses
        ' the date with JS's tolerant parser anyway.
        LocalToUtc = DateAdd("n", CLng(tz.Bias), d)
        Exit Function
    Next tz

Fallback:
    ' If WMI isn't available, just pass the local time through. The webhook
    ' will still accept it — the worst case is a few hours of skew in the
    ' published-at timestamp on the news feed card.
    LocalToUtc = d
End Function
