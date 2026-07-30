/**
 * EU Policy Hierarchy (beta module M·42) — data model & display metadata.
 *
 * The dataset maps the EU's legal order as a hierarchy: primary law (the
 * Treaties) at the top, then per-policy-domain branches of secondary law
 * (regulations, directives, decisions), tertiary law (delegated and
 * implementing acts), soft law (communications, recommendations) and the
 * supporting document layer (impact assessments, staff working documents).
 *
 * Coverage is deliberately NOT climate-only: the branches span climate &
 * energy, environment, trade, industry & competitiveness, health, security &
 * defence, digital, transport, agriculture and economy/finance/social, so the
 * four cross-cutting lenses (climate · competitiveness · security · health)
 * can be read across the whole acquis.
 *
 * The instrument list itself lives in `instruments.generated.ts` — compiled
 * by one Sonnet agent per domain branch and flagged per-item with
 * `confident: false` where the exact reference/CELEX needs human
 * verification. Every count and grouping on the page is computed from the
 * data, never hard-coded.
 */

/* ============================================================ types */

export type InstrumentType =
  | 'treaty'
  | 'protocol'
  | 'charter'
  | 'international-agreement'
  | 'regulation'
  | 'directive'
  | 'decision'
  | 'delegated-act'
  | 'implementing-act'
  | 'communication'
  | 'recommendation'
  | 'green-paper'
  | 'white-paper'
  | 'impact-assessment'
  | 'staff-working-document'
  | 'interinstitutional-agreement';

/** The four cross-cutting reading lenses. */
export type LensId = 'climate' | 'competitiveness' | 'security' | 'health';

/**
 * The vertical tier of the hierarchy an instrument type belongs to.
 * Primary law binds everything below it; supporting documents bind nothing
 * but explain everything above them.
 */
export type Tier = 'primary' | 'international' | 'secondary' | 'tertiary' | 'soft' | 'supporting';

export interface Instrument {
  id: string;
  /** Common name, e.g. "European Climate Law". */
  title: string;
  /** Official citation, e.g. "Regulation (EU) 2021/1119" or "COM(2019) 640 final". */
  officialRef: string;
  type: InstrumentType;
  /** Year of adoption (of the proposal for pending acts). */
  year: number;
  /** CELEX number where known, e.g. "32021R1119". */
  celex?: string;
  /** Deep link into EUR-Lex (CELEX link, or a EUR-Lex search URL when unverified). */
  eurlexUrl: string;
  /** One plain-language sentence on what the act does. */
  summary: string;
  lenses: LensId[];
  /** Set on delegated/implementing acts and impact assessments: the id of the parent act. */
  parentId?: string;
  /** False when the compiling agent was not certain of the exact reference — treat the link as a pointer, not a citation. */
  confident: boolean;
}

export interface LegalBasis {
  /** e.g. "Art. 191–193 TFEU". */
  article: string;
  description: string;
}

export interface DomainBranch {
  id: string;
  name: string;
  legalBases: LegalBasis[];
  instruments: Instrument[];
}

/* ============================================================ lens metadata */

export const LENS_ORDER: LensId[] = ['climate', 'competitiveness', 'security', 'health'];

export const LENS_META: Record<LensId, { label: string; color: string; bg: string; description: string }> = {
  climate: {
    label: 'Climate',
    color: '#007B6C',
    bg: '#E5F9E7',
    description: 'Decarbonisation, emissions, energy transition and adaptation — the acts that carry the EU’s climate objectives.',
  },
  competitiveness: {
    label: 'Competitiveness',
    color: '#A530B8',
    bg: '#F6E9F8',
    description: 'Industrial capacity, the single market, innovation, cost of doing business and economic strategic autonomy.',
  },
  security: {
    label: 'Security',
    color: '#B83230',
    bg: '#FBEAEA',
    description: 'Defence, resilience, supply security, cyber and borders — the security dimension across the acquis.',
  },
  health: {
    label: 'Health',
    color: '#004B7F',
    bg: '#F2F6F8',
    description: 'Public health, food safety and environmental health, from pandemic preparedness to air quality.',
  },
};

