'use client';

export default function WordAddinSetupPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <a href="/references" className="text-sm text-gray-400 hover:text-gray-200">&larr; Back to Reference Manager</a>
          <h1 className="text-2xl font-bold mt-1">Word Citation Manager Setup</h1>
          <p className="text-sm text-gray-400 mt-0.5">Insert citations and generate bibliographies directly in Word</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Quick overview */}
        <section className="bg-blue-900/20 border border-blue-700/40 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-2 text-blue-200">One-time install per PC</h2>
          <p className="text-gray-300 text-sm mb-3">
            Each teammate runs <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">install.cmd</code> once
            on their own machine. After that the <strong>ESABCC References</strong> ribbon tab appears in every
            Word document they open &mdash; including shared files on SharePoint &mdash; and stays there across
            reboots, Word updates, and however many times you open and close the file.
          </p>
          <p className="text-gray-400 text-xs">
            The shared file can (and should) stay as <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">.docx</code>.
            Real-time co-authoring keeps working, and there&apos;s no macro-enable banner for anyone.
          </p>
        </section>

        {/* STEP 1 */}
        <section className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-blue-600 text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center">1</span>
            <h2 className="text-xl font-semibold">Download the Installer</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Download the ZIP and extract it anywhere you can find it (e.g. Desktop or Documents).
            Keep all five files in the same folder &mdash; the installer needs them together.
          </p>
          <a
            href="/word-vba/esabcc-word-setup.zip"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
            download
          >
            Download esabcc-word-setup.zip
          </a>
          <p className="text-xs text-gray-500 mt-2">
            Right-click &rarr; &ldquo;Save link as&rdquo; if the download doesn&apos;t start automatically.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Windows may flag the ZIP as downloaded from the internet. Right-click the ZIP &rarr; Properties &rarr;
            tick <strong>Unblock</strong> <em>before</em> extracting, so the PowerShell files inside run without a warning.
          </p>

          <div className="mt-5 bg-red-900/30 border border-red-700/50 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-200 mb-2">
              You must EXTRACT the ZIP before running anything
            </p>
            <p className="text-sm text-gray-300 mb-2">
              If you double-click files while still looking <em>inside</em> the ZIP window, Windows only
              unpacks that one file to a temporary folder. The installer can&apos;t find its sibling files
              and you&apos;ll see errors like <em>&ldquo;The system cannot find the path specified&rdquo;</em> or
              the script will just open in Notepad.
            </p>
            <p className="text-sm text-gray-300">
              Fix: right-click <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">esabcc-word-setup.zip</code>{' '}
              &rarr; <strong>Extract All&hellip;</strong> &rarr; pick a folder &rarr; open that folder &rarr;
              <em> then</em> double-click <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">install.cmd</code>.
            </p>
          </div>

          <div className="mt-3 bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-4">
            <p className="text-sm font-semibold text-yellow-200 mb-1">
              Double-click <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">install.cmd</code>, not <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">install.ps1</code>
            </p>
            <p className="text-sm text-gray-300">
              Windows opens <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">.ps1</code> files in Notepad by default (so malicious scripts can&apos;t run by accident).
              If Notepad pops up showing PowerShell code, you clicked the wrong file &mdash; close Notepad and
              double-click <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">install.cmd</code> instead.
            </p>
          </div>
        </section>

        {/* STEP 2 */}
        <section className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-blue-600 text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center">2</span>
            <h2 className="text-xl font-semibold">Run the Installer</h2>
          </div>

          <div className="space-y-6">
            <div className="border-l-2 border-blue-500 pl-4">
              <p className="font-medium text-gray-200 mb-1">2a. Close Word</p>
              <p className="text-sm text-gray-400">
                Fully close all Word windows first &mdash; the installer drives Word in the background and
                can&apos;t attach to an already-open instance cleanly.
              </p>
            </div>

            <div className="border-l-2 border-blue-500 pl-4">
              <p className="font-medium text-gray-200 mb-1">2b. Double-click <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">install.cmd</code></p>
              <p className="text-sm text-gray-400">
                A PowerShell window opens, launches Word silently, builds the
                <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs mx-1">ESABCC_RefManager.dotm</code>
                template, and drops it into your personal Word STARTUP folder:
              </p>
              <p className="text-xs text-gray-500 font-mono mt-1 break-all">
                %APPDATA%\Microsoft\Word\STARTUP\
              </p>
              <p className="text-xs text-gray-500 mt-1">
                No admin rights, no registry changes left behind.
              </p>
            </div>

            <div className="border-l-2 border-blue-500 pl-4">
              <p className="font-medium text-gray-200 mb-1">2c. Reopen Word</p>
              <p className="text-sm text-gray-400">
                The <strong>&ldquo;ESABCC References&rdquo;</strong> tab appears in the ribbon with icons
                for Insert Citation, Short Citation, Group Citation, Bibliography, and more.
                It auto-loads every time you open Word &mdash; no per-document setup, no .docm save.
              </p>
            </div>

            <div className="border-l-2 border-gray-700 pl-4">
              <p className="font-medium text-gray-300 mb-1">To uninstall</p>
              <p className="text-sm text-gray-400">
                Double-click <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">uninstall.cmd</code> from
                the same folder. It removes the template from the STARTUP folder.
              </p>
            </div>
          </div>
        </section>

        {/* Embed-in-file: deprecated in most tenants */}
        <section className="bg-gray-900 border border-yellow-700/40 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-2 text-yellow-200">
            Advanced: embedding macros into the shared file
          </h2>
          <p className="text-sm text-gray-400 mb-3">
            The ZIP also ships <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">embed-in-file.cmd</code>,
            which bakes the macros into a Word file so it becomes a
            <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs mx-1">.docm</code>
            that carries the ribbon wherever it goes. This sounds attractive for a shared SharePoint file,
            but in practice <strong>don&apos;t use it</strong> unless you know your tenant allows it.
          </p>
          <ul className="text-sm text-gray-400 list-disc list-inside space-y-1 mb-3">
            <li>
              Most corporate SharePoint tenants <strong>block <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">.docm</code> uploads</strong> via
              sensitivity-label or file-type policies (you&apos;ll see &ldquo;Upload Failed&rdquo; in the title bar).
            </li>
            <li>
              Even if the upload succeeds, Office&apos;s default &ldquo;<strong>block macros from files from the internet</strong>&rdquo; policy
              (on by default since 2022) prevents the macros from running for anyone opening the file from SharePoint.
              They&apos;ll see a red security banner that can&apos;t be dismissed by end users.
            </li>
            <li>
              Co-authoring on <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">.docm</code> is second-class in SharePoint &mdash;
              expect AutoSave loops and &ldquo;Save Again&rdquo; banners.
            </li>
          </ul>
          <p className="text-sm text-gray-400">
            Keep your shared file as <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">.docx</code> and ask each teammate to
            run <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">install.cmd</code> once. That&apos;s the tested path.
          </p>
        </section>

        {/* STEP 3 */}
        <section className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-blue-600 text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center">3</span>
            <h2 className="text-xl font-semibold">Using the Toolbar</h2>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            Here&apos;s what the main buttons in the <strong>ESABCC References</strong> ribbon tab do:
          </p>

          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-medium text-green-300 mb-1">Insert Citation</h3>
              <p className="text-sm text-gray-400">
                Place your cursor in the document where you want the citation. Click the button,
                type a search term (author name, title keyword, year), and pick from the results.
                A formatted citation like <code className="bg-gray-700 px-1.5 py-0.5 rounded">(Smith et al., 2024)</code> is inserted.
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-medium text-orange-300 mb-1">Group Citation</h3>
              <p className="text-sm text-gray-400">
                For multi-author citations. Search and add multiple references one by one.
                When done, leave the search box empty and press OK. Inserts something like{' '}
                <code className="bg-gray-700 px-1.5 py-0.5 rounded">(Smith, 2024; Jones, 2023; Lee et al., 2022)</code>.
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-medium text-blue-300 mb-1">Bibliography</h3>
              <p className="text-sm text-gray-400">
                Scans the document for all citations you&apos;ve inserted, then generates a formatted
                reference list at the end of the document with proper hanging indents.
                Run it again to update after adding more citations.
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-medium text-purple-300 mb-1">Refresh All</h3>
              <p className="text-sm text-gray-400">
                Regenerates the bibliography. Use this after adding new citations.
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-medium text-gray-300 mb-1">Web Manager</h3>
              <p className="text-sm text-gray-400">
                Opens the full reference manager web app in your browser for browsing,
                searching, and managing the reference library.
              </p>
            </div>
          </div>
        </section>

        {/* TROUBLESHOOTING */}
        <section className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Troubleshooting</h2>

          <div className="space-y-4">
            <div className="border-l-2 border-red-500 pl-4">
              <p className="font-medium text-gray-200">&ldquo;The system cannot find the path specified&rdquo; / Notepad opens with PowerShell code</p>
              <p className="text-sm text-gray-400 mt-1">
                You ran the installer from inside the ZIP without extracting it, or you clicked{' '}
                <code className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">install.ps1</code> instead of{' '}
                <code className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">install.cmd</code>. Close the
                Notepad/error window, go to your Downloads folder, right-click{' '}
                <code className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">esabcc-word-setup.zip</code> &rarr;{' '}
                <strong>Extract All&hellip;</strong>, open the extracted folder, and double-click{' '}
                <code className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">install.cmd</code> from there.
              </p>
            </div>

            <div className="border-l-2 border-yellow-500 pl-4">
              <p className="font-medium text-gray-200">install.cmd flashes and closes immediately</p>
              <p className="text-sm text-gray-400 mt-1">
                Windows is blocking the downloaded PowerShell script. Close the window, right-click the ZIP
                you downloaded &rarr; <strong>Properties</strong> &rarr; tick <strong>Unblock</strong>, then
                extract again and re-run <code className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">install.cmd</code>.
                If that&apos;s not it, run it from PowerShell to see the error:
                <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs ml-1">powershell -ExecutionPolicy Bypass -File install.ps1</code>.
              </p>
            </div>

            <div className="border-l-2 border-yellow-500 pl-4">
              <p className="font-medium text-gray-200">&ldquo;Could not detect Word under HKCU&rdquo;</p>
              <p className="text-sm text-gray-400 mt-1">
                The installer checks the per-user Office registry (so it doesn&apos;t need admin). This error
                means Office isn&apos;t registered for the current Windows account, typically with a system-wide
                Office install where you&apos;ve never opened Word. Open Word once, close it, and re-run the installer.
              </p>
            </div>

            <div className="border-l-2 border-red-500 pl-4">
              <p className="font-medium text-gray-200">Ribbon tab doesn&apos;t appear after reopening Word</p>
              <p className="text-sm text-gray-400 mt-1">
                Confirm the template is in place: open File Explorer, paste
                <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs mx-1">%APPDATA%\Microsoft\Word\STARTUP</code>{' '}
                into the address bar, and check that <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">ESABCC_RefManager.dotm</code> is
                there. If macros are disabled, Word blocks it silently &mdash; enable macros for trusted
                locations: <strong>File &rarr; Options &rarr; Trust Center &rarr; Trust Center Settings &rarr;
                Trusted Locations</strong>, and confirm the Word STARTUP folder is listed (it is by default).
              </p>
            </div>

            <div className="border-l-2 border-red-500 pl-4">
              <p className="font-medium text-gray-200">&ldquo;Macros have been disabled&rdquo; banner</p>
              <p className="text-sm text-gray-400 mt-1">
                Go to <strong>File &rarr; Options &rarr; Trust Center &rarr; Trust Center Settings &rarr; Macro Settings</strong>
                and select <strong>&ldquo;Disable all macros with notification&rdquo;</strong>. Restart Word and
                click <strong>Enable Content</strong> when prompted.
              </p>
            </div>

            <div className="border-l-2 border-red-500 pl-4">
              <p className="font-medium text-gray-200">Search returns no results</p>
              <p className="text-sm text-gray-400 mt-1">
                The macro needs internet access to reach the reference database. Check your connection
                and try a simple search like &ldquo;climate&rdquo; or &ldquo;IPCC&rdquo;.
              </p>
            </div>
          </div>
        </section>

        {/* MANUAL FALLBACK */}
        <section className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-3">Manual Install (fallback)</h2>
          <p className="text-sm text-gray-400 mb-4">
            Only use this if <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">install.cmd</code> fails
            (e.g. antivirus policies blocking PowerShell or COM automation of Word).
          </p>

          <ol className="list-decimal list-inside text-sm text-gray-400 space-y-2">
            <li>
              Download just the macro file:{' '}
              <a
                href="/word-vba/ESABCC_RefManager.bas"
                className="text-blue-400 hover:text-blue-300 underline"
                download
              >
                ESABCC_RefManager.bas
              </a>
            </li>
            <li>
              In Word, press <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">Alt + F11</kbd> to open the VBA Editor.
            </li>
            <li>
              <strong>File &rarr; Import File&hellip;</strong>, browse to the downloaded{' '}
              <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">ESABCC_RefManager.bas</code>, and open it.
            </li>
            <li>
              Close the VBA editor, then press <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">Alt + F8</kbd>,
              select <strong>ESABCC_Start</strong>, click <strong>Run</strong>. The toolbar appears under the Add-Ins tab.
            </li>
            <li>
              To make it permanent across sessions, run <strong>ESABCC_MakePermanent</strong> from the same
              Macros dialog. This requires <em>Trust access to the VBA project object model</em> to be enabled
              (<strong>File &rarr; Options &rarr; Trust Center &rarr; Trust Center Settings &rarr; Macro Settings</strong>).
            </li>
          </ol>
        </section>

        {/* WHAT IT SEARCHES */}
        <section className="bg-green-900/20 border border-green-700/40 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3 text-green-200">Reference Library</h2>
          <p className="text-sm text-gray-300">
            The macro searches the <strong>ESABCC reference library</strong> with 2,600+ references
            covering climate policy, adaptation, mitigation, and related topics.
            The data is hosted on the web app and accessed via API &mdash; no local database needed.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            You can browse the full library on the{' '}
            <a href="/references" className="text-blue-400 hover:text-blue-300">Reference Manager</a> page.
          </p>
        </section>

      </div>
    </div>
  );
}
