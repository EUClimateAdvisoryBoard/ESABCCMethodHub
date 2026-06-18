'use client';

/**
 * Policy Analysis Cookbook — beta module page.
 *
 * A faithful, digestible visualisation of the internal position paper
 * "Suggestion for a policy analysis cookbook" (CCE5). It is a 1-to-1
 * rendering of that document: the three-phase workflow, the two scoping
 * figures (sector/system options; the first/second/third-order policy
 * onion, re-drawn here as a concentric SVG), Box 1 "A bit of theory",
 * Figure 1 (the three analysis steps matched to the first Policy Gap
 * report's gap categories, re-drawn as a flow), Figure 2 (the policy
 * cycle, adapted from Henstra 2015 and the Better Regulation toolbox), and
 * the Step-2 coherence codebook with its key questions.
 *
 * Nothing here is invented: every label, example and question is taken
 * from the paper. Where the paper shows a figure, it is re-drawn so the
 * same content is searchable and on-brand rather than a flat image.
 */

import type { ReactNode } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

/* --------------------------------------------------------------- content
 * All strings below are quoted/condensed straight from the paper.
 * ----------------------------------------------------------------------- */

type Step = { id: string; title: string; body: string };
type Phase = {
  num: string;
  title: string;
  short: string;
  tint: string;
  bar: string;
  ring: string;
  steps: Step[];
};

const PHASES: Phase[] = [
  {
    num: '1',
    title: 'Preparatory steps',
    short: 'Prepare the policy set',
    tint: 'bg-surface-blue',
    bar: 'bg-primary',
    ring: 'ring-primary',
    steps: [
      {
        id: '1.1',
        title: 'Agreeing on sectors or systems to be covered',
        body: 'For a Policy Gap report covering both mitigation and adaptation, a few options are identified (see the three options below).',
      },
      {
        id: '1.2',
        title: 'Identifying key areas of synergies and trade-offs between mitigation and adaptation',
        body: 'A scoping review of synergies and trade-offs — at the big-picture level (for progress and EU climate goals) and per sector. The output can be a comparative table from a literature review, e.g. comparing NECPs and NAPs/SAPs (national/sectoral adaptation plans), which helps refine the structure in step 1.1.',
      },
      {
        id: '1.3',
        title: 'Identifying relevant policies and classifying them',
        body: 'Done jointly in the policy navigator tool of the MethodHub: identify core (first-order) climate policies and their instruments, then key sectoral policy portfolios, then supporting policies. Classify each policy and check the pre-assigned tags (sector, type of policy, relation to adaptation/mitigation). Define cut-offs for when a policy is less relevant to include.',
      },
      {
        id: '1.4',
        title: 'Linking policies to the indicator assessment framework and defining assumptions about attribution',
        body: 'Assign assessment-framework indicators to the identified policies by creating a logic flow — the Better Regulation toolbox calls this the "logic of intervention": this policy responds to this problem and leads to this change we can observe and measure (stating causal assumptions). Identify "negative spaces" where a crucial indicator has no supporting policy — bearing in mind EU competencies and added value.',
      },
      {
        id: '1.5',
        title: 'Iterative steps: insights from literature and from indicator findings',
        body: 'As more scientific papers are read and the indicator analysis progresses, collect insights on whether policies deliver at the pace and scale needed for the climate objectives — input for the policy coherence analysis.',
      },
    ],
  },
  {
    num: '2',
    title: 'Policy (coherence) analysis',
    short: 'Analyse coherence',
    tint: 'bg-surface-teal',
    bar: 'bg-secondary',
    ring: 'ring-secondary',
    steps: [
      {
        id: '2.1',
        title: 'Creating a framework for analysing the dimensions of policy coherence',
        body: 'A comprehensive framework covers problem analysis, coherence and evaluation (steps 1–3 in Figure 1). The first Policy Gap report categories — policy gap, ambition gap, policy inconsistency and implementation gap — largely match this structure but need some refining, a more systematic identification of policies, and better integration with the indicator data.',
      },
      {
        id: '2.2',
        title: 'Piloting the framework on a subset of policies',
        body: 'Finetuning the codebook is iterative. Pilot it jointly on a few policies — sitting together, going through a document and discussing where each piece of text belongs — to rearrange, add, group or delete codes. For example, one first-order and one second-order policy.',
      },
      {
        id: '2.3',
        title: 'Analysis of the rest of the policy dataset (and quality controls)',
        body: 'Divide the reading and coding of the remaining documents. Half-way through, run a quality check where someone else re-codes some of the same documents to check consistency; repeat at the end and calculate an inter-coder agreement score (percentage agreement on using a given code per document).',
      },
    ],
  },
  {
    num: '3',
    title: 'Integration of analyses',
    short: 'Integrate findings',
    tint: 'bg-surface-yellow',
    bar: 'bg-accent-orange',
    ring: 'ring-accent-orange',
    steps: [
      {
        id: '3.1',
        title: 'Integrating findings from the policy analysis and the indicator analysis',
        body: 'Once all documents are coded, the text insights can be integrated with quantitative data — e.g. overall internal and external coherence scores per policy or sector, as part of each sector chapter’s overview. Other ways to integrate are discussed under Policy Evaluation (Step 3).',
      },
    ],
  },
];

