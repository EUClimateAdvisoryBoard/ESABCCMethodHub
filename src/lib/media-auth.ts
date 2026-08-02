/**
 * Authorisation helpers for media-monitoring API routes.
 *
 * Two levels:
 *
 *  - `authoriseMediaMutation` — for endpoints driven by the beta dashboard
 *    (keyword and social-source management, manual fetch triggers). Accepts
 *    either the shared `MEDIA_MONITORING_SECRET` or a Supabase user access
 *    token. When no secret is configured the endpoint stays open, matching
 *    the historical behaviour of local/dev deployments; a warning is logged
 *    so operators know to set it in production.
 *
 *  - `requireIngestSecret` — for the browser-extension ingest endpoint,
 *    which accepts writes from arbitrary origins. Fails closed: the secret
 *    must be configured and must match.
 */

import { NextRequest } from 'next/server';
import { getServerSupabase } from './supabase-server';

export interface AuthResult {
  ok: boolean;
  status?: number;
  error?: string;
}

function bearerToken(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

let warnedOpenMutations = false;

export async function authoriseMediaMutation(req: NextRequest): Promise<AuthResult> {
  const secret = process.env.MEDIA_MONITORING_SECRET;
  const token = bearerToken(req) ?? req.headers.get('x-media-secret');

  if (!secret) {
    if (!warnedOpenMutations) {
      warnedOpenMutations = true;
      console.warn(
        '[media-monitoring] MEDIA_MONITORING_SECRET is not set — mutation endpoints are open. Set it in production.',
      );
    }
    return { ok: true };
  }

  if (token && token === secret) return { ok: true };

  // Fall back to a Supabase user session token.
  const userToken = bearerToken(req);
  if (userToken) {
    const supabase = getServerSupabase();
    if (supabase) {
      const { data } = await supabase.auth.getUser(userToken);
      if (data?.user) return { ok: true };
    }
  }

  return { ok: false, status: 401, error: 'Unauthorized.' };
}

export function requireIngestSecret(req: NextRequest, querySecret?: string | null): AuthResult {
  const secret = process.env.MEDIA_MONITORING_SECRET;
  if (!secret) {
    return {
      ok: false,
      status: 503,
      error: 'MEDIA_MONITORING_SECRET is not configured on the server.',
    };
  }
  const token = bearerToken(req) ?? req.headers.get('x-media-secret') ?? querySecret;
  if (token === secret) return { ok: true };
  return { ok: false, status: 401, error: 'Unauthorized.' };
}
