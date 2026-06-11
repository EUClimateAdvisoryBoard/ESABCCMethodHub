/**
 * Home / module index.
 * --------------------
 * This is the first page anyone — a Secretariat user, an EEA IT reviewer,
 * a peer unit evaluating the blueprint — lands on. It has to answer, at a
 * glance, three questions:
 *
 *   1. What is this?                       ← internal Secretariat tool
 *   2. What is shipped today?              ← the eight production modules
 *   3. Who runs / maintains it?            ← CCE5 (code) · EEA IT (host)
 *
 * It also renders a ribbon of sixteen beta modules routed under `/beta/<slug>`.
 *
 * All numbers on the page are real: they are read at render time from the
 * bundled data stores (`src/data/*`), the custom-references store, and the
 * cached daily-summary JSON. `export const dynamic = 'force-dynamic'`
 * makes sure those counts stay fresh without a redeploy.
 */
import Link from 'next/link';
import fs from 'node:fs/promises';
import path from 'node:path';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { references } from '@/data/references';
import { policies } from '@/data/policies';
import { scenarios } from '@/data/scenarios';
import { newsFeedItems } from '@/data/newsfeed';
import { ALL_ESABCC_RECOMMENDATIONS } from '@/data/esabcc-recommendations';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type DailySummaryItem = {
  title?: string;
  source?: string;
  link?: string;
};

type DailySummarySection = {
  id?: string;
  title?: string;
  items?: DailySummaryItem[];
};

type DailySummary = {
  date?: string;
  generatedAt?: string;
  sections?: DailySummarySection[];
  stats?: {
    totalArticlesScanned?: number;
    articlesLast24h?: number;
    afterDedup?: number;
    feedsQueried?: number;
  };
};

async function readJson<T>(rel: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), rel), 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function countFaqItems(): Promise<number> {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), 'src/app/faq/page.tsx'),
      'utf-8'
    );
    return (raw.match(/^\s+id: '/gm) ?? []).length;
  } catch {
    return 0;
  }
}

/**
 * Live references + latest-added timestamp, pulled directly from the
 * Supabase `references` and `custom_references` tables and added on top
 * of the bundled `@/data/references` list. The bundled list is the
 * baseline catalogue every install ships with; live rows are everything
 * users have added on top via the web UI or the Word add-in. Service-role
 * key bypasses RLS so the un-authenticated home page sees every library.
 */
async function getLiveReferenceStats(): Promise<{
  total: number;
  lastAddedAt: string | undefined;
}> {
  const staticTotal = references.length;
  try {
    const supabase = getServerSupabase();
    if (!supabase) return { total: staticTotal, lastAddedAt: undefined };

    const [mainRes, customRes, latestMainRes, latestCustomRes] = await Promise.all([
      supabase.from('references').select('*', { count: 'exact', head: true }),
      supabase.from('custom_references').select('*', { count: 'exact', head: true }),
      supabase
        .from('references')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('custom_references')
        .select('added_at')
        .order('added_at', { ascending: false })
        .limit(1),
    ]);

    const liveCount = (mainRes.count ?? 0) + (customRes.count ?? 0);

    const candidates: string[] = [];
    const latestMain = latestMainRes.data?.[0]?.created_at;
    const latestCustom = latestCustomRes.data?.[0]?.added_at;
    if (latestMain) candidates.push(latestMain);
    if (latestCustom) candidates.push(latestCustom);
    const lastAddedAt = candidates.sort().at(-1);

    return { total: staticTotal + liveCount, lastAddedAt };
  } catch {
    return { total: staticTotal, lastAddedAt: undefined };
  }
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtCetTime(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const hh = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Brussels',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
    return `${hh} CET`;
  } catch {
    return '—';
  }
}

/**
 * Single cell in the hand-drawn deployment-topology diagram rendered by the
 * home page. Colour tokens mirror the legend in
 * `docs/infrastructure/tech-stack.md` so the diagram on the page and the
 * Mermaid diagram in the docs look related.
 */
