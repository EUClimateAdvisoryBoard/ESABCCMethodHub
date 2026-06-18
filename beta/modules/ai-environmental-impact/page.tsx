'use client';

/**
 * The Carbon Cost of a Prompt — AI environmental impact, beta module.
 *
 * An interactive, transparent back-of-the-envelope estimator for the
 * greenhouse-gas footprint of *using* generative AI today (inference, not
 * training). It is built so every assumption is a slider you can move.
 *
 * The chain of reasoning is deliberately simple and explicit:
 *
 *   1. WHERE the data centre sits fixes the carbon intensity of the
 *      electricity it draws. We offer two anchors:
 *        • EU grid  ≈ 250 gCO₂e/kWh  (EEA: EU electricity ≈ 242 g in 2022,
 *          falling year on year).
 *        • US grid  ≈ 370 gCO₂e/kWh  (EPA eGRID / EIA ≈ 0.37 kg/kWh).
 *
 *   2. HOW MUCH ENERGY a token costs. Published 2025 anchors put a *typical*
 *      short assistant query at ≈ 0.3 Wh (Epoch AI for GPT-4o-class; Google's
 *      median Gemini text prompt ≈ 0.24 Wh; OpenAI's Altman quoted ≈ 0.34 Wh).
 *      Older/larger-model estimates were ≈ 3 Wh/query. We model this as a
 *      fixed per-request overhead plus an energy cost per 1,000 generated
 *      ("output-equivalent") tokens, all scaled by data-centre PUE.
 *
 *   3. HOW MANY TOKENS a task burns. Four reference tasks span the range from a
 *      one-line question to a long agentic coding job, each with a worked
 *      example and an explicit token budget (input / reasoning / output and the
 *      number of model calls).
 *
 *   4. COMPARE the result to everyday anchors everyone has a feel for — a web
 *      search, boiling a kettle, driving a petrol car, a beef burger, an hour
 *      of flying — and then SCALE it up to a planetary number of queries to
 *      show why the real story is as much about grid expansion as about
 *      gross emissions.
 *
 * Everything here is an illustrative order-of-magnitude reconstruction from
 * public figures, NOT a measurement of any specific product, and NOT a
 * forecast. Inference-energy figures in particular are uncertain to within a
 * factor of several — which is exactly why they are exposed as sliders.
 */

import { Fragment, useMemo, useState, type ReactNode } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

/* ----------------------------------------------------------------- model */

type Params = {
  gridIntensity: number; // gCO2e per kWh of grid electricity
  energyPer1k: number;   // Wh per 1,000 output-equivalent tokens
  reqOverhead: number;   // Wh fixed overhead per model request (routing, retrieval, idle)
  pue: number;           // data-centre Power Usage Effectiveness (≥1)
  inputWeight: number;   // 0..1 — energy of one input/prefill token vs one output token
};

const DEFAULTS: Params = {
  gridIntensity: 250,
  energyPer1k: 1.5,
  reqOverhead: 0.15,
  pue: 1.2,
  inputWeight: 0.2,
};

type Task = {
  id: string;
  label: string;
  glyph: string;
  blurb: string;
  example: string;
  exampleNote: string;
  requests: number;   // number of model calls the task triggers
  input: number;      // total input/prefill tokens read across the task
  reasoning: number;  // hidden chain-of-thought tokens generated
  output: number;     // visible answer tokens generated
};

const TASKS: Task[] = [
  {
    id: 'simple',
    label: 'A normal question',
    glyph: '💬',
    blurb:
      'A single, short factual question to a standard assistant — no tools, no hidden reasoning. The everyday case, billions of times a day.',
    example: '“What’s the capital of Australia, and give me one interesting fact about it.”',
    exampleNote:
      '≈ 30 tokens in, a ≈ 80-token answer (“Canberra was purpose-built as a compromise between Sydney and Melbourne…”), one model call.',
    requests: 1,
    input: 30,
    reasoning: 0,
    output: 80,
  },
  {
    id: 'writing',
    label: 'A short writing task',
    glyph: '✍️',
    blurb:
      'Drafting a paragraph or a polished email — the most common “productivity” use. A bit more output than a quick question, still a single call.',
    example: '“Draft a polite 150-word email rescheduling Thursday’s meeting to next Tuesday.”',
    exampleNote: '≈ 40 tokens of instruction in, a ≈ 220-token email out, one model call.',
    requests: 1,
    input: 40,
    reasoning: 0,
    output: 220,
  },
  {
    id: 'research',
    label: 'A deep-research question',
    glyph: '🔎',
    blurb:
      'An agentic research run: the model searches the web, reads many pages, reasons over them across several rounds, then writes a cited synthesis. Input balloons because retrieved pages are fed back in.',
    example:
      '“Research the current state of the EU Carbon Border Adjustment Mechanism (CBAM), with sources, and compare it to similar US proposals.”',
    exampleNote:
      '≈ 30 model calls, ≈ 60,000 tokens of retrieved pages read, ≈ 8,000 tokens of reasoning, a ≈ 2,500-token cited report.',
    requests: 30,
    input: 60000,
    reasoning: 8000,
    output: 2500,
  },
  {
    id: 'code',
    label: 'Writing ~1,000 lines of complex code',
    glyph: '🛠️',
    blurb:
      'A full agentic coding job: the model repeatedly reads the codebase, plans, reasons, edits files and re-reads results over dozens of turns. The single most energy-hungry common task — and the fastest-growing.',
    example:
      '“Build a complete REST API with authentication, a database layer, tests and docs — about 1,000 lines across several files.”',
    exampleNote:
      '≈ 80 model calls, ≈ 120,000 tokens of code/context read, ≈ 15,000 tokens of reasoning, ≈ 14,000 tokens written (~1,000 lines ≈ 12–15k tokens).',
    requests: 80,
    input: 120000,
    reasoning: 15000,
    output: 14000,
  },
];

// output-equivalent token count: output + reasoning generated at full cost,
// input/prefill discounted by inputWeight.
const computeTokens = (t: Task, p: Params) =>
  t.output + t.reasoning + t.input * p.inputWeight;

// energy in Wh for one whole task
function taskEnergyWh(t: Task, p: Params) {
  const tokenWh = (computeTokens(t, p) / 1000) * p.energyPer1k;
  const overheadWh = t.requests * p.reqOverhead;
  return (tokenWh + overheadWh) * p.pue;
}

// grams CO2e for one whole task
const taskGrams = (t: Task, p: Params) =>
  (taskEnergyWh(t, p) / 1000) * p.gridIntensity;

/* ----------------------------------------------------- everyday anchors */

type Anchor = { label: string; grams: number; note: string };

