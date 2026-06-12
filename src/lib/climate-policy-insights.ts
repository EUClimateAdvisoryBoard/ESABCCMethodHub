/**
 * Deep-insight computations for the National Level Climate Policies beta
 * module.
 *
 * Everything here is derived live from the `ClimatePolicy[]` catalogue
 * (climate-laws.org snapshot or Supabase refresh) so the insights, the
 * choropleth metrics and the charts stay correct after every refresh —
 * nothing is hand-curated.
 *
 * Keep this file free of server-only imports — it is bundled into the
 * client page (beta/modules/national-climate-policies).
 */

import type { ClimatePolicy } from './climate-laws-types';
import { EU_MEMBER_STATES } from '@/data/eu-member-states';

// The Paris Agreement was adopted in December 2015; instruments dated 2016+
// are counted as "post-Paris".
const POST_PARIS_FROM = 2016;

export interface CountryPolicyMetrics {
  code: string;
  name: string;
  total: number;
  laws: number;
  policies: number;
  /** laws / total (0 when the country has no instruments). */
  lawShare: number;
  /** Has a legislative act tagged as a Mitigation framework (a "climate law"). */
  hasMitigationFrameworkLaw: boolean;
  /** Year of the earliest Mitigation framework law, if any. */
  frameworkLawYear: number | null;
  /** Has any Mitigation framework instrument (law or executive policy). */
  hasMitigationFramework: boolean;
  /** Has any Adaptation framework instrument. */
  hasAdaptationFramework: boolean;
  /** Share of instruments that address Adaptation (responses). */
  adaptationShare: number;
  /** Share of dated instruments adopted 2016 or later. */
  postParisShare: number;
  firstYear: number | null;
  latestYear: number | null;
  /** Distinct sectors covered by at least one instrument. */
  sectorsCovered: number;
}