function TopoBox({
  title,
  sub,
  tone,
  highlight,
  optional,
  dotted,
}: {
  title: string;
  sub: string;
  tone: 'client' | 'proxy' | 'app' | 'data' | 'id' | 'ext';
  highlight?: boolean;
  optional?: boolean;
  dotted?: boolean;
}) {
  const toneClass: Record<typeof tone, string> = {
    client: 'bg-[#FCE4EC] border-[#AD1457]/40 text-[#880E4F]',
    proxy:  'bg-[#FFF3E0] border-[#EF6C00]/40 text-[#BF360C]',
    app:    'bg-[#E3F2FD] border-[#1565C0]/40 text-[#0D47A1]',
    data:   'bg-[#EDE7F6] border-[#4527A0]/40 text-[#311B92]',
    id:     'bg-[#F1F8E9] border-[#558B2F]/40 text-[#33691E]',
    ext:    'bg-white border-[#B8BCC2] text-[#3D5265]',
  };
  return (
    <div
      className={`flex-1 min-w-0 border rounded-sm px-2.5 py-2 sm:px-3 ${toneClass[tone]} ${
        highlight ? 'ring-2 ring-[#00928F]/40 shadow-sm' : ''
      } ${dotted ? 'border-dashed' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11.5px] sm:text-[12.5px] font-bold leading-tight break-words min-w-0">{title}</p>
        {optional && (
          <span className="font-mono text-[9px] tracking-[0.1em] uppercase opacity-70 shrink-0">opt</span>
        )}
      </div>
      <p className="mt-0.5 text-[10px] sm:text-[10.5px] opacity-75 break-words">{sub}</p>
    </div>
  );
}

/**
 * Arrow/connector rendered between `TopoBox` cells. Horizontal by default;
 * pass `vertical` to rotate. The label is shown below the arrow so it reads
 * left-to-right (or top-to-bottom) regardless of orientation.
 */
function TopoArrow({ label, vertical }: { label: string; vertical?: boolean }) {
  return (
    <div className={`flex ${vertical ? 'flex-col items-center' : 'items-center'} shrink-0 text-[#8A95A3]`}>
      <svg
        width={vertical ? 14 : 26}
        height={vertical ? 26 : 14}
        viewBox={vertical ? '0 0 14 26' : '0 0 26 14'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        {vertical
          ? <><path d="M7 1v22" /><path d="M3 19l4 4 4-4" /></>
          : <><path d="M1 7h22" /><path d="M19 3l4 4-4 4" /></>}
      </svg>
      <span className="font-mono text-[9.5px] tracking-[0.1em] uppercase">{label}</span>
    </div>
  );
}

export default async function HomePage() {
  const [dailySummary, faqCount, liveRefs] = await Promise.all([
    readJson<DailySummary>('public/data/daily-summary.json', {}),
    countFaqItems(),
    getLiveReferenceStats(),
  ]);

  // ── Reference Manager ────────────────────────────────────────────────
  // Counts come straight from the Supabase `references` + `custom_references`
  // tables (see getLiveReferenceStats). Falls back to the bundled list when
  // Supabase is not configured.
  const refsTotal = liveRefs.total;
  const refsSyncedLabel = fmtCetTime(liveRefs.lastAddedAt) || '—';

  // ── Scenarios ────────────────────────────────────────────────────────
  const scenarioPairs = new Set(
    scenarios.map((s) => `${s.model}|${s.scenario}`)
  );
  const scenarioCount = scenarioPairs.size;
  const datapointCount = scenarios.reduce(
    (sum, s) =>
      sum + Object.values(s.values).filter((v) => v !== null && v !== undefined).length,
    0
  );

  // ── Secretariat News ─────────────────────────────────────────────────
  // SOURCES = count of distinct source labels seen across today's briefing
  // sections and the seeded static feed. This is a real "distinct unique"
  // count rather than feedsQueried, which counts RSS endpoints polled.
  const distinctSources = new Set<string>();
  for (const section of dailySummary.sections ?? []) {
    for (const item of section.items ?? []) {
      const s = (item.source ?? '').trim();
      if (s) distinctSources.add(s);
    }
  }
  for (const item of newsFeedItems) {
    const s = (item.sourceLabel ?? '').trim();
    if (s) distinctSources.add(s);
  }
  const newsSources = distinctSources.size;
  const newsToday =
    dailySummary.stats?.afterDedup ?? dailySummary.stats?.articlesLast24h ?? newsFeedItems.length;

  // ── EU Policy Navigator ──────────────────────────────────────────────
  const policyCount = policies.length;
  const domainCount = new Set(policies.map((p) => p.domain)).size;
  const recommendationCount = ALL_ESABCC_RECOMMENDATIONS.length;

  const productionModules = [
    {
      code: 'M · 01',
      title: 'Reference Manager',
      description:
        'Literature library with DOI lookup, PDF annotation and a Word add-in for inline citations.',
      href: '/references',
      stats: [
        { label: 'REFS', value: fmt(refsTotal) },
        { label: 'SYNCED', value: refsSyncedLabel },
      ],
    },
    {
      code: 'M · 02',
      title: 'Data & Scenario Explorer',
      description:
        'Eurostat indicators alongside IPCC AR6 and IIASA scenario projections in one queryable view.',
      href: '/scenarios',
      stats: [
        { label: 'SCENARIOS', value: fmt(scenarioCount) },
        { label: 'DATAPOINTS', value: fmt(datapointCount) },
      ],
    },
    {
      code: 'M · 03',
      title: 'Secretariat News',
      description:
        'Curated climate policy feed, daily 24h EU briefing, and the Brussels Bulletin export pipeline.',
      href: '/news-feed',
      stats: [
        { label: 'SOURCES', value: fmt(newsSources) },
        { label: 'TODAY', value: `${fmt(newsToday)} items` },
      ],
    },
    {
      code: 'M · 04',
      title: 'EU Policy Navigator',
      description:
        `Network map of ${fmt(policyCount)} EU climate policies with annotations and 2030 / 2040 / 2050 sector milestones.`,
      href: '/policy-navigator',
      stats: [
        { label: 'POLICIES', value: fmt(policyCount) },
        { label: 'DOMAINS', value: fmt(domainCount) },
      ],
    },
    {
      code: 'M · 05',
      title: 'Content Analysis',
      description:
        'Qualitative tagging for EU policy texts and references — hierarchical tag system, EUR-Lex PDF ingestion, AI pre-tagging and cross-document coherence.',
      href: '/content-analysis',
      stats: [
        { label: 'POLICIES', value: fmt(policyCount) },
        { label: 'TAGGING', value: 'MAXQDA-style' },
      ],
    },
    {
      code: 'M · 06',
      title: 'Voting Tool',
      description:
        'Build private ballots for Advisory Board members. Externals receive a single-use link; submissions stay isolated from the rest of the Hub and feed straight into the analysis surface.',
      href: '/voting',
      stats: [
        { label: 'ACCESS', value: 'Single-use links' },
        { label: 'ANALYSIS', value: 'Priority + tally' },
      ],
    },
    {
      code: 'M · 07',
      title: 'Project Workspace',
      description:
        'A workspace per analytical project. Bundles indicator databases, recommendation trackers, member-state space and policy analysis under Policy Gap 2.0 and other projects.',
      href: '/project-workspace',
      stats: [
        { label: 'PROJECTS', value: '2 seed' },
        { label: 'MODULES', value: 'User-extensible' },
      ],
    },
    {
      code: 'M · 08',
      title: 'Recommendations',
      description:
        'Tracker for the Advisory Board recommendations — implementation status and dated uptake events against EU legislation, labelled by source report. Shares its data with Policy Gap 2.0.',
      href: '/recommendations',
      stats: [
        { label: 'TRACKED', value: fmt(recommendationCount) },
        { label: 'SOURCE', value: 'ESABCC reports' },
      ],
    },
  ];

  const experimentalModules = [
    { code: 'M · 09', title: 'Energy System Modelling', href: '/beta/energy-system',     tags: ['PyPSA', 'NUTS-2'] },
    { code: 'M · 10', title: 'Climate Adaptation',      href: '/beta/climate-adaptation', tags: ['CLIMADA', 'CMIP6'] },
    { code: 'M · 11', title: 'Maritime & Aviation',     href: '/beta/maritime-aviation',  tags: ['SEAMAPS', 'OAG'] },
    { code: 'M · 12', title: 'Climate Finance',         href: '/beta/climate-finance',    tags: ['NGFS v5', 'EIB'] },
    { code: 'M · 13', title: 'Media Monitoring',        href: '/beta/media-monitoring',   tags: ['GDELT', 'MEDIAC'] },
    { code: 'M · 14', title: 'Fact Sheet Builder',      href: '/beta/fact-sheets',        tags: ['Templates', 'LaTeX'] },
    { code: 'M · 15', title: 'FAQ & Prebunking',        href: '/beta/faq',                tags: [`${faqCount} entries`, 'Prebunking'] },
    { code: 'M · 16', title: 'Funding Sources',         href: '/beta/funding-sources',    tags: ['Horizon', 'DG DIGIT'] },
    { code: 'M · 17', title: 'Strategy & Framework',    href: '/beta/strategy-docs',      tags: ['Strategy', 'PIRs'] },
    { code: 'M · 18', title: 'EU Climate Councils',     href: '/beta/eu-climate-councils', tags: ['67 bodies', 'Leaflet map'] },
    { code: 'M · 19', title: 'Project Management',      href: '/beta/project-management',  tags: ['5 Phases', 'Gantt', 'Manual v2.1'] },
    { code: 'M · 20', title: 'National Climate Policies', href: '/beta/national-climate-policies', tags: ['EU-27', 'climate-laws.org'] },
    { code: 'M · 21', title: 'EU Transition Panorama',  href: '/beta/transition-panorama', tags: ['AR6 pathways', '2040 advice'] },
    { code: 'M · 22', title: 'Transition Stories',     href: '/beta/transition-stories',  tags: ['Cinematic', 'Real photography'] },
    { code: 'M · 23', title: 'Policy Coherence',       href: '/beta/policy-coherence',    tags: ['4-step model', 'Coherence lens'] },
    { code: 'M · 24', title: 'Transition Stories 2',   href: '/beta/transition-stories-2', tags: ['Policy gap report', 'Mind the Gap'] },
  ];

  return (
    <div className="min-h-screen bg-white text-[#3D5265]">
      <SiteHeader />

      {/* ─────────────────────────────────────────────────────────
          HERO
          Internal tool framing. Leaves no ambiguity about who the audience
          is (ESABCC Secretariat), who maintains it (CCE5), and where it
          runs: today the app is hosted on Vercel in the EU region
          (GDPR-compliant via DPAs/SCCs, but with US-controlled
          processors), and is built to be redeployed onto EEA-managed
          infrastructure as the long-term home.
          ───────────────────────────────────────────────────────── */}
      <section className="relative border-b border-[#E6E7E8] overflow-hidden">
        {/* Subtle decorative grid + teal gradient — no imagery, still distinct */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.35]"
             style={{
               backgroundImage:
                 'linear-gradient(#00928F0C 1px, transparent 1px), linear-gradient(90deg, #00928F0C 1px, transparent 1px)',
               backgroundSize: '32px 32px',
             }} />
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full"
             style={{ background: 'radial-gradient(closest-side, #00928F22, transparent 70%)' }} />

        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-14 lg:py-20">
          <h1 className="text-[24px] sm:text-[34px] lg:text-[44px] font-bold leading-[1.15] text-[#3D5265] max-w-4xl tracking-tight pb-2 border-b-4 border-[#00928F] inline-block">
            ESABCC Secretariat MethodHub
          </h1>
          <p className="mt-4 sm:mt-5 text-[14px] sm:text-[15px] lg:text-[17px] text-[#3D5265]/80 max-w-3xl leading-relaxed">
            An integrated, internal research workspace for the European Scientific Advisory Board on Climate Change Secretariat.
            Eight production modules — references, data &amp; scenarios, news, policy, content analysis, voting, the project workspace and recommendations — packaged as a single
            self-contained Next.js service. It is <strong className="text-[#3D5265]">hosted on Vercel (EU region) today</strong>{' '}
            and built to be redeployed onto <strong className="text-[#3D5265]">EEA infrastructure</strong>, with the codebase
            stewarded by <strong className="text-[#3D5265]">CCE5</strong>.
          </p>

          <div className="mt-6 sm:mt-7 flex flex-col sm:flex-row sm:flex-wrap gap-2.5 sm:gap-3">
            <Link
              href="#modules"
              className="inline-flex items-center justify-center px-4 sm:px-5 py-3 sm:py-2.5 text-[14px] sm:text-[13px] font-semibold text-white bg-[#00928F] border border-[#00928F] rounded-sm hover:bg-[#007a77] transition-colors touch-target shadow-sm"
            >
              The eight modules
              <svg className="ml-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Link>
            <Link
              href="#infrastructure"
              className="inline-flex items-center justify-center px-4 sm:px-5 py-3 sm:py-2.5 text-[14px] sm:text-[13px] font-medium text-[#3D5265] bg-white border border-[#3D5265]/30 rounded-sm hover:border-[#3D5265] transition-colors touch-target"
            >
              Deployment &amp; infrastructure
            </Link>
            <a
              href="/docs/"
              className="inline-flex items-center justify-center px-4 sm:px-5 py-3 sm:py-2.5 text-[14px] sm:text-[13px] font-medium text-[#3D5265] bg-white border border-[#3D5265]/30 rounded-sm hover:border-[#3D5265] transition-colors touch-target"
            >
              Documentation
              <svg className="ml-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </a>
          </div>

          {/* Quick facts row */}
          <dl className="mt-8 sm:mt-10 grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#E6E7E8] border border-[#E6E7E8] rounded-sm overflow-hidden max-w-4xl">
            {[
              { k: 'Production modules', v: '8', sub: 'stable, shipped' },
              { k: 'Policies tracked',   v: fmt(policyCount), sub: `${domainCount} domains` },
              { k: 'Scenarios',          v: fmt(scenarioCount), sub: `${fmt(datapointCount)} datapoints` },
              { k: 'References',         v: fmt(refsTotal), sub: 'DOI-indexed' },
            ].map((s) => (
              <div key={s.k} className="bg-white px-3 py-2.5 sm:px-4 sm:py-3">
                <dt className="font-mono text-[10px] sm:text-[10px] tracking-[0.08em] sm:tracking-[0.1em] uppercase text-[#8A95A3]">{s.k}</dt>
                <dd className="mt-1 text-[20px] sm:text-[22px] font-bold text-[#3D5265] tabular-nums leading-none">{s.v}</dd>
                <dd className="mt-1 text-[11px] text-[#3D5265]/60">{s.sub}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div id="modules" className="scroll-mt-20" />

      {/* ─────────────────────────────────────────────────────────
          PRODUCTION MODULES  (M·01 – M·08)
          The eight surfaces shipped to the Secretariat. Any beta module
          under `beta/modules/` must not appear here — that separation is
          the whole point of the scope lock.
          ───────────────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-10 sm:pt-14 lg:pt-20">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-[#00928F] font-semibold">
              <span className="inline-block w-6 border-t border-[#00928F] align-middle mr-2" />
              Scope · v1.0
            </p>
            <h2 className="mt-3 text-[22px] sm:text-[30px] lg:text-[36px] font-bold text-[#3D5265] leading-[1.15]">
              The eight production modules.
            </h2>
            <p className="mt-3 max-w-2xl text-[13.5px] text-[#3D5265]/75 leading-relaxed">
              Everything in this row is <strong className="text-[#3D5265]">stable</strong>, covered by migrations,
              RLS policies, retention jobs and IT handoff scripts. It is the only code path EEA IT needs to
              care about on day one.
            </p>
          </div>
          <span className="font-mono text-[10px] sm:text-[11px] tracking-[0.14em] uppercase text-[#3D5265]/70 inline-flex items-center gap-2 px-2 py-1 bg-white border border-[#00928F]/40 rounded-sm">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00928F]" aria-hidden />
            Stable · in production
          </span>
        </div>
        <div className="mt-4 border-t border-[#3D5265]" />

        <div className="mt-6 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {productionModules.map((m, i) => (
            <Link
              key={m.href}
              href={m.href}
              className="group relative bg-white border border-[#E6E7E8] p-4 sm:p-5 rounded-sm hover:border-[#00928F] hover:shadow-md hover:-translate-y-[1px] transition flex flex-col"
            >
              {/* Numbered accent bar */}
              <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#00928F] to-[#00928F]/0 opacity-0 group-hover:opacity-100 transition" />

              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.14em] text-[#8A95A3]">
                  {m.code}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-[#00928F]">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00928F]" aria-hidden />
                  Stable
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-mono text-[24px] font-bold text-[#00928F]/20 leading-none tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-[15.5px] font-bold text-[#3D5265] leading-snug group-hover:text-[#00928F] transition">
                  {m.title}
                </h3>
              </div>
              <p className="mt-2 text-[12px] text-[#3D5265]/75 leading-relaxed flex-1">
                {m.description}
              </p>

              <dl className="mt-4 border-t border-[#E6E7E8] pt-2.5 font-mono text-[10.5px] text-[#3D5265]/80 divide-y divide-[#E6E7E8]/80">
                {m.stats.map((s) => (
                  <div key={s.label} className="flex justify-between py-0.5">
                    <dt className="tracking-[0.1em] text-[#8A95A3]">{s.label}</dt>
                    <dd className="tabular-nums text-[#3D5265]">{s.value}</dd>
                  </div>
                ))}
              </dl>

              <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-[#E87722] group-hover:gap-2 transition-all">
                Open module
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────
          BETA MODULES  (M·09 – M·24)
          Sixteen experimental modules routed under `/beta/<slug>`. Each card
          links to its own page; the source lives at `beta/modules/<slug>`
          and is wired into Next.js via a thin re-export under
          `src/app/beta/<slug>/page.tsx`. The Brussels Bulletin pipeline was
          promoted into News (`/news-feed/brussels-bulletin`); the Project
          Workspace and Recommendations modules graduated to core as M·07/M·08.
          ───────────────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-10 sm:pt-14 lg:pt-20">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-[#E87722] font-semibold">
              <span className="inline-block w-6 border-t border-[#E87722] align-middle mr-2" />
              Beta · on the roadmap
            </p>
            <h2 className="mt-3 text-[20px] sm:text-[26px] lg:text-[30px] font-bold text-[#3D5265] leading-[1.15]">
              Out of scope for v1.0 — but on the roadmap.
            </h2>
            <p className="mt-3 max-w-3xl text-[13px] text-[#3D5265]/75 leading-relaxed">
              Sixteen experimental modules live under <code className="font-mono text-[12px] bg-[#FBFBFA] border border-[#E6E7E8] px-1.5 py-0.5 rounded-sm">beta/modules/</code> and are exposed at <code className="font-mono text-[12px] bg-[#FBFBFA] border border-[#E6E7E8] px-1.5 py-0.5 rounded-sm">/beta/&lt;slug&gt;</code>.
              Click any card to open the prototype.
            </p>
          </div>
          <span className="font-mono text-[10px] sm:text-[11px] tracking-[0.14em] uppercase text-[#3D5265]/70 inline-flex items-center gap-2 px-2 py-1 bg-[#FFF7EE] border border-[#E87722]/40 rounded-sm">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E87722]" aria-hidden />
            Beta · preview
          </span>
        </div>

        <div className="mt-5 border border-dashed border-[#B8BCC2] rounded-sm p-4 sm:p-5 bg-[#FBFBFA]">
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {experimentalModules.map((m) => (
              <Link
                key={m.code}
                href={m.href}
                className="group relative bg-white border border-[#E6E7E8] p-3 rounded-sm hover:border-[#E87722] hover:shadow-md hover:-translate-y-[1px] transition flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-[0.14em] text-[#8A95A3]">
                    {m.code}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#E87722]">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E87722]" aria-hidden />
                    Beta
                  </span>
                </div>
                <h3 className="mt-2 text-[13.5px] font-bold text-[#3D5265] leading-snug group-hover:text-[#E87722] transition">
                  {m.title}
                </h3>
                <div className="mt-2 pt-2 border-t border-dashed border-[#D1D5DB] font-mono text-[10px] tracking-[0.1em] uppercase text-[#8A95A3]">
                  {m.tags.join('  ·  ')}
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#E87722] group-hover:gap-2 transition-all">
                  Open preview
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-[11.5px] text-[#3D5265]/70">
            Source in repo: <code className="font-mono text-[11px] bg-white border border-[#E6E7E8] px-1.5 py-0.5 rounded-sm">beta/modules/&lt;slug&gt;/page.tsx</code>
            &nbsp;·&nbsp; Routed via <code className="font-mono text-[11px] bg-white border border-[#E6E7E8] px-1.5 py-0.5 rounded-sm">src/app/beta/&lt;slug&gt;/page.tsx</code>.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────
          INFRASTRUCTURE & STEWARDSHIP
          The "how we ship" section. It is explicit about two states:
            TODAY    — the app is hosted on Vercel (EU region, SCCs, DPA
                       in place). It is GDPR-compliant on paper, but it
                       is a US-controlled processor and edge runtime,
                       which is not a long-term fit for an EEA product.
            IDEAL    — the same container moves onto EEA-managed
                       infrastructure in an EU region, with Postgres
                       and storage inside the EEA perimeter and EU
                       Login replacing Supabase Auth.
          In both states CCE5 stewards the codebase: GitHub stays the
          source of truth, PRs and reviews are public in github.com/eea
          style, and CCE5 ships the migrations and features.
          The goal is that any EEA IT reader can answer "what is hosting
          today, and what would we have to host to take it in-house?"
          in under a minute.
          ───────────────────────────────────────────────────────── */}
      <section id="infrastructure" className="scroll-mt-20 mt-14 lg:mt-20 border-t border-[#E6E7E8] bg-gradient-to-b from-white to-[#F6F9FA]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12 lg:py-20">
          <div className="grid grid-cols-1 gap-10 lg:gap-16 lg:grid-cols-[minmax(0,440px)_1fr] items-start">
            {/* Left: headline */}
            <div>
              <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-[#00928F] font-semibold">
                <span className="inline-block w-6 border-t border-[#00928F] align-middle mr-2" />
                Deployment &amp; infrastructure
              </p>
              <h2 className="mt-4 text-[24px] sm:text-[32px] lg:text-[38px] font-bold text-[#3D5265] leading-[1.15] sm:leading-[1.1] break-words">
                Hosted on <span className="text-[#B05814]">Vercel today</span>. Built to run on <span className="text-[#00928F]">EEA infrastructure</span>, stewarded by <span className="text-[#00928F]">CCE5</span>.
              </h2>
              <p className="mt-5 text-[14px] text-[#3D5265]/80 leading-relaxed">
                <strong className="text-[#3D5265]">Today, the app is deployed on Vercel</strong> (EU region, Frankfurt).
                Supabase — also in the EU — backs the database, auth and object storage. Both vendors ship signed
                Data Processing Agreements and Standard Contractual Clauses, and the running service only handles
                data that Secretariat staff put into it. That makes the current setup <strong>GDPR-compliant on
                paper</strong>, but <strong>not ideal</strong>: Vercel and Supabase are US-controlled processors,
                Vercel runs on an edge/serverless layer we do not operate, and there is no EEA-side key custody.
              </p>
              <p className="mt-4 text-[14px] text-[#3D5265]/80 leading-relaxed">
                <strong className="text-[#3D5265]">In our view, a product used by an EU official body such as the EEA or the ESABCC Secretariat needs to be hosted properly — inside the EU institutional perimeter — to guarantee data security, GDPR compliance, data sovereignty, auditability and operational control.</strong>{' '}
                The codebase is already written for that move: Next.js is compiled with
                <code className="font-mono text-[12px] bg-white border border-[#E6E7E8] px-1.5 py-0.5 rounded-sm mx-1">output: 'standalone'</code>,
                shipped as a <strong>180&nbsp;MB multi-stage Docker image</strong>, and has no hard dependency on
                edge runtime or serverless primitives. It can be deployed onto whatever EEA IT already operates —
                Podman, OpenShift, Nomad, a plain VM — with Postgres, S3/MinIO and EU Login provided from inside
                the EEA perimeter.
              </p>
              <p className="mt-4 text-[14px] text-[#3D5265]/80 leading-relaxed">
                <strong className="text-[#3D5265]">CCE5 keeps stewardship of the codebase either way.</strong>{' '}
                GitHub hosts the source, PRs, reviews and CI — exactly like every other
                <code className="font-mono text-[12px] bg-white border border-[#E6E7E8] px-1.5 py-0.5 rounded-sm mx-1">github.com/eea</code>
                repository. CCE5 ships new features, owns the data model and writes the migrations. In the target
                setup, EEA IT only has to provide a Postgres URL, a TLS cert, and OIDC — that is the entire surface
                they carry.
              </p>

              {/* Transition chart — today → ideal per dimension.
                  Four axes move (Repo, Host, Data, AI); the remaining
                  facts are constants that do not transition and are
                  listed below as context. */}
              <figure className="mt-6 border border-[#E6E7E8] rounded-sm bg-white p-4 sm:p-5 font-mono text-[11px]">
                <div className="grid grid-cols-[minmax(72px,88px)_1fr_auto_1fr] items-center gap-x-2 sm:gap-x-3 pb-2 border-b border-[#E6E7E8]">
                  <div className="tracking-[0.14em] text-[10px] uppercase text-[#8A95A3]">Axis</div>
                  <div className="tracking-[0.14em] text-[10px] uppercase text-[#B05814] font-semibold">Today</div>
                  <div className="w-6 sm:w-8" aria-hidden />
                  <div className="tracking-[0.14em] text-[10px] uppercase text-[#00928F] font-semibold">Ideal</div>
                </div>

                <ul className="divide-y divide-[#E6E7E8]">
                  {[
                    ['Repo',  'github.com/EUClimateAdvisoryBoard/ESABCCMethodHub', 'ESABCC or EEA org · CCE5 keeps Maintain'],
                    ['Host',  'Vercel · EU region (Frankfurt)',           'EEA infrastructure (EU region)'],
                    ['Data',  'Supabase EU · Postgres · Auth · Storage',  'EEA Postgres · S3/MinIO · EU Login'],
                    ['AI',    'Azure OpenAI EU · service key',            'M365 Copilot · per-user licence via Graph'],
                  ].map(([axis, today, ideal]) => (
                    <li
                      key={axis}
                      className="grid grid-cols-[minmax(72px,88px)_1fr_auto_1fr] items-center gap-x-2 sm:gap-x-3 py-3"
                    >
                      <div className="tracking-[0.12em] text-[#3D5265] uppercase font-semibold">{axis}</div>
                      <div className="min-w-0 break-words rounded-sm bg-[#FFF3E0] border border-[#EF6C00]/30 text-[#B05814] px-2 py-1.5 leading-snug">
                        {today}
                      </div>
                      <div className="w-6 sm:w-8 flex items-center justify-center text-[#8A95A3]" aria-hidden>
                        <svg viewBox="0 0 24 8" className="w-full h-2.5" fill="none" stroke="currentColor" strokeWidth="1.25">
                          <line x1="0" y1="4" x2="20" y2="4" />
                          <polyline points="16,1 20,4 16,7" />
                        </svg>
                      </div>
                      <div className="min-w-0 break-words rounded-sm bg-[#E0F2F1] border border-[#00928F]/40 text-[#00928F] font-semibold px-2 py-1.5 leading-snug">
                        {ideal}
                      </div>
                    </li>
                  ))}
                </ul>

                <figcaption className="sr-only">
                  Transition chart: each infrastructure axis moves from its current Vercel/Supabase state to an EEA-hosted target.
                </figcaption>
              </figure>

              <dl className="mt-3 border border-[#E6E7E8] rounded-sm bg-white divide-y divide-[#E6E7E8] font-mono text-[11px]">
                {[
                  ['Code ownership',   'CCE5 (EEA unit)',                                'neutral'],
                  ['Source of truth',  'github.com · PRs + reviews',                     'neutral'],
                  ['Build target',     'Docker · standalone Next.js',                    'neutral'],
                  ['Edge / serverless','Not used in the app code',                       'neutral'],
                  ['GDPR posture',     'Compliant on paper · US processors · not ideal', 'warn'],
                ].map(([k, v, tone]) => (
                  <div
                    key={k}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 px-3 sm:px-4 py-2.5"
                  >
                    <dt className="tracking-[0.12em] text-[#8A95A3] shrink-0">{String(k).toUpperCase()}</dt>
                    <dd className={`tabular-nums break-words sm:text-right ${
                      tone === 'warn'   ? 'text-[#B05814]' :
                      tone === 'vision' ? 'text-[#00928F] font-semibold' :
                      'text-[#3D5265]'
                    }`}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Right: topology diagrams — today vs ideal */}
            <div className="space-y-6">
              {/* Topology — TODAY (Vercel + Supabase) */}
              <figure className="border border-[#E6E7E8] rounded-sm bg-white p-4 sm:p-5 lg:p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <figcaption className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#8A95A3]">
                    Topology — request path today
                  </figcaption>
                  <span className="font-mono text-[9px] tracking-[0.14em] uppercase px-2 py-0.5 rounded-sm bg-[#FFF3E0] text-[#B05814] border border-[#EF6C00]/40">
                    GDPR ok · not ideal
                  </span>
                </div>

                <div className="mt-4 flex flex-col items-stretch gap-3">
                  {/* Row 1: user & Vercel edge */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <TopoBox title="Policy analyst" sub="Web browser · EU network" tone="client" />
                    <TopoArrow label="HTTPS" />
                    <TopoBox title="Vercel edge · EU" sub="TLS · Frankfurt region" tone="proxy" />
                  </div>
                  {/* Row 2: app on Vercel */}
                  <div className="flex justify-center sm:justify-start sm:pl-[calc(50%+1.5rem)]">
                    <TopoArrow label="invoke" vertical />
                  </div>
                  <div className="flex items-center gap-3">
                    <TopoBox title="methodhub-app" sub="Next.js on Vercel · EU region" tone="app" highlight />
                  </div>
                  {/* Row 3: Supabase-backed services */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-1">
                    <TopoBox title="Supabase Postgres" sub="EU region · RLS · DPA + SCCs" tone="data" />
                    <TopoBox title="Supabase Storage" sub="EU region · PDFs" tone="data" optional />
                    <TopoBox title="Supabase Auth" sub="EU region · email + OAuth" tone="id" />
                  </div>
                </div>
              </figure>

              {/* Topology — IDEAL (EEA-hosted) */}
              <figure className="border border-[#00928F]/40 rounded-sm bg-white p-4 sm:p-5 lg:p-6 shadow-sm ring-1 ring-[#00928F]/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <figcaption className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#00928F] font-semibold">
                    Topology — ideal target (EEA-hosted)
                  </figcaption>
                  <span className="font-mono text-[9px] tracking-[0.14em] uppercase px-2 py-0.5 rounded-sm bg-[#E0F2F1] text-[#00928F] border border-[#00928F]/40">
                    CCE5 stewardship
                  </span>
                </div>

                <div className="mt-4 flex flex-col items-stretch gap-3">
                  {/* Row 1: user & EEA proxy */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <TopoBox title="Policy analyst" sub="Web browser · EU network" tone="client" />
                    <TopoArrow label="HTTPS" />
                    <TopoBox title="nginx / HAProxy" sub="EEA domain · TLS · HSTS" tone="proxy" />
                  </div>
                  {/* Row 2: app */}
                  <div className="flex justify-center sm:justify-start sm:pl-[calc(50%+1.5rem)]">
                    <TopoArrow label="HTTP :3000" vertical />
                  </div>
                  <div className="flex items-center gap-3">
                    <TopoBox title="methodhub-app" sub="Next.js standalone · Docker · EEA host" tone="app" highlight />
                  </div>
                  {/* Row 3: EEA-managed backing services */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-1">
                    <TopoBox title="Postgres 14+" sub="EEA-managed · RLS · retention" tone="data" />
                    <TopoBox title="S3 / MinIO" sub="EEA-hosted · PDFs" tone="data" optional />
                    <TopoBox title="EU Login / Azure AD" sub="OIDC · replaces Supabase Auth" tone="id" />
                  </div>
                  {/* Row 4: AI layer — three interchangeable paths.
                      Azure OpenAI is the service-subscription route; the
                      M365 Copilot path reuses the user's own licence via
                      Microsoft Graph, so no service key is needed. The
                      two are controlled by the same LLM_PROVIDER flag. */}
                  <div className="pt-2">
                    <p className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-[#8A95A3] mb-2">
                      AI layer · one of
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                      <TopoBox title="Azure OpenAI EU" sub="service key · EU region" tone="ext" dotted />
                      <TopoBox title="M365 Copilot · Graph" sub="per-user licence · delegated OAuth" tone="ext" dotted />
                      <TopoBox title="No AI path" sub="disabled globally if needed" tone="ext" dotted optional />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <TopoBox title="Public EU data" sub="EUR-Lex · Eurostat · IIASA · RSS" tone="ext" dotted />
                  </div>
                </div>
              </figure>

            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
