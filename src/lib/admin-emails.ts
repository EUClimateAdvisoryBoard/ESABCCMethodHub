/**
 * GDPR: the list of email addresses that should automatically be granted
 * the `admin` role on signup is configured via the `ADMIN_EMAILS` env var
 * (comma-separated). Personal emails must never be hard-coded.
 *
 * Returns a normalised, lowercased Set. Empty if the env var is unset.
 */
export function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || '';
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().has(email.toLowerCase());
}