export function computeCountryMetrics(policies: ClimatePolicy[]): CountryPolicyMetrics[] {
  return EU_MEMBER_STATES.map(({ code, name }) => {
    const list = policies.filter(p => p.countryCode === code);
    const laws = list.filter(p => p.category === 'Law');
    const dated = list.filter(p => p.year != null);
    const years = dated.map(p => p.year as number);
    const adaptation = list.filter(p => p.responses.includes('Adaptation'));
    const frameworkLaws = laws
      .filter(p => p.frameworks.includes('Mitigation') && p.year != null)
      .map(p => p.year as number);
    const hasMitigationFrameworkLaw = laws.some(p => p.frameworks.includes('Mitigation'));
    return {
      code,
      name,
      total: list.length,
      laws: laws.length,
      policies: list.length - laws.length,
      lawShare: list.length ? laws.length / list.length : 0,
      hasMitigationFrameworkLaw,
      frameworkLawYear: frameworkLaws.length ? Math.min(...frameworkLaws) : null,
      hasMitigationFramework: list.some(p => p.frameworks.includes('Mitigation')),
      hasAdaptationFramework: list.some(p => p.frameworks.includes('Adaptation')),
      adaptationShare: list.length ? adaptation.length / list.length : 0,
      postParisShare: dated.length
        ? dated.filter(p => (p.year as number) >= POST_PARIS_FROM).length / dated.length
        : 0,
      firstYear: years.length ? Math.min(...years) : null,
      latestYear: years.length ? Math.max(...years) : null,
      sectorsCovered: new Set(list.flatMap(p => p.sectors)).size,
    };
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Narrative insights
// ───────────────────────────────────────────────────────────────────────────

export interface PolicyInsight {
  id: string;
  /** The single number/figure the card leads with. */
  headline: string;
  title: string;
  body: string;
  tone: 'green' | 'amber' | 'red' | 'neutral';
  /** Optional country chips — clicking one filters the catalogue. */
  countries?: { code: string; name: string }[];
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const names = (ms: { name: string }[]) => ms.map(m => m.name).join(', ');
const chips = (ms: CountryPolicyMetrics[]) => ms.map(m => ({ code: m.code, name: m.name }));

export function computeInsights(
  policies: ClimatePolicy[],
  metrics: CountryPolicyMetrics[],
): PolicyInsight[] {
  const insights: PolicyInsight[] = [];
  const total = policies.length;
  if (!total) return insights;

  const withData = metrics.filter(m => m.total > 0);

  // 1 — Framework climate laws: the binding backbone of national climate
  //     governance, and the clearest single marker of institutionalisation.
  {
    const withLaw = metrics.filter(m => m.hasMitigationFrameworkLaw);
    const policyOnly = metrics.filter(m => !m.hasMitigationFrameworkLaw && m.hasMitigationFramework);
    const none = metrics.filter(m => !m.hasMitigationFramework);
    const earliest = withLaw
      .filter(m => m.frameworkLawYear != null)
      .sort((a, b) => (a.frameworkLawYear as number) - (b.frameworkLawYear as number));
    insights.push({
      id: 'framework-laws',
      headline: `${withLaw.length} / ${metrics.length}`,
      title: 'Member states with a binding framework climate law',
      body:
        `${withLaw.length} member states have enshrined their climate framework in ` +
        `legislation passed by parliament` +
        (earliest.length
          ? ` (the earliest being ${earliest[0].name} in ${earliest[0].frameworkLawYear})`
          : '') +
        `. ${policyOnly.length} more rely on an executive framework strategy that a ` +
        `future government could amend without a parliamentary vote` +
        (policyOnly.length ? ` (${names(policyOnly)})` : '') +
        (none.length
          ? `, and ${none.length} show no framework instrument in this catalogue.`
          : '.'),
      tone: withLaw.length >= metrics.length * 0.7 ? 'green' : 'amber',
      countries: chips(metrics.filter(m => !m.hasMitigationFrameworkLaw)),
    });
  }

  // 2 — Adaptation frameworks: mitigation gets the laws, adaptation often
  //     only a strategy — or nothing tagged at all.
  {
    const lacking = metrics.filter(m => !m.hasAdaptationFramework);
    insights.push({
      id: 'adaptation-frameworks',
      headline: `${metrics.length - lacking.length} / ${metrics.length}`,
      title: 'Member states with a framework adaptation instrument',
      body:
        lacking.length === 0
          ? 'Every member state has at least one framework-level adaptation instrument.'
          : `${lacking.length} member states have no instrument tagged as an adaptation ` +
            `framework in this catalogue — adaptation there is governed only through ` +
            `sectoral or mitigation-led instruments, if at all.`,
      tone: lacking.length > metrics.length / 3 ? 'red' : lacking.length > 0 ? 'amber' : 'green',
      countries: chips(lacking),
    });
  }

  // 3 — The Paris effect: how much of today's national climate acquis
  //     post-dates the Paris Agreement.
  {
    const dated = policies.filter(p => p.year != null);
    const post = dated.filter(p => (p.year as number) >= POST_PARIS_FROM);
    const years = dated.map(p => p.year as number);
    const maxYear = Math.max(...years);
    const postSpan = Math.max(1, maxYear - POST_PARIS_FROM + 1);
    const preSpan = POST_PARIS_FROM - 1 - 1997 + 1; // Kyoto (1997) → 2015
    const pre = dated.filter(p => (p.year as number) >= 1997 && (p.year as number) < POST_PARIS_FROM);
    const ratio = pre.length ? (post.length / postSpan) / (pre.length / preSpan) : 0;
    insights.push({
      id: 'paris-effect',
      headline: pct(post.length / dated.length),
      title: 'Of the national climate acquis was adopted after Paris',
      body:
        `${post.length} of ${dated.length} dated instruments were adopted in ${POST_PARIS_FROM} ` +
        `or later` +
        (ratio > 0
          ? ` — an adoption pace of ${(post.length / postSpan).toFixed(0)} instruments a year, ` +
            `${ratio.toFixed(1)}× the Kyoto-to-Paris era (1997–2015) average`
          : '') +
        (ratio > 1.5
          ? `. National climate law-making accelerated sharply after the Paris Agreement.`
          : `.`),
      tone: 'green',
    });
  }

  // 4 — Legislative vs executive balance: who governs climate by act of
  //     parliament, who by decree and strategy.
  {
    const laws = policies.filter(p => p.category === 'Law').length;
    const big = withData.filter(m => m.total >= 8);
    const sorted = [...big].sort((a, b) => a.lawShare - b.lawShare);
    const mostExec = sorted.slice(0, 3);
    const mostLeg = sorted.slice(-3).reverse();
    insights.push({
      id: 'legislative-balance',
      headline: pct(laws / total),
      title: 'Of all instruments are legislative acts',
      body:
        `EU-wide, ${laws} of ${total} instruments were passed by parliament; the rest are ` +
        `executive strategies, plans and decrees. The most law-driven systems are ` +
        `${mostLeg.map(m => `${m.name} (${pct(m.lawShare)})`).join(', ')}; the most ` +
        `executive-driven are ${mostExec.map(m => `${m.name} (${pct(m.lawShare)})`).join(', ')} — ` +
        `where climate policy is more exposed to changes of government.`,
      tone: 'neutral',
      countries: chips(mostExec),
    });
  }

  // 5 — Adaptation attention gap.
  {
    const adapt = policies.filter(p => p.responses.includes('Adaptation')).length;
    const low = withData
      .filter(m => m.total >= 8 && m.adaptationShare < 0.15)
      .sort((a, b) => a.adaptationShare - b.adaptationShare);
    insights.push({
      id: 'adaptation-gap',
      headline: pct(adapt / total),
      title: 'Of instruments address adaptation',
      body:
        `Only ${adapt} of ${total} instruments cover adaptation at all. ` +
        (low.length
          ? `${low.length} member states with a substantial catalogue dedicate less than 15% ` +
            `of it to adaptation — a striking gap given rising climate impacts across Europe.`
          : `No member state with a substantial catalogue falls below 15% adaptation coverage.`),
      tone: low.length ? 'red' : 'green',
      countries: chips(low),
    });
  }

  // 6 — Sector blind spots: which major economic sectors the fewest member
  //     states regulate explicitly. Restricted to sectors with a substantial
  //     instrument base EU-wide so rare taxonomy tags don't dominate.
  {
    const sectors = Array.from(new Set(policies.flatMap(p => p.sectors)));
    const coverage = sectors
      .map(s => {
        const list = policies.filter(p => p.sectors.includes(s));
        return {
          sector: s,
          instruments: list.length,
          countries: new Set(list.map(p => p.countryCode)).size,
        };
      })
      .filter(c => c.instruments >= 25)
      .sort((a, b) => a.countries - b.countries);
    const worst = coverage.slice(0, 3);
    const cs = (n: number) => `${n} member state${n === 1 ? '' : 's'}`;
    if (worst.length) {
      insights.push({
        id: 'sector-blind-spots',
        headline: `${worst[0].countries} / ${metrics.length}`,
        title: `Member states explicitly cover the "${worst[0].sector}" sector`,
        body:
          `Among sectors with a substantial instrument base EU-wide, the patchiest ` +
          `national coverage is ${worst
            .map(w => `${w.sector} (${cs(w.countries)})`)
            .join(', ')}. ` +
          `Where no national instrument names a sector, it is governed only via ` +
          `EU-level rules — or not at all.`,
        tone: 'amber',
      });
    }
  }

  // 7 — Recency: countries whose catalogue has gone quiet. Anchored on the
  //     newest instrument in the snapshot, not on today's date, so the
  //     insight stays honest however old the snapshot is.
  {
    const refYear = Math.max(...withData.map(m => m.latestYear ?? 0));
    const quiet = withData
      .filter(m => m.latestYear != null && m.latestYear <= refYear - 5)
      .sort((a, b) => (a.latestYear as number) - (b.latestYear as number));
    insights.push({
      id: 'quiet-catalogues',
      headline: `${quiet.length}`,
      title: `Member states with nothing new in 5+ years`,
      body: quiet.length
        ? `${quiet.length} member states show no new instrument since ${refYear - 5} ` +
          `(oldest: ${quiet[0].name}, last active ${quiet[0].latestYear}), while the ` +
          `catalogue's newest instruments date from ${refYear}. Quiet can mean a stable ` +
          `framework — or a stalled one.`
        : `Every member state has adopted at least one instrument since ${refYear - 5}.`,
      tone: quiet.length ? 'amber' : 'green',
      countries: chips(quiet),
    });
  }

  // 8 — Concentration of the catalogue.
  {
    const sorted = [...withData].sort((a, b) => b.total - a.total);
    const top5 = sorted.slice(0, 5);
    const top5Total = top5.reduce((s, m) => s + m.total, 0);
    insights.push({
      id: 'concentration',
      headline: pct(top5Total / total),
      title: 'Of all instruments sit in just five member states',
      body:
        `${top5.map(m => `${m.name} (${m.total})`).join(', ')} together account for ` +
        `${top5Total} of ${total} catalogued instruments. Part of this is genuine ` +
        `legislative activity; part is climate-laws.org documentation depth — treat ` +
        `low counts as "less documented", not necessarily "less governed".`,
      tone: 'neutral',
      countries: chips(top5),
    });
  }

  return insights;
}

// ───────────────────────────────────────────────────────────────────────────
// Choropleth metrics
// ───────────────────────────────────────────────────────────────────────────

export interface MapMetric {
  key: string;
  label: string;
  description: string;
  fill: (m: CountryPolicyMetrics) => string;
  legend: { color: string; label: string }[];
  /** One-line value for the country tooltip. */
  valueLabel: (m: CountryPolicyMetrics) => string;
}

/** Linear interpolation between two hex colours, t in [0, 1]. */
function lerpHex(from: string, to: string, t: number): string {
  const c = Math.min(1, Math.max(0, t));
  const f = parseInt(from.slice(1), 16);
  const g = parseInt(to.slice(1), 16);
  const ch = (shift: number) =>
    Math.round(((f >> shift) & 0xff) + (((g >> shift) & 0xff) - ((f >> shift) & 0xff)) * c);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

const FRAMEWORK_COLORS = {
  law: '#1B5E20',
  policyOnly: '#F9A825',
  none: '#EF9A9A',
};

export function buildMapMetrics(all: CountryPolicyMetrics[]): MapMetric[] {
  const maxTotal = Math.max(1, ...all.map(m => m.total));
  const latestYears = all.map(m => m.latestYear).filter((y): y is number => y != null);
  const refYear = latestYears.length ? Math.max(...latestYears) : new Date().getFullYear();

  return [
    {
      key: 'framework',
      label: 'Framework climate law',
      description:
        'Dark green: binding framework law passed by parliament. Amber: framework exists ' +
        'only as an executive policy. Red: no framework instrument catalogued.',
      fill: m =>
        m.hasMitigationFrameworkLaw
          ? FRAMEWORK_COLORS.law
          : m.hasMitigationFramework
          ? FRAMEWORK_COLORS.policyOnly
          : FRAMEWORK_COLORS.none,
      legend: [
        { color: FRAMEWORK_COLORS.law, label: 'Framework law' },
        { color: FRAMEWORK_COLORS.policyOnly, label: 'Framework policy only' },
        { color: FRAMEWORK_COLORS.none, label: 'None catalogued' },
      ],
      valueLabel: m =>
        m.hasMitigationFrameworkLaw
          ? `Framework climate law${m.frameworkLawYear ? ` since ${m.frameworkLawYear}` : ''}`
          : m.hasMitigationFramework
          ? 'Framework policy only (no binding law)'
          : 'No framework instrument catalogued',
    },
    {
      key: 'total',
      label: 'Catalogue depth',
      description:
        'Number of national climate laws and policies catalogued (square-root scale; ' +
        'depth partly reflects climate-laws.org documentation coverage).',
      fill: m => lerpHex('#E6F4F1', '#00564E', Math.sqrt(m.total / maxTotal)),
      legend: [
        { color: '#E6F4F1', label: 'Few' },
        { color: lerpHex('#E6F4F1', '#00564E', 0.6), label: '' },
        { color: '#00564E', label: `Most (${maxTotal})` },
      ],
      valueLabel: m => `${m.total} instruments (${m.laws} laws · ${m.policies} policies)`,
    },
    {
      key: 'lawShare',
      label: 'Legislative share',
      description:
        'Share of the catalogue passed by parliament rather than adopted by the executive.',
      fill: m => (m.total ? lerpHex('#F1F8E9', '#1B5E20', m.lawShare) : '#ECEFF1'),
      legend: [
        { color: '#F1F8E9', label: 'Mostly executive' },
        { color: '#1B5E20', label: 'Mostly legislative' },
      ],
      valueLabel: m =>
        m.total ? `${Math.round(m.lawShare * 100)}% legislative acts` : 'No instruments',
    },
    {
      key: 'adaptation',
      label: 'Adaptation attention',
      description: 'Share of the catalogue that addresses adaptation.',
      fill: m => (m.total ? lerpHex('#E3F2FD', '#0D47A1', m.adaptationShare / 0.6) : '#ECEFF1'),
      legend: [
        { color: '#E3F2FD', label: '0%' },
        { color: '#0D47A1', label: '60%+' },
      ],
      valueLabel: m =>
        m.total ? `${Math.round(m.adaptationShare * 100)}% address adaptation` : 'No instruments',
    },
    {
      key: 'recency',
      label: 'Most recent activity',
      description:
        `Year of the newest catalogued instrument (newest in snapshot: ${refYear}). ` +
        'Pale countries have gone quiet.',
      fill: m =>
        m.latestYear == null
          ? '#ECEFF1'
          : lerpHex('#FBE9E7', '#00928F', (m.latestYear - (refYear - 12)) / 12),
      legend: [
        { color: '#FBE9E7', label: `${refYear - 12} or earlier` },
        { color: '#00928F', label: `${refYear}` },
      ],
      valueLabel: m =>
        m.latestYear != null
          ? `Latest instrument: ${m.latestYear}`
          : 'No dated instruments',
    },
  ];
}
