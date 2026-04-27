// PLACEHOLDER — text below is a structural draft. The DPO and the
// ESABCC secretariat must review and adapt it before launch.

export const metadata = {
  title: 'Cookie & local-storage notice — ESABCC Method Hub',
};

export default function CookiesPage() {
  return (
    <>
      <h1>Cookie &amp; local-storage notice</h1>

      <p>
        The platform uses cookies and browser local-storage only where necessary or where you have
        explicitly opted in via the consent banner.
      </p>

      <h2>Strictly necessary (always on)</h2>
      <table>
        <thead>
          <tr><th>Name</th><th>Type</th><th>Purpose</th><th>Retention</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>sb-* (Supabase Auth)</td>
            <td>Cookie / local-storage</td>
            <td>Authenticated session.</td>
            <td>Session length set by Supabase Auth (rolling, default 1h with refresh).</td>
          </tr>
        </tbody>
      </table>

      <h2>Optional (require consent)</h2>
      <table>
        <thead>
          <tr><th>Name</th><th>Type</th><th>Purpose</th><th>Retention</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>nf-reading-list, bb-history, etc.</td>
            <td>Local-storage</td>
            <td>Remembers UI state for the news feed and Brussels Bulletin draft history.</td>
            <td>Until you clear it from the consent banner or your browser.</td>
          </tr>
          <tr>
            <td>llm_consent</td>
            <td>Local-storage + DB</td>
            <td>Records your opt-in for AI features that send text to third-party LLMs.</td>
            <td>Until you withdraw consent in your profile.</td>
          </tr>
        </tbody>
      </table>

      <h2>What we do not use</h2>
      <ul>
        <li>No third-party advertising or tracking cookies.</li>
        <li>No analytics tags (Google Analytics, Plausible, etc.) by default.</li>
        <li>No fingerprinting / device-identification scripts.</li>
      </ul>

      <p>
        See the <a href="/legal/privacy">privacy notice</a> for the broader picture of how personal
        data is processed.
      </p>
    </>
  );
}