/* ---- Figure: sectors / systems options (step 1.1) -------------------- */

const OPTIONS = [
  {
    n: '1',
    head: 'Current mitigation structure with some considerations of how to make sectors more resilient.',
    groups: [
      {
        title: 'Climate resilience of emission sectors',
        accent: 'primary',
        items: ['Energy +', 'Industry +', 'Buildings +', 'Transport +', 'Agriculture +', 'LULUCF +'],
      },
    ],
  },
  {
    n: '2',
    head: 'Parallel structures reflecting emission sectors and main adaptation systems, perhaps with a framing chapter on synergies and trade-offs between mitigation and adaptation.',
    groups: [
      {
        title: 'Part A · Emission sectors',
        accent: 'primary',
        items: ['Energy', 'Industry', 'Buildings', 'Transport', 'Agriculture', 'LULUCF'],
      },
      {
        title: 'Part B · Recurring adaptation systems',
        accent: 'orange',
        items: [
          'Energy',
          'Built environment / cities, territories and infrastructure',
          'Health',
          'Food',
          'Ecosystems and biodiversity',
          'Marine and coastal ecosystems',
          'Poverty and livelihoods',
          'Water',
        ],
      },
    ],
  },
  {
    n: '3',
    head: 'Keep option 1 but change headers to a system-level equivalent and add a few selected adaptation sections, focusing on synergies and trade-offs.',
    groups: [
      { title: 'Energy system', accent: 'teal', items: ['Energy', 'Resilience of infrastructure', 'Energy affordability'] },
      { title: 'Economy', accent: 'teal', items: ['Industry', 'Livelihoods and poverty', 'Water resources'] },
      {
        title: 'Built environment',
        accent: 'teal',
        items: ['Buildings', 'Critical infrastructure (including health)', 'Urban and spatial planning', 'Cultural heritage sites'],
      },
      { title: 'Transport system', accent: 'teal', items: ['Transport', 'Mobility'] },
      { title: 'Agri-food system', accent: 'teal', items: ['Agriculture', 'Fisheries', 'Food security'] },
      { title: 'Natural systems', accent: 'teal', items: ['Land use and land use change', 'Forestry', 'Marine ecosystems'] },
    ],
  },
];

/* ---- Figure: first / second / third-order policies (step 1.3) -------- */

type Order = {
  order: string;
  sub: string;
  ring: string;
  examples: string;
  card: string;
  dot: string;
  swatch: string;
};

const ORDERS: Order[] = [
  {
    order: 'First order',
    sub: 'Climate-focus policies and instruments',
    ring: 'Framework climate policies · Climate policy instruments',
    examples: 'European Climate Law; EU Integrated Resilience Framework; EU ETS (1 & 2); Effort Sharing; LULUCF; EU Covenant of Mayors',
    card: 'border-secondary bg-surface-teal',
    dot: 'bg-secondary',
    swatch: '#007B6C',
  },
  {
    order: 'Second order',
    sub: 'Pre-existing sectors where climate objectives have been mainstreamed',
    ring: 'Sectoral policy portfolios',
    examples: 'CO₂ standards for vehicles; Renewable Energy Directive; F-gas regulation; CAP; Union Preparedness Mechanism; Water regulation framework',
    card: 'border-primary-lighter bg-surface-blue',
    dot: 'bg-primary-light',
    swatch: '#478EA5',
  },
  {
    order: 'Third order',
    sub: 'Policies that enable progress and/or systemic changes',
    ring: 'Supporting policies',
    examples: 'Better Regulation; MFF; Horizon 2020 and LIFE programme; governance regulation; Cohesion Fund; ERDF; InvestEU',
    card: 'border-accent-orange bg-surface-yellow',
    dot: 'bg-accent-orange',
    swatch: '#FF9933',
  },
];

