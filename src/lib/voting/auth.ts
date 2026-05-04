/**
 * Auth helpers for the voting tool's admin endpoints.
 *
 * Admin endpoints (everything under `/api/voting/votes/*`) require the
 * site-auth cookie that the middleware mints for any logged-in MethodHub
 * user. The public ballot endpoint (`/api/voting/ballot/[token]`) uses
 * the token itself as the credential and does NOT call this helper.
 */

import type { NextRequest } from 'next/server';
import { SITE_AUTH_COOKIE, verifySiteAuthToken } from '@/lib/site-auth';

export async function requireMethodHubUser(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SITE_AUTH_COOKIE)?.value;
  return verifySiteAuthToken(token);
}
