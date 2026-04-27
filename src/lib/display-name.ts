/**
 * GDPR: never derive a user-facing display name from the email local-part.
 * Doing so leaks the email prefix (typically firstname.lastname) into
 * every public comment, annotation, news-feed post and reading-list entry,
 * which violates Art. 5(1)(c) data minimisation.
 *
 * Use this helper everywhere a display name is rendered. The auth user's
 * email is intentionally not accepted as a fallback.
 */
export function safeDisplayName(
  displayName: string | null | undefined,
  fallback: string = 'Anonymous',
): string {
  const trimmed = (displayName || '').trim();
  if (trimmed) return trimmed;
  return fallback;
}