/* ---- Figure 1: three steps matched to gap categories ----------------- */

type Fig1Row = {
  step: string;
  group?: string;
  method: string;
  methodNote: string;
  icon: 'globe-policy' | 'policy-policy' | 'policy-stack' | 'policy-globe';
  gaps: string[];
};

const FIGURE1: Fig1Row[] = [
  {
    step: '1',
    method: 'Problem analysis',
    methodNote: 'Ensuring a widely accepted and comprehensive understanding of the policy problem.',
    icon: 'globe-policy',
    gaps: [
      'Policy gap: no policies in place to address the required change.',
      'Ambition gap: the policies in place are not ambitious enough to deliver the required change.',
    ],
  },
  {
    step: '2a',
    group: 'Policy coherence',
    method: 'External coherence',
    methodNote: 'Across relevant sectoral policies.',
    icon: 'policy-policy',
    gaps: ['Policy inconsistencies: policies provide counterproductive incentives.'],
  },
  {
    step: '2b',
    group: 'Policy coherence',
    method: 'Internal coherence',
    methodNote: 'Between policy goals and delivery mechanisms (e.g. instruments).',
    icon: 'policy-stack',
    gaps: ['Ambition gap / intervention logic is not sound and up-to-date.'],
  },
  {
    step: '3',
    method: 'Policy evaluation',
    methodNote: 'Measuring policy change and policy outcomes (ex post).',
    icon: 'policy-globe',
    gaps: ['Implementation gap: policies are not implemented adequately / are not delivering at the required pace and scale.'],
  },
];

/* ---- Figure 2: the policy cycle -------------------------------------- */

type CycleBox = { label: string; note: string };
const CYCLE_ZONES: { key: string; title: string; sub: string; cls: string; boxes: CycleBox[] }[] = [
  {
    key: 'integration',
    title: 'Policy integration / mainstreaming',
    sub: 'Climate objectives pursued across sectoral policies',
    cls: 'border-secondary bg-surface-teal',
    boxes: [
      { label: 'Policy inputs', note: 'Knowledge, resources, actors that feed into policy making' },
      { label: 'Policy goals', note: 'Strategic targets defined by policy actors (general level)' },
      { label: 'Policy processes', note: 'e.g. sectoral emission reduction goals mandated' },
    ],
  },
  {
    key: 'coherence',
    title: 'Policy coherence',
    sub: 'Internal (within a domain) and external (across policies) — a coherence / fitness check',
    cls: 'border-accent-orange bg-surface-orange',
    boxes: [
      { label: 'Policy outputs — delivery mechanisms', note: 'e.g. creation of ETS; climate-proofing checks' },
      { label: 'Policy implementation', note: 'e.g. execution and management of ETS' },
    ],
  },
  {
    key: 'evaluation',
    title: 'Policy evaluation',
    sub: 'Judging the outcomes and impacts actually achieved',
    cls: 'border-accent-yellow bg-surface-yellow',
    boxes: [{ label: 'Outcomes and impacts', note: 'e.g. % change of EV purchases; % GHG emission reduction by X' }],
  },
];

const CYCLE_CONCEPTS = [
  ['Policy inputs', 'the knowledge, resources, actors that feed into policy making'],
  ['Policy processes', 'the procedures and institutional arrangements that shape policy making'],
  ['Policy goals', 'strategic targets defined by policy actors (at a general level)'],
  ['Policy outputs', 'the decisions on objectives and instruments meant to achieve policy goals'],
  ['Policy implementation', 'the arrangements by authorities and other actors for putting policy instruments into action'],
  ['Outcomes', 'the behavioural changes and responses of actors in society, such as industry or households'],
  ['Impacts', 'the environmental and other effects resulting from the outcomes'],
];

/* ---- Step 2 codebook: internal coherence ----------------------------- */

