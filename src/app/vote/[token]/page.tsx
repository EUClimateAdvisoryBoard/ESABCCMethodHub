/**
 * Public ballot page — `/vote/<token>`.
 *
 * Externals (typically Advisory Board members) land here from a single-use
 * link. They see only:
 *
 *   - The vote title, description and instructions.
 *   - The list of options and the controls that match the voting system.
 *   - A Submit button.
 *
 * After a successful submission the page renders a thank-you screen with
 * no link back into the Method Hub. Errors (link not valid / already used /
 * vote closed) are rendered inline.
 *
 * Crucially: this page does NOT render SiteHeader, SiteFooter, navigation,
 * the command palette or any other Method-Hub surface.
 */
import VoteBallot from './VoteBallot';

export const dynamic = 'force-dynamic';

export default function VoteBallotPage({ params }: { params: { token: string } }) {
  return <VoteBallot token={params.token} />;
}
