# ============================================================================
# ESABCC Outlook Feed Sync
# ============================================================================
#
# Runs on a Windows Scheduled Task (once per hour) under the current user.
# The task is launched via run-hidden.vbs + wscript.exe so no PowerShell
# console window is ever shown - not even the brief flash that
# -WindowStyle Hidden alone lets through.
#
# Manual-push only: the script pushes any mail you drop into an Outlook
# subfolder called "Feed" (under your default Inbox) to the News Feed.
# Nothing else in your Inbox is touched.
#
# What it does each run:
#   1. If Outlook isn't already running, exit quietly.
#   2. Attach to the running Outlook via COM (Outlook is a single-instance
#      COM server, so New-Object attaches rather than creating a new copy).
#   3. Scan the "Feed" subfolder of the Inbox for items that are not yet
#      tagged with the "Pushed to MethodHub" category.
#   4. POST each one to /api/inbound-email and tag it so it's never posted
#      twice.
#   5. Log everything to %LOCALAPPDATA%\ESABCC\outlook-sync.log.
#
# This script is installed by install.ps1 into
# %LOCALAPPDATA%\ESABCC\OutlookFeedSync.ps1 and the task runs it silently.
# The installer also drops a "Push Outlook Feed Now" shortcut on the
# Desktop that runs this script immediately (same hidden wrapper, so no
# window pops up there either).

$ErrorActionPreference = 'Stop'

# ---------- Config ----------
# Trailing slash is required: next.config.js has trailingSlash=true and
# sends a 308 Permanent Redirect on non-slashed paths. Windows PowerShell 5.1
# drops the POST body on that redirect.
$WebhookUrl     = 'https://eu-climate-policy.vercel.app/api/inbound-email/'
$WebhookSecret  = 'esabcc-feed-7f3a9c2e1b4d1'
$PushedCategory = 'Pushed to MethodHub'
$FeedFolderName = 'Feed'
$MaxBodyChars   = 200000
$LogPath        = Join-Path $env:LOCALAPPDATA 'ESABCC\outlook-sync.log'
$LogMaxBytes    = 1MB    # roll log when it exceeds this

# ---------- Logging ----------
function Write-Log {
    param([string]$Message)
    try {
        $dir = Split-Path -Parent $LogPath
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        if ((Test-Path $LogPath) -and ((Get-Item $LogPath).Length -gt $LogMaxBytes)) {
            Move-Item $LogPath "$LogPath.old" -Force
        }
        $line = "{0}  {1}" -f (Get-Date).ToString('yyyy-MM-dd HH:mm:ss'), $Message
        Add-Content -Path $LogPath -Value $line -Encoding UTF8
    } catch { }
}

Write-Log "=== Sync run start ==="

# ---------- Guard: Outlook must be running ----------
$olProc = Get-Process OUTLOOK -ErrorAction SilentlyContinue
if (-not $olProc) {
    Write-Log "Outlook not running - skipping."
    exit 0
}

# ---------- Attach to Outlook ----------
try {
    $outlook = New-Object -ComObject Outlook.Application
    $ns = $outlook.GetNamespace('MAPI')
} catch {
    Write-Log "COM attach failed: $($_.Exception.Message)"
    exit 1
}

# ---------- Helpers ----------
function Get-SenderDisplay {
    param($Item)
    $name = ''; $addr = ''
    try { $name = [string]$Item.SenderName } catch {}
    try { $addr = [string]$Item.SenderEmailAddress } catch {}
    # Resolve Exchange DN to SMTP when possible.
    if (-not $addr -or $addr.StartsWith('/o', [StringComparison]::OrdinalIgnoreCase) -or $addr.StartsWith('/O')) {
        try {
            $ae = $Item.Sender
            if ($ae) {
                $smtp = $ae.PropertyAccessor.GetProperty('http://schemas.microsoft.com/mapi/proptag/0x39FE001E')
                if ($smtp) { $addr = [string]$smtp }
            }
        } catch {}
    }
    if ($name -and $addr) { return "$name <$addr>" }
    if ($addr) { return $addr }
    return $name
}

function Test-AlreadyPushed {
    param($Item)
    try {
        $cat = [string]$Item.Categories
        if ($cat) { return $cat.Contains($PushedCategory) }
    } catch {}
    return $false
}