/* ============================================================ tier metadata */

export const TIER_ORDER: Tier[] = ['primary', 'international', 'secondary', 'tertiary', 'soft', 'supporting'];

export const TIER_META: Record<Tier, { label: string; description: string }> = {
  primary: {
    label: 'Primary law',
    description: 'The Treaties, agreed by all Member States. Every EU act below must name its legal basis here.',
  },
  international: {
    label: 'International agreements',
    description: 'Concluded under Art. 216–218 TFEU; binding on the institutions and the Member States, ranking below the Treaties but above secondary law.',
  },
  secondary: {
    label: 'Secondary law',
    description: 'The legislative acts of Art. 288 TFEU — regulations, directives, decisions — normally adopted by Parliament and Council under the ordinary legislative procedure (Art. 294 TFEU).',
  },
  tertiary: {
    label: 'Tertiary law',
    description: 'Commission acts filling in the detail: delegated acts (Art. 290 TFEU) and implementing acts (Art. 291 TFEU, comitology).',
  },
  soft: {
    label: 'Soft law & strategy',
    description: 'Communications, recommendations, green and white papers — not legally binding, but they set the political direction the binding acts follow.',
  },
  supporting: {
    label: 'Supporting documents',
    description: 'Impact assessments and staff working documents — the Better Regulation evidence layer underneath major proposals.',
  },
};

/* ============================================================ type metadata */

export const TYPE_META: Record<InstrumentType, { label: string; abbr: string; tier: Tier; color: string; legend: string }> = {
  treaty: {
    label: 'Treaty', abbr: 'TREATY', tier: 'primary', color: '#2E3E4C',
    legend: 'Founding treaty (TEU, TFEU, Euratom). The constitutional charter of the EU — primary law that all other acts must respect.',
  },
  protocol: {
    label: 'Protocol', abbr: 'PROT', tier: 'primary', color: '#3D5265',
    legend: 'Protocol annexed to the Treaties; same legal rank as the Treaties themselves.',
  },
  charter: {
    label: 'Charter', abbr: 'CFR', tier: 'primary', color: '#3D5265',
    legend: 'The Charter of Fundamental Rights — primary-law rank since Lisbon (Art. 6 TEU).',
  },
  'international-agreement': {
    label: 'International agreement', abbr: 'INT·AGR', tier: 'international', color: '#54728C',
    legend: 'Agreement with third countries or international organisations, concluded by Council decision under Art. 216–218 TFEU (e.g. the Paris Agreement).',
  },
  regulation: {
    label: 'Regulation', abbr: 'REG', tier: 'secondary', color: '#004B7F',
    legend: 'Binding in its entirety and directly applicable in every Member State (Art. 288 TFEU) — no national transposition needed.',
  },
  directive: {
    label: 'Directive', abbr: 'DIR', tier: 'secondary', color: '#0065A4',
    legend: 'Binding as to the result to be achieved; Member States choose form and methods, transposing it into national law by a deadline (Art. 288 TFEU).',
  },
  decision: {
    label: 'Decision', abbr: 'DEC', tier: 'secondary', color: '#6667AB',
    legend: 'Binding in its entirety; where it specifies addressees, binding only on them (Art. 288 TFEU).',
  },
  'delegated-act': {
    label: 'Delegated act', abbr: 'DEL', tier: 'tertiary', color: '#00928F',
    legend: 'Non-legislative Commission act supplementing or amending non-essential elements of a legislative act (Art. 290 TFEU); Parliament and Council can object.',
  },
  'implementing-act': {
    label: 'Implementing act', abbr: 'IMPL', tier: 'tertiary', color: '#007B6C',
    legend: 'Sets uniform conditions for implementing a binding act (Art. 291 TFEU), adopted under Member-State committee control (“comitology”, Reg. 182/2011).',
  },
  communication: {
    label: 'Communication', abbr: 'COM', tier: 'soft', color: '#D97706',
    legend: 'Commission policy paper (COM document) — strategies, action plans, the Green Deal itself. Sets direction; legally binds no one.',
  },
  recommendation: {
    label: 'Recommendation', abbr: 'REC', tier: 'soft', color: '#B8860B',
    legend: 'Recommends action without imposing legal obligation (Art. 288 TFEU: “no binding force”).',
  },
  'green-paper': {
    label: 'Green paper', abbr: 'GREEN', tier: 'soft', color: '#2E8B57',
    legend: 'Consultation document opening a public debate before the Commission decides whether to legislate.',
  },
  'white-paper': {
    label: 'White paper', abbr: 'WHITE', tier: 'soft', color: '#808285',
    legend: 'Concrete proposals for EU action in a policy field, often following a green paper.',
  },
  'impact-assessment': {
    label: 'Impact assessment', abbr: 'IA', tier: 'supporting', color: '#A530B8',
    legend: 'Staff working document analysing the problem, options, costs and benefits behind a major proposal — the Better Regulation evidence base.',
  },
  'staff-working-document': {
    label: 'Staff working document', abbr: 'SWD', tier: 'supporting', color: '#8B5CF6',
    legend: 'Analysis, evaluation or guidance by the Commission services accompanying or underpinning policy (SWD document).',
  },
  'interinstitutional-agreement': {
    label: 'Interinstitutional agreement', abbr: 'IIA', tier: 'primary', color: '#54728C',
    legend: 'Agreement between Parliament, Council and Commission organising how they cooperate in law-making (Art. 295 TFEU), e.g. Better Law-Making 2016.',
  },
};

