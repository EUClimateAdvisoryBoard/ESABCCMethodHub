/**
 * Voting Tool — Supabase-backed store.
 *
 * Mirrors the file-based store interface so callers can swap implementations
 * without changes. Uses the service-role admin client; RLS on the three
 * voting tables denies every other role, so this code path is the only way
 * to read or write a ballot.
 *
 * Single-use is enforced two ways:
 *   1. We claim the token row in a single UPDATE … WHERE used_at IS NULL,
 *      so two concurrent submissions for the same token race against the
 *      database and only one wins.
 *   2. The (vote_id, token_fingerprint) unique index makes a duplicate
 *      ballot insertion fail outright if step 1 ever raced past us.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Ballot, VoteBundle, VoteRecord, VoteToken } from './types';
import { fingerprint, newId, newToken } from './util';
import { createAdminClient } from '@/lib/supabase-server';

// Lazy: only instantiate on the first call so importing this module doesn't
// throw when env vars are absent at build time.
let _client: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (!_client) _client = createAdminClient();
  return _client;
}

// ── Row ↔ camelCase mapping ────────────────────────────────────────────────
type VoteRow = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  voting_system: VoteRecord['votingSystem'];
  config: VoteRecord['config'];
  options: VoteRecord['options'];
  is_anonymous: boolean;
  status: VoteRecord['status'];
  closes_at: string | null;
  created_by: string | null;
  created_at: string;
  reset_epoch: number | null;
};

type TokenRow = {
  token: string;
  vote_id: string;
  label: string | null;
  used_at: string | null;
  created_at: string;
  max_uses: number | null;
  use_count: number;
};

type BallotRow = {
  id: string;
  vote_id: string;
  responses: Record<string, number | boolean>;
  token_id: string | null;
  token_fingerprint: string;
  submitted_at: string;
};

function rowToVote(r: VoteRow): VoteRecord {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    instructions: r.instructions ?? undefined,
    votingSystem: r.voting_system,
    config: r.config,
    options: r.options,
    isAnonymous: r.is_anonymous,
    status: r.status,
    closesAt: r.closes_at ?? undefined,
    createdBy: r.created_by ?? undefined,
    createdAt: r.created_at,
    resetEpoch: r.reset_epoch ?? 0,
  };
}

function rowToToken(r: TokenRow): VoteToken {
  return {
    token: r.token,
    label: r.label ?? undefined,
    usedAt: r.used_at,
    createdAt: r.created_at,
    maxUses: r.max_uses,
    useCount: r.use_count ?? 0,
  };
}

function rowToBallot(r: BallotRow): Ballot {
  return {
    id: r.id,
    voteId: r.vote_id,
    responses: r.responses,
    tokenId: r.token_id ?? undefined,
    tokenFingerprint: r.token_fingerprint,
    submittedAt: r.submitted_at,
  };
}

// ── Public API (matches store-fs.ts) ───────────────────────────────────────

export async function listVotes(): Promise<VoteRecord[]> {
  const { data, error } = await client()
    .from('votes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToVote);
}

export async function getVote(voteId: string): Promise<VoteBundle | null> {
  const sb = client();
  const [voteRes, tokenRes, ballotRes] = await Promise.all([
    sb.from('votes').select('*').eq('id', voteId).maybeSingle(),
    sb.from('vote_tokens').select('*').eq('vote_id', voteId).order('created_at', { ascending: true }),
    sb.from('ballots').select('*').eq('vote_id', voteId).order('submitted_at', { ascending: true }),
  ]);
  if (voteRes.error) throw voteRes.error;
  if (!voteRes.data) return null;
  if (tokenRes.error) throw tokenRes.error;
  if (ballotRes.error) throw ballotRes.error;
  return {
    vote: rowToVote(voteRes.data as VoteRow),
    tokens: (tokenRes.data as TokenRow[]).map(rowToToken),
    ballots: (ballotRes.data as BallotRow[]).map(rowToBallot),
  };
}

export async function createVote(record: VoteRecord): Promise<VoteRecord> {
  const { error } = await client().from('votes').insert({
    id: record.id,
    title: record.title,
    description: record.description ?? null,
    instructions: record.instructions ?? null,
    voting_system: record.votingSystem,
    config: record.config,
    options: record.options,
    is_anonymous: record.isAnonymous,
    status: record.status,
    closes_at: record.closesAt ?? null,
    created_by: record.createdBy ?? null,
    created_at: record.createdAt,
  });
  if (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new Error(`Vote ${record.id} already exists`);
    }
    throw error;
  }
  return record;
}

export async function updateVote(
  voteId: string,
  patch: Partial<Omit<VoteRecord, 'id' | 'createdAt'>>,
): Promise<VoteRecord> {
  // Whitelist the fields we expose at the API layer; map to snake_case.
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined)        row.title = patch.title;
  if (patch.description !== undefined)  row.description = patch.description ?? null;
  if (patch.instructions !== undefined) row.instructions = patch.instructions ?? null;
  if (patch.votingSystem !== undefined) row.voting_system = patch.votingSystem;
  if (patch.config !== undefined)       row.config = patch.config;
  if (patch.options !== undefined)      row.options = patch.options;
  if (patch.isAnonymous !== undefined)  row.is_anonymous = patch.isAnonymous;
  if (patch.status !== undefined)       row.status = patch.status;
  if (patch.closesAt !== undefined)     row.closes_at = patch.closesAt ?? null;

  const { data, error } = await client()
    .from('votes')
    .update(row)
    .eq('id', voteId)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Vote ${voteId} not found`);
  return rowToVote(data as VoteRow);
}

export async function deleteVote(voteId: string): Promise<void> {
  const { error } = await client().from('votes').delete().eq('id', voteId);
  if (error) throw error;
}

export async function resetVote(voteId: string): Promise<VoteRecord> {
  const sb = client();

  // 1. Drop every ballot for this vote.
  const { error: delErr } = await sb.from('ballots').delete().eq('vote_id', voteId);
  if (delErr) throw delErr;

  // 2. Delete every issued link for this vote — admins regenerate from scratch.
  const { error: tokErr } = await sb.from('vote_tokens').delete().eq('vote_id', voteId);
  if (tokErr) throw tokErr;

  // 3. Bump the reset epoch atomically. We read-then-write because
  // postgrest doesn't expose `reset_epoch = reset_epoch + 1` directly,
  // but a small race is harmless: two concurrent admins resetting at the
  // same time both want the epoch ahead of where it was, and either
  // increment is acceptable.
  const { data: voteRow, error: readErr } = await sb
    .from('votes')
    .select('*')
    .eq('id', voteId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!voteRow) throw new Error(`Vote ${voteId} not found`);
  const next = ((voteRow as VoteRow).reset_epoch ?? 0) + 1;
  const { data: updated, error: bumpErr } = await sb
    .from('votes')
    .update({ reset_epoch: next })
    .eq('id', voteId)
    .select('*')
    .single();
  if (bumpErr) throw bumpErr;
  return rowToVote(updated as VoteRow);
}

export async function generateTokens(
  voteId: string,
  count: number,
  labels: (string | undefined)[] = [],
  maxUses: number | null = 1,
): Promise<VoteToken[]> {
  // Make sure the vote exists first so we don't insert orphans (the FK would
  // catch it too, but a clean error message is friendlier).
  const { data: voteRow, error: voteErr } = await client()
    .from('votes')
    .select('id')
    .eq('id', voteId)
    .maybeSingle();
  if (voteErr) throw voteErr;
  if (!voteRow) throw new Error(`Vote ${voteId} not found`);

  const now = new Date().toISOString();
  const rows = Array.from({ length: count }, (_, i) => ({
    token: newToken(),
    vote_id: voteId,
    label: labels[i] ?? null,
    used_at: null,
    created_at: now,
    max_uses: maxUses,
    use_count: 0,
  }));
  const { data, error } = await client().from('vote_tokens').insert(rows).select('*');
  if (error) throw error;
  return (data as TokenRow[]).map(rowToToken);
}

export async function findTokenContext(token: string): Promise<{
  bundle: VoteBundle;
  tokenRecord: VoteToken;
} | null> {
  const sb = client();
  const { data: tokenRow, error } = await sb
    .from('vote_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (error) throw error;
  if (!tokenRow) return null;
  const bundle = await getVote((tokenRow as TokenRow).vote_id);
  if (!bundle) return null;
  return { bundle, tokenRecord: rowToToken(tokenRow as TokenRow) };
}

export async function recordBallot(
  voteId: string,
  token: string,
  responses: Record<string, number | boolean>,
): Promise<Ballot> {
  const sb = client();

  // 1. Vote sanity checks (status / closesAt). These re-validate what the
  // public API already checked, but cheap and defensive.
  const { data: voteRow, error: voteErr } = await sb
    .from('votes')
    .select('*')
    .eq('id', voteId)
    .maybeSingle();
  if (voteErr) throw voteErr;
  if (!voteRow) throw new Error(`Vote ${voteId} not found`);
  const vote = rowToVote(voteRow as VoteRow);
  if (vote.status !== 'open') throw new Error('Vote is not open');
  if (vote.closesAt && new Date(vote.closesAt) < new Date()) {
    throw new Error('Vote has closed');
  }

  // 2. Read the current token state, then atomically claim a use slot.
  // We bump `use_count` exactly once if and only if it is still strictly
  // below `max_uses` (or `max_uses` is null, meaning unlimited). Doing it
  // inside a single UPDATE … RETURNING with the precise pre-image (matched
  // on use_count) gives us race-free reservation without an explicit
  // transaction or RPC.
  const nowIso = new Date().toISOString();
  const { data: tokenRow, error: tokenErr } = await sb
    .from('vote_tokens')
    .select('*')
    .eq('token', token)
    .eq('vote_id', voteId)
    .maybeSingle();
  if (tokenErr) throw tokenErr;
  if (!tokenRow) throw new Error('Invalid voting link');
  const t = tokenRow as TokenRow;
  if (t.max_uses != null && t.use_count >= t.max_uses) {
    throw new Error('This voting link has reached its submission limit');
  }
  const { data: claimed, error: claimErr } = await sb
    .from('vote_tokens')
    .update({
      use_count: t.use_count + 1,
      used_at: t.used_at ?? nowIso,
    })
    .eq('token', token)
    .eq('vote_id', voteId)
    .eq('use_count', t.use_count)
    .select('*')
    .maybeSingle();
  if (claimErr) throw claimErr;
  if (!claimed) {
    // Lost the race — another submitter incremented use_count between our
    // read and our update.
    throw new Error('This voting link has reached its submission limit');
  }

  // 3. Insert the ballot. The unique index on (vote_id, token_fingerprint)
  // is a second safety net.
  const fp = fingerprint(voteId, token);
  const ballotRow = {
    id: newId('ballot'),
    vote_id: voteId,
    responses,
    token_id: vote.isAnonymous ? null : token,
    token_fingerprint: fp,
    submitted_at: nowIso,
  };
  const { data: inserted, error: insertErr } = await sb
    .from('ballots')
    .insert(ballotRow)
    .select('*')
    .single();
  if (insertErr) {
    // Roll the token claim back so the participant can retry rather than
    // being permanently locked out by a transient DB hiccup.
    await sb.from('vote_tokens')
      .update({ use_count: t.use_count })
      .eq('token', token);
    throw insertErr;
  }
  return rowToBallot(inserted as BallotRow);
}
