/**
 * Scenarios (M · 55) — slide view.
 *
 * Rebuilds the EEA deck "EU screening settings: potential likely setting"
 * (PDF, 20 November 2026, nine slides) as live slides for whatever setting
 * the panel holds:
 *
 *   1  Impact of different filtering criteria — tolerance table
 *   2  The three rules (2030 / 2040 / 2050) — dot strips by model family
 *   3  Funnel with pathways removed per step + the ESABCC limits
 *   4–9 One slide per sector: trajectory, 2050 annotation, lever tiles
 *       (industry also: pathways by model)
 *
 * With the potential likely setting the slides reproduce the PDF's numbers
 * (build gate in scripts/build-scenario-pathways.py, browser check in
 * model.ts `checkPdfParity`). Slides are drawn on a fixed 1280 × 720 stage
 * and scaled to the container, so they look the same on screen, in the
 * full-screen presentation mode and in print (one slide per page; "Save as
 * PDF" in the print dialog gives a PDF deck).
 *
 * AI-compiled — pending Secretariat verification.
 */
'use client';

import { ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FAMILIES, SRC_LABEL, THRESHOLDS, WIN_OPEN, YEARS,
  bandStats, fmtNum, isLikely, matchesPreset, isExportDefault, median, modelFamily, screenAll, sectorMatrix, windowLabel,
  type Dataset, type Family, type HarmMethod, type Pathway, type SectorDef, type SectorKey, type Settings,
} from '@/lib/scenario-pathways/model';
import { DECK, FunnelChart, TrajectoryChart, linear, niceTicks } from './charts';

const SW = 1280;
const SH = 720;

// Model-family colours as in the PDF's strip plots (REMIND purple, IMAGE red,
// PRIMES blue, POLES gold, GCAM orange, WITCH pink, other grey). Families are
// also named in the legend and in tooltips, so colour is never the only cue.
const FAMILY_COLOUR: Record<Family, string> = {
  REMIND: '#3b2468', IMAGE: '#a84048', PRIMES: '#5b7fc4', POLES: '#b8901e', GCAM: '#ec621d',
  WITCH: '#c77aa8', MESSAGE: '#2a6f97', AIM: '#6f8f3a', other: '#bdbdbd',
};

const SLIDE_ORDER: SectorKey[] = ['industry', 'supply', 'mobility', 'buildings', 'agri', 'eco'];

type Tile =
  | { kind: 'single'; col: string; label: string; accent?: boolean }
  | { kind: 'series'; stem: string; label: string };

const TILES: Record<SectorKey, Tile[]> = {
  industry: [
    { kind: 'single', col: 'fe40', label: 'Industry final energy 2040, EJ' },
    { kind: 'single', col: 'el40', label: 'Electricity in industry 2040, EJ' },
    { kind: 'single', col: 'h240', label: 'Hydrogen in industry 2040, EJ' },
    { kind: 'single', col: 'ccs50', label: 'CO₂ captured in industry 2050, Mt CO₂' },
    { kind: 'single', col: 'pr40', label: 'Process CO₂ 2040, Mt CO₂' },
    { kind: 'single', col: 'net50', label: 'EU net GHG 2050, Mt CO₂e', accent: true },
  ],
  supply: [
    { kind: 'series', stem: 'sup_wind', label: 'Wind electricity, TWh' },
    { kind: 'series', stem: 'sup_solar', label: 'Solar electricity, TWh' },
    { kind: 'series', stem: 'sup_el', label: 'Total electricity, TWh' },
    { kind: 'series', stem: 'sup_h2', label: 'Hydrogen production, EJ' },
  ],
  mobility: [
    { kind: 'series', stem: 'mob_fe', label: 'Final energy, EJ' },
    { kind: 'series', stem: 'mob_el', label: 'Electricity, EJ' },
    { kind: 'series', stem: 'mob_h2', label: 'Hydrogen, EJ' },
  ],
  buildings: [
    { kind: 'series', stem: 'bui_fe', label: 'Final energy, EJ' },
    { kind: 'series', stem: 'bui_el', label: 'Electricity, EJ' },
    { kind: 'series', stem: 'bui_gas', label: 'Gas, EJ' },
  ],
  agri: [
    { kind: 'series', stem: 'agr_ch4', label: 'Methane, Mt CH₄' },
    { kind: 'series', stem: 'agr_n2o', label: 'Nitrous oxide, kt N₂O' },
    { kind: 'series', stem: 'agr_live', label: 'Livestock food supply' },
  ],
  eco: [
    { kind: 'series', stem: 'eco_forest', label: 'Forest area, Mha' },
    { kind: 'series', stem: 'eco_e', label: 'LULUCF CO₂, Mt CO₂ (as reported)' },
  ],
};

// ── setting description ──────────────────────────────────────────────────

