/**
 * Voting Tool — store dispatcher.
 *
 * Picks Supabase when SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL
 * are configured (production / staging on the EEA Supabase project, plus
 * Vercel where the filesystem is read-only). Otherwise falls back to the
 * file-based store under `data/votes/` — useful for local dev without
 * Supabase credentials and for first-run install of the seed file.
 *
 * The two backends expose the same async API and the same data shapes
 * (see ./types.ts), so callers in `src/app/api/voting/*` and the page
 * components don't care which one is active.
 */

import * as fsStore from './store-fs';
import * as supabaseStore from './store-supabase';
import { detectVotingBackend } from './backend';
import { ensureUniqueOptionIds, fingerprint, newId, newToken, slugify } from './util';

type StoreModule = typeof fsStore;

function pickBackend(): StoreModule {
  return detectVotingBackend() === 'supabase'
    ? (supabaseStore as unknown as StoreModule)
    : fsStore;
}

const backend: StoreModule = pickBackend();

export const listVotes        = (...a: Parameters<StoreModule['listVotes']>)        => backend.listVotes(...a);
export const getVote          = (...a: Parameters<StoreModule['getVote']>)          => backend.getVote(...a);
export const createVote       = (...a: Parameters<StoreModule['createVote']>)       => backend.createVote(...a);
export const updateVote       = (...a: Parameters<StoreModule['updateVote']>)       => backend.updateVote(...a);
export const deleteVote       = (...a: Parameters<StoreModule['deleteVote']>)       => backend.deleteVote(...a);
export const resetVote        = (...a: Parameters<StoreModule['resetVote']>)        => backend.resetVote(...a);
export const generateTokens   = (...a: Parameters<StoreModule['generateTokens']>)   => backend.generateTokens(...a);
export const findTokenContext = (...a: Parameters<StoreModule['findTokenContext']>) => backend.findTokenContext(...a);
export const recordBallot     = (...a: Parameters<StoreModule['recordBallot']>)     => backend.recordBallot(...a);

// Re-export the shared utilities so existing imports
// (`import { slugify, ensureUniqueOptionIds, newId } from '@/lib/voting/store'`)
// keep working.
export { ensureUniqueOptionIds, fingerprint, newId, newToken, slugify };