// All values are gCO2e, order-of-magnitude figures from public life-cycle
// sources (see method note). Used both as comparison bars and as "X equals N
// of these" equivalences.
const ANCHORS: Anchor[] = [
  { label: 'One web search', grams: 0.2, note: 'classic ≈ 0.2 gCO₂e per Google search' },
  { label: 'Charging a smartphone', grams: 3, note: '≈ 0.012 kWh on the EU grid' },
  { label: 'An hour of LED light (10 W)', grams: 2.5, note: '0.01 kWh on the EU grid' },
  { label: 'Boiling a full kettle', grams: 28, note: '≈ 0.11 kWh on the EU grid' },
  { label: 'An hour of HD video streaming', grams: 50, note: 'network + device, EU average' },
  { label: 'Driving 1 km, petrol car', grams: 170, note: 'real-world tailpipe ≈ 170 g/km' },
  { label: 'Driving 5 km, petrol car', grams: 850, note: '5 × 170 g/km' },
  { label: 'A beef burger', grams: 2500, note: '≈ 2.5 kgCO₂e for a ~110 g beef patty + bun' },
  { label: '1 kg of beef', grams: 60000, note: '≈ 60 kgCO₂e/kg, life-cycle average' },
  { label: 'One hour of flying (economy)', grams: 90000, note: '≈ 90 kgCO₂e per passenger-hour' },
];

// the subset shown alongside the AI tasks in the comparison chart
const CHART_ANCHORS = ['One web search', 'Boiling a full kettle', 'Driving 5 km, petrol car', 'A beef burger'];

/* ---------------------------------------------------------------- presets */

type Preset = { id: string; label: string; blurb: string; over: Partial<Params> };

const GRID = { EU: 250, US: 370 };
const TIER = {
  efficient: { energyPer1k: 0.4, reqOverhead: 0.05 },
  standard: { energyPer1k: 1.5, reqOverhead: 0.15 },
  frontier: { energyPer1k: 5.0, reqOverhead: 0.4 },
};

const PRESETS: Preset[] = [
  {
    id: 'eu-standard',
    label: 'EU grid · standard assistant',
    blurb:
      'Data centre on the EU grid (≈ 250 gCO₂e/kWh) running a mainstream GPT-4o / Gemini-class model. A simple question lands near the published ≈ 0.3 Wh / ≈ 0.1 g anchor.',
    over: { gridIntensity: GRID.EU, ...TIER.standard },
  },
  {
    id: 'us-standard',
    label: 'US grid · standard assistant',
    blurb:
      'Same model, but the data centre draws the dirtier US average grid (≈ 370 gCO₂e/kWh) — so every task carries ≈ 50% more carbon than on the EU grid.',
    over: { gridIntensity: GRID.US, ...TIER.standard },
  },
  {
    id: 'eu-frontier',
    label: 'EU grid · frontier reasoning model',
    blurb:
      'A large, heavy “reasoning” model on the EU grid. Per-token energy is several times higher, and reasoning tasks generate many hidden tokens — the footprint climbs sharply.',
    over: { gridIntensity: GRID.EU, ...TIER.frontier },
  },
  {
    id: 'us-frontier',
    label: 'US grid · frontier reasoning model',
    blurb:
      'The worst common case here: a heavy reasoning model on the US grid. This is roughly where a lot of today’s most demanding agentic work actually runs.',
    over: { gridIntensity: GRID.US, ...TIER.frontier },
  },
  {
    id: 'eu-efficient',
    label: 'EU grid · efficient small model',
    blurb:
      'A small, distilled, well-optimised model on the EU grid — the most efficient case. Shows how much headroom there is if the same task runs on a leaner model.',
    over: { gridIntensity: GRID.EU, ...TIER.efficient },
  },
];

/* -------------------------------------------------------------- formatting */

function fmt(n: number, d = 0) {
  return n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
}

// human-friendly grams of CO2e
function grams(g: number) {
  if (g < 1) return `${g.toFixed(g < 0.1 ? 3 : 2)} g`;
  if (g < 1000) return `${fmt(g, g < 10 ? 1 : 0)} g`;
  return `${fmt(g / 1000, 2)} kg`;
}

// human-friendly Wh / kWh
function energy(wh: number) {
  if (wh < 1000) return `${fmt(wh, wh < 1 ? 3 : wh < 10 ? 2 : 1)} Wh`;
  return `${fmt(wh / 1000, 2)} kWh`;
}

/* ---------------------------------------------------------------- sliders */

function Slider(props: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  std?: number;
  display?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const { label, hint, value, min, max, step, unit, std, display, onChange } = props;
  const fmtVal = (v: number) => (display ? display(v) : fmt(v));
  const modified = std !== undefined && Math.abs(value - std) > step / 2;
  const stdPct = std !== undefined ? ((std - min) / (max - min)) * 100 : null;
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-tertiary-dark">{label}</span>
        <span className={`font-mono text-[12px] tabular-nums ${modified ? 'text-accent-orange' : 'text-primary'}`}>
          {fmtVal(value)}
          {unit ? <span className="text-tertiary"> {unit}</span> : null}
        </span>
      </div>
      <div className="relative mt-1.5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
        {stdPct !== null && (
          <span
            aria-hidden
            title={`Standard: ${fmtVal(std!)}`}
            className="pointer-events-none absolute -bottom-0.5 h-2 w-px bg-tertiary/50"
            style={{ left: `calc(${stdPct}% )` }}
          />
        )}
      </div>
      <div className="mt-0.5 flex items-start justify-between gap-2">
        {hint ? <p className="text-[10.5px] leading-snug text-tertiary">{hint}</p> : <span />}
        {std !== undefined &&
          (modified ? (
            <button
              type="button"
              onClick={() => onChange(std)}
              className="shrink-0 whitespace-nowrap text-[10px] font-semibold text-accent-orange hover:underline"
            >
              ↺ standard {fmtVal(std)}
            </button>
          ) : (
            <span className="shrink-0 whitespace-nowrap text-[10px] text-tertiary/70">standard</span>
          ))}
      </div>
    </label>
  );
}

