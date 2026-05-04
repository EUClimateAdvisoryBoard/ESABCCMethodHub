/**
 * Tiny diagnostic: which backend is the voting store currently using?
 *
 * Server-only — reads `process.env`. Returns `'supabase'` when both
 * NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
 * (the same conditions `store.ts` uses to dispatch); otherwise
 * returns `'filesystem'`. Surfaces this on the admin page so a user
 * can tell at a glance whether ballots will survive a redeploy.
 */
export type VotingBackend = 'supabase' | 'filesystem';

export function detectVotingBackend(): VotingBackend {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return 'supabase';
  }
  return 'filesystem';
}