const CODEBOOK = [
  {
    group: 'Coherence between mitigation and adaptation goals',
    codes: ['Not linked', 'Trade-offs', 'Minimum coherence (DNSH)', 'Substantive coherence', 'Synergies'],
  },
  {
    group: 'Coherence with delivery mechanisms',
    codes: [
      'Coherence in discourse (across articles)',
      'Between targets and instruments',
      'Between targets and resources',
      'Between the target and the level / channel of intervention',
      'Clearly assigned roles and responsibilities for target',
    ],
  },
];

const STEP1_QUESTIONS = [
  'Is the problem sufficiently addressed by existing policies? Is the definition of "success" of a policy sound (e.g. its intervention logic)? Are there policy voids that the EU could address?',
  'Has the problem changed since the policies were put in place (e.g. geopolitical risks jeopardising global climate goals and Europe’s pace and scale to deliver)?',
];

const STEP2_QUESTIONS = [
  'To what extent are the various elements of the intervention coherent with one another? Does it comply with "do no significant harm"?',
  'To what extent have the various elements generated synergies and/or compensated possible trade-offs among them?',
  'To what extent is the intervention coherent with wider EU policies and priorities (e.g. environmental integrity, fairness, competitiveness, security)?',
];

const STEP2_ADAPTATION = [
  'Are climate risks assessed? Are they based on a range of scenarios?',
  'Are adaptation options and their limits identified, including transformational options? Are these prioritised?',
  'Are there clearly assigned roles and responsibilities?',
  'Maladaptation: does the policy risk increasing vulnerability or risk onto other populations (spillovers)? Can it limit future choices (lock-ins, erosion of resources/capacities)? Does it increase GHG emissions?',
];

/* --------------------------------------------------------------- helpers */

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[11px] uppercase tracking-[0.12em] text-tertiary mb-2">{children}</div>;
}

const ACCENT_TEXT: Record<string, string> = {
  primary: 'text-primary-dark',
  teal: 'text-secondary-dark',
  orange: 'text-accent-orange',
};

/* ------------------------------------------------------------------ page */

