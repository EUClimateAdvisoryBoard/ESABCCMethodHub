/**
 * Voting Tool — file-based store.
 *
 * Each vote is one JSON document under `data/votes/<voteId>.json` containing
 * the vote config, the issued tokens and all ballots. Single-file storage
 * keeps writes atomic (rename-after-write) which is enough for the
 * Secretariat's expected scale (≤ a few hundred ballots per vote).
 *
 * Security & GDPR:
 *
 *  - The token is the credential. Only its SHA-256 fingerprint is checked
 *    against ballots when verifying single-use, so tokens are never
 *    cross-referenced with ballot rows in anonymous mode.
 *  - When `isAnonymous=true`, ballots store only the fingerprint, not the
 *    token id, so admins cannot link a ballot back to a participant label.
 *  - No IP / user-agent / browser fingerprint is stored.
 *  - Service is fully self-hosted: ballots stay in the EEA-controlled
 *    `data/votes/` directory and never travel to a third party.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { Ballot, VoteBundle, VoteRecord, VoteToken } from './types';
import { fingerprint, newId, newToken } from './util';

const STORE_DIR = path.join(process.cwd(), 'data', 'votes');

async function ensureDir(): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

function bundlePath(voteId: string): string {
  return path.join(STORE_DIR, `${voteId}.json`);
}

function emptyBundle(vote: VoteRecord): VoteBundle {
  return { vote, tokens: [], ballots: [] };
}

function normaliseBundle(bundle: VoteBundle): VoteBundle {
  // Backfill fields added by later migrations so older JSON files keep
  // working without a one-shot rewrite. Read-only operation.
  return {
    ...bundle,
    vote: { ...bundle.vote, resetEpoch: bundle.vote.resetEpoch ?? 0 },
    tokens: bundle.tokens.map((t) => ({
      ...t,
      maxUses: t.maxUses ?? 1,
      useCount: t.useCount ?? 0,
    })),
  };
}

async function readBundle(voteId: string): Promise<VoteBundle | null> {
  try {
    const raw = await fs.readFile(bundlePath(voteId), 'utf-8');
    return normaliseBundle(JSON.parse(raw) as VoteBundle);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

async function writeBundle(bundle: VoteBundle): Promise<void> {
  await ensureDir();
  const target = bundlePath(bundle.vote.id);
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(bundle, null, 2), 'utf-8');
  await fs.rename(tmp, target);
}

export async function listVotes(): Promise<VoteRecord[]> {
  await ensureDir();
  const entries = await fs.readdir(STORE_DIR);
  const records: VoteRecord[] = [];
  for (const name of entries) {
    if (!name.endsWith('.json')) continue;
    try {
      const raw = await fs.readFile(path.join(STORE_DIR, name), 'utf-8');
      const bundle = normaliseBundle(JSON.parse(raw) as VoteBundle);
      records.push(bundle.vote);
    } catch {
      // ignore malformed files; admin can clean up via filesystem
    }
  }
  return records.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getVote(voteId: string): Promise<VoteBundle | null> {
  return readBundle(voteId);
}


export async function createVote(record: VoteRecord): Promise<VoteRecord> {
  if (await readBundle(record.id)) {
    throw new Error(`Vote ${record.id} already exists`);
  }
  await writeBundle(emptyBundle(record));
  return record;
}

export async function updateVote(
  voteId: string,
  patch: Partial<Omit<VoteRecord, 'id' | 'createdAt'>>,
): Promise<VoteRecord> {
  const bundle = await readBundle(voteId);
  if (!bundle) throw new Error(`Vote ${voteId} not found`);
  bundle.vote = { ...bundle.vote, ...patch };
  await writeBundle(bundle);
  return bundle.vote;
}

export async function deleteVote(voteId: string): Promise<void> {
  try {
    await fs.unlink(bundlePath(voteId));
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

/**
 * Drop every ballot for the vote, reset every token to its unused state,
 * and bump the reset epoch so participants' localStorage flags are
 * invalidated. Idempotent.
 */
export async function resetVote(voteId: string): Promise<VoteRecord> {
  const bundle = await readBundle(voteId);
  if (!bundle) throw new Error(`Vote ${voteId} not found`);
  bundle.ballots = [];
  bundle.tokens = bundle.tokens.map((t) => ({ ...t, usedAt: null, useCount: 0 }));
  bundle.vote = { ...bundle.vote, resetEpoch: (bundle.vote.resetEpoch ?? 0) + 1 };
  await writeBundle(bundle);
  return bundle.vote;
}

export async function generateTokens(
  voteId: string,
  count: number,
  labels: (string | undefined)[] = [],
  maxUses: number | null = 1,
): Promise<VoteToken[]> {
  const bundle = await readBundle(voteId);
  if (!bundle) throw new Error(`Vote ${voteId} not found`);
  const created: VoteToken[] = [];
  const now = new Date().toISOString();
  for (let i = 0; i < count; i++) {
    created.push({
      token: newToken(),
      label: labels[i],
      createdAt: now,
      usedAt: null,
      maxUses,
      useCount: 0,
    });
  }
  bundle.tokens = [...bundle.tokens, ...created];
  await writeBundle(bundle);
  return created;
}

export async function findTokenContext(token: string): Promise<{
  bundle: VoteBundle;
  tokenRecord: VoteToken;
} | null> {
  // Linear scan is fine at our scale and avoids a token→vote index file
  // (which would itself need consistent updates).
  await ensureDir();
  const names = await fs.readdir(STORE_DIR);
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    let bundle: VoteBundle;
    try {
      const raw = await fs.readFile(path.join(STORE_DIR, name), 'utf-8');
      bundle = JSON.parse(raw) as VoteBundle;
    } catch {
      continue;
    }
    const t = bundle.tokens.find((x) => x.token === token);
    if (t) return { bundle, tokenRecord: t };
  }
  return null;
}

export async function recordBallot(
  voteId: string,
  token: string,
  responses: Record<string, number | boolean>,
): Promise<Ballot> {
  const bundle = await readBundle(voteId);
  if (!bundle) throw new Error(`Vote ${voteId} not found`);
  if (bundle.vote.status !== 'open') {
    throw new Error('Vote is not open');
  }
  if (bundle.vote.closesAt && new Date(bundle.vote.closesAt) < new Date()) {
    throw new Error('Vote has closed');
  }
  const tokenIdx = bundle.tokens.findIndex((t) => t.token === token);
  if (tokenIdx < 0) throw new Error('Invalid voting link');
  const tokenRecord = bundle.tokens[tokenIdx];
  const maxUses = tokenRecord.maxUses ?? null;
  const useCount = tokenRecord.useCount ?? 0;
  if (maxUses != null && useCount >= maxUses) {
    throw new Error('This voting link has reached its submission limit');
  }

  const fp = fingerprint(voteId, token);
  const now = new Date().toISOString();
  const ballot: Ballot = {
    id: newId('ballot'),
    voteId,
    submittedAt: now,
    responses,
    tokenId: bundle.vote.isAnonymous ? undefined : tokenRecord.token,
    tokenFingerprint: fp,
  };

  bundle.tokens[tokenIdx] = {
    ...tokenRecord,
    usedAt: tokenRecord.usedAt ?? now,
    useCount: useCount + 1,
  };
  bundle.ballots.push(ballot);
  await writeBundle(bundle);
  return ballot;
}
