ESABCC Outlook Feed Sync
=========================

One-click installer for a background task that pushes any Outlook email
you drop into a "Feed" folder to the MethodHub News Feed. No VBA, no
Trust Center fiddling, no F11.

HOW IT WORKS
------------

A Windows Scheduled Task runs once per hour while you're logged in.
It attaches to your running Outlook via COM (reading is allowed; we
never touch the VBA project), scans a subfolder of your Inbox called
"Feed" for items that don't yet carry the "Pushed to MethodHub"
Outlook category, and POSTs each one to the News Feed webhook. Pushed
items get tagged with that category so they are never posted twice.

The task is launched through a tiny VBScript wrapper (run-hidden.vbs)
via wscript.exe, so no PowerShell console window is ever shown. Older
installs used "powershell.exe -WindowStyle Hidden" directly, which
still flashed a black window briefly - that's been fixed here.

If Outlook isn't running, the task exits silently and does nothing.

REQUIREMENTS
------------

Classic desktop Outlook for Windows (2013 or newer). The "new Outlook"
and outlook.com in a browser do not expose Outlook's COM API and
cannot be automated this way.

INSTALL
-------

1. Unzip the folder somewhere (e.g. Desktop).
2. Double-click  install.cmd
3. If Windows SmartScreen warns about an unverified publisher, click
   "More info" > "Run anyway". The installer is plain PowerShell -
   no binaries, no admin.
4. The installer copies OutlookFeedSync.ps1 and run-hidden.vbs to
   %LOCALAPPDATA%\ESABCC, registers the scheduled task, drops a
   "Push Outlook Feed Now" shortcut on your Desktop, and fires a
   first sync run.

PUSHING A MAIL TO THE FEED
--------------------------

1. In Outlook, right-click your Inbox > "New Folder" > call it  Feed
   (spelled exactly that way - capital F).
2. Drag any email into that Feed folder.
3. Within an hour it lands on the News Feed (or instantly, if you
   double-click the Desktop shortcut described below). The item stays
   in your Feed folder, just with a "Pushed to MethodHub" category tag
   so the next sync run knows not to re-post it.

The task does NOT touch anything outside the Feed folder, so your
Inbox, Sent Items, archives, etc. are never read or modified.

ONE-CLICK BUTTON IN OUTLOOK (optional, 30 seconds)
---------------------------------------------------

Outlook's built-in Quick Steps give you a one-click button (and an
optional keyboard shortcut) that moves the selected mail into the Feed
folder:

1. Outlook Home tab > Quick Steps pane > "Create New".
2. Name it  Push to MethodHub
3. Action: "Move to folder" > pick  Feed
4. Expand "Options" > assign Shortcut key  Ctrl+Shift+1  (or any other)
5. Finish.

Select any email and press Ctrl+Shift+1. The Quick Step moves it into
Feed, the next sync run picks it up, and it appears on the News Feed.

TRIGGERING A SYNC RIGHT NOW
---------------------------

Easiest: double-click the  Push Outlook Feed Now  shortcut the
installer placed on your Desktop. It runs the same hidden wrapper, so
no window opens - the sync just happens. Use this whenever you don't
want to wait for the next hourly tick.

Alternatives:

  - From PowerShell:  schtasks /run /tn "ESABCC Outlook Feed Sync"
  - From Task Scheduler (Win+R > taskschd.msc): find the task under
    Task Scheduler Library and click "Run".

UNINSTALL
---------

Double-click  uninstall.cmd

This removes the scheduled task, the sync script, the hidden wrapper,
and the Desktop shortcut. It does NOT delete the Feed folder, the
"Pushed to MethodHub" category, or your Quick Step - those are yours
to keep or clean up manually.

LOG FILE
--------

%LOCALAPPDATA%\ESABCC\outlook-sync.log

Lists every run, every push, and every error. If something looks
missing from the feed, start there.

TROUBLESHOOTING
---------------

"Could not detect Outlook under HKCU..."
  You're on the new Outlook, web Outlook, or a machine-wide install.
  The COM automation path only works with classic desktop Outlook
  installed for the current user.

Nothing is getting pushed, log says "Outlook not running - skipping":
  The task only does work while Outlook is open. Open Outlook, wait up
  to an hour, or double-click the Desktop shortcut to flush now.

Log says "Feed folder not found under Inbox":
  Create a subfolder under Inbox named exactly  Feed  (capital F). The
  script only pushes mail that's inside that folder.

Log says "COM attach failed":
  Outlook was starting up or closing when the task ran. Normal -
  it'll succeed on the next tick.

Log shows "POST failed ... 308 Permanent Redirect":
  You have an older version of OutlookFeedSync.ps1 without the trailing
  slash on the webhook URL. Re-download this zip and re-run install.cmd
  to refresh it.

A console window still flashes every hour:
  You're on an old install (pre-hourly, pre-VBS wrapper). Re-download
  this zip and re-run install.cmd - the new installer wires the task
  through wscript.exe so no window appears.