function Remove-JsonBreakingChars {
    # PowerShell 5.1's ConvertTo-Json sometimes lets raw control characters
    # through (NUL, vertical tab, form feed, unpaired surrogate halves etc).
    # Those bytes then break the server-side JSON.parse with errors like
    # "Expected ',' or '}' after property value in JSON at position N".
    # Strip everything outside printable range except TAB/LF/CR, and drop
    # unpaired high/low surrogate halves.
    param([string]$Text)
    if (-not $Text) { return '' }
    # Remove C0 controls except \t(0x09) \n(0x0A) \r(0x0D), plus DEL (0x7F).
    $out = [regex]::Replace($Text, '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '')
    # Drop unpaired high/low surrogate halves (PowerShell 5.1 has no \u{}
    # escape syntax, and dropping them is safer than trying to substitute).
    $out = [regex]::Replace($out, '[\uD800-\uDBFF](?![\uDC00-\uDFFF])', '')
    $out = [regex]::Replace($out, '(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]', '')
    return $out
}

function Invoke-Push {
    param($Item)
    $subj = ''; $body = ''; $html = ''; $date = (Get-Date).ToString('o')
    try { $subj = [string]$Item.Subject } catch {}
    try { $body = [string]$Item.Body } catch {}
    try { $html = [string]$Item.HTMLBody } catch {}
    try {
        $received = [DateTime]$Item.ReceivedTime
        $date = $received.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    } catch {}

    $from = Get-SenderDisplay -Item $Item
    if ($body.Length -gt $MaxBodyChars) { $body = $body.Substring(0, $MaxBodyChars) }
    if ($html.Length -gt $MaxBodyChars) { $html = $html.Substring(0, $MaxBodyChars) }

    # Sanitise inputs before JSON serialising - PowerShell 5.1 can emit
    # invalid JSON when the source string contains rogue control bytes.
    $subj = Remove-JsonBreakingChars $subj
    $body = Remove-JsonBreakingChars $body
    $html = Remove-JsonBreakingChars $html
    $from = Remove-JsonBreakingChars $from

    $payload = @{
        subject = $subj
        from    = $from
        text    = $body
        html    = $html
        date    = $date
        source  = 'outlook-sync'
    } | ConvertTo-Json -Compress -Depth 3

    $url = "$WebhookUrl`?secret=$WebhookSecret"

    # POST the payload as explicit UTF-8 bytes. If we pass the string
    # directly, PowerShell 5.1 encodes it using the system default codepage
    # (often Windows-1252) which applies "best-fit" fallback - e.g. the
    # curly quote U+201C gets silently rewritten to plain ASCII "  - which
    # embeds an unescaped " into the JSON body and breaks the server parser:
    #     Expected ',' or '}' after property value in JSON at position N
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
        $null = Invoke-RestMethod -Uri $url -Method Post -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec 30
    } catch {
        Write-Log "POST failed for '$subj': $($_.Exception.Message)"
        return $false
    }

    # Mark as pushed so the next run skips it. Append to existing categories
    # rather than replacing them.
    try {
        $existing = [string]$Item.Categories
        if ($existing -and -not $existing.Contains($PushedCategory)) {
            $Item.Categories = "$existing;$PushedCategory"
        } elseif (-not $existing) {
            $Item.Categories = $PushedCategory
        }
        $Item.Save()
    } catch {
        Write-Log "Could not set category on '$subj': $($_.Exception.Message)"
    }

    Write-Log "Pushed: $subj"
    return $true
}

# ---------- Scan Feed folder (manual push) ----------
$inbox = $ns.GetDefaultFolder(6)   # olFolderInbox
$feedFolder = $null
try {
    foreach ($f in $inbox.Folders) {
        if ([string]$f.Name -eq $FeedFolderName) { $feedFolder = $f; break }
    }
} catch {}

if (-not $feedFolder) {
    Write-Log "Feed folder not found under Inbox. Create it in Outlook to start pushing mail."
    try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($outlook) | Out-Null } catch {}
    Write-Log "=== Sync run done ==="
    exit 0
}

$pushed = 0
$scanned = 0
try {
    foreach ($item in $feedFolder.Items) {
        $scanned++
        try {
            if ([string]$item.MessageClass -notlike 'IPM.Note*') { continue }
            if (Test-AlreadyPushed -Item $item) { continue }
            if (Invoke-Push -Item $item) { $pushed++ }
        } catch {
            Write-Log "Feed folder item error: $($_.Exception.Message)"
        }
    }
} catch {
    Write-Log "Feed folder scan error: $($_.Exception.Message)"
}

# ---------- Cleanup ----------
try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($outlook) | Out-Null } catch {}
Write-Log ("Feed folder: pushed {0} of {1} scanned." -f $pushed, $scanned)
Write-Log "=== Sync run done ==="
