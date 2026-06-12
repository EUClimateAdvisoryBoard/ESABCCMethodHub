'use client';

/**
 * Policy Coherence 2.0 — user guide.
 *
 * A plain-language walkthrough of the block-level coherence module: what
 * each surface shows, the intended workflow (read stats → triage findings →
 * drill into blocks → run the ML pass → persist / export), and a legend for
 * every badge and chip. The interactive guided tour on the module page
 * covers the same ground in-place; this page is the reference version.
 */

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

function StepHeading({ n, color, children }: { n: number; color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className={`w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center ${color}`}>
        {n}
      </span>
      <h2 className="text-xl font-bold text-tertiary-dark">{children}</h2>
    </div>
  );
}

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-block text-[10px] border rounded px-1.5 py-0.5 align-middle ${className}`}>
      {children}
    </span>
  );
}

export default function PolicyCoherence2GuidePage() {
  return (
    <>
      <SiteHeader />
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Link
          href="/beta/policy-coherence-2"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-secondary hover:text-primary transition mb-3"
        >
          Back to Policy Coherence 2.0
        </Link>
        <h1 className="text-3xl font-bold text-tertiary-dark mb-2">
          How to use Policy Coherence 2.0
        </h1>
        <p className="text-tertiary mb-4 text-base leading-relaxed">
          The module treats every sentence of every policy text as a <strong>piece of
          data</strong> — a puzzle piece with a stable id, a structural path and extracted
          claims. The dark &ldquo;data wall&rdquo; shows all ~2,600 pieces at once; the four
          coherence lenses test whether they fit together, and where they don&apos;t, a
          finding marks the misfit. Prefer learning in place? Hit{' '}
          <strong>&ldquo;Guided tour&rdquo;</strong> at the top of the module page — it walks
          through every section live.
        </p>
        <p className="text-tertiary mb-10 text-sm leading-relaxed">
          The 30-second version: <strong>read the hero counters → scan the data wall for
          red/amber tiles → click a tile to inspect the block → triage the misfits (high
          severity first) → run the ML pass for discovered contradictions and trade-offs →
          write everything to the database and export JSONL</strong>. Details below.
        </p>

        <div className="space-y-10">
          <section>
            <StepHeading n={1} color="bg-primary/10 text-primary">Understand the four gap types</StepHeading>
            <div className="ml-11 space-y-3 text-sm text-tertiary leading-relaxed">
              <p>
                The module applies the Advisory Board&apos;s consistency framework (assessment
                report §2.1) at block level. Every signal the blocks reveal is classified as
                one of four gap types, defined as in the report:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Policy gaps</strong> — no EU policies in place to drive the required change in a specific mitigation lever or enabling condition (detected via a lever-coverage scan over the whole corpus);</li>
                <li><strong>Policy inconsistencies</strong> — policies providing incentives that counteract the required change (counteracting goal interactions, conflicting target blocks, discovered contradictions);</li>
                <li><strong>Ambition gaps</strong> — policies in place, but objectives or delivery mechanisms insufficient (goals without means, weak deontics, derogation clusters, missing MRV);</li>
                <li><strong>Implementation gaps</strong> — ambitious policies in place, but delivery ineffective so far (measured pace below the required pace while the machinery exists; violated design assumptions).</li>
              </ul>
              <p>
                Every gap finding carries a <strong>numbered reasoning chain</strong> — from
                required change, through block-level evidence, to conclusion — and cites the
                exact sentence blocks it rests on.
              </p>
            </div>
          </section>

          <section>
            <StepHeading n={2} color="bg-secondary/10 text-secondary">Read the hero and command bar</StepHeading>
            <div className="ml-11 space-y-3 text-sm text-tertiary leading-relaxed">
              <p>
                The hero counters size the corpus: how many <strong>acts</strong> ship with
                real text, the <strong>text blocks</strong> and <strong>data blocks</strong>{' '}
                (sentence units) they split into, the extracted <strong>claims</strong>, how
                many blocks are <strong>flagged</strong>, and the <strong>misfits</strong>{' '}
                (findings) count. The <code className="font-mono text-[12px]">corpus</code>{' '}
                hash identifies the exact text snapshot — same corpus, same results, always.
              </p>
              <p>
                In the command bar, <strong>&ldquo;Write run to database&rdquo;</strong>{' '}
                persists the whole run (every block, claim and finding) to Supabase with
                stable ids, so blocks stay referenceable forever.{' '}
                <strong>&ldquo;JSONL export&rdquo;</strong> gives you the same substrate as
                one machine-readable file for external pipelines.
              </p>
            </div>
          </section>

          <section>
            <StepHeading n={3} color="bg-accent-violet/10 text-accent-violet">Scan the data wall, inspect blocks</StepHeading>
            <div className="ml-11 space-y-3 text-sm text-tertiary leading-relaxed">
              <p>
                The <strong>data wall</strong> renders every sentence block of every act as
                one tile. The colours are the whole story at a glance:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="text-slate-500">dark</strong> — inert text (no extracted data);</li>
                <li><strong className="text-teal-600">teal</strong> — data-bearing (targets, obligations, instruments, MRV…);</li>
                <li><strong className="text-sky-600">blue</strong> / <strong className="text-amber-600">amber</strong> / <strong className="text-red-600">red</strong> — cited by a finding (low/info, medium, high — worst severity wins).</li>
              </ul>
              <p>
                <strong>Click any tile</strong> to open it in the <strong>block
                inspector</strong>: the sentence with its id, structural path and char
                offsets, its claims as structured fields, the four-lens tags, its
                neighbouring blocks in the act, and its <strong>puzzle links</strong> — every
                finding and ML pair that cites it, each with the other involved blocks as
                clickable chips. Following chips from block to block is the fastest way to
                trace an inconsistency through the corpus.
              </p>
              <p>
                In the inspector, extracted data appears as colour-coded claim fields:{' '}
                <Chip className="bg-emerald-50 text-emerald-700 border-emerald-200">target</Chip>{' '}
                <Chip className="bg-indigo-50 text-indigo-700 border-indigo-200">deadline</Chip>{' '}
                <Chip className="bg-blue-50 text-blue-700 border-blue-200">obligation</Chip>{' '}
                <Chip className="bg-violet-50 text-violet-700 border-violet-200">instrument</Chip>{' '}
                <Chip className="bg-orange-50 text-orange-700 border-orange-200">financing</Chip>{' '}
                <Chip className="bg-teal-50 text-teal-700 border-teal-200">monitoring</Chip>{' '}
                <Chip className="bg-cyan-50 text-cyan-700 border-cyan-200">review</Chip>{' '}
                <Chip className="bg-rose-50 text-rose-700 border-rose-200">flexibility</Chip>{' '}
                <Chip className="bg-grey-100 text-tertiary border-grey-200">crossref</Chip>.{' '}
                <em>flexibility</em> marks discretion language — derogations, exemptions,
                &ldquo;where appropriate&rdquo; — the raw material of loopholes. Block ids
                (<code className="font-mono text-[12px]">u-&lt;policy&gt;-b&lt;block&gt;-s&lt;sentence&gt;</code>)
                are deterministic: the same sentence keeps the same id across runs, which is
                what makes citations and database rows durable.
              </p>
            </div>
          </section>

          <section>
            <StepHeading n={4} color="bg-primary/10 text-primary">Read the gap matrix, triage the gaps</StepHeading>
            <div className="ml-11 space-y-3 text-sm text-tertiary leading-relaxed">
              <p>
                The <strong>gap matrix</strong> is the bigger picture: acts as rows, the gap
                types as columns, cell colour intensity by count — click any cell to filter
                the findings list to that act and gap type. Policy gaps sit in their own{' '}
                <strong>lever-coverage panel</strong> on the left: levers no act in the corpus
                drives have no row to live in.
              </p>
              <p>
                Findings are pre-sorted worst-first. A practical triage: filter severity to{' '}
                <Chip className="bg-red-50 text-red-700 border-red-200 font-mono uppercase">high</Chip>{' '}
                first (violated design assumptions, counteracting goal interactions,
                internal target conflicts), then{' '}
                <Chip className="bg-amber-50 text-amber-700 border-amber-200 font-mono uppercase">medium</Chip>{' '}
                (orphan goals, assumptions under pressure, soft targets). Use the other
                filters to slice by step, rule or policy.
              </p>
              <p>
                Every finding card names <strong>the rule it followed</strong>, states{' '}
                <strong>why it fired</strong>, and quotes <strong>the exact units it rests
                on</strong> (policy · structural path · unit id). Nothing is a vibe — if you
                disagree with a finding, you are disagreeing with a printed rule application
                you can check.
              </p>
              <p>
                Findings marked{' '}
                <Chip className="bg-sky-50 text-sky-700 border-sky-200 font-mono uppercase">info</Chip>{' '}
                are deliberately over-inclusive <strong>candidates for human review</strong> —
                e.g. divergent same-family targets across acts, where scopes may legitimately
                differ. That over-inclusiveness is by design: undeclared scope differences
                are exactly where cross-policy incoherence hides.
              </p>
            </div>
          </section>

          <section>
            <StepHeading n={5} color="bg-secondary/10 text-secondary">Run the machine-learning pass</StepHeading>
            <div className="ml-11 space-y-3 text-sm text-tertiary leading-relaxed">
              <p>
                Click <strong>&ldquo;Run ML pass&rdquo;</strong> (≈ half a second). It learns
                a TF-IDF vector model from the corpus itself, mines related provisions by
                cosine similarity, and types each high-similarity pair:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Contradiction candidates</strong> — same indicator and year with
                  different values, a hard &ldquo;shall&rdquo; on one side vs a derogation on
                  the other, or opposed direction verbs on the same object.
                </li>
                <li>
                  <strong>Trade-off candidates</strong> — two acts pulling on the same
                  contested resource axis (land &amp; forest carbon, electricity system,
                  public finance, industrial base, administrative capacity, households).
                </li>
                <li>
                  <strong>Duplication / overlap</strong> — near-identical normative content
                  in different acts (consolidation candidates).
                </li>
              </ul>
              <p>
                The right-hand panel shows <strong>theme clusters</strong>: groups of
                provisions from different acts that crowd onto the same topic. Each pair card
                shows its score, the signals that drove the classification, the two quoted
                provisions side by side, and the shared terms — so every score is checkable.
                Unlike the rule-based findings, these are <strong>discovered</strong>, not
                pattern-matched: the statistics propose, you dispose.
              </p>
              <p>
                <strong>&ldquo;Write ML results to database&rdquo;</strong> persists pairs
                and clusters against the persisted run (write the main analysis first).
              </p>
            </div>
          </section>

          <section>
            <StepHeading n={6} color="bg-accent-violet/10 text-accent-violet">Check the rule book, then go deeper</StepHeading>
            <div className="ml-11 space-y-3 text-sm text-tertiary leading-relaxed">
              <p>
                The <strong>Declared rules</strong> section prints every rule the findings
                follow from, and the method note states the model&apos;s honest caveats — in
                particular: where a shipped text is an excerpt of the consolidated act,
                absence-based findings (missing MRV, orphan goals) mark where the{' '}
                <em>substrate</em> ends, not necessarily where the act does.
              </p>
              <p>For programmatic access, four endpoints serve the same data:</p>
              <div className="overflow-x-auto">
                <table className="text-[12px] text-tertiary border-collapse">
                  <tbody>
                    {[
                      ['POST /api/policy-coherence-2/analyze', 'run + persist units, claims and findings'],
                      ['GET /api/policy-coherence-2/findings', 'findings, filterable (?policyId=&ruleId=&severity=&stepId=&scope=)'],
                      ['GET /api/policy-coherence-2/units?policyId=…', 'sentence units of one act, with claims'],
                      ['GET /api/policy-coherence-2/ml  ·  POST …/ml', 'ML pairs + clusters; POST persists them'],
                      ['GET /api/policy-coherence-2/export', 'everything as one JSONL file'],
                    ].map(([ep, desc]) => (
                      <tr key={ep} className="border-b border-grey-200">
                        <td className="py-1.5 pr-4 font-mono text-[11px] whitespace-nowrap">{ep}</td>
                        <td className="py-1.5">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-10 border-t border-grey-200 pt-4 text-[12px] text-tertiary leading-relaxed">
          Related: the act-level{' '}
          <Link href="/beta/policy-coherence" className="text-secondary hover:text-primary underline">
            Policy Coherence board
          </Link>{' '}
          (one grade per act, curated evidence) and the{' '}
          <Link href="/content-analysis" className="text-secondary hover:text-primary underline">
            Content Analysis workbench
          </Link>{' '}
          (the same texts, hand-coded — PC 2.0 units share its block id space).
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
