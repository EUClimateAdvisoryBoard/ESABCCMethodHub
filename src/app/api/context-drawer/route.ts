import { NextRequest, NextResponse } from 'next/server';
import { policies, connections } from '@/data/policies';
import { references } from '@/data/references';
import { newsFeedItems } from '@/data/newsfeed';
import { suggestPoliciesForArticle } from '@/lib/suggestPolicyForArticle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Kind = 'policy' | 'reference' | 'news' | 'segment';

interface RelatedItem {
  module: 'references' | 'scenarios' | 'news' | 'policies' | 'codes';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

const STOP = new Set(['the','and','for','with','from','that','this','a','of','in','on','to','by','an','as','is','at']);

function tokens(s: string): Set<string> {
  return new Set(
    (s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 3 && !STOP.has(t))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function relatedToPolicy(policyId: string): RelatedItem[] {
  const items: RelatedItem[] = [];
  const target = policies.find(p => p.id === policyId);
  if (!target) return items;
  const tt = tokens(target.short_title || target.title);

  // Other policies linked via explicit connections (the `connections`
  // array is exported separately from `policies` in src/data/policies.ts).
  const outgoing = connections.filter(c => c.source_policy_id === target.id);
  for (const c of outgoing) {
    const linked = policies.find(p => p.id === c.target_policy_id);
    if (!linked) continue;
    items.push({
      module: 'policies',
      id: linked.id,
      title: linked.short_title || linked.title,
      subtitle: c.connection_type,
      href: `/policy-navigator/policy?id=${encodeURIComponent(linked.id)}`,
    });
  }

  // News items mentioning this policy (token overlap + suggester).
  const newsHits: { item: typeof newsFeedItems[number]; s: number }[] = [];
  for (const n of newsFeedItems) {
    const s = jaccard(tt, tokens(n.title + ' ' + (n.summary || '')));
    if (s > 0.05) newsHits.push({ item: n, s });
  }
  newsHits.sort((a, b) => b.s - a.s);
  for (const h of newsHits.slice(0, 5)) {
    items.push({
      module: 'news', id: h.item.id, title: h.item.title, subtitle: h.item.source,
      href: `/news-feed?id=${encodeURIComponent(h.item.id)}`,
    });
  }

  // References that match by title/keyword overlap.
  const refHits: { r: typeof references[number]; s: number }[] = [];
  let evaluated = 0;
  for (const r of references) {
    if (++evaluated > 4000) break;
    const s = jaccard(tt, tokens(r.title));
    if (s > 0.08) refHits.push({ r, s });
  }
  refHits.sort((a, b) => b.s - a.s);
  for (const h of refHits.slice(0, 5)) {
    items.push({
      module: 'references', id: h.r.id, title: h.r.title,
      subtitle: `${h.r.authors} (${h.r.year})`,
      href: `/references?ref=${encodeURIComponent(h.r.id)}`,
    });
  }
  return items;
}

function relatedToNews(newsId: string): RelatedItem[] {
  const items: RelatedItem[] = [];
  const n = newsFeedItems.find(x => x.id === newsId);
  if (!n) return items;
  // Suggested policies.
  const suggestions = suggestPoliciesForArticle({ title: n.title, description: n.summary || '' });
  for (const s of suggestions.slice(0, 5)) {
    items.push({
      module: 'policies', id: s.policy.id,
      title: s.policy.short_title || s.policy.title,
      subtitle: `score ${s.score.toFixed(2)}`,
      href: `/policy-navigator/policy?id=${encodeURIComponent(s.policy.id)}`,
    });
  }
  return items;
}

function relatedToReference(refId: string): RelatedItem[] {
  const items: RelatedItem[] = [];
  const r = references.find(x => x.id === refId);
  if (!r) return items;
  const tt = tokens(r.title);
  // Other references with overlapping titles.
  const more: { r: typeof references[number]; s: number }[] = [];
  let evaluated = 0;
  for (const other of references) {
    if (other.id === r.id) continue;
    if (++evaluated > 4000) break;
    const s = jaccard(tt, tokens(other.title));
    if (s > 0.2) more.push({ r: other, s });
  }
  more.sort((a, b) => b.s - a.s);
  for (const h of more.slice(0, 5)) {
    items.push({
      module: 'references', id: h.r.id, title: h.r.title,
      subtitle: `${h.r.authors} (${h.r.year})`,
      href: `/references?ref=${encodeURIComponent(h.r.id)}`,
    });
  }
  return items;
}

export async function GET(req: NextRequest) {
  const kind = (req.nextUrl.searchParams.get('kind') || '') as Kind;
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!kind || !id) return NextResponse.json({ items: [] });

  let items: RelatedItem[] = [];
  if (kind === 'policy') items = relatedToPolicy(id);
  else if (kind === 'news') items = relatedToNews(id);
  else if (kind === 'reference') items = relatedToReference(id);

  return NextResponse.json({ items });
}
