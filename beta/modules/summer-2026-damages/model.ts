/**
 * Summer 2026 Economic Damage Ledger — types and deterministic helpers
 * (beta module M · 54).
 *
 * The module is a sourced ledger, not a model: there is no estimation in
 * this file, only type contracts and arithmetic over the records in
 * data.generated.ts (tallies, groupings, and the explicit refusal to sum
 * euro figures whose scopes differ). Every judgement-shaped decision —
 * which figures exist, what they cover, how confident the compilation is —
 * lives in the data file where it carries a source and a confidence flag.
 */

/* ------------------------------------------------------------------ types */

/** The five damage strands the ledger tracks. */
export type Strand = 'heat' | 'wildfire' | 'water' | 'agriculture' | 'energy';

/**
 * Compile-time confidence of a record — how the compiling agent saw the
 * figure, not a verification verdict (that is the Secretariat's job):
 *   verified  — the primary source page/PDF/API was fetched and the figure
 *               read from the retrieved text;
 *   secondary — a reputable secondary report (syndication, agency write-up)
 *               was fetched; the primary document was not;
 *   snippet   — seen only in search-result snippets; pending verification
 *               and not to be quoted outside the hub.
 */
export type Confidence = 'verified' | 'secondary' | 'snippet';

export type SourceRef = {
  label: string;
  url: string;
  /** Publication or retrieval date, ISO where known. */
  date?: string;
  /** Page, section, endpoint or other locator inside the source. */
  locator?: string;
};

/**
 * A euro damage estimate. Scopes differ wildly (restoration-only,
 * firefighting-only, GDP-flow, property loss, welfare loss), so figures
 * are stored with their scope stated and are NEVER summed across records —
 * see noHonestTotal() below.
 */
export type EuroFigure = {
  /** €bn, lo == hi when the source gives a point value. */
  lo: number;
  hi: number;
  /** What the figure covers — the reason these must not be added up. */
  scope: string;
  kind: 'official' | 'insurer' | 'academic' | 'bank' | 'analysis' | 'industry' | 'private-forecast';
  /** Date the estimate refers to / was published. */
  asOf: string;
  confidence: Confidence;
  source: SourceRef;
};

/** One entry in the event ledger. */
export type DamageEvent = {
  id: string;
  strand: Strand;
  title: string;
  /** Human-readable time window, e.g. "17 June – 2 July 2026". */
  window: string;
  region: string;
  /** Prose description; every figure inline here also appears in sources. */
  what: string;
  /** Headline physical metrics for the card's stat row. */
  physical: { label: string; value: string }[];
  /** Euro estimates attached to this event (often none — that is honest). */
  euro: EuroFigure[];
  confidence: Confidence;
  sources: SourceRef[];
};

/** One link in the "why this summer" build-up chain. */
export type ChainLink = {
  id: string;
  /** Short stage label, e.g. "Winter 2025/26". */
  stage: string;
  finding: string;
  /**
   * verified/secondary/snippet as above; 'open' marks a link in the causal
   * story that could NOT be sourced — shown as an open question, never
   * filled in by analogy with earlier years.
   */
  status: Confidence | 'open';
  sources: SourceRef[];
};

/** One summer in the escalation series. */
export type SummerBenchmark = {
  year: number;
  label: string;
  /**
   * Estimated heat-related deaths, where a study exists. `basis` flags the
   * methodology, because the series is NOT homogeneous: 'europe' marks
   * full-Europe epidemiological estimates (Ballester-style), 'cities' a
   * cities-only study covering a fraction of the population (an undercount
   * relative to the series), 'running' a provisional in-season tally of
   * heterogeneous national figures. The chart must not present these as one
   * comparable line.
   */
  heatDeaths: { value: number; lo: number; hi: number; basis: 'europe' | 'cities' | 'running'; note: string } | null;
  note: string;
  confidence: Confidence;
  sources: SourceRef[];
};

/** One row of the preparedness ledger: the gap claim and its steel-man. */
export type PreparednessRow = {
  id: string;
  dimension: string;
  gap: { claim: string; quote?: string; sources: SourceRef[] };
  /** Genuine adaptation progress on the same dimension; null when none was found. */
  steelman: { claim: string; quote?: string; sources: SourceRef[] } | null;
};

/* ----------------------------------------------------------------- helpers */

export const STRANDS: Strand[] = ['heat', 'wildfire', 'water', 'agriculture', 'energy'];

export const STRAND_META: Record<Strand, { label: string; short: string }> = {
  heat: { label: 'Heatwaves & health', short: 'Heat' },
  wildfire: { label: 'Wildfires', short: 'Fire' },
  water: { label: 'Rivers, drought & transport', short: 'Water' },
  agriculture: { label: 'Agriculture & food', short: 'Crops' },
  energy: { label: 'Energy system', short: 'Energy' },
};

export const CONFIDENCE_META: Record<Confidence, { label: string; title: string }> = {
  verified: {
    label: 'source fetched',
    title: 'The primary source page, PDF or API was fetched and the figure read from the retrieved text.',
  },
  secondary: {
    label: 'via secondary',
    title: 'A reputable secondary report was fetched; the primary document was not directly retrieved.',
  },
  snippet: {
    label: 'pending verification',
    title: 'Seen only in search-result snippets — must be verified against the source before quoting.',
  },
};

export const eventsByStrand = (events: DamageEvent[]): Record<Strand, DamageEvent[]> => {
  const out = { heat: [], wildfire: [], water: [], agriculture: [], energy: [] } as Record<Strand, DamageEvent[]>;
  for (const e of events) out[e.strand].push(e);
  return out;
};

export const confidenceTally = (events: DamageEvent[]): Record<Confidence, number> => {
  const out: Record<Confidence, number> = { verified: 0, secondary: 0, snippet: 0 };
  for (const e of events) out[e.confidence] += 1;
  return out;
};

/** All euro figures across the ledger, flattened with their parent event. */
export const allEuroFigures = (events: DamageEvent[]): { event: DamageEvent; fig: EuroFigure }[] =>
  events.flatMap((event) => event.euro.map((fig) => ({ event, fig })));

/**
 * The designed refusal: the ledger's euro figures measure different things
 * (restoration-only vs GDP flow vs property loss vs season forecasts), so a
 * single "summer 2026 cost Europe €X" total would be an invented number.
 * This helper returns the count of distinct scopes as the evidence for that
 * refusal — the UI renders the reason, never a sum.
 */
export const noHonestTotal = (events: DamageEvent[]): { figures: number; scopes: number } => {
  const figs = allEuroFigures(events);
  return { figures: figs.length, scopes: new Set(figs.map((f) => f.fig.scope)).size };
};

export const fmt = (n: number, d = 0): string =>
  n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });

/** "€3.1bn" / "€15.6–19.1bn" from an EuroFigure. */
export const fmtEuro = (f: EuroFigure): string => {
  const one = (v: number) => (v >= 100 ? fmt(v) : fmt(v, v < 10 ? 1 : 0));
  return f.lo === f.hi ? `€${one(f.lo)}bn` : `€${one(f.lo)}–${one(f.hi)}bn`;
};