function settingName(s: Settings): string {
  if (isLikely(s)) return 'Potential likely setting';
  const pr = matchesPreset(s);
  if (pr?.advice && isExportDefault(s)) return 'Setting of the 2040 advice';
  if (pr && isExportDefault(s)) return `Deck setting ${pr.short}`;
  return 'Custom setting';
}

function ruleText(s: Settings): string {
  const parts = [
    s.r30On ? `≥ ${s.r30Min ?? 55}% by 2030` : null,
    s.winOn ? `${s.winHi >= WIN_OPEN ? `≥ ${s.winLo}%` : `${s.winLo}–${s.winHi}%`} by 2040` : null,
    s.netOn ? `net GHG ≤ ${fmtNum(s.netTol, 0)} Mt in 2050` : null,
  ].filter(Boolean);
  return parts.length ? `EU-wide ${parts.join(', ')}` : 'no EU-wide rule';
}

function sourceList(ps: Pathway[]): string {
  const c = new Map<string, number>();
  for (const p of ps) c.set(SRC_LABEL[p.src] ?? p.src, (c.get(SRC_LABEL[p.src] ?? p.src) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ');
}

const netOf = (s: Settings) => (p: Pathway) => (s.netValue ? s.netValue(p) : p.v.net50);

// ── stage ────────────────────────────────────────────────────────────────

/** Fixed 1280 × 720 slide scaled to the width of its container. */
function SlideStage({ children, fit }: { children: ReactNode; fit?: { w: number; h: number } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(fit ? Math.min(fit.w / SW, fit.h / SH) : 0.5);
  useLayoutEffect(() => {
    if (fit) { setScale(Math.min(fit.w / SW, fit.h / SH)); return; }
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / SW));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);
  return (
    <div ref={ref} className="sp-slide-outer relative overflow-hidden bg-white shadow-sm ring-1 ring-grey-200"
      style={fit ? { width: SW * scale, height: SH * scale } : { width: '100%', height: SH * scale }}>
      <div className="sp-slide-inner absolute left-0 top-0 origin-top-left" style={{ width: SW, height: SH, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

function SlideShell({ kicker, title, lead, children, foot, page, total }: {
  kicker: string; title: ReactNode; lead?: ReactNode; children: ReactNode; foot?: ReactNode; page: number; total: number;
}) {
  return (
    <div className="flex h-full w-full flex-col bg-white px-[64px] pb-[34px] pt-[44px] text-[#474747]" style={{ fontFamily: 'Inter, "Segoe UI", Arial, sans-serif' }}>
      <p className="text-[15px] font-extrabold uppercase tracking-[0.12em] text-[#ec621d]">{kicker}</p>
      <h2 className="mt-1 text-[38px] font-extrabold leading-[1.1] text-[#608c95]">{title}</h2>
      {lead && <p className="mt-2 text-[18px] leading-snug text-[#474747]">{lead}</p>}
      <div className="mt-4 min-h-0 flex-1">{children}</div>
      {foot && <p className="mt-2 text-[10.5px] leading-snug text-[#7a7a7a]">{foot}</p>}
      <span className="absolute bottom-[14px] right-[22px] text-[11px] text-[#9a9a9a]">{page} / {total}</span>
    </div>
  );
}

// ── slide 1: tolerance table ─────────────────────────────────────────────

function ToleranceSlide({ ds, s, page, total }: { ds: Dataset; s: Settings; page: number; total: number }) {
  const tols = [0, 150, 300];
  const wins: [number, number][] = [[85, 90], [85, 95]];
  const margins = [0, 10, 20, 30];
  const net = netOf(s);
  const cells = useMemo(() => tols.map((t) => wins.map(([lo, hi]) => margins.map((m) => {
    const set = screenAll(ds, { ...s, netOn: true, winOn: true, netTol: t, winLo: lo, winHi: hi, margin: m }).filter((x) => x.stage === 4).map((x) => x.p);
    const reds = set.map((p) => p.v.red).filter((v): v is number => v != null);
    const nets = set.map(net).filter((v): v is number => v != null);
    return { n: set.length, red: reds.length ? median(reds) : NaN, net: nets.length ? median(nets) : NaN };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }))), [ds, s]);
  const current = (t: number, w: [number, number], m: number) =>
    s.netOn && s.winOn && s.netTol === t && s.winLo === w[0] && s.winHi === w[1] && s.margin === m;
  return (
    <SlideShell page={page} total={total} kicker="Screening settings · 1 of 2" title="Impact of different filtering criteria"
      lead={<>Big number: pathways · below: median EU net GHG cut 2040 vs 1990 · median EU net GHG 2050, Mt CO₂e</>}
      foot={<>
        {ds.pathways.filter((p) => p.det).length.toLocaleString('en-GB')} pathways with industry data.{' '}
        {s.r30On ? `All settings include the 2030 rule: EU net GHG cut ≥ ${s.r30Min ?? 55}% vs 1990 (rounded to one decimal; missing values count as passed). ` : 'No 2030 rule applied. '}
        Tolerance: ESABCC filter limits (Table 5) and risk levels (Table 6) raised by the stated share{s.filterOn && s.riskOn ? '' : ' (only the steps switched on)'}.
        Net GHG 2050 {s.netValue ? 'scaled to the inventory' : 'as reported (JRC: net-zero flag only)'}. Orange frame: the current setting.
      </>}>
      <table className="w-full border-collapse text-[15px]">
        <thead>
          <tr className="bg-[#608c95] text-white">
            <th className="px-3 py-1.5 text-left font-bold" rowSpan={2}>Net GHG 2050 · 2040 cut</th>
            <th className="px-3 py-1.5 text-center font-bold" colSpan={4}>Tolerance: all ESABCC filter limits and risk levels raised by</th>
          </tr>
          <tr className="bg-[#608c95] text-white">
            {margins.map((m) => <th key={m} className="px-3 py-1 text-center font-bold">{m ? `+${m}%` : 'none'}</th>)}
          </tr>
        </thead>
        <tbody>
          {tols.map((t, i) => wins.map((w, j) => (
            <tr key={`${t}-${j}`} className={`border-b ${j === 1 && i < 2 ? 'border-b-2 border-[#608c95]' : 'border-grey-200'}`}>
              <td className="px-3 py-1.5 text-[15px]">Net GHG {t ? `≤ ${t} Mt` : '≤ 0'} · <b className="text-[#3f6670]">{w[0]}–{w[1]}%</b></td>
              {cells[i][j].map((c, k) => (
                <td key={k} className={`px-3 py-1 text-center ${k === 0 ? 'bg-[#efe9f4]' : ''}`}
                  style={current(t, w, margins[k]) ? { outline: `3px solid ${DECK.orange}`, outlineOffset: -3 } : undefined}>
                  <span className={`block font-mono text-[26px] font-extrabold leading-tight tabular-nums ${k === 0 ? 'text-[#3b2468]' : 'text-[#8f8aa3]'}`}>{c.n}</span>
                  <span className={`block text-[11.5px] ${k === 0 ? 'text-[#474747]' : 'text-[#9a9a9a]'}`}>
                    {c.n ? `${fmtNum(c.red, 1)}% · ${fmtNum(c.net, 0)} Mt` : '—'}
                  </span>
                </td>
              ))}
            </tr>
          )))}
        </tbody>
      </table>
    </SlideShell>
  );
}

// ── slide 2: the three rules ─────────────────────────────────────────────

interface StripSpec {
  key: string; title: string; axis: string; values: { v: number; fam: Family; label: string }[];
  keep: [number, number]; lines: number[]; bin: number; domain: [number, number]; counts: string;
}

function StripPanel({ spec }: { spec: StripSpec }) {
  const W = 370, H = 400, m = { l: 14, r: 14, t: 52, b: 40 };
  const sx = linear(spec.domain[0], spec.domain[1], m.l, W - m.r);
  const bins = new Map<number, { v: number; fam: Family; label: string }[]>();
  for (const d of spec.values) {
    const b = Math.round(d.v / spec.bin) * spec.bin;
    if (!bins.has(b)) bins.set(b, []);
    bins.get(b)!.push(d);
  }
  const maxStack = Math.max(1, ...[...bins.values()].map((x) => x.length));
  const step = Math.min(10, (H - m.t - m.b - 8) / maxStack);
  const r = Math.max(2, Math.min(4.2, step / 2 - 0.3));
  const ticks = niceTicks(spec.domain[0], spec.domain[1], 6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={spec.title}>
      <text x={m.l} y={16} fontSize={15} fontWeight={700} fill={DECK.tealDark}>{spec.title}</text>
      <text x={m.l} y={36} fontSize={12} fontWeight={700} fill="#1f1f1f">{spec.counts}</text>
      <rect x={sx(Math.max(spec.keep[0], spec.domain[0]))} y={m.t} height={H - m.t - m.b}
        width={Math.max(0, sx(Math.min(spec.keep[1], spec.domain[1])) - sx(Math.max(spec.keep[0], spec.domain[0])))} fill="#e3eef0" />
      {spec.lines.filter((l) => l >= spec.domain[0] && l <= spec.domain[1]).map((l) => (
        <line key={l} x1={sx(l)} x2={sx(l)} y1={m.t} y2={H - m.b} stroke="#1f1f1f" strokeDasharray="3 3" strokeWidth={1} />
      ))}
      {[...bins.entries()].map(([b, ds]) => ds
        .sort((a, c) => FAMILIES.indexOf(a.fam) - FAMILIES.indexOf(c.fam))
        .map((d, i) => (
          <circle key={`${b}-${i}`} cx={sx(Math.min(Math.max(b, spec.domain[0]), spec.domain[1]))} cy={H - m.b - 6 - i * step} r={r} fill={FAMILY_COLOUR[d.fam]}>
            <title>{`${d.label}: ${fmtNum(d.v, 1)}`}</title>
          </circle>
        )))}
      <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke="#9a9a9a" />
      {ticks.map((t) => (
        <text key={t} x={sx(t)} y={H - m.b + 16} fontSize={11} textAnchor="middle" fill="#7a7a7a">{String(t).replace('-', '−')}</text>
      ))}
      <text x={(m.l + W - m.r) / 2} y={H - 4} fontSize={12} textAnchor="middle" fill="#1f1f1f">{spec.axis}</text>
    </svg>
  );
}

function RulesSlide({ ds, s, page, total }: { ds: Dataset; s: Settings; page: number; total: number }) {
  const net = netOf(s);
  const passOthers = (patch: Partial<Settings>) => screenAll(ds, { ...s, ...patch }).filter((x) => x.stage === 4).map((x) => x.p);
  const lab = (p: Pathway) => `${p.model} · ${p.scenario}`;
  const r30Min = s.r30Min ?? 55;
  const [lo, hi] = [s.winLo, s.winHi];
  const tol = s.netTol;

  const a = passOthers({ r30On: false });
  const aV = a.filter((p) => p.v.red30 != null).map((p) => ({ v: p.v.red30 as number, fam: modelFamily(p.model), label: lab(p) }));
  const aBelow = aV.filter((d) => Math.round(d.v * 10) / 10 < r30Min);
  const b = passOthers({ winOn: false });
  const bV = b.filter((p) => p.v.red != null).map((p) => ({ v: p.v.red as number, fam: modelFamily(p.model), label: lab(p) }));
  const bLow = bV.filter((d) => d.v < lo - 0.05).length;
  const bHigh = hi >= WIN_OPEN ? 0 : bV.filter((d) => d.v >= hi + 0.5).length;
  const c = passOthers({ netOn: false });
  const cV = c.filter((p) => net(p) != null).map((p) => ({ v: net(p) as number, fam: modelFamily(p.model), label: lab(p) }));
  const brk = [...new Set([0, 150, tol])].sort((x, y) => x - y);
  const cats = brk.map((t, i) => {
    const lower = i === 0 ? -Infinity : brk[i - 1];
    const n = cV.filter((d) => d.v > lower && d.v <= t).length;
    return `${i === 0 ? `≤ ${fmtNum(t, 0)}` : `${fmtNum(lower, 0)}–${fmtNum(t, 0)}`}: ${n}`;
  });
  const above = cV.filter((d) => d.v > brk[brk.length - 1]).length;
  cats.push(`> ${fmtNum(brk[brk.length - 1], 0)}: ${above}`);
  const dom = (vs: number[], extra: number[], pad: number, clamp?: [number, number]): [number, number] => {
    const all = [...vs, ...extra];
    let x0 = Math.min(...all) - pad, x1 = Math.max(...all) + pad;
    if (clamp) { x0 = Math.max(x0, clamp[0]); x1 = Math.min(x1, clamp[1]); }
    return [x0, x1];
  };
  const fams = FAMILIES.filter((f) => [...aV, ...bV, ...cV].some((d) => d.fam === f));
  const name = settingName(s).toLowerCase();
  const specs: StripSpec[] = [
    {
      key: 'a', title: `a  2030: EU net GHG cut ≥ ${r30Min}%${s.r30On ? '' : ' (rule off)'}`, axis: 'EU net GHG cut 2030 vs 1990, %',
      values: aV, keep: [r30Min - 0.05, 200], lines: [r30Min], bin: 0.5, domain: dom(aV.map((d) => d.v), [r30Min], 2, [0, 100]),
      counts: `< ${r30Min}%: ${aBelow.length} · ≥ ${r30Min}%: ${aV.length - aBelow.length}`,
    },
    {
      key: 'b', title: `b  2040: EU net GHG cut ${hi >= WIN_OPEN ? `≥ ${lo}%` : `${lo}–${hi}%`}${s.winOn ? '' : ' (rule off)'}`, axis: 'EU net GHG cut 2040 vs 1990, %',
      values: bV, keep: [lo - 0.05, hi >= WIN_OPEN ? 200 : hi + 0.5], lines: hi >= WIN_OPEN ? [lo] : [lo, hi + 0.5], bin: 0.5,
      domain: dom(bV.map((d) => d.v), [lo, Math.min(hi, 100)], 2, [0, 110]),
      counts: `< ${lo}%: ${bLow} · ${windowLabel(s)}: ${bV.length - bLow - bHigh}${hi >= WIN_OPEN ? '' : ` · > ${hi}%: ${bHigh}`}`,
    },
    {
      key: 'c', title: `c  2050: EU net GHG ≤ ${fmtNum(tol, 0)} Mt${s.netOn ? '' : ' (rule off)'}`, axis: 'EU net GHG 2050, Mt CO₂e',
      values: cV, keep: [-1e9, tol], lines: brk, bin: 25, domain: dom(cV.map((d) => d.v), brk, 50),
      counts: cats.join(' · '),
    },
  ];
  return (
    <SlideShell page={page} total={total} kicker={settingName(s)} title={`Three rules that build the ${name}`}
      lead={<>Each panel: pathways passing all other rules of the {name} · (a) 2030: {aBelow.length} below {r30Min}% · (b) 2040: {bHigh} above {hi >= WIN_OPEN ? '—' : `${hi}%`}, {bLow} below {lo}% · (c) 2050: {above} above {fmtNum(tol, 0)} Mt</>}
      foot={<>
        Shaded: range kept. {aBelow.length > 0 && aBelow.length <= 6 ? `(a) below ${r30Min}% in 2030: ${aBelow.map((d) => `${d.label} (${fmtNum(d.v, 1)}%)`).join(', ')}. ` : ''}
        2030 cut derived from the export&apos;s 2040 cut and the reported net GHG (ESABCC runs: scaled to the 2020 inventory). ESABCC filter and risk levels {s.filterOn || s.riskOn ? `applied in all panels${s.margin ? `, +${s.margin}% tolerance` : ', without tolerance'}` : 'off'}.
        Pathways without a value are not drawn (a: {a.length - aV.length}, b: {b.length - bV.length}, c: {c.length - cV.length}).
      </>}>
      <div className="grid h-[400px] grid-cols-3 gap-4">
        {specs.map((sp) => <StripPanel key={sp.key} spec={sp} />)}
      </div>
      <div className="mt-1 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[13px]">
        {fams.map((f) => (
          <span key={f} className="inline-flex items-center gap-1.5">
            <svg width="12" height="12" aria-hidden><circle cx="6" cy="6" r="5" fill={FAMILY_COLOUR[f]} /></svg>{f}
          </span>
        ))}
      </div>
    </SlideShell>
  );
}

// ── slide 3: funnel ──────────────────────────────────────────────────────

function FunnelSlide({ ds, s, page, total }: { ds: Dataset; s: Settings; page: number; total: number }) {
  const sc = screenAll(ds, s).filter((x) => x.stage !== -2);
  const at = (k: number) => sc.filter((x) => x.stage >= k).length;
  const steps = [
    { label: 'Pathways with industry data', n: at(-0.5), on: true },
    { label: `2030: EU net GHG cut ≥ ${s.r30Min ?? 55}%`, n: at(0), on: !!s.r30On },
    { label: `2050: EU net GHG ≤ ${fmtNum(s.netTol, 0)} Mt`, n: at(1), on: s.netOn },
    { label: `2040: EU net GHG cut ${windowLabel(s)}`, n: at(2), on: s.winOn },
    { label: 'ESABCC filter', n: at(3), on: s.filterOn },
    { label: 'ESABCC risk levels', n: at(4), on: s.riskOn },
  ].filter((x) => x.on);
  const passing = sc.filter((x) => x.stage === 4).map((x) => x.p);
  const f = 1 + s.margin / 100;
  return (
    <SlideShell page={page} total={total} kicker={settingName(s)}
      title={`From ${steps[0].n.toLocaleString('en-GB')} pathways to ${passing.length}`}
      lead="Each rule applied to the pathways left after the previous one; numbers on the right: pathways removed"
      foot={<>
        The {passing.length}: {sourceList(passing) || '—'}. 2030 and 2040 cuts: EU net GHG vs 1990, scaled to the 2015 inventory (ESABCC runs: the Board&apos;s 2040 metric);
        missing values count as {s.missingPass ? 'passed' : 'failed'}. Net GHG 2050 {s.netValue ? 'scaled to the inventory' : 'as reported (JRC: net-zero flag)'}.
        ESABCC filter and risk levels {s.margin ? `with +${s.margin}% tolerance` : 'without tolerance'}.
      </>}>
      <div className="grid h-full grid-cols-[1fr_340px] items-center gap-8">
        <FunnelChart showRemoved steps={steps.map((x) => ({ label: x.label, n: x.n }))} />
        <div className="border-l-[6px] border-[#3b2468] bg-[#eef3f4] px-5 py-4 text-[13px]">
          {(['filter', 'risk'] as const).map((g) => (
            <div key={g} className={g === 'risk' ? 'mt-3' : ''}>
              <p className="text-[16px] font-bold text-[#3b2468]">{g === 'filter' ? 'ESABCC filter' : 'ESABCC risk levels'}{(g === 'filter' ? s.filterOn : s.riskOn) ? '' : ' (off)'}</p>
              <p className="text-[11px] text-[#7a7a7a]">excluded if above{g === 'filter' ? ', 2050 unless stated' : ', 2050'}{s.margin ? `; limits × ${f.toFixed(2)}` : ''}</p>
              {THRESHOLDS.filter((t) => t.group === g).map((t) => (
                <div key={t.key} className="flex justify-between border-b border-[#d6e2e4] py-[3px]">
                  <span>{t.label.replace(', 2050', '')}</span>
                  <b className="font-mono tabular-nums text-[#3b2468]">{fmtNum(s.th[t.key] * f, t.def < 10 ? 2 : 0)} {t.unit}</b>
                </div>
              ))}
            </div>
          ))}
          <p className="mt-2 text-[10.5px] text-[#7a7a7a]">ESABCC (2023), Tables 5 and 6</p>
        </div>
      </div>
    </SlideShell>
  );
}

// ── slides 4–9: sectors ──────────────────────────────────────────────────

function TileBox({ big, label, sub, accent }: { big: string; label: string; sub: string; accent?: boolean }) {
  return (
    <div className={`border-l-[6px] ${accent ? 'border-[#ec621d]' : 'border-[#3b2468]'} bg-[#eef3f4] px-4 py-2.5`}>
      <b className={`block font-mono text-[30px] font-extrabold leading-tight tabular-nums ${accent ? 'text-[#ec621d]' : 'text-[#3b2468]'}`}>{big}</b>
      <span className="block text-[13px] leading-snug text-[#474747]">{label}</span>
      <span className="block text-[12px] text-[#474747]">{sub}</span>
    </div>
  );
}

function tileFor(t: Tile, ps: Pathway[]): { big: string; label: string; sub: string; accent?: boolean } {
  if (t.kind === 'single') {
    const v = ps.map((p) => p.v[t.col]).filter((x): x is number => x != null);
    if (!v.length) return { big: '—', label: t.label, sub: 'not reported' };
    return { big: fmtNum(median(v)), label: t.label, sub: `range ${fmtNum(Math.min(...v))} to ${fmtNum(Math.max(...v))}`, accent: t.accent };
  }
  const a = ps.map((p) => p.v[`${t.stem}_2020`]).filter((x): x is number => x != null);
  const z = ps.map((p) => p.v[`${t.stem}_2050`]).filter((x): x is number => x != null);
  if (!z.length) return { big: '—', label: t.label, sub: 'not reported' };
  return {
    big: `${a.length ? fmtNum(median(a)) : '—'} → ${fmtNum(median(z))}`,
    label: `${t.label} · n=${z.length}`,
    sub: `2050 range ${fmtNum(Math.min(...z))} to ${fmtNum(Math.max(...z))}`,
  };
}

function SectorSlide({ ds, s, sector, idx, count, passing, harm, page, total }: {
  ds: Dataset; s: Settings; sector: SectorDef; idx: number; count: number; passing: Pathway[]; harm: HarmMethod; page: number; total: number;
}) {
  const b = bandStats(sectorMatrix(passing, sector.value));
  const unit = sector.unit.replace(' (negative = sink)', '');
  const reported = sector.reported ?? sector.value;
  const m20 = (() => { const v = passing.map((p) => reported(p, 2020)).filter((x): x is number => x != null); return v.length ? median(v) : NaN; })();
  const inv20 = ds.invSectors[2020]?.[sector.key], inv24 = ds.invSectors[2024]?.[sector.key];
  const isInd = sector.key === 'industry';
  const fams = useMemo(() => {
    const c = new Map<Family, number>();
    for (const p of passing) c.set(modelFamily(p.model), (c.get(modelFamily(p.model)) ?? 0) + 1);
    return [...c.entries()].sort((x, y) => y[1] - x[1]);
  }, [passing]);
  const tiles = TILES[sector.key].map((t) => tileFor(t, passing));
  const short = sector.name;
  const chart = b.n === 0 ? (
    <div className="flex h-full items-center justify-center text-[18px] text-[#7a7a7a]">None of the {passing.length} pathways reports this sector for all four years.</div>
  ) : (
    <TrajectoryChart
      ariaLabel={`${sector.name}: median and percentile bands of ${b.n} pathways, EEA inventory`}
      years={YEARS} width={isInd ? 760 : 1150} height={isInd ? 290 : 335}
      xDomain={[2009, 2052]} xTicks={[2010, 2015, 2020, 2025, 2030, 2035, 2040, 2045, 2050]} yLabel={unit}
      bars={Object.keys(ds.invSectors).map(Number).filter((y) => y >= 2010).map((y) => ({ x: y, y: ds.invSectors[y][sector.key] }))}
      barColor={DECK.barPale}
      bands={b.n < 5 ? [] : [
        { lo: b.q[5], hi: b.q[95], color: DECK.tealLight, opacity: 0.45, label: '5–95%' },
        { lo: b.q[25], hi: b.q[75], color: DECK.teal, opacity: 0.75, label: '25–75%' },
      ]}
      lines={b.n < 5 ? b.lines.map((ys) => ({ ys, color: DECK.purple, width: 2 })) : [{ ys: b.q[50], color: DECK.purple, width: 3.5, label: `median of ${b.n}` }]}
      valueLabels={b.n >= 5 ? { ys: b.q[50], idx: [1, 2, 3], color: DECK.purple } : undefined}
      rangeMarker={b.n >= 2 ? {
        lo: b.q[25][3], hi: b.q[75][3], title: `${short} 2050, 25–75%`,
        lines: [`${short} 2050`, `median ${fmtNum(b.q[50][3], 0)}`, `25–75%: ${fmtNum(b.q[25][3], 0)} to ${fmtNum(b.q[75][3], 0)}`, `5–95%: ${fmtNum(b.q[5][3], 0)} to ${fmtNum(b.q[95][3], 0)}`],
      } : undefined}
    />
  );
  const harmNote = harm === 'none'
    ? `As reported, not harmonised: model 2020 median ${fmtNum(m20, 0)} vs inventory ${fmtNum(inv20, 0)}.`
    : `Scaled to the EEA inventory 2020 (${harm === 'ratio' ? 'ratio, offset where unusable' : 'offset'}); the models reported a 2020 median of ${fmtNum(m20, 0)} vs inventory ${fmtNum(inv20, 0)}.`;
  return (
    <SlideShell page={page} total={total}
      kicker={`${settingName(s)} · ${ruleText(s)} · sector ${idx} of ${count}`}
      title={b.n ? <>{short}: median {fmtNum(b.q[50][3], 0)} {unit} in 2050</> : short}
      lead={isInd
        ? <><b className="text-[#3b2468]">{passing.length} pathways</b> · {sourceList(passing)}</>
        : <>{b.n} of {passing.length} pathways report the sector{b.n ? <> · median {fmtNum(b.q[50][1], 0)} in 2030, {fmtNum(b.q[50][2], 0)} in 2040 · 2050, 25–75%: {fmtNum(b.q[25][3], 0)} to {fmtNum(b.q[75][3], 0)}</> : null} · inventory 2024: {fmtNum(inv24, 0)}</>}
      foot={<>
        {isInd ? 'All rules apply to total EU net GHG (all sectors, incl. LULUCF), not to industry. ' : ''}
        Tiles: median {isInd ? '' : '2020 → 2050 '}of the pathways reporting the variable{isInd ? '' : ', as reported'}. {sector.variable}; inventory {sector.inventory}. {harmNote}
      </>}>
      <div className="flex h-full flex-col">
        <div className="mb-1 flex gap-4 text-[12px]">
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-5" style={{ background: DECK.tealLight, opacity: 0.7 }} />5–95%</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-5" style={{ background: DECK.teal }} />25–75%</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-[3px] w-5" style={{ background: DECK.purple }} />median of {b.n}</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-5" style={{ background: DECK.barPale }} />EEA inventory</span>
        </div>
        <div className={`min-h-0 flex-1 ${isInd ? 'grid grid-cols-[1fr_380px] gap-6' : ''}`}>
          <div className="min-h-0 overflow-hidden">{chart}</div>
          {isInd && (
            <div>
              <p className="mb-2 text-[15px] font-bold text-[#3f6670]">{passing.length} pathways by model</p>
              {fams.map(([f, n]) => (
                <div key={f} className="mb-2 flex items-center gap-2">
                  <span className="w-[72px] text-right text-[13px] text-[#474747]">{f}</span>
                  <span className="h-[30px]" style={{ width: `${(n / Math.max(1, fams[0][1])) * 240}px`, background: FAMILY_COLOUR[f] }} />
                  <b className="text-[14px] text-[#1f1f1f]">{n}</b>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-2 grid gap-3" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
          {tiles.map((t) => <TileBox key={t.label} {...t} />)}
        </div>
      </div>
    </SlideShell>
  );
}

// ── deck ─────────────────────────────────────────────────────────────────

export default function SlideDeck({ ds, settings, allSectors, selected, harm }: {
  ds: Dataset; settings: Settings; allSectors: SectorDef[]; selected: SectorKey[]; harm: HarmMethod;
}) {
  const passing = useMemo(() => screenAll(ds, settings).filter((x) => x.stage === 4).map((x) => x.p), [ds, settings]);
  const sectorList = SLIDE_ORDER.filter((k) => selected.includes(k)).map((k) => allSectors.find((s) => s.key === k)!).filter(Boolean);
  const total = 3 + sectorList.length;
  const slides: ReactNode[] = [
    <ToleranceSlide key="t" ds={ds} s={settings} page={1} total={total} />,
    <RulesSlide key="r" ds={ds} s={settings} page={2} total={total} />,
    <FunnelSlide key="f" ds={ds} s={settings} page={3} total={total} />,
    ...sectorList.map((sec, i) => (
      <SectorSlide key={sec.key} ds={ds} s={settings} sector={sec} idx={i + 1} count={sectorList.length} passing={passing} harm={harm} page={4 + i} total={total} />
    )),
  ];
  const [presenting, setPresenting] = useState<number | null>(null);
  const [printing, setPrinting] = useState(false);
  const closePresenter = useCallback(() => setPresenting(null), []);

  const print = useCallback(() => {
    setPrinting(true);
    const done = () => { setPrinting(false); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    // Let the print portal render before opening the dialog.
    setTimeout(() => window.print(), 300);
  }, []);

  return (
    <div className="space-y-4">
      <style dangerouslySetInnerHTML={{ __html: `
@media screen { .sp-print-root { display: none; } }
@media print {
  @page { size: ${SW}px ${SH}px; margin: 0; }
  body > *:not(.sp-print-root) { display: none !important; }
  .sp-print-root { display: block; }
  .sp-print-root .sp-print-page { width: ${SW}px; height: ${SH}px; position: relative; overflow: hidden; break-after: page; page-break-after: always; }
  .sp-print-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}` }} />
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-grey-200 bg-white px-4 py-3 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
        <p className="text-[12.5px] text-tertiary dark:text-[var(--mh-muted)]">
          {total} slides in the layout of the EEA deck <em>EU screening settings: potential likely setting</em>, recomputed for the current setting
          ({settingName(settings).toLowerCase()}, {passing.length} pathways). Sector slides follow the sector selection.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPresenting(0)} className="mh-focus rounded bg-[#3b2468] px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90">▶ Present</button>
          <button type="button" onClick={print} className="mh-focus rounded border border-primary px-3 py-1.5 text-[12px] font-semibold text-primary hover:bg-surface-blue dark:text-[#74CBC8]">⎙ Print / save as PDF</button>
        </div>
      </div>
      {passing.length === 0 && (
        <p className="rounded border border-accent-orange/60 bg-surface-orange px-3 py-2 text-[12px] text-tertiary-dark">
          No pathway is within all criteria, so the sector slides are empty; slides 1–3 still show where the pathways drop out.
        </p>
      )}
      {slides.map((sl, i) => (
        <div key={i}>
          <button type="button" onClick={() => setPresenting(i)} className="mh-focus block w-full text-left" aria-label={`Present from slide ${i + 1}`}>
            <SlideStage>{sl}</SlideStage>
          </button>
        </div>
      ))}
      {presenting != null && <Presenter slides={slides} start={presenting} onClose={closePresenter} />}
      {printing && typeof document !== 'undefined' && createPortal(
        <div className="sp-print-root">
          {slides.map((sl, i) => <div key={i} className="sp-print-page">{sl}</div>)}
        </div>,
        document.body,
      )}
    </div>
  );
}

function Presenter({ slides, start, onClose }: { slides: ReactNode[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [vp, setVp] = useState({ w: 1280, h: 720 });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const size = () => setVp({ w: window.innerWidth - 32, h: window.innerHeight - 64 });
    size();
    window.addEventListener('resize', size);
    const key = (e: KeyboardEvent) => {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); setI((x) => Math.min(slides.length - 1, x + 1)); }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', key);
    try { ref.current?.requestFullscreen?.().catch(() => undefined); } catch { /* fullscreen not allowed: overlay still works */ }
    return () => {
      window.removeEventListener('resize', size);
      window.removeEventListener('keydown', key);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    };
  }, [slides.length, onClose]);
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) setVp({ w: window.innerWidth - 32, h: window.innerHeight - 64 }); };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Slide presentation" className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#2b2b2b]">
      <SlideStage fit={vp}>{slides[i]}</SlideStage>
      <div className="mt-3 flex items-center gap-3 text-[12px] text-white/80">
        <button type="button" onClick={() => setI((x) => Math.max(0, x - 1))} className="mh-focus rounded px-2 py-1 hover:bg-white/10" aria-label="Previous slide">←</button>
        <span className="font-mono tabular-nums">{i + 1} / {slides.length}</span>
        <button type="button" onClick={() => setI((x) => Math.min(slides.length - 1, x + 1))} className="mh-focus rounded px-2 py-1 hover:bg-white/10" aria-label="Next slide">→</button>
        <button type="button" onClick={onClose} className="mh-focus ml-4 rounded border border-white/40 px-2 py-1 hover:bg-white/10">Close (Esc)</button>
      </div>
    </div>
  );
}