function ControlGroup({ title, accent, children }: { title: string; accent?: boolean; children: ReactNode }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? 'border-primary/40 bg-surface-blue' : 'border-grey-200 bg-white'}`}>
      <h3 className={`mb-3 text-[11px] font-bold uppercase tracking-[0.1em] ${accent ? 'text-primary' : 'text-tertiary'}`}>
        {title}
      </h3>
      <div className="space-y-3.5">{children}</div>
    </div>
  );
}

/* ------------------------------------------------ horizontal log bar chart */

function LogBars(props: {
  items: { label: string; grams: number; color: string; highlight?: boolean }[];
  height?: number;
}) {
  const { items } = props;
  const W = 720;
  const rowH = 30;
  const H = items.length * rowH + 28;
  const m = { l: 230, r: 56, t: 6, b: 22 };
  const iw = W - m.l - m.r;
  const min = 0.1; // gCO2e floor for the log axis
  const max = Math.max(...items.map((d) => d.grams));
  const lo = Math.log10(min);
  const hi = Math.log10(max * 1.3);
  const sx = (g: number) => m.l + ((Math.log10(Math.max(g, min)) - lo) / (hi - lo)) * iw;
  const ticks = [0.1, 1, 10, 100, 1000, 10000, 100000];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="CO2e footprint comparison (log scale)">
      {/* vertical gridlines + axis labels */}
      {ticks
        .filter((t) => t >= min && t <= max * 1.3)
        .map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={m.t} y2={H - m.b} stroke="#E6E7E8" strokeWidth={1} />
            <text x={sx(t)} y={H - 8} textAnchor="middle" className="fill-grey-500" fontSize={9}>
              {t < 1 ? `${t}g` : t < 1000 ? `${t}g` : `${t / 1000}kg`}
            </text>
          </g>
        ))}
      {items.map((d, i) => {
        const y = m.t + i * rowH;
        const x = sx(d.grams);
        return (
          <g key={d.label}>
            <text x={m.l - 8} y={y + rowH / 2 + 3} textAnchor="end" fontSize={11} className={d.highlight ? 'fill-tertiary-dark font-semibold' : 'fill-tertiary'}>
              {d.label.length > 34 ? `${d.label.slice(0, 33)}…` : d.label}
            </text>
            <rect x={m.l} y={y + 6} width={Math.max(1, x - m.l)} height={rowH - 13} rx={2} fill={d.color} fillOpacity={d.highlight ? 1 : 0.55} />
            <text x={x + 5} y={y + rowH / 2 + 3} fontSize={10} className="fill-tertiary-dark font-mono tabular-nums">
              {grams(d.grams)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------- page */

const C = {
  simple: '#74CBC8',
  writing: '#478EA5',
  research: '#FF9933',
  code: '#B83230',
  anchor: '#7495B2',
};

const TASK_COLOR: Record<string, string> = {
  simple: C.simple,
  writing: C.writing,
  research: C.research,
  code: C.code,
};

// EU annual electricity demand, for the scale section (≈ 2,600 TWh/yr).
const EU_ELECTRICITY_TWH = 2600;
const REACTOR_TWH = 8;        // one large reactor ≈ 8 TWh/yr
const HOUSEHOLD_KWH = 3500;   // average EU household ≈ 3,500 kWh/yr

/* -------------------------------------------- "cost of building MethodHub"
 * Measured from this very repository (git ls-files, 18 Jun 2026). "Authored
 * source" excludes generated/vendored/data artefacts (lock-files, GeoJSON,
 * extracted reference JSON, concatenated SQL dumps, built bundles). The token
 * count converts the authored bytes at ≈ 3.5 characters per token (code is
 * denser than prose). See the panel + method note for how the build multiplier
 * turns a static artefact into an estimate of the tokens actually *processed*
 * during agentic, iterative development.
 */
const HUB = {
  allFiles: 1102,
  allMB: 35.7,
  authoredFiles: 865,
  authoredLines: 210000,
  authoredBytes: 9_631_910,
  charsPerToken: 3.5,
};
const HUB_ARTIFACT_TOKENS = HUB.authoredBytes / HUB.charsPerToken; // ≈ 2.75 M tokens of committed code

/* ------------------------------------------ corporate energy-per-revenue
 * The macro signal from the hyperscalers' own CSR / sustainability reports:
 * electricity drawn vs revenue earned, and how that ratio is moving. Figures
 * are total/operational electricity consumption (TWh) from each company's
 * sustainability reports and press analyses of them, and reported revenue
 * ($bn). Microsoft is on a July–June fiscal year; Google and Meta on calendar
 * years. Intermediate and latest-year electricity figures are approximate
 * order-of-magnitude values as reported — the trend, not the third digit, is
 * the point. Sources are listed in the method note.
 */
const COMPANY_YEARS = [2020, 2021, 2022, 2023, 2024];

type Company = {
  id: string;
  label: string;
  note: string;
  color: string;
  elec: number[]; // TWh of electricity, by COMPANY_YEARS
  rev: number[];  // $bn revenue, by COMPANY_YEARS
};

const COMPANIES: Company[] = [
  {
    id: 'msft',
    label: 'Microsoft',
    note: 'fiscal year (Jul–Jun)',
    color: '#0A3D61',
    elec: [11, 14, 18, 24, 30],
    rev: [143.0, 168.1, 198.3, 211.9, 245.1],
  },
  {
    id: 'googl',
    label: 'Google (Alphabet)',
    note: 'data-centre electricity',
    color: '#B83230',
    elec: [14.4, 18.3, 21.8, 24.2, 30.8],
    rev: [182.5, 257.6, 282.8, 307.4, 350.0],
  },
  {
    id: 'meta',
    label: 'Meta',
    note: 'data-centre electricity',
    color: '#007B6C',
    elec: [7.17, 9.42, 11.56, 14.98, 18.0],
    rev: [85.97, 117.9, 116.6, 134.9, 164.5],
  },
];

// electricity intensity, MWh of electricity per $ million of revenue
const intensityMWhPerM = (c: Company) => c.elec.map((e, i) => (e / c.rev[i]) * 1000);
// indexed to 2020 = 100
const intensityIndex = (c: Company) => {
  const I = intensityMWhPerM(c);
  return I.map((v) => (v / I[0]) * 100);
};

/* indexed multi-line chart for 2020–2024 ------------------------------- */

function IndexChart(props: {
  series: { label: string; color: string; values: number[] }[];
  years: number[];
  yMin: number;
  yMax: number;
  height?: number;
}) {
  const { series, years, yMin, yMax, height = 280 } = props;
  const W = 720;
  const H = height;
  const m = { l: 44, r: 16, t: 14, b: 28 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const sx = (i: number) => m.l + (i / (years.length - 1)) * iw;
  const sy = (v: number) => m.t + ih - ((Math.min(Math.max(v, yMin), yMax) - yMin) / (yMax - yMin)) * ih;
  const yTicks = 5;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Energy intensity index">
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const v = yMin + ((yMax - yMin) / yTicks) * i;
        const y = sy(v);
        return (
          <g key={i}>
            <line x1={m.l} x2={W - m.r} y1={y} y2={y} stroke={v === 100 ? '#BCBEC0' : '#E6E7E8'} strokeWidth={1} strokeDasharray={v === 100 ? '4 3' : undefined} />
            <text x={m.l - 6} y={y + 3} textAnchor="end" className="fill-grey-500" fontSize={10}>
              {fmt(v)}
            </text>
          </g>
        );
      })}
      {years.map((yr, i) => (
        <text key={yr} x={sx(i)} y={H - 9} textAnchor="middle" className="fill-grey-500" fontSize={10}>
          {yr}
        </text>
      ))}
      <text x={m.l} y={m.t - 3} className="fill-tertiary" fontSize={10}>
        Electricity per $ of revenue (index, 2020 = 100)
      </text>
      {series.map((s) => (
        <g key={s.label}>
          <path
            d={s.values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ')}
            fill="none"
            stroke={s.color}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          {s.values.map((v, i) => (
            <circle key={i} cx={sx(i)} cy={sy(v)} r={2.6} fill={s.color} />
          ))}
        </g>
      ))}
    </svg>
  );
}

export default function AiEnvironmentalImpactPage() {
  const [p, setP] = useState<Params>({ ...DEFAULTS, ...PRESETS[0].over });
  const [activePreset, setActivePreset] = useState('eu-standard');
  const [taskId, setTaskId] = useState('simple');
  const [perDayMillions, setPerDayMillions] = useState(1000); // millions of THIS task per day
  const [buildMult, setBuildMult] = useState(50); // tokens processed in development ÷ tokens of final committed code

  const set = (k: keyof Params) => (v: number) => {
    setP((prev) => ({ ...prev, [k]: v }));
    setActivePreset('custom');
  };

  const applyPreset = (pr: Preset) => {
    setP({ ...DEFAULTS, ...pr.over });
    setActivePreset(pr.id);
  };

  const task = TASKS.find((t) => t.id === taskId)!;

  const results = useMemo(() => TASKS.map((t) => ({ t, wh: taskEnergyWh(t, p), g: taskGrams(t, p) })), [p]);
  const sel = results.find((r) => r.t.id === taskId)!;

  // everyday equivalences for the selected task
  const eq = (anchorLabel: string) => {
    const a = ANCHORS.find((x) => x.label === anchorLabel)!;
    return sel.g / a.grams;
  };
  const searches = eq('One web search');
  const carMetres = (sel.g / ANCHORS.find((a) => a.label === 'Driving 1 km, petrol car')!.grams) * 1000;
  const burgerPct = eq('A beef burger') * 100;
  const flightPct = eq('One hour of flying (economy)') * 100;

  // comparison chart: the 4 tasks + a few everyday anchors, sorted
  const chartItems = useMemo(() => {
    const taskRows = results.map((r) => ({
      label: r.t.label,
      grams: r.g,
      color: TASK_COLOR[r.t.id],
      highlight: r.t.id === taskId,
    }));
    const anchorRows = ANCHORS.filter((a) => CHART_ANCHORS.includes(a.label)).map((a) => ({
      label: a.label,
      grams: a.grams,
      color: C.anchor,
      highlight: false,
    }));
    return [...taskRows, ...anchorRows].sort((a, b) => a.grams - b.grams);
  }, [results, taskId]);

  // scale projection for the selected task
  const perDay = perDayMillions * 1e6;
  const dailyWh = sel.wh * perDay;
  const annualTWh = (dailyWh * 365) / 1e9; // Wh → TWh
  const annualMt = (annualTWh * p.gridIntensity) / 1000; // TWh × g/kWh → Mt CO2e
  const households = (annualTWh * 1e9) / HOUSEHOLD_KWH; // TWh → kWh → households
  const reactors = annualTWh / REACTOR_TWH;
  const euPct = (annualTWh / EU_ELECTRICITY_TWH) * 100;

  const tokensTotal = task.input + task.reasoning + task.output;

  // "cost of building MethodHub": apply the page's own energy/grid model to an
  // estimate of the total tokens processed while developing this codebase.
  const buildEnergyWh = (mult: number) =>
    ((HUB_ARTIFACT_TOKENS * mult) / 1000) * p.energyPer1k * p.pue;
  const buildGrams = (mult: number) => (buildEnergyWh(mult) / 1000) * p.gridIntensity;
  const buildTokens = HUB_ARTIFACT_TOKENS * buildMult;
  const buildG = buildGrams(buildMult);
  const buildLowG = buildGrams(20);
  const buildHighG = buildGrams(100);
  const buildKm = buildG / ANCHORS.find((a) => a.label === 'Driving 1 km, petrol car')!.grams;
  const buildBurgers = buildG / ANCHORS.find((a) => a.label === 'A beef burger')!.grams;
  const buildFlightHrs = buildG / ANCHORS.find((a) => a.label === 'One hour of flying (economy)')!.grams;

  // corporate energy-per-revenue trend
  const companyStats = COMPANIES.map((c) => {
    const I = intensityMWhPerM(c);
    const idx = intensityIndex(c);
    const change2024 = idx[idx.length - 1] - 100;
    const elecGrowth = c.elec[c.elec.length - 1] / c.elec[0];
    const revGrowth = c.rev[c.rev.length - 1] / c.rev[0];
    // YoY change of intensity, last value = most recent year's acceleration
    const yoy = I.map((v, i) => (i ? (v / I[i - 1] - 1) * 100 : 0));
    return { c, I, idx, change2024, elecGrowth, revGrowth, yoyLatest: yoy[yoy.length - 1] };
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* hero */}
        <section className="mb-6">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module · AI &amp; climate · interactive footprint estimator
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">The Carbon Cost of a Prompt</h1>
          <p className="mt-2 max-w-3xl text-sm text-tertiary sm:text-base">
            What is the greenhouse-gas footprint of actually <em>using</em> AI? This module follows one transparent
            chain — <strong>where</strong> the data centre sits (EU or US grid), <strong>how much energy</strong> a
            token costs, and <strong>how many tokens</strong> a task burns — then turns the answer into things we all
            have a feel for: a web search, boiling a kettle, driving a petrol car, a beef burger, an hour of flying.
            Finally it scales a single prompt up to a planetary number of queries, because the real challenge AI brings
            is not only its gross emissions but the <strong>grid expansion</strong> needed to power it.
          </p>
          <p className="mt-2 max-w-3xl text-[12px] text-tertiary">
            Every number below is an illustrative order-of-magnitude reconstruction from public figures — not a
            measurement of any product, and not a forecast. The inference-energy figures are uncertain to within a
            factor of several, which is exactly why they are sliders.
          </p>
        </section>

        {/* anchor cards */}
        <section className="mb-6 grid gap-2 sm:grid-cols-3">
          {[
            {
              h: 'Where: grid carbon intensity',
              b: 'EU grid ≈ 250 gCO₂e/kWh (EEA, falling); US grid ≈ 370 gCO₂e/kWh (EPA eGRID). Same prompt, ~50% more carbon in the US.',
            },
            {
              h: 'How much: energy per token',
              b: 'A typical short query ≈ 0.3 Wh (Epoch AI / Google / OpenAI, 2025). Modelled as a fixed per-request overhead + energy per 1,000 generated tokens × PUE.',
            },
            {
              h: 'How many: tokens per task',
              b: 'From an 80-token answer to a 1,000-line coding job reading 120,000 tokens of context over 80 model calls — a spread of hundreds of times.',
            },
          ].map((c) => (
            <div key={c.h} className="rounded-lg border border-grey-200 bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">{c.h}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-tertiary">{c.b}</p>
            </div>
          ))}
        </section>

        {/* presets */}
        <section className="mb-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary">Scenarios</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((pr) => (
              <button
                key={pr.id}
                onClick={() => applyPreset(pr)}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  activePreset === pr.id
                    ? 'border-primary bg-primary text-white'
                    : 'border-grey-300 bg-white text-tertiary-dark hover:border-primary hover:text-primary'
                }`}
              >
                {pr.label}
              </button>
            ))}
            {activePreset === 'custom' && (
              <span className="inline-flex items-center rounded-full border border-dashed border-grey-400 px-3 py-1.5 text-[12px] font-semibold text-tertiary">
                Custom
              </span>
            )}
          </div>
          <p className="mt-2 max-w-3xl text-[11.5px] leading-relaxed text-tertiary">
            {PRESETS.find((x) => x.id === activePreset)?.blurb ??
              'You have moved the assumptions away from a named scenario. Use the buttons above to return to a calibrated starting point.'}
          </p>
        </section>

        {/* task picker */}
        <section className="mb-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary">Pick a task</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {results.map(({ t, g }) => (
              <button
                key={t.id}
                onClick={() => setTaskId(t.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  taskId === t.id ? 'border-primary bg-surface-blue' : 'border-grey-200 bg-white hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">{t.glyph}</span>
                  <span className="font-mono text-[12px] font-bold tabular-nums text-tertiary-dark">{grams(g)}</span>
                </div>
                <p className="mt-1 text-[12px] font-semibold leading-tight text-tertiary-dark">{t.label}</p>
                <p className="mt-0.5 text-[10px] text-tertiary">CO₂e per task</p>
              </button>
            ))}
          </div>
        </section>

        {/* KPI strip for selected task */}
        <section className="mb-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            { label: 'Energy / task', v: energy(sel.wh), sub: `${fmt(tokensTotal)} tokens, ${task.requests} call${task.requests > 1 ? 's' : ''}` },
            { label: 'CO₂e / task', v: grams(sel.g), sub: `at ${fmt(p.gridIntensity)} gCO₂e/kWh` },
            { label: '≈ web searches', v: searches >= 1 ? fmt(searches) : searches.toFixed(2), sub: '@ 0.2 g each' },
            { label: '≈ petrol-car driving', v: carMetres >= 1000 ? `${fmt(carMetres / 1000, 2)} km` : `${fmt(carMetres)} m`, sub: '@ 170 g/km' },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-grey-200 bg-grey-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-tertiary">{c.label}</p>
              <p className="mt-0.5 font-mono text-xl font-bold text-tertiary-dark tabular-nums">{c.v}</p>
              <p className="text-[10.5px] text-tertiary">{c.sub}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* main column */}
          <div className="space-y-6 lg:order-1">
            {/* the worked example */}
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <h2 className="text-[13px] font-bold text-tertiary-dark">
                {task.glyph} {task.label} — a worked example
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-tertiary">{task.blurb}</p>
              <div className="mt-3 rounded-md border border-grey-200 bg-surface-teal p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-secondary-dark">Example prompt</p>
                <p className="mt-1 text-[13px] italic leading-relaxed text-tertiary-dark">{task.example}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-tertiary">{task.exampleNote}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { k: 'Input read', v: fmt(task.input), u: 'tokens' },
                  { k: 'Reasoning', v: fmt(task.reasoning), u: 'tokens' },
                  { k: 'Answer', v: fmt(task.output), u: 'tokens' },
                  { k: 'Model calls', v: fmt(task.requests), u: '' },
                ].map((b) => (
                  <div key={b.k} className="rounded-md border border-grey-200 bg-grey-50 p-2 text-center">
                    <p className="font-mono text-[14px] font-bold tabular-nums text-tertiary-dark">{b.v}</p>
                    <p className="text-[10px] text-tertiary">
                      {b.k} {b.u}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-tertiary">
                Energy = (fixed overhead per call + generated tokens × energy/1,000 tokens) × PUE ={' '}
                <span className="font-mono text-tertiary-dark">{energy(sel.wh)}</span>. On a{' '}
                {fmt(p.gridIntensity)} gCO₂e/kWh grid that is <span className="font-mono text-tertiary-dark">{grams(sel.g)}</span> of
                CO₂e — about <strong>{searches >= 1 ? fmt(searches) : searches.toFixed(2)} web searches</strong>,{' '}
                <strong>{carMetres >= 1000 ? `${fmt(carMetres / 1000, 2)} km` : `${fmt(carMetres)} m`}</strong> of
                petrol-car driving, <strong>{burgerPct < 1 ? burgerPct.toFixed(2) : fmt(burgerPct, 1)}%</strong> of a
                beef burger, or <strong>{flightPct < 1 ? flightPct.toFixed(3) : fmt(flightPct, 2)}%</strong> of an hour
                in a plane.
              </p>
            </div>

            {/* comparison chart */}
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <h2 className="text-[13px] font-bold text-tertiary-dark">How the four tasks compare to everyday things</h2>
              <p className="mb-2 text-[11px] text-tertiary">
                Footprint per task, gCO₂e, on a <strong>logarithmic</strong> scale — the only way to fit a single
                question and a beef burger on one axis. Your selected task is highlighted; the blue bars are everyday
                anchors.
              </p>
              <LogBars items={chartItems} />
              <p className="mt-1 text-[10.5px] text-tertiary">
                The headline: most single AI uses are tiny next to a car trip or a burger — but a heavy agentic coding
                or research run, especially on a frontier model and a dirty grid, climbs into the same range as a few
                kilometres of driving. The danger is volume, not any single prompt.
              </p>
            </div>

            {/* scale section */}
            <div className="rounded-lg border border-primary/40 bg-surface-blue p-4">
              <h2 className="text-[13px] font-bold text-tertiary-dark">Now multiply by the world</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-tertiary">
                A single prompt is trivial. A planet running them is not. Below: <strong>{fmt(perDayMillions)} million</strong>{' '}
                of the selected task (<em>{task.label.toLowerCase()}</em>) every day. For reference, leading assistants
                already field on the order of a billion or more messages a day.
              </p>
              <div className="mt-3">
                <Slider
                  label="How many of this task per day, worldwide"
                  hint="In millions. ChatGPT alone is reported at well over a billion (1,000 million) messages per day."
                  value={perDayMillions}
                  min={1}
                  max={10000}
                  step={1}
                  unit="million/day"
                  display={(v) => (v >= 1000 ? `${fmt(v / 1000, 1)} bn` : fmt(v))}
                  onChange={setPerDayMillions}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                {[
                  { label: 'Electricity / year', v: `${fmt(annualTWh, annualTWh < 10 ? 2 : 0)} TWh`, sub: 'just for this one task' },
                  { label: 'CO₂e / year', v: `${fmt(annualMt, annualMt < 10 ? 2 : 1)} Mt`, sub: `at ${fmt(p.gridIntensity)} g/kWh` },
                  { label: '≈ households powered', v: households >= 1e6 ? `${fmt(households / 1e6, 1)} M` : fmt(households), sub: '@ 3,500 kWh/yr (EU)' },
                  { label: '≈ EU electricity', v: `${euPct < 1 ? euPct.toFixed(2) : fmt(euPct, 1)}%`, sub: 'of ~2,600 TWh/yr' },
                ].map((c) => (
                  <div key={c.label} className="rounded-lg border border-grey-200 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-tertiary">{c.label}</p>
                    <p className="mt-0.5 font-mono text-lg font-bold text-tertiary-dark tabular-nums">{c.v}</p>
                    <p className="text-[10.5px] text-tertiary">{c.sub}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-tertiary">
                That is roughly <strong>{reactors < 1 ? reactors.toFixed(2) : fmt(reactors, reactors < 10 ? 1 : 0)} large
                power-station reactor{reactors >= 1.5 ? 's' : ''}</strong> running flat out, all year, for a single
                category of AI task. This is the grid-expansion problem in a sentence: even when the carbon per prompt is
                small, the new firm, around-the-clock demand has to be <em>built</em> — and if it is built faster than
                clean generation, it locks in fossil capacity. The IEA projects data-centre electricity demand roughly
                doubling to ≈ 945 TWh by 2030, with AI the main driver.
              </p>
            </div>
          </div>

          {/* controls column */}
          <aside className="space-y-5 lg:order-2">
            <div className="rounded-lg border border-grey-200 bg-grey-50 p-3 text-[11px] leading-relaxed text-tertiary">
              <p>
                <span className="font-bold text-tertiary-dark">Standard settings.</span> Sliders open on the{' '}
                <strong>EU grid · standard assistant</strong> scenario. A tick under each track marks that standard;
                any slider you move turns <span className="font-semibold text-accent-orange">orange</span> with a{' '}
                <span className="font-semibold text-accent-orange">↺ standard</span> button to snap it back.
              </p>
            </div>

            <ControlGroup title="Where — the grid">
              <Slider
                label="Grid carbon intensity"
                hint="EU ≈ 250, US ≈ 370, coal-heavy grids 600+, near-fully-clean grids (e.g. France, Nordics) under 100."
                value={p.gridIntensity}
                std={DEFAULTS.gridIntensity}
                min={20}
                max={700}
                step={10}
                unit="gCO₂e/kWh"
                onChange={set('gridIntensity')}
              />
              <Slider
                label="Data-centre PUE"
                hint="Power Usage Effectiveness — total facility power ÷ IT power. Best hyperscalers ≈ 1.1; older sites 1.5+."
                value={p.pue}
                std={DEFAULTS.pue}
                min={1.0}
                max={2.0}
                step={0.05}
                display={(v) => `${v.toFixed(2)}×`}
                onChange={set('pue')}
              />
            </ControlGroup>

            <ControlGroup title="How much — energy per token" accent>
              <Slider
                label="Energy per 1,000 tokens"
                hint="Generated (output + reasoning) tokens. Efficient small model ≈ 0.4 Wh, mainstream ≈ 1.5 Wh, heavy reasoning model 5+ Wh."
                value={p.energyPer1k}
                std={DEFAULTS.energyPer1k}
                min={0.1}
                max={10}
                step={0.1}
                unit="Wh"
                display={(v) => v.toFixed(1)}
                onChange={set('energyPer1k')}
              />
              <Slider
                label="Fixed overhead per model call"
                hint="Routing, retrieval, idle-capacity attribution charged once per request, before any tokens."
                value={p.reqOverhead}
                std={DEFAULTS.reqOverhead}
                min={0}
                max={2}
                step={0.05}
                unit="Wh"
                display={(v) => v.toFixed(2)}
                onChange={set('reqOverhead')}
              />
              <Slider
                label="Input-token cost vs output"
                hint="Prefill (reading the prompt/context) is cheaper per token than autoregressive generation. 0.2 = 20% of an output token."
                value={p.inputWeight}
                std={DEFAULTS.inputWeight}
                min={0.05}
                max={1}
                step={0.05}
                display={(v) => `${Math.round(v * 100)}%`}
                onChange={set('inputWeight')}
              />
            </ControlGroup>

            <button
              onClick={() => applyPreset(PRESETS[0])}
              className="w-full rounded-md border border-grey-300 bg-white py-2 text-[12px] font-semibold text-tertiary-dark hover:border-primary hover:text-primary"
            >
              Reset to EU · standard assistant
            </button>

            {/* full anchor table */}
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary">Everyday anchors</h3>
              <table className="w-full text-[11px]">
                <tbody>
                  {ANCHORS.map((a) => (
                    <tr key={a.label} className="border-b border-grey-100 last:border-0">
                      <td className="py-1.5 pr-2 text-tertiary-dark">{a.label}</td>
                      <td className="py-1.5 text-right font-mono tabular-nums text-tertiary">{grams(a.grams)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[10px] leading-snug text-tertiary">
                Life-cycle order-of-magnitude figures; see the method note for sources.
              </p>
            </div>
          </aside>
        </div>

        {/* corporate energy-per-revenue trend */}
        <section className="mt-10">
          <div className="mb-1 text-[11px] uppercase tracking-[0.12em] text-tertiary">The corporate signal · from the CSR reports</div>
          <h2 className="text-lg font-bold text-tertiary-dark sm:text-xl">
            Energy per dollar of revenue is rising — and the rise is accelerating
          </h2>
          <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-tertiary">
            Per-prompt efficiency improving while the total still explodes is only half the story. The other half is
            visible in the hyperscalers&rsquo; own sustainability reports: they are now burning <em>more</em> electricity
            for every dollar they earn — the opposite of the &ldquo;growth decoupled from energy&rdquo; trend of the
            2010s. Microsoft burned roughly <strong>60% more energy per $ of revenue in 2024 than in 2020</strong>; its
            electricity grew {fmt(companyStats[0].elecGrowth, 1)}× while revenue grew only {fmt(companyStats[0].revGrowth, 1)}×.
            And the rate of increase is itself increasing — the steepest year-on-year jumps land in the AI build-out
            years, not the early ones. <strong>That is acceleration.</strong>
          </p>

          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <h3 className="text-[13px] font-bold text-tertiary-dark">Electricity per $ of revenue, indexed to 2020 = 100</h3>
              <p className="mb-1 text-[11px] text-tertiary">
                Above the dashed 100 line means a company is using more energy per dollar than it did in 2020. All three
                lines turn upward in the AI years.
              </p>
              <IndexChart
                years={COMPANY_YEARS}
                yMin={85}
                yMax={170}
                series={COMPANIES.map((c) => ({ label: c.label, color: c.color, values: intensityIndex(c) }))}
              />
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5">
                {COMPANIES.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1.5 text-[11px] text-tertiary">
                    <svg width="22" height="8" className="shrink-0">
                      <line x1="0" y1="4" x2="22" y2="4" stroke={c.color} strokeWidth="3" />
                    </svg>
                    {c.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {companyStats.map(({ c, change2024, yoyLatest }) => (
                <div key={c.id} className="rounded-lg border border-grey-200 bg-grey-50 p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12px] font-bold text-tertiary-dark">{c.label}</span>
                    <span className="font-mono text-lg font-bold tabular-nums" style={{ color: c.color }}>
                      {change2024 >= 0 ? '+' : ''}
                      {fmt(change2024)}%
                    </span>
                  </div>
                  <p className="text-[10.5px] text-tertiary">
                    energy/$ revenue, 2024 vs 2020 · latest year {yoyLatest >= 0 ? '+' : ''}
                    {fmt(yoyLatest)}% · {c.note}
                  </p>
                </div>
              ))}
              <p className="text-[10.5px] leading-snug text-tertiary">
                Different denominators (Microsoft&rsquo;s figure is total electricity; Google and Meta quote data-centre
                electricity), so compare the <em>direction and slope</em>, not the absolute levels.
              </p>
            </div>
          </div>

          {/* raw data table */}
          <div className="mt-4 overflow-x-auto rounded-lg border border-grey-200 bg-white p-4">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary">The underlying figures (from the reports)</h3>
            <table className="w-full min-w-[640px] text-[11px]">
              <thead>
                <tr className="border-b border-grey-200 text-tertiary">
                  <th className="py-1.5 pr-2 text-left font-semibold">Company · metric</th>
                  {COMPANY_YEARS.map((y) => (
                    <th key={y} className="px-2 py-1.5 text-right font-semibold">
                      {y}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {companyStats.map(({ c, I }) => (
                  <Fragment key={c.id}>
                    <tr className="border-b border-grey-100">
                      <td className="py-1.5 pr-2 font-semibold text-tertiary-dark">{c.label} — electricity (TWh)</td>
                      {c.elec.map((v, i) => (
                        <td key={i} className="px-2 py-1.5 text-right font-mono tabular-nums text-tertiary">
                          {fmt(v, 1)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-grey-100">
                      <td className="py-1.5 pr-2 text-tertiary">— revenue ($bn)</td>
                      {c.rev.map((v, i) => (
                        <td key={i} className="px-2 py-1.5 text-right font-mono tabular-nums text-tertiary">
                          {fmt(v)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b-2 border-grey-200">
                      <td className="py-1.5 pr-2 text-tertiary">— MWh per $M revenue</td>
                      {I.map((v, i) => (
                        <td key={i} className="px-2 py-1.5 text-right font-mono tabular-nums font-semibold" style={{ color: c.color }}>
                          {fmt(v, 1)}
                        </td>
                      ))}
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 max-w-3xl text-[12px] leading-relaxed text-tertiary">
            <strong>So what will the 2025 reports say?</strong> Every leading indicator points the same way: capital
            expenditure on AI data centres hit record highs in 2024–25, the new capacity runs flat-out, and the heaviest
            tasks (agentic research and coding, video and reasoning models) are exactly the ones growing fastest. On this
            trajectory the 2025 sustainability reports almost certainly show energy-per-revenue climbing again, with the
            year-on-year jump as large as or larger than 2024&rsquo;s. The decoupling of digital growth from energy that
            defined the last decade has, for now, gone into reverse — and that reversal, not any single chatbot answer,
            is the real climate and grid-expansion challenge.
          </p>
        </section>

        {/* the two takeaways */}
        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-grey-200 bg-surface-teal p-4">
            <h2 className="text-[13px] font-bold text-tertiary-dark">The honest, calming part</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-tertiary">
              For an individual, a single AI prompt is a rounding error in a daily footprint. A normal question is a
              fraction of a gram — far less than the commute, the coffee, or the burger at lunch. Worrying about asking a
              chatbot one more question is, climate-wise, missing the point. Efficiency is also improving fast: per-query
              energy has fallen sharply as models and hardware are optimised, and running on a clean grid (move the
              intensity slider toward France/Nordic levels) shrinks the carbon by another order of magnitude.
            </p>
          </div>

          <div className="rounded-lg border border-grey-200 bg-surface-yellow p-4">
            <h2 className="text-[13px] font-bold text-tertiary-dark">…and the part that should worry us</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-tertiary">
              The challenge is <strong>aggregate and structural</strong>, not per-prompt. Three things compound: tasks
              are getting heavier (agentic research and coding burn hundreds of times more than a question); usage is
              exploding to billions of calls a day; and the demand is <em>firm and around-the-clock</em>, so it needs new
              dispatchable capacity. If that capacity is built faster than clean generation can keep up, AI growth
              entrenches gas and coal and competes with electrification of transport, heat and industry for the same grid
              and the same permits. For the EU this is squarely a climate-neutrality and energy-security question — the
              footprint that matters is the data centre on the horizon and the transmission line to it, not the gram of
              CO₂ behind any one answer.
            </p>
          </div>
        </section>

        {/* cost of building MethodHub */}
        <section className="mt-10 rounded-lg border border-primary/40 bg-surface-blue p-4 sm:p-5">
          <div className="mb-1 text-[11px] uppercase tracking-[0.12em] text-tertiary">Putting it to work · a self-measurement</div>
          <h2 className="text-lg font-bold text-tertiary-dark sm:text-xl">What did it cost to build MethodHub itself?</h2>
          <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-tertiary">
            This very platform was built largely with AI coding assistance, so it is a natural test case. Measuring the
            repository directly (<code className="font-mono text-[11px]">git ls-files</code>, {HUB.allFiles.toLocaleString('en-GB')} text
            files, ≈ {HUB.allMB} MB) and keeping only <strong>authored source</strong> — excluding generated data,
            GeoJSON, lock-files, concatenated SQL dumps and built bundles — leaves{' '}
            <strong>{HUB.authoredFiles.toLocaleString('en-GB')} files</strong>, about{' '}
            <strong>{fmt(HUB.authoredLines / 1000)}k lines</strong> and{' '}
            <strong>{fmt(HUB.authoredBytes / 1e6, 1)} MB</strong> of code. At ≈ {HUB.charsPerToken} characters per token
            that committed artefact is ≈ <strong>{fmt(HUB_ARTIFACT_TOKENS / 1e6, 2)} million tokens</strong>.
          </p>
          <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-tertiary">
            But you never process a codebase only once. Agentic development re-reads files as context dozens of times,
            reasons, drafts, debugs, refactors and discards work — so the tokens actually <em>processed</em> are a large
            multiple of the final size. That multiplier is the single most uncertain number here, so it is a slider.
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { label: 'Tokens processed', v: `${fmt(buildTokens / 1e6)} M`, sub: `${fmt(buildMult)}× the committed code` },
                { label: 'Energy', v: energy(buildEnergyWh(buildMult)), sub: `at ${p.energyPer1k.toFixed(1)} Wh/1k · PUE ${p.pue.toFixed(2)}×` },
                { label: 'CO₂e (central)', v: grams(buildG), sub: `at ${fmt(p.gridIntensity)} gCO₂e/kWh` },
                { label: '≈ petrol-car driving', v: buildKm >= 1 ? `${fmt(buildKm)} km` : `${fmt(buildKm * 1000)} m`, sub: '@ 170 g/km' },
                { label: '≈ beef burgers', v: fmt(buildBurgers, buildBurgers < 10 ? 1 : 0), sub: '@ 2.5 kg each' },
                { label: '≈ hours of flying', v: buildFlightHrs < 1 ? buildFlightHrs.toFixed(2) : fmt(buildFlightHrs, 1), sub: '@ 90 kg/passenger-hr' },
              ].map((c) => (
                <div key={c.label} className="rounded-lg border border-grey-200 bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-tertiary">{c.label}</p>
                  <p className="mt-0.5 font-mono text-lg font-bold text-tertiary-dark tabular-nums">{c.v}</p>
                  <p className="text-[10.5px] text-tertiary">{c.sub}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <Slider
                label="Development overhead multiplier"
                hint="Tokens processed during development ÷ tokens of final committed code. Light editing ≈ 10×; heavy agentic build with lots of context re-reading, debugging and refactors ≈ 100×."
                value={buildMult}
                min={5}
                max={150}
                step={5}
                unit="×"
                onChange={setBuildMult}
              />
              <p className="mt-3 text-[12px] leading-relaxed text-tertiary">
                Plausible range (20×–100×): <strong>{grams(buildLowG)}</strong> to <strong>{grams(buildHighG)}</strong>{' '}
                of CO₂e on the current grid setting.
              </p>
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-[12px] leading-relaxed text-tertiary">
            So building this entire platform with AI cost on the order of <strong>{grams(buildG)}</strong> of CO₂e —
            roughly <strong>{buildKm >= 1 ? `${fmt(buildKm)} km` : `${fmt(buildKm * 1000)} m`}</strong> in a petrol car,{' '}
            <strong>{fmt(buildBurgers, buildBurgers < 10 ? 1 : 0)} beef burgers</strong>, or{' '}
            <strong>{buildFlightHrs < 1 ? buildFlightHrs.toFixed(2) : fmt(buildFlightHrs, 1)} hours</strong> of flying.
            That is the point in miniature: the footprint of <em>making</em> one product is genuinely modest — a single
            return flight dwarfs it. The climate stakes are not this codebase but the billions of daily inferences it and
            everything like it will serve, and the always-on data-centre capacity that has to be built to power them.
            <span className="text-tertiary/80"> (Inference only — this excludes the energy of training the models used,
            which is a separate, larger one-off cost.)</span>
          </p>
        </section>

        {/* method note + sources */}
        <section className="mt-8 max-w-3xl space-y-2 border-t border-grey-200 pt-4 text-[11px] leading-relaxed text-tertiary">
          <p className="text-[12px] font-bold text-tertiary-dark">Method &amp; honest limits</p>
          <p>
            This is a deliberately simple, fully transparent estimator of <strong>inference</strong> (usage) emissions —
            it ignores the one-off energy of <em>training</em> a model and the embodied carbon of the chips and
            buildings, both of which are real and significant. For each task, energy = (model-calls × fixed overhead +
            generated-token-equivalents × energy-per-1,000-tokens) × PUE, where generated-token-equivalents count
            output and reasoning tokens at full cost and input/prefill tokens at a discount. Grams of CO₂e = energy ×
            grid carbon intensity. Token budgets for the four tasks are representative round numbers, not measurements;
            real tasks vary widely. Inference-energy figures are uncertain to within a factor of several and are falling
            over time — treat every output as an order of magnitude, and use the sliders to test how sensitive the
            conclusion is to each assumption.
          </p>
          <p>
            The <strong>“cost of building MethodHub”</strong> panel measures this repository directly with{' '}
            <code className="font-mono text-[10.5px]">git ls-files</code>, keeps only authored source (no generated data,
            lock-files, GeoJSON, SQL dumps or built bundles), converts bytes to tokens at ≈ 3.5 chars/token, then
            multiplies by a development-overhead factor to approximate the tokens actually processed during iterative,
            agentic coding (re-reading context, reasoning, debugging, discarded drafts). It uses the same energy and grid
            settings as the rest of the page and counts inference only — not the energy of training the underlying
            models. The overhead multiplier is the dominant uncertainty, hence the explicit 20×–100× range.
          </p>
          <p className="text-[12px] font-bold text-tertiary-dark">Indicative sources</p>
          <ul className="space-y-1">
            <li>
              EEA — greenhouse-gas intensity of EU electricity generation (≈ 242 gCO₂e/kWh, 2022, declining):{' '}
              <a className="text-primary underline" href="https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emission-intensity-of-1" target="_blank" rel="noreferrer">
                eea.europa.eu
              </a>
            </li>
            <li>
              US EPA eGRID / EIA — US average grid ≈ 0.37 kgCO₂e/kWh:{' '}
              <a className="text-primary underline" href="https://www.epa.gov/egrid" target="_blank" rel="noreferrer">
                epa.gov/egrid
              </a>
            </li>
            <li>
              IEA — <em>Energy and AI</em> (2025): data-centre electricity demand projected to reach ≈ 945 TWh by 2030:{' '}
              <a className="text-primary underline" href="https://www.iea.org/reports/energy-and-ai" target="_blank" rel="noreferrer">
                iea.org/reports/energy-and-ai
              </a>
            </li>
            <li>
              Epoch AI — energy use of a typical GPT-4o-class query (≈ 0.3 Wh):{' '}
              <a className="text-primary underline" href="https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use" target="_blank" rel="noreferrer">
                epoch.ai
              </a>
            </li>
            <li>
              Google — environmental cost of a Gemini text prompt (median ≈ 0.24 Wh, ≈ 0.03 gCO₂e):{' '}
              <a className="text-primary underline" href="https://cloud.google.com/blog/products/infrastructure/measuring-the-environmental-impact-of-ai-inference" target="_blank" rel="noreferrer">
                cloud.google.com
              </a>
            </li>
            <li>
              Corporate energy-per-revenue: each company&rsquo;s sustainability / environmental report and press
              analyses of them — Microsoft (FY total electricity ≈ 11 TWh 2020 → ≈ 24 TWh 2023, rising further in
              FY2024), Google/Alphabet (data-centre electricity ≈ 14.4 TWh 2020 → 30.8 TWh 2024) and Meta (≈ 7.2 TWh 2020
              → ≈ 18 TWh 2024); revenue from the companies&rsquo; annual filings. See e.g.{' '}
              <a className="text-primary underline" href="https://www.visualcapitalist.com/microsofts-electricity-use-has-doubled-between-2020-2023/" target="_blank" rel="noreferrer">
                Visual Capitalist (Microsoft)
              </a>{' '}
              and{' '}
              <a className="text-primary underline" href="https://techcrunch.com/2025/07/01/googles-data-center-energy-use-doubled-in-four-years/" target="_blank" rel="noreferrer">
                TechCrunch (Google)
              </a>
              . Intermediate and latest-year figures are approximate as reported; the trend is the point.
            </li>
            <li>
              Everyday-anchor figures (driving, beef, flying, kettle) follow standard life-cycle ranges, e.g. Mike
              Berners-Lee, <em>How Bad Are Bananas? The Carbon Footprint of Everything</em>, and Our World in Data&rsquo;s
              food and transport footprint datasets:{' '}
              <a className="text-primary underline" href="https://ourworldindata.org/environmental-impacts-of-food" target="_blank" rel="noreferrer">
                ourworldindata.org
              </a>
            </li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