export default function PolicyAnalysisCookbookPage() {
  return (
    <>
      <SiteHeader />
      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ---- intro ---- */}
        <section className="mb-6">
          <SectionLabel>Beta module · Method walkthrough</SectionLabel>
          <h1 className="text-2xl sm:text-3xl font-bold text-tertiary-dark">Policy Analysis Cookbook</h1>
          <p className="mt-2 text-sm sm:text-base text-tertiary max-w-3xl">
            A digestible, one-to-one visualisation of the position paper{' '}
            <em>&ldquo;Suggestion for a policy analysis cookbook&rdquo;</em> — a step-by-step recipe for
            analysing EU climate policies for a Policy Gap report that covers both mitigation and
            adaptation.
          </p>
        </section>

        {/* ---- phase stepper ---- */}
        <section className="mb-10">
          <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-0">
            {PHASES.map((p, i) => (
              <div key={p.num} className="flex items-stretch flex-1">
                <div className={`flex-1 rounded-lg border border-grey-200 ${p.tint} px-4 py-3`}>
                  <div className="flex items-center gap-2">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-white text-sm font-bold ${p.bar}`}>
                      {p.num}
                    </span>
                    <div>
                      <div className="text-[13px] font-bold text-tertiary-dark leading-tight">{p.short}</div>
                      <div className="text-[11px] text-tertiary leading-tight">{p.title}</div>
                    </div>
                  </div>
                </div>
                {i < PHASES.length - 1 && (
                  <div className="hidden sm:flex items-center px-1 text-grey-400 text-xl">&rarr;</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ---- overview roadmap ---- */}
        <section className="mb-12">
          <SectionLabel>Overview of steps</SectionLabel>
          <div className="grid gap-3 lg:grid-cols-3">
            {PHASES.map((p) => (
              <div key={p.num} className={`rounded-lg border border-grey-200 overflow-hidden ${p.tint}`}>
                <div className="flex items-center gap-3 px-4 py-3 bg-white/60 border-b border-grey-200">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-white text-sm font-bold ${p.bar}`}>
                    {p.num}
                  </span>
                  <h2 className="text-sm font-bold text-tertiary-dark">{p.title}</h2>
                </div>
                <ol className="divide-y divide-grey-200">
                  {p.steps.map((s) => (
                    <li key={s.id} className="px-4 py-3">
                      <div className="flex gap-2">
                        <span className={`text-[11px] font-mono font-bold text-white ${p.bar} rounded px-1.5 py-0.5 h-fit shrink-0`}>
                          {s.id}
                        </span>
                        <div>
                          <div className="text-[13px] font-semibold text-tertiary-dark leading-snug">{s.title}</div>
                          <p className="mt-1 text-[12px] text-tertiary leading-relaxed">{s.body}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* ---- step 1.1: sector / system options ---- */}
        <section className="mb-12">
          <SectionLabel>Step 1.1 · Sectors or systems to be covered</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-3">Three options for structuring the report</h2>
          <div className="grid gap-3 md:grid-cols-3 items-start">
            {OPTIONS.map((o) => (
              <div key={o.n} className="rounded-lg border border-grey-200 bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-grey-50 border-b border-grey-200">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tertiary text-white text-[12px] font-bold">
                    {o.n}
                  </span>
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-tertiary">Option {o.n}</span>
                </div>
                <div className="p-4">
                  <p className="text-[12px] text-tertiary mb-3 leading-relaxed">{o.head}</p>
                  <div className="space-y-3">
                    {o.groups.map((g) => (
                      <div key={g.title}>
                        <div className={`text-[12px] font-bold mb-1.5 ${ACCENT_TEXT[g.accent]}`}>{g.title}</div>
                        <ul className="flex flex-wrap gap-1.5">
                          {g.items.map((it) => (
                            <li
                              key={it}
                              className="text-[12px] text-tertiary-dark bg-grey-50 border border-grey-200 rounded px-2 py-1"
                            >
                              {it}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---- step 1.3: policy onion ---- */}
        <section className="mb-12">
          <SectionLabel>Step 1.3 · Identifying and classifying policies</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-1">
            The policy &ldquo;onion&rdquo;: first, second and third order
          </h2>
          <p className="text-[13px] text-tertiary mb-5 max-w-3xl">
            In the policy navigator, identify the core climate policies and instruments, then the
            sectoral portfolios that mainstream them, then the supporting policies that enable progress.
          </p>

          <div className="grid gap-6 lg:grid-cols-[360px_1fr] items-center">
            <PolicyOnion />
            <div className="space-y-3">
              {ORDERS.map((o) => (
                <div key={o.order} className={`rounded-lg border-l-4 ${o.card} border border-grey-200 p-4`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${o.dot}`} />
                    <span className="text-sm font-bold text-tertiary-dark">{o.order}</span>
                    <span className="text-[13px] text-tertiary">— {o.sub}</span>
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-wide text-tertiary-light">{o.ring}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {o.examples.split('; ').map((e) => (
                      <span
                        key={e}
                        className="inline-block rounded border border-grey-200 bg-white px-2 py-1 text-[12px] text-tertiary-dark"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Box 1: a bit of theory ---- */}
        <section className="mb-12">
          <div className="rounded-lg border border-primary-lighter bg-surface-blue p-5">
            <div className="text-[12px] font-bold uppercase tracking-wide text-primary-dark mb-2">Box 1 · A bit of theory</div>
            <div className="grid gap-4 md:grid-cols-2 text-[13px] text-tertiary-dark leading-relaxed">
              <p>
                Climate objectives have to be retrofitted into existing sectoral policies (transport,
                industry, agriculture) while new policies must account for climate objectives from their
                design (&ldquo;climate-proofing&rdquo;). Aligning goals from different policy domains and
                making them operational is called <strong>policy integration</strong> (or mainstreaming).
              </p>
              <p>
                Because sectors&rsquo; goals follow their own interests and internal logic, mainstreaming
                climate policies onto other sectors may produce inconsistencies that jeopardise the
                intended outcomes. Policies are therefore checked for <strong>coherence</strong> — in its
                narrowest sense, avoiding conflicting outcomes (the &lsquo;do no significant harm&rsquo;
                principle); in a broader sense, the &lsquo;synergic and systematic support towards the
                achievement of common objectives within and across individual policies&rsquo; (Henstra,
                2015).
              </p>
            </div>
          </div>
        </section>

        {/* ---- Figure 1: three steps matched to gap categories ---- */}
        <section className="mb-12">
          <SectionLabel>Figure 1 · The analysis framework</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-3">
            Three analysis steps, matched to the first Policy Gap report&rsquo;s gap categories
          </h2>
          <div className="grid grid-cols-2 gap-2 mb-2 text-[11px] font-semibold uppercase tracking-wide">
            <div className="text-primary-dark">From the literature &amp; Better Regulation</div>
            <div className="text-accent-orange">Match to first Policy Gap report categories</div>
          </div>
          <div className="space-y-2">
            {FIGURE1.map((r, i) => {
              const inGroup = !!r.group;
              const groupStart = inGroup && (i === 0 || FIGURE1[i - 1].group !== r.group);
              return (
                <div key={r.step} className="relative">
                  {groupStart && (
                    <div className="ml-9 mb-1 text-[11px] font-bold uppercase tracking-wide text-tertiary">
                      Step 2 · {r.group}
                    </div>
                  )}
                  <div className={`flex items-stretch gap-2 ${inGroup ? 'sm:pl-6' : ''}`}>
                    {inGroup && (
                      <span className="hidden sm:block w-1 rounded bg-secondary-lighter shrink-0" aria-hidden />
                    )}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-full bg-accent-orange text-white text-[12px] font-bold">
                      {r.step}
                    </span>
                    <div className="flex-1 grid sm:grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <div className="rounded-lg border border-grey-200 border-l-4 border-l-primary bg-white px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <FlowIcon kind={r.icon} />
                          <div className="text-[13px] font-bold text-primary-dark">{r.method}</div>
                        </div>
                        <div className="text-[12px] text-tertiary mt-0.5">{r.methodNote}</div>
                      </div>
                      <div className="hidden sm:block text-grey-400 text-lg text-center">&rarr;</div>
                      <div className="rounded-lg border border-accent-orange bg-surface-orange px-3 py-2.5">
                        <ul className="space-y-1">
                          {r.gaps.map((g) => (
                            <li key={g} className="text-[12px] text-tertiary-dark leading-snug">{g}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-tertiary italic">
            Step 1 = problem analysis · Step 2 = policy coherence (external + internal) · Step 3 = policy
            evaluation. The right column lists the gaps used in the first Policy Gap report.
          </p>
        </section>

        {/* ---- Figure 2: the policy cycle ---- */}
        <section className="mb-12">
          <SectionLabel>Figure 2 · The policy cycle</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-1">
            Where integration, coherence and evaluation sit on the policy cycle
          </h2>
          <p className="text-[12px] text-tertiary italic mb-4">
            Adapted from Henstra, 2015 and the Better Regulation toolbox, 2025.
          </p>

          <div className="flex flex-col lg:flex-row items-stretch gap-2 mb-4">
            {CYCLE_ZONES.map((z, zi) => (
              <div key={z.key} className="flex items-stretch gap-2 flex-1">
                <div className={`flex-1 rounded-lg border ${z.cls} p-3`}>
                  <div className="text-[12px] font-bold text-tertiary-dark leading-snug">{z.title}</div>
                  <div className="text-[11px] text-tertiary leading-snug mb-2.5">{z.sub}</div>
                  <div className="space-y-1.5">
                    {z.boxes.map((b, bi) => (
                      <div key={b.label}>
                        <div className="rounded border border-grey-300 bg-white px-2.5 py-1.5">
                          <div className="text-[12px] font-semibold text-tertiary-dark leading-snug">{b.label}</div>
                          <div className="text-[11px] text-tertiary leading-snug">{b.note}</div>
                        </div>
                        {bi < z.boxes.length - 1 && (
                          <div className="text-center text-grey-400 text-xs leading-none mt-0.5">&darr;</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {zi < CYCLE_ZONES.length - 1 && (
                  <div className="hidden lg:flex items-center text-grey-400 text-xl">&rarr;</div>
                )}
              </div>
            ))}
          </div>

          <div className="rounded border border-grey-200 bg-grey-50 p-3 text-[12px] text-tertiary mb-3">
            <span className="font-semibold text-tertiary-dark">Cross-cutting:</span>{' '}
            <strong>enablers</strong> (data, innovation, infrastructure, skilled workforce),{' '}
            <strong>unforeseen events / confounders</strong> (e.g. a drop in emissions due to the COVID
            crisis), and the wider <strong>contextual factors</strong>.
          </div>

          <details className="rounded border border-grey-200 bg-white">
            <summary className="cursor-pointer px-3 py-2 text-[12px] font-semibold text-tertiary-dark">
              Basic concepts in the figure
            </summary>
            <dl className="px-4 pb-3 pt-1 grid gap-1.5 sm:grid-cols-2 text-[12px]">
              {CYCLE_CONCEPTS.map(([term, def]) => (
                <div key={term} className="flex gap-2">
                  <dt className="font-semibold text-tertiary-dark whitespace-nowrap">{term}</dt>
                  <dd className="text-tertiary">— {def}</dd>
                </div>
              ))}
            </dl>
          </details>
        </section>

        {/* ---- Step 1: problem analysis questions ---- */}
        <section className="mb-8">
          <SectionLabel>Step 1 · Problem analysis</SectionLabel>
          <p className="text-[13px] text-tertiary mb-3 max-w-3xl">
            Matches the identification of needs in the needs–gaps–fixes approach; helps structure the
            policy and ambition gaps. Answered using scientific literature and specialised data / grey
            literature. Examples of key questions:
          </p>
          <QuestionList items={STEP1_QUESTIONS} accent="primary" />
        </section>

        {/* ---- Step 2: coherence codebook ---- */}
        <section className="mb-8">
          <SectionLabel>Step 2 · Policy coherence analysis</SectionLabel>
          <p className="text-[13px] text-tertiary mb-4 max-w-3xl">
            Export the classified policy documents from the policy navigator to the content analysis
            tool, then build a <strong>codebook</strong> of a-priori categories (codes/tags) linked to
            the text that answers the key questions. <em>Scope:</em> internal coherence on first-order
            policies; external coherence on second-order (sectoral) policies.
          </p>

          <div className="rounded-lg border border-secondary bg-surface-teal p-4 mb-5">
            <div className="text-[11px] uppercase tracking-wide text-secondary-dark font-bold mb-3">
              Codebook · Internal coherence
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {CODEBOOK.map((c) => (
                <div key={c.group} className="rounded-lg border border-grey-200 bg-white p-4">
                  <div className="text-[13px] font-bold text-tertiary-dark mb-2">{c.group}</div>
                  <ul className="flex flex-wrap gap-1.5">
                    {c.codes.map((code) => (
                      <li
                        key={code}
                        className="text-[12px] text-tertiary-dark bg-grey-50 border border-grey-200 rounded-full px-2.5 py-1"
                      >
                        {code}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-[12px] font-bold text-tertiary-dark mb-2">Key coherence questions</div>
              <QuestionList items={STEP2_QUESTIONS} accent="secondary" />
            </div>
            <div>
              <div className="text-[12px] font-bold text-tertiary-dark mb-2">
                Trade-offs &amp; synergies between mitigation and adaptation
              </div>
              <QuestionList items={STEP2_ADAPTATION} accent="orange" />
            </div>
          </div>
        </section>

        {/* ---- Step 3: evaluation ---- */}
        <section className="mb-12">
          <SectionLabel>Step 3 · Policy evaluation</SectionLabel>
          <div className="rounded-lg border border-grey-200 bg-grey-50 p-5 max-w-3xl">
            <p className="text-[13px] text-tertiary-dark leading-relaxed">
              Evaluation is a <strong>retrospective</strong> analysis, possible once implementation data
              exists (at least 3 years of M&amp;E data for EU interventions). It judges how well the
              intervention has performed and <em>why</em>; how much change can be attributed to the EU
              intervention; and whether that change meets the original expectations.
            </p>
            <p className="mt-2 text-[13px] text-tertiary-dark leading-relaxed">
              This is the entry point to connect the indicator data with the policy analysis: using the
              intervention logic to explain trends from the progress assessment, add an indication of
              strong–weak attribution from policies to progress, and add caveats to expectations of
              progress toward the 2040 / 2050 targets.
            </p>
          </div>
        </section>

        {/* ---- source note ---- */}
        <section className="mb-4">
          <p className="text-[11px] text-tertiary border-t border-grey-200 pt-4">
            Faithful rendering of the internal position paper{' '}
            <em>&ldquo;Suggestion for a policy analysis cookbook&rdquo;</em>. All labels, examples and
            questions are taken from the document; the two scoping figures, Figure 1 and Figure 2 are
            re-drawn from the paper. Figure references: Henstra (2015); Better Regulation toolbox (2025).
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

/* --------------------------------------------------------- sub-components */

/** Concentric "onion" of the first / second / third-order policy nesting. */
function PolicyOnion() {
  const cx = 180;
  return (
    <svg viewBox="0 0 360 360" className="w-full max-w-[360px] mx-auto" role="img" aria-label="Policy onion: nested first, second and third-order policies">
      {/* third order — supporting policies */}
      <circle cx={cx} cy={185} r={170} fill="#FFF8DB" stroke="#FF9933" strokeWidth={1.5} />
      <text x={cx} y={36} textAnchor="middle" className="fill-accent-orange" fontSize={13} fontWeight={700}>
        Supporting policies
      </text>
      {/* second order — sectoral policy portfolios */}
      <circle cx={cx} cy={205} r={123} fill="#EAF1F6" stroke="#478EA5" strokeWidth={1.5} />
      <text x={cx} y={100} textAnchor="middle" className="fill-primary-light" fontSize={12.5} fontWeight={700}>
        Sectoral policy portfolios
      </text>
      {/* numbered portfolio nodes */}
      {[0, 1, 2, 3, 4].map((i) => {
        const x = 116 + i * 32;
        return (
          <g key={i}>
            <circle cx={x} cy={316} r={12} fill="#fff" stroke="#478EA5" strokeWidth={1.5} />
            <text x={x} y={320} textAnchor="middle" className="fill-primary-light" fontSize={11} fontWeight={700}>
              {i + 1}
            </text>
          </g>
        );
      })}
      {/* first order — climate policy instruments */}
      <circle cx={cx} cy={230} r={74} fill="#CDE5E2" stroke="#007B6C" strokeWidth={1.5} />
      <text x={cx} y={196} textAnchor="middle" className="fill-secondary-dark" fontSize={12} fontWeight={700}>
        Climate policy
      </text>
      <text x={cx} y={211} textAnchor="middle" className="fill-secondary-dark" fontSize={12} fontWeight={700}>
        instruments
      </text>
      {/* core — framework climate policies */}
      <circle cx={cx} cy={258} r={42} fill="#007B6C" />
      <text x={cx} y={252} textAnchor="middle" fill="#fff" fontSize={10} fontWeight={700}>
        Framework
      </text>
      <text x={cx} y={264} textAnchor="middle" fill="#fff" fontSize={10} fontWeight={700}>
        climate
      </text>
      <text x={cx} y={276} textAnchor="middle" fill="#fff" fontSize={10} fontWeight={700}>
        policies
      </text>
    </svg>
  );
}

/** Small policy-box / globe motifs used in the Figure 1 flow. */
function FlowIcon({ kind }: { kind: Fig1Row['icon'] }) {
  const box = (x: number, y: number) => (
    <rect x={x} y={y} width={9} height={11} rx={1} fill="#FF9933" />
  );
  const globe = (x: number, y: number) => (
    <g>
      <circle cx={x} cy={y} r={5.5} fill="none" stroke="#3D5265" strokeWidth={1.2} />
      <path d={`M${x - 5.5} ${y} h11 M${x} ${y - 5.5} v11 M${x - 4} ${y - 3.2} q4 3.2 8 0 M${x - 4} ${y + 3.2} q4 -3.2 8 0`} fill="none" stroke="#3D5265" strokeWidth={0.9} />
    </g>
  );
  return (
    <svg width={30} height={16} viewBox="0 0 30 16" aria-hidden className="shrink-0">
      {kind === 'globe-policy' && (<>{globe(6, 8)}{box(17, 2)}</>)}
      {kind === 'policy-policy' && (<>{box(4, 2)}{box(17, 2)}</>)}
      {kind === 'policy-stack' && (<>{box(6, 4)}{box(11, 1)}</>)}
      {kind === 'policy-globe' && (<>{box(2, 2)}{globe(24, 8)}</>)}
    </svg>
  );
}

function QuestionList({ items, accent }: { items: string[]; accent: 'primary' | 'secondary' | 'orange' }) {
  const dot =
    accent === 'primary' ? 'bg-primary' : accent === 'secondary' ? 'bg-secondary' : 'bg-accent-orange';
  return (
    <ul className="space-y-2">
      {items.map((q) => (
        <li key={q} className="flex gap-2 text-[12px] text-tertiary-dark leading-relaxed">
          <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${dot} shrink-0`} />
          <span>{q}</span>
        </li>
      ))}
    </ul>
  );
}
