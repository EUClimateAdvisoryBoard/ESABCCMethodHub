// PLACEHOLDER — text below is a structural draft. The ESABCC secretariat
// and the EEA legal service must review before launch.

export const metadata = {
  title: 'Terms of use — ESABCC Method Hub',
};

export default function TermsPage() {
  return (
    <>
      <h1>Terms of use</h1>

      <p>
        The ESABCC Method Hub is provided by the secretariat of the European Scientific Advisory Board on
        Climate Change for use by secretariat staff. By signing in you agree to the following terms.
      </p>

      <h2>1. Authorised use</h2>
      <p>
        Access is limited to the ESABCC secretariat and to people explicitly invited by an administrator.
        Do not share your account or your access link outside that group.
      </p>

      <h2>2. Acceptable content</h2>
      <ul>
        <li>Do not paste personal data of third parties into annotations or comments unless that data is necessary for the secretariat&apos;s work.</li>
        <li>Do not enable AI summarisation features for content that contains classified or otherwise sensitive material.</li>
        <li>Forward newsletters only from sources whose terms permit forwarding into an internal archive.</li>
      </ul>

      <h2>3. No warranty</h2>
      <p>
        The platform is provided &ldquo;as is&rdquo;. AI-generated summaries and policy interpretations may be
        inaccurate &mdash; verify against primary sources before relying on them.
      </p>

      <h2>4. Termination</h2>
      <p>
        Administrators may suspend or terminate access at any time. You may close your own account from the
        &ldquo;Your data&rdquo; section of your profile.
      </p>

      <h2>5. Governing law</h2>
      <p>
        {/* TODO(legal): confirm jurisdiction — typically EU / Denmark for EEA-hosted platforms. */}
        <em>Governing law: TODO &mdash; confirm with EEA legal service.</em>
      </p>
    </>
  );
}