/* ============================================================ mandate rings */

/**
 * The Board-mandate reading of each instrument, operationalising Art. 3(2)(b)
 * of the European Climate Law ("existing and proposed Union measures" — not
 * "climate measures"): core = the climate architecture itself; adjacent =
 * other-purpose acts with material climate provisions, coherence-assessable;
 * context = shapes the feasibility of climate action only.
 */
export type MandateRelevance = 'core' | 'adjacent' | 'context';

export const RELEVANCE_ORDER: MandateRelevance[] = ['core', 'adjacent', 'context'];

export const RELEVANCE_META: Record<MandateRelevance, { label: string; color: string; bg: string; description: string }> = {
  core: {
    label: 'Core mandate',
    color: '#007B6C',
    bg: '#E5F9E7',
    description: 'The climate architecture itself — squarely inside the Board’s tasks under Art. 3(2) of the Climate Law.',
  },
  adjacent: {
    label: 'Adjacent — coherence-assessable',
    color: '#6667AB',
    bg: '#EFEFF7',
    description: 'Primary purpose elsewhere, but with material climate provisions: assessable for coherence with climate neutrality under Art. 3(2)(b).',
  },
  context: {
    label: 'Context',
    color: '#808285',
    bg: '#F3F4F5',
    description: 'No material climate provisions, but shapes the fiscal, institutional or political feasibility of climate action.',
  },
};

/* ============================================================ legislative status */

/** Where the 2025-26 legislative agenda is moving an instrument. */
export type InstrumentStatus = 'proposal' | 'under-revision' | 'reopened' | 'watch';

export const STATUS_META: Record<InstrumentStatus, { label: string; color: string; description: string }> = {
  proposal: {
    label: 'Proposal',
    color: '#D97706',
    description: 'The act itself is still a Commission proposal — not yet adopted.',
  },
  'under-revision': {
    label: 'Under revision',
    color: '#B83230',
    description: 'Adopted act with a formal amending proposal on the table.',
  },
  reopened: {
    label: 'Reopened',
    color: '#FF6B35',
    description: 'Adopted act reopened by the 2025-26 simplification / omnibus agenda.',
  },
  watch: {
    label: 'Review ahead',
    color: '#54728C',
    description: 'Announced review clause or clearly signalled upcoming revision.',
  },
};

/* ============================================================ dataset */

export { DOMAIN_BRANCHES } from './instruments.generated';
export { MANDATE, STATUS } from './annotations.generated';
export { NAVIGATOR_BRIDGE, SECTOR_BRIDGE } from './bridges.generated';
export { RECOMMENDATIONS } from './recommendations.generated';
