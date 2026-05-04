/**
 * Shared utilities for the voting tool. Both the filesystem and the
 * Supabase store import these so id formats and fingerprint computation
 * stay identical regardless of backend.
 */

import crypto from 'node:crypto';
import type { VoteOption } from './types';

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

export function newToken(): string {
  // 24 random bytes → 32 url-safe chars (~192 bits of entropy).
  return crypto.randomBytes(24).toString('base64url');
}

export function fingerprint(voteId: string, token: string): string {
  return crypto
    .createHash('sha256')
    .update(`${voteId} ${token}`, 'utf-8')
    .digest('hex');
}

export function ensureUniqueOptionIds(options: VoteOption[]): VoteOption[] {
  const seen = new Set<string>();
  return options.map((o) => {
    let id = o.id || slugify(o.label);
    let n = 2;
    while (seen.has(id)) {
      id = `${slugify(o.label)}-${n++}`;
    }
    seen.add(id);
    return { ...o, id };
  });
}
