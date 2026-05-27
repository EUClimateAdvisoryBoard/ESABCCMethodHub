/**
 * Cross-module search API for policies, references, news, scenarios, and codes.
 * Supports GET with a ?q= query parameter and optional module prefix filters.
 */
import { NextRequest, NextResponse } from 'next/server';
import { policies } from '@/data/policies';
import { references } from '@/data/references';
import { newsFeedItems } from '@/data/newsfeed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Module = 'references' | 'scenarios' | 'news' | 'policies' | 'codes';

interface Hit {
  id: string;
  module: Module;
  title: string;
  subtitle?: string;
  href: string;
  score: number;
}

const PREFIX_TO_MODULE: Record<string, Module> = {
  r: 'references',
  s: 'scenarios',
  n: 'news',
  p: 'policies',
  c: 'codes',
};

function score(text: string, q: string): number {
  if (!text) return 0;
  const t = text.toLowerCase();
  const idx = t.indexOf(q);
  if (idx < 0) return 0;
  // Earlier hit + shorter haystack = higher score.
  return 1000 - idx - Math.min(500, t.length / 4);
}

function searchPolicies(q: string): Hit[] {
  const out: Hit[] = [];
  for (const p of policies) {
    const s = Math.max(
      score(p.short_title || '', q),
      score(p.title, q),
      score(p.celex_number || '', q),
    );
    if (s > 0) {
      out.push({
        id: p.id,
        module: 'policies',
        title: p.short_title || p.title,
        subtitle: p.celex_number ? `CELEX ${p.celex_number}` : p.domain,
        href: `/policy-navigator/policy?id=${encodeURIComponent(p.id)}`,
        score: s + 50, // Policies are usually the most-clicked target.
      });
    }
  }
  return out;
}

function searchReferences(q: string): Hit[] {
  const out: Hit[] = [];
  // References file is large; cap evaluations to keep the route fast.
  let evaluated = 0;
  for (const r of references) {
    if (++evaluated > 8000) break;
    const s = Math.max(
      score(r.title, q),
      score(r.authors, q) * 0.7,
      score(r.doi || '', q),
    );
    if (s > 0) {
      out.push({
        id: r.id,
        module: 'references',
        title: r.title,
        subtitle: `${r.authors} (${r.year})`,
        href: `/references?ref=${encodeURIComponent(r.id)}`,
        score: s,
      });
    }
  }
  return out;
}

function searchNews(q: string): Hit[] {
  const out: Hit[] = [];
  for (const n of newsFeedItems) {
    const s = Math.max(score(n.title, q), score(n.summary || '', q) * 0.6);
    if (s > 0) {
      out.push({
        id: n.id,
        module: 'news',
        title: n.title,
        subtitle: n.source,
        href: `/news-feed?id=${encodeURIComponent(n.id)}`,
        score: s,
      });
    }
  }
  return out;
}

function searchScenarios(q: string): Hit[] {
  // Scenario data is loaded client-side; expose the well-known scenario
  // family names so users can jump straight to the explorer with a filter.
  const families: { id: string; title: string; subtitle: string }[] = [
    { id: 'ar6', title: 'IPCC AR6 scenarios', subtitle: 'Sixth Assessment Report' },
    { id: 'iiasa-net-zero-2050', title: 'IIASA Net Zero 2050', subtitle: 'IIASA NZ pathway' },
    { id: 'ngfs', title: 'NGFS scenarios', subtitle: 'Network for Greening the Financial System' },
    { id: 'ref', title: 'EU Reference Scenario', subtitle: 'Existing policies baseline' },
    { id: 'paris', title: 'Paris-aligned 1.5°C', subtitle: '<1.5°C overshoot' },
  ];
  const out: Hit[] = [];
  for (const f of families) {
    const s = Math.max(score(f.title, q), score(f.subtitle, q) * 0.6);
    if (s > 0) {
      out.push({
        id: f.id,
        module: 'scenarios',
        title: f.title,
        subtitle: f.subtitle,
        href: `/scenarios?family=${encodeURIComponent(f.id)}`,
        score: s,
      });
    }
  }
  return out;
}

function searchCodes(_q: string): Hit[] {
  // Hot path: code segments live per-user in Supabase. The palette
  // returns the static root code names so users can jump into M·05.
  return [];
}

export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get('q') || '').trim();
  if (!raw) return NextResponse.json({ hits: [] });

  // Module prefixes: `p:` policies, `r:` references, etc.
  let restricted: Module | null = null;
  let q = raw.toLowerCase();
  const m = q.match(/^([prnsc]):\s*(.*)$/);
  if (m && m[2]) {
    restricted = PREFIX_TO_MODULE[m[1]];
    q = m[2];
  }
  if (q.length < 2) return NextResponse.json({ hits: [] });

  const all: Hit[] = [];
  if (!restricted || restricted === 'policies') all.push(...searchPolicies(q));
  if (!restricted || restricted === 'references') all.push(...searchReferences(q));
  if (!restricted || restricted === 'news') all.push(...searchNews(q));
  if (!restricted || restricted === 'scenarios') all.push(...searchScenarios(q));
  if (!restricted || restricted === 'codes') all.push(...searchCodes(q));

  all.sort((a, b) => b.score - a.score);
  return NextResponse.json({ hits: all.slice(0, 30) });
}
