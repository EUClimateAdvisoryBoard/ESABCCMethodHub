// ---------------------------------------------------------------------------
// Seed data for the Content Analysis beta.
//
// Pulls the first handful of policies from the shipped corpus and derives a
// master code system from their `domain`. That is enough for the module to
// light up out-of-the-box — a real ingestion pipeline (EUR-Lex PDF ⇒ text +
// line numbering) will replace this later.
// ---------------------------------------------------------------------------

import { policies } from '@/data/policies';
import { POLICY_MASTER_TAGS } from './policy-master-tags';
import { POLICY_OBJECTIVE_CHECKLISTS } from './policy-objective-checklist';
import type {
  AiClassification,
  AnalysisDocument,
  Block,
  BlockKind,
  CodedSegment,
  CodeNode,
  ContentAnalysisSnapshot,
  DocumentKind,
  Project,
} from './types';

const PALETTE: Record<string, string> = {
  climate:       '#00928F',
  energy:        '#E87722',
  transport:     '#0065A4',
  industry:      '#7C3AED',
  buildings:     '#D97706',
  agriculture:   '#65A30D',
  finance:       '#B83230',
  adaptation:    '#14B8A6',
  water:         '#0EA5E9',
  forest:        '#16A34A',
  ecology:       '#22C55E',
  // Extended palette — more semantic hues for the richer hierarchy.
  justice:       '#9333EA',
  health:        '#E11D48',
  digital:       '#0891B2',
  education:     '#CA8A04',
  consumer:      '#F97316',
  migration:     '#84CC16',
  security:      '#475569',
  trade:         '#7E22CE',
  nuclear:       '#4F46E5',
  hydrogen:      '#06B6D4',
  solar:         '#FACC15',
  wind:          '#38BDF8',
  gas:           '#6B7280',
  circular:      '#A855F7',
  innovation:    '#8B5CF6',
  pricing:       '#B45309',
  research:      '#BE185D',
  default:       '#3D5265',
};

const ROOT_CODES: Array<{ id: string; name: string; description: string; color: string }> = [
  { id: 'root-mitigation', name: 'Mitigation', description: 'Direct climate-mitigation measures (targets, pricing, sectoral reduction).', color: PALETTE.climate },
  { id: 'root-adaptation', name: 'Adaptation', description: 'Resilience, risk preparedness, impact management.', color: PALETTE.adaptation },
  { id: 'root-finance',    name: 'Finance',    description: 'Budgets, green finance, disclosure, investment steering.', color: PALETTE.finance },
  { id: 'root-sector',     name: 'Sectoral policy', description: 'Sector-specific legislation (energy, transport, agriculture…).', color: PALETTE.energy },
  { id: 'root-crosscut',   name: 'Cross-cutting', description: 'Governance, monitoring, reporting, just-transition.', color: PALETTE.default },
  { id: 'root-assessment', name: 'Objective–delivery checklist', description: 'Assessment criteria: can the act deliver its own stated objective? (ESABCC-style consistency check, Climate Law Arts. 5–7).', color: '#0F766E' },
  { id: 'root-coherence',  name: 'Policy coherence (beta)', description: 'Four-step coherence model over the policy space: ① ex-ante design vs world development, ② coherence across all policy goals, ③ goals vs means of implementation, ④ policy evaluation (measuring policy change and outcomes). Steps ③–④ derive from the objective–delivery checklist.', color: '#6D28D9' },
];

const DOMAIN_TO_ROOT: Record<string, { rootId: string; color: string }> = {
  climate:     { rootId: 'root-mitigation', color: PALETTE.climate },
  energy:      { rootId: 'root-sector',     color: PALETTE.energy },
  transport:   { rootId: 'root-sector',     color: PALETTE.transport },
  industry:    { rootId: 'root-sector',     color: PALETTE.industry },
  buildings:   { rootId: 'root-sector',     color: PALETTE.buildings },
  agriculture: { rootId: 'root-sector',     color: PALETTE.agriculture },
  finance:     { rootId: 'root-finance',    color: PALETTE.finance },
  adaptation:  { rootId: 'root-adaptation', color: PALETTE.adaptation },
  forest:      { rootId: 'root-sector',     color: PALETTE.forest },
  water:       { rootId: 'root-sector',     color: PALETTE.water },
};

function kindFor(docType: string): DocumentKind {
  switch (docType) {
    case 'regulation':
    case 'directive':
    case 'decision':
    case 'communication':
    case 'strategy':
      return docType;
    default:
      return 'report';
  }
}

function truncateText(raw: string | undefined, limit = 24_000): string {
  if (!raw) return '';
  if (raw.length <= limit) return raw;
  return raw.slice(0, limit) + '\n\n[…truncated for beta preview…]';
}

/** Synthesize a readable body for policies that ship without `full_text`.
 *  Pulls the shipped metadata (title, summary, adoption date, CELEX) into
 *  a properly-paragraphed stub document so the workbench always has
 *  something to code against. When the user later ingests the real
 *  EUR-Lex text the stub is replaced. */
function synthesizeBodyFromMetadata(p: {
  title: string;
  short_title: string;
  document_type: string;
  summary: string;
  adoption_date: string | null;
  celex_number: string | null;
  eurlex_url: string;
  domain: string;
}): string {
  const docType = p.document_type.toUpperCase();
  const lines: string[] = [];
  lines.push(`${docType} — ${p.short_title.toUpperCase()}`);
  lines.push('');
  lines.push(p.title);
  lines.push('');
  if (p.adoption_date) lines.push(`Adopted: ${p.adoption_date}`);
  if (p.celex_number) lines.push(`CELEX: ${p.celex_number}`);
  lines.push(`Domain: ${p.domain}`);
  lines.push('');
  lines.push('SUMMARY');
  lines.push('');
  // Break the summary on sentence boundaries so the derived blocks are
  // sensibly sized (the paragraph splitter looks for \n\n).
  const sentences = p.summary
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z(])/g)
    .map(s => s.trim())
    .filter(Boolean);
  for (const s of sentences) {
    lines.push(s);
    lines.push('');
  }
  lines.push('SOURCE');
  lines.push('');
  lines.push(`Full consolidated text available on EUR-Lex: ${p.eurlex_url}`);
  lines.push('');
  lines.push('[…Use "Ingest EUR-Lex PDF" or "Upload PDF" to replace this stub with the full text.]');
  return lines.join('\n');
}

/** Turn a policy summary into a ≤180-char rationale for the synthetic
 *  AI classifications. Takes the first sentence or two from the summary
 *  — already evidence-grounded prose, just trimmed. */
function summaryToRationale(summary: string | undefined, domain: string): string {
  if (!summary || !summary.trim()) {
    return `Curated top-level assignment from policy domain "${domain}".`;
  }
  const firstBreak = summary.search(/[.;]\s/);
  const base = firstBreak > 40 ? summary.slice(0, firstBreak + 1) : summary.slice(0, 180);
  const cleaned = base.replace(/\s+/g, ' ').trim();
  return cleaned.length > 180 ? cleaned.slice(0, 177) + '…' : cleaned;
}

/** Split a plain-text body into paragraph blocks so the block viewer
 *  works immediately. Re-ingesting the PDF later replaces these with
 *  proper PDF-sourced blocks that have bounding boxes. Exported so
 *  the store's `applyPolicyBodies` mutator can reuse it when merging
 *  the lazily-loaded EUR-Lex JSON into documents. */
export function deriveBlocksFromText(policyId: string, rawText: string): Block[] {
  if (!rawText || rawText.trim().length < 50) return [];
  const paragraphs = rawText
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  return paragraphs.map((text, i) => ({
    id: `block-${policyId}-${i}`,
    page: 1,
    order: i,
    bboxes: [],
    kind: inferBlockKind(text),
    text,
  }));
}

/** Same heuristic the ingest route uses — keeps kinds consistent
 *  whether the blocks came from PDF extraction or plain-text seed. */
function inferBlockKind(text: string): BlockKind {
  if (/^Article\s+\d+/i.test(text)) return 'article';
  if (/^\(\d+\)\s/.test(text)) return 'recital';
  if (/^(ANNEX|CHAPTER|SECTION|TITLE|PART)\b/i.test(text)) return 'heading';
  if (text.length < 80 && text === text.toUpperCase() && /[A-Z]/.test(text)) return 'heading';
  if (text.length < 90 && /^\d+\s*\/\s*\d+\s*$/.test(text.trim())) return 'footer';
  if (/^Page\s+\d+/i.test(text) || /^OJ\b/.test(text)) return 'footer';
  return 'paragraph';
}

// ── Checklist verdicts as in-text annotations ──────────────────────────────
// Every objective-checklist rationale cites the article / recital it rests
// on (e.g. "Art. 4 sets binding -55% …"). Where the policy ships with real
// legal text, that citation is resolved to its block and seeded as a
// master-library coded segment — so the workbench shows the checklist
// evidence as in-text highlights under the `check-*` codes, with the
// verdict + rationale as the tag comment. Deterministic ids (`seg-check-…`)
// keep the seed stable across browsers and let the store's hydrate
// migration backfill them into older persisted snapshots.

const CHECKLIST_VERDICT_LABEL: Record<string, string> = {
  met: 'Met',
  partial: 'Partial',
  'not-met': 'Not met',
  'not-applicable': 'N/A',
};

/** The first article / recital a rationale cites that exists in the blocks.
 *  When the citation resolves to a bare heading line ("Article 6 — …"), the
 *  anchor extends to the article's first substantive paragraph so the
 *  highlight covers evidence, not just a title. */
function findCitedBlock(blocks: Block[], rationale: string): Block | undefined {
  const substantive = (hit: Block): Block => {
    if (hit.text.length >= 160) return hit;
    const next = blocks.find(b => b.order === hit.order + 1);
    // Prefer the following body paragraph over a short heading — unless the
    // next block opens another article/heading (an empty article).
    if (next && next.kind !== 'article' && next.kind !== 'heading' && next.text.length > hit.text.length) {
      return next;
    }
    return hit;
  };
  // "Art. 4", "Arts. 6-7", "Article 10a", "Art. 4(2)(d)" …
  const artRefs = [...rationale.matchAll(/Art(?:icle)?s?\.?\s*(\d+[a-z]?)/gi)].map(m =>
    m[1].toLowerCase(),
  );
  for (const ref of artRefs) {
    const re = new RegExp(`^Article\\s+${ref}\\b`, 'i');
    const hit = blocks.find(b => b.kind === 'article' && re.test(b.text));
    if (hit) return substantive(hit);
  }
  // "recital 3" → recital blocks start "(3) …".
  const recRefs = [...rationale.matchAll(/recitals?\s+(\d+)/gi)].map(m => m[1]);
  for (const ref of recRefs) {
    const hit = blocks.find(b => b.kind === 'recital' && b.text.startsWith(`(${ref})`));
    if (hit) return hit;
  }
  return undefined;
}

/** In-text checklist annotations for one policy document, anchored against
 *  its CURRENT blocks. Pure: called at seed time for the shipped texts, and
 *  again by the store whenever a document's substrate changes (lazy-loaded
 *  EUR-Lex bodies, PDF ingestion) so the anchors never go stale and every
 *  policy with real text gets its annotations. */
export function buildChecklistSegmentsFor(
  doc: AnalysisDocument,
  codeNameById: Map<string, string>,
  now: string,
): CodedSegment[] {
  const entries = POLICY_OBJECTIVE_CHECKLISTS[doc.id];
  if (!entries || !doc.blocks || doc.blocks.length === 0) return [];
  // Only anchor into real legal text — highlighting the synthesized metadata
  // stub would be meaningless.
  if (!doc.blocks.some(b => b.kind === 'article')) return [];
  const out: CodedSegment[] = [];
  for (const e of entries) {
    if (e.verdict === 'not-applicable') continue;
    const block = findCitedBlock(doc.blocks, e.rationale);
    if (!block) continue;
    // Cap very long articles so the segment list stays readable; offsets are
    // block-relative (`blockId` is set), so the slice stays anchored.
    const quote = block.text.length > 600 ? block.text.slice(0, 600) : block.text;
    out.push({
      id: `seg-check-${doc.id}-${e.codeId}`,
      documentId: doc.id,
      codeId: e.codeId,
      blockId: block.id,
      startChar: 0,
      endChar: quote.length,
      text: quote,
      note: `${codeNameById.get(e.codeId) ?? e.codeId}: ${CHECKLIST_VERDICT_LABEL[e.verdict]} — ${e.rationale}`,
      noteAuthor: 'AI checklist assessment',
      projectId: null,
      createdAt: now,
    });
  }
  return out;
}

export function buildSeedSnapshot(): ContentAnalysisSnapshot {
  const now = new Date().toISOString();

  // ── Codes ──────────────────────────────────────────────────────────────
  const rootCodes: CodeNode[] = ROOT_CODES.map(c => ({
    id: c.id,
    parentId: null,
    name: c.name,
    description: c.description,
    color: c.color,
    scope: 'master',
    createdAt: now,
  }));

  const domainCodes: CodeNode[] = [];
  const seenDomains = new Set<string>();
  for (const p of policies) {
    if (seenDomains.has(p.domain)) continue;
    seenDomains.add(p.domain);
    const mapping = DOMAIN_TO_ROOT[p.domain] ?? { rootId: 'root-crosscut', color: PALETTE.default };
    domainCodes.push({
      id: `domain-${p.domain}`,
      parentId: mapping.rootId,
      name: p.domain.charAt(0).toUpperCase() + p.domain.slice(1),
      description: `Policies tagged with domain "${p.domain}".`,
      color: mapping.color,
      scope: 'master',
      createdAt: now,
    });
  }

  // ── A richer default code hierarchy ────────────────────────────────────
  // Five roots (Mitigation, Adaptation, Finance, Sectoral policy,
  // Cross-cutting) with two-to-three levels of sub-codes under each.
  // Policies are tagged with the top-level root codes via
  // DOMAIN_TO_ROOT; the handPicked array below is where the analyst-
  // facing depth lives. Add / rename in the UI as the project evolves.
  const handPicked: CodeNode[] = [
    // ── Mitigation ────────────────────────────────────────────────────
    { id: 'code-target',          parentId: 'root-mitigation',   name: 'Climate targets',          description: '2030, 2040, 2050 targets.',                           color: PALETTE.climate,     scope: 'master', createdAt: now },
    { id: 'code-target-2030',     parentId: 'code-target',       name: '2030 (-55%)',              description: 'Fit-for-55 package target.',                          color: PALETTE.climate,     scope: 'master', createdAt: now },
    { id: 'code-target-2040',     parentId: 'code-target',       name: '2040',                     description: 'Interim 2040 target pathway.',                        color: PALETTE.climate,     scope: 'master', createdAt: now },
    { id: 'code-target-2050',     parentId: 'code-target',       name: '2050 neutrality',          description: 'Climate neutrality by 2050.',                         color: PALETTE.climate,     scope: 'master', createdAt: now },

    { id: 'code-pricing',         parentId: 'root-mitigation',   name: 'Carbon pricing',           description: 'Pricing, permits, border measures.',                  color: PALETTE.pricing,     scope: 'master', createdAt: now },
    { id: 'code-ets',             parentId: 'code-pricing',      name: 'EU ETS',                   description: 'Emissions Trading System (stationary + aviation).',   color: PALETTE.pricing,     scope: 'master', createdAt: now },
    { id: 'code-ets-phases',      parentId: 'code-ets',          name: 'Trading phases',           description: 'Phase I–V linear reduction factor, cap trajectory.',  color: PALETTE.pricing,     scope: 'master', createdAt: now },
    { id: 'code-ets-msr',         parentId: 'code-ets',          name: 'Market Stability Reserve', description: 'MSR intake / release mechanism.',                     color: PALETTE.pricing,     scope: 'master', createdAt: now },
    { id: 'code-ets-freealloc',   parentId: 'code-ets',          name: 'Free allocation',          description: 'Benchmarks, carbon leakage list, cross-sectoral CSCF.', color: PALETTE.pricing,   scope: 'master', createdAt: now },
    { id: 'code-ets-aviation',    parentId: 'code-ets',          name: 'Aviation in ETS',          description: 'Intra-EEA flights, CORSIA interface.',                color: '#0EA5E9',           scope: 'master', createdAt: now },
    { id: 'code-ets-maritime',    parentId: 'code-ets',          name: 'Maritime in ETS',          description: 'Shipping inclusion from 2024.',                       color: '#0369A1',           scope: 'master', createdAt: now },
    { id: 'code-ets-innovfund',   parentId: 'code-ets',          name: 'Innovation Fund',          description: 'Innovation Fund from auction revenues.',              color: PALETTE.innovation,  scope: 'master', createdAt: now },
    { id: 'code-ets-modernfund',  parentId: 'code-ets',          name: 'Modernisation Fund',      description: 'Modernisation Fund for lower-income MS.',             color: PALETTE.finance,     scope: 'master', createdAt: now },
    { id: 'code-ets2',            parentId: 'code-pricing',      name: 'ETS2 (buildings/road)',    description: 'Extension to buildings and road transport.',          color: '#92400E',           scope: 'master', createdAt: now },
    { id: 'code-ets2-scf',        parentId: 'code-ets2',         name: 'Social Climate Fund',      description: 'Social Climate Fund financed by ETS2 revenues.',      color: '#A855F7',           scope: 'master', createdAt: now },
    { id: 'code-cbam',            parentId: 'code-pricing',      name: 'CBAM',                     description: 'Carbon Border Adjustment Mechanism.',                 color: PALETTE.pricing,     scope: 'master', createdAt: now },
    { id: 'code-cbam-trans',      parentId: 'code-cbam',         name: 'Transitional phase',       description: 'Reporting-only phase 2023–2025.',                     color: PALETTE.pricing,     scope: 'master', createdAt: now },
    { id: 'code-cbam-iron',       parentId: 'code-cbam',         name: 'Iron & steel',             description: 'CBAM-covered sector: iron & steel.',                  color: PALETTE.industry,    scope: 'master', createdAt: now },
    { id: 'code-cbam-cement',     parentId: 'code-cbam',         name: 'Cement',                   description: 'CBAM-covered sector: cement.',                        color: PALETTE.industry,    scope: 'master', createdAt: now },
    { id: 'code-cbam-fert',       parentId: 'code-cbam',         name: 'Fertilisers',              description: 'CBAM-covered sector: nitrogen fertilisers.',          color: PALETTE.agriculture, scope: 'master', createdAt: now },
    { id: 'code-cbam-alu',        parentId: 'code-cbam',         name: 'Aluminium',                description: 'CBAM-covered sector: aluminium.',                     color: PALETTE.industry,    scope: 'master', createdAt: now },
    { id: 'code-cbam-h2',         parentId: 'code-cbam',         name: 'Hydrogen',                 description: 'CBAM-covered sector: hydrogen.',                      color: PALETTE.hydrogen,    scope: 'master', createdAt: now },
    { id: 'code-cbam-elec',       parentId: 'code-cbam',         name: 'Electricity',              description: 'CBAM-covered sector: imported electricity.',          color: PALETTE.energy,      scope: 'master', createdAt: now },
    { id: 'code-esr',             parentId: 'code-pricing',      name: 'Effort Sharing',           description: 'Non-ETS MS burden sharing.',                          color: PALETTE.pricing,     scope: 'master', createdAt: now },
    { id: 'code-esr-targets',     parentId: 'code-esr',          name: 'National targets',         description: '2030 per-MS reduction targets.',                      color: PALETTE.pricing,     scope: 'master', createdAt: now },
    { id: 'code-esr-flex',        parentId: 'code-esr',          name: 'Flexibilities',            description: 'ETS-ESR flex, LULUCF flex, banking.',                 color: PALETTE.pricing,     scope: 'master', createdAt: now },

    { id: 'code-lulucf',          parentId: 'root-mitigation',   name: 'LULUCF & sinks',           description: 'Land use, land-use change, forestry and soil sinks.', color: PALETTE.forest,      scope: 'master', createdAt: now },
    { id: 'code-lulucf-forest',   parentId: 'code-lulucf',       name: 'Forest management',        description: 'Afforestation, reforestation, forest carbon.',        color: PALETTE.forest,      scope: 'master', createdAt: now },
    { id: 'code-lulucf-soil',     parentId: 'code-lulucf',       name: 'Soil / peat carbon',       description: 'Peatland rewetting, cropland soils.',                 color: PALETTE.forest,      scope: 'master', createdAt: now },
    { id: 'code-lulucf-wetland',  parentId: 'code-lulucf',       name: 'Wetlands',                 description: 'Wetland restoration, coastal carbon.',                color: PALETTE.water,       scope: 'master', createdAt: now },
    { id: 'code-lulucf-crop',     parentId: 'code-lulucf',       name: 'Cropland',                 description: 'Cropland management, cover crops.',                   color: PALETTE.agriculture, scope: 'master', createdAt: now },
    { id: 'code-lulucf-grass',    parentId: 'code-lulucf',       name: 'Grassland',                description: 'Grassland management, permanent pasture.',            color: PALETTE.agriculture, scope: 'master', createdAt: now },
    { id: 'code-lulucf-harv',     parentId: 'code-lulucf',       name: 'Harvested wood products',  description: 'HWP carbon accounting, wood substitution.',           color: PALETTE.forest,      scope: 'master', createdAt: now },
    { id: 'code-lulucf-cdr',      parentId: 'code-lulucf',       name: 'Carbon removals (CRCF)',   description: 'Carbon Removals and Carbon Farming certification.',   color: PALETTE.forest,      scope: 'master', createdAt: now },

    { id: 'code-renewables',      parentId: 'root-mitigation',   name: 'Renewable energy',         description: 'RES deployment and targets.',                         color: PALETTE.energy,      scope: 'master', createdAt: now },
    { id: 'code-renew-red',       parentId: 'code-renewables',   name: 'RED III',                  description: 'Renewable Energy Directive III targets and rules.',   color: PALETTE.energy,      scope: 'master', createdAt: now },
    { id: 'code-renew-solar',     parentId: 'code-renewables',   name: 'Solar',                    description: 'Solar PV and thermal.',                               color: PALETTE.solar,       scope: 'master', createdAt: now },
    { id: 'code-renew-solar-pv',  parentId: 'code-renew-solar',  name: 'Rooftop PV',               description: 'Rooftop solar, solar mandate on buildings.',          color: PALETTE.solar,       scope: 'master', createdAt: now },
    { id: 'code-renew-solar-util',parentId: 'code-renew-solar',  name: 'Utility-scale PV',         description: 'Ground-mounted PV farms.',                            color: PALETTE.solar,       scope: 'master', createdAt: now },
    { id: 'code-renew-wind',      parentId: 'code-renewables',   name: 'Wind',                     description: 'Onshore + offshore wind.',                            color: PALETTE.wind,        scope: 'master', createdAt: now },
    { id: 'code-renew-wind-on',   parentId: 'code-renew-wind',   name: 'Onshore wind',             description: 'Onshore wind deployment.',                            color: PALETTE.wind,        scope: 'master', createdAt: now },
    { id: 'code-renew-wind-off',  parentId: 'code-renew-wind',   name: 'Offshore wind',            description: 'Fixed-bottom offshore wind.',                         color: '#0369A1',           scope: 'master', createdAt: now },
    { id: 'code-renew-wind-float',parentId: 'code-renew-wind',   name: 'Floating wind',            description: 'Floating offshore wind platforms.',                   color: '#0369A1',           scope: 'master', createdAt: now },
    { id: 'code-renew-hydro',     parentId: 'code-renewables',   name: 'Hydro',                    description: 'Hydropower.',                                         color: '#0369A1',           scope: 'master', createdAt: now },
    { id: 'code-renew-geo',       parentId: 'code-renewables',   name: 'Geothermal',               description: 'Geothermal power and heat.',                          color: '#C2410C',           scope: 'master', createdAt: now },
    { id: 'code-renew-ocean',     parentId: 'code-renewables',   name: 'Ocean energy',             description: 'Tidal, wave energy.',                                 color: '#0EA5E9',           scope: 'master', createdAt: now },
    { id: 'code-renew-biomass',   parentId: 'code-renewables',   name: 'Biomass / biofuels',       description: 'Biomass, biogas, biofuels.',                          color: '#65A30D',           scope: 'master', createdAt: now },
    { id: 'code-renew-biogas',    parentId: 'code-renew-biomass',name: 'Biomethane',               description: 'Biomethane plan, grid injection.',                    color: '#65A30D',           scope: 'master', createdAt: now },
    { id: 'code-renew-bioliq',    parentId: 'code-renew-biomass',name: 'Liquid biofuels',          description: 'Bioethanol, biodiesel, advanced biofuels.',           color: '#65A30D',           scope: 'master', createdAt: now },
    { id: 'code-renew-sust',      parentId: 'code-renew-biomass',name: 'Sustainability criteria',  description: 'RED sustainability & GHG criteria for bioenergy.',    color: '#65A30D',           scope: 'master', createdAt: now },
    { id: 'code-renew-hydrogen',  parentId: 'code-renewables',   name: 'Hydrogen',                 description: 'Green / low-carbon hydrogen.',                        color: PALETTE.hydrogen,    scope: 'master', createdAt: now },
    { id: 'code-renew-h2-green',  parentId: 'code-renew-hydrogen', name: 'Green (RFNBO)',          description: 'Renewable fuels of non-biological origin.',           color: PALETTE.hydrogen,    scope: 'master', createdAt: now },
    { id: 'code-renew-h2-low',    parentId: 'code-renew-hydrogen', name: 'Low-carbon',             description: 'Low-carbon hydrogen (incl. blue).',                   color: PALETTE.hydrogen,    scope: 'master', createdAt: now },
    { id: 'code-renew-h2-elec',   parentId: 'code-renew-hydrogen', name: 'Electrolysers',          description: 'Electrolyser capacity, hydrogen bank.',               color: PALETTE.hydrogen,    scope: 'master', createdAt: now },
    { id: 'code-renew-h2-infra',  parentId: 'code-renew-hydrogen', name: 'Hydrogen infrastructure', description: 'Hydrogen backbone, storage, imports.',               color: PALETTE.hydrogen,    scope: 'master', createdAt: now },

    { id: 'code-efficiency',      parentId: 'root-mitigation',   name: 'Energy efficiency',        description: 'Demand-side efficiency targets.',                     color: '#D97706',           scope: 'master', createdAt: now },
    { id: 'code-eff-eed',         parentId: 'code-efficiency',   name: 'EED',                      description: 'Energy Efficiency Directive.',                        color: '#D97706',           scope: 'master', createdAt: now },
    { id: 'code-eff-epbd',        parentId: 'code-efficiency',   name: 'EPBD',                     description: 'Energy Performance of Buildings Directive.',          color: '#D97706',           scope: 'master', createdAt: now },
    { id: 'code-eff-ecodes',      parentId: 'code-efficiency',   name: 'Ecodesign / ELP',          description: 'Ecodesign Regulation, Energy Labelling.',             color: '#D97706',           scope: 'master', createdAt: now },
    { id: 'code-eff-poverty',     parentId: 'code-efficiency',   name: 'Energy poverty',           description: 'Energy-poor households, protection measures.',        color: '#A855F7',           scope: 'master', createdAt: now },

    { id: 'code-methane',         parentId: 'root-mitigation',   name: 'Methane & non-CO₂',        description: 'Methane, N₂O, F-gases.',                              color: '#DB2777',           scope: 'master', createdAt: now },
    { id: 'code-methane-energy',  parentId: 'code-methane',      name: 'Methane (energy)',         description: 'Methane Regulation for oil, gas, coal.',              color: '#DB2777',           scope: 'master', createdAt: now },
    { id: 'code-methane-agri',    parentId: 'code-methane',      name: 'Methane (agriculture)',    description: 'Enteric fermentation, manure.',                       color: PALETTE.agriculture, scope: 'master', createdAt: now },
    { id: 'code-fgas',            parentId: 'code-methane',      name: 'F-gases',                  description: 'Fluorinated-gas Regulation, HFC phase-down.',         color: '#DB2777',           scope: 'master', createdAt: now },
    { id: 'code-ods',             parentId: 'code-methane',      name: 'Ozone-depleting substances', description: 'ODS Regulation.',                                   color: '#DB2777',           scope: 'master', createdAt: now },

    // ── Adaptation ────────────────────────────────────────────────────
    { id: 'code-risk',            parentId: 'root-adaptation',   name: 'Climate risks',            description: 'Physical climate hazards.',                           color: PALETTE.adaptation,  scope: 'master', createdAt: now },
    { id: 'code-risk-heat',       parentId: 'code-risk',         name: 'Heat / heatwaves',         description: 'Extreme heat, urban heat islands.',                   color: PALETTE.health,      scope: 'master', createdAt: now },
    { id: 'code-risk-flood',      parentId: 'code-risk',         name: 'Flooding',                 description: 'Fluvial, pluvial, coastal flooding.',                 color: '#0369A1',           scope: 'master', createdAt: now },
    { id: 'code-risk-flood-flu',  parentId: 'code-risk-flood',   name: 'Fluvial (river)',          description: 'River flooding.',                                     color: '#0369A1',           scope: 'master', createdAt: now },
    { id: 'code-risk-flood-plu',  parentId: 'code-risk-flood',   name: 'Pluvial (surface)',        description: 'Urban/surface-water flooding.',                       color: '#0369A1',           scope: 'master', createdAt: now },
    { id: 'code-risk-flood-coa',  parentId: 'code-risk-flood',   name: 'Coastal storm surge',      description: 'Coastal flooding and storm surge.',                   color: '#0369A1',           scope: 'master', createdAt: now },
    { id: 'code-risk-drought',    parentId: 'code-risk',         name: 'Drought / water stress',   description: 'Meteorological and hydrological drought.',            color: '#D97706',           scope: 'master', createdAt: now },
    { id: 'code-risk-fire',       parentId: 'code-risk',         name: 'Wildfire',                 description: 'Forest and wildland fires.',                          color: '#EA580C',           scope: 'master', createdAt: now },
    { id: 'code-risk-slr',        parentId: 'code-risk',         name: 'Sea-level rise',           description: 'Coastal inundation, erosion.',                        color: PALETTE.water,       scope: 'master', createdAt: now },
    { id: 'code-risk-storm',      parentId: 'code-risk',         name: 'Storms & cyclones',        description: 'Wind storms, extra-tropical cyclones.',               color: '#6366F1',           scope: 'master', createdAt: now },
    { id: 'code-risk-cold',       parentId: 'code-risk',         name: 'Cold extremes',            description: 'Cold waves, freeze-thaw damage.',                     color: '#0EA5E9',           scope: 'master', createdAt: now },
    { id: 'code-risk-perm',       parentId: 'code-risk',         name: 'Permafrost thaw',          description: 'Permafrost degradation, subarctic regions.',          color: '#14B8A6',           scope: 'master', createdAt: now },
    { id: 'code-risk-cascade',    parentId: 'code-risk',         name: 'Cascading / compound',     description: 'Compound hazards, tipping points.',                   color: PALETTE.health,      scope: 'master', createdAt: now },

    { id: 'code-sec-adapt',       parentId: 'root-adaptation',   name: 'Sectoral adaptation',      description: 'Adaptation responses per sector.',                    color: PALETTE.adaptation,  scope: 'master', createdAt: now },
    { id: 'code-adapt-agri',      parentId: 'code-sec-adapt',    name: 'Agriculture',              description: 'Crop resilience, irrigation.',                        color: PALETTE.agriculture, scope: 'master', createdAt: now },
    { id: 'code-adapt-health',    parentId: 'code-sec-adapt',    name: 'Public health',            description: 'Heat mortality, vector-borne disease.',               color: PALETTE.health,      scope: 'master', createdAt: now },
    { id: 'code-adapt-infra',     parentId: 'code-sec-adapt',    name: 'Infrastructure',           description: 'Resilient design, asset risk.',                       color: PALETTE.transport,   scope: 'master', createdAt: now },
    { id: 'code-adapt-eco',       parentId: 'code-sec-adapt',    name: 'Ecosystems',               description: 'Biodiversity-based adaptation.',                      color: PALETTE.ecology,     scope: 'master', createdAt: now },
    { id: 'code-adapt-cities',    parentId: 'code-sec-adapt',    name: 'Cities / urban',           description: 'Urban heat, green infrastructure.',                   color: '#16A34A',           scope: 'master', createdAt: now },
    { id: 'code-adapt-water',     parentId: 'code-sec-adapt',    name: 'Water resources',          description: 'Water allocation, reuse, supply security.',           color: PALETTE.water,       scope: 'master', createdAt: now },
    { id: 'code-adapt-tour',      parentId: 'code-sec-adapt',    name: 'Tourism',                  description: 'Coastal, alpine and cultural tourism.',               color: '#F97316',           scope: 'master', createdAt: now },
    { id: 'code-adapt-fin',       parentId: 'code-sec-adapt',    name: 'Financial sector',         description: 'Insurance, stranded assets, physical-risk pricing.',  color: PALETTE.finance,     scope: 'master', createdAt: now },
    { id: 'code-adapt-forest',    parentId: 'code-sec-adapt',    name: 'Forestry',                 description: 'Forest resilience, pest and disease.',                color: PALETTE.forest,      scope: 'master', createdAt: now },
    { id: 'code-adapt-fish',      parentId: 'code-sec-adapt',    name: 'Fisheries & aquaculture',  description: 'Ocean warming, acidification, aquaculture resilience.', color: '#0EA5E9',         scope: 'master', createdAt: now },
    { id: 'code-adapt-energy',    parentId: 'code-sec-adapt',    name: 'Energy system',            description: 'Generation outages, demand shifts, cooling.',         color: PALETTE.energy,      scope: 'master', createdAt: now },

    { id: 'code-riskassess',      parentId: 'root-adaptation',   name: 'Risk assessment',          description: 'EUCRA, national risk assessments.',                   color: '#14B8A6',           scope: 'master', createdAt: now },
    { id: 'code-risk-eucra',      parentId: 'code-riskassess',   name: 'EUCRA',                    description: 'European Climate Risk Assessment (EEA, 2024).',       color: '#14B8A6',           scope: 'master', createdAt: now },
    { id: 'code-risk-nra',        parentId: 'code-riskassess',   name: 'National risk assessments', description: 'Member-state risk assessments.',                     color: '#14B8A6',           scope: 'master', createdAt: now },
    { id: 'code-earlywarn',       parentId: 'root-adaptation',   name: 'Early warning',            description: 'Forecast, alert, disaster-readiness systems.',        color: '#14B8A6',           scope: 'master', createdAt: now },
    { id: 'code-disaster',        parentId: 'root-adaptation',   name: 'Disaster response',        description: 'Civil protection, recovery.',                         color: '#14B8A6',           scope: 'master', createdAt: now },
    { id: 'code-disaster-rescue', parentId: 'code-disaster',     name: 'rescEU',                   description: 'EU civil-protection capacity.',                       color: '#14B8A6',           scope: 'master', createdAt: now },
    { id: 'code-disaster-solidar',parentId: 'code-disaster',     name: 'EU Solidarity Fund',       description: 'EUSF post-disaster assistance.',                      color: PALETTE.finance,     scope: 'master', createdAt: now },
    { id: 'code-adaptlimits',     parentId: 'root-adaptation',   name: 'Limits to adaptation',     description: 'Loss & damage, maladaptation.',                       color: PALETTE.health,      scope: 'master', createdAt: now },
    { id: 'code-losseu-damage',   parentId: 'code-adaptlimits',  name: 'Loss & damage',            description: 'Residual impacts, WIM, L&D fund.',                    color: PALETTE.health,      scope: 'master', createdAt: now },
    { id: 'code-maladapt',        parentId: 'code-adaptlimits',  name: 'Maladaptation',            description: 'Adaptation measures that worsen vulnerability.',      color: PALETTE.health,      scope: 'master', createdAt: now },

    // ── Finance ──────────────────────────────────────────────────────
    { id: 'code-fin-pub',         parentId: 'root-finance',      name: 'Public finance',           description: 'EU budget and national programmes.',                  color: PALETTE.finance,     scope: 'master', createdAt: now },
    { id: 'code-fin-mff',         parentId: 'code-fin-pub',      name: 'MFF',                      description: 'Multiannual Financial Framework.',                    color: PALETTE.finance,     scope: 'master', createdAt: now },
    { id: 'code-fin-mff-mainstr', parentId: 'code-fin-mff',      name: 'Climate mainstreaming',    description: '30% MFF climate spending target.',                    color: PALETTE.finance,     scope: 'master', createdAt: now },
    { id: 'code-fin-mff-biodiv',  parentId: 'code-fin-mff',      name: 'Biodiversity mainstreaming', description: '7.5% biodiversity target (from 2024).',             color: PALETTE.ecology,     scope: 'master', createdAt: now },
    { id: 'code-fin-ngeu',        parentId: 'code-fin-pub',      name: 'NextGenerationEU',         description: 'RRF and related instruments.',                        color: PALETTE.finance,     scope: 'master', createdAt: now },
    { id: 'code-fin-rrf',         parentId: 'code-fin-ngeu',     name: 'RRF (Recovery & Resilience)', description: 'Recovery and Resilience Facility, 37% climate tag.', color: PALETTE.finance,    scope: 'master', createdAt: now },
    { id: 'code-fin-repwr',       parentId: 'code-fin-ngeu',     name: 'REPowerEU',                description: 'Energy independence, gas phase-out, RES acceleration.', color: PALETTE.energy,    scope: 'master', createdAt: now },
    { id: 'code-fin-cohesion',    parentId: 'code-fin-pub',      name: 'Cohesion / regional',      description: 'ERDF, CF, regional investment.',                      color: PALETTE.finance,     scope: 'master', createdAt: now },
    { id: 'code-fin-erdf',        parentId: 'code-fin-cohesion', name: 'ERDF',                     description: 'European Regional Development Fund.',                 color: PALETTE.finance,     scope: 'master', createdAt: now },
    { id: 'code-fin-cf',          parentId: 'code-fin-cohesion', name: 'Cohesion Fund',            description: 'Cohesion Fund (lower-income MS).',                    color: PALETTE.finance,     scope: 'master', createdAt: now },
    { id: 'code-fin-invest',      parentId: 'code-fin-pub',      name: 'InvestEU',                 description: 'InvestEU guarantees and advisory hub.',               color: PALETTE.finance,     scope: 'master', createdAt: now },
    { id: 'code-fin-horizon',     parentId: 'code-fin-pub',      name: 'Horizon Europe',           description: 'R&I framework programme, climate-relevant missions.', color: PALETTE.research,    scope: 'master', createdAt: now },
    { id: 'code-fin-life',        parentId: 'code-fin-pub',      name: 'LIFE programme',           description: 'LIFE climate and environment funding.',               color: PALETTE.ecology,     scope: 'master', createdAt: now },
    { id: 'code-fin-cef',         parentId: 'code-fin-pub',      name: 'CEF',                      description: 'Connecting Europe Facility (TEN-T/E).',               color: PALETTE.transport,   scope: 'master', createdAt: now },

    { id: 'code-fin-priv',        parentId: 'root-finance',      name: 'Private finance',          description: 'Capital markets, disclosures, labels.',               color: '#DB2777',           scope: 'master', createdAt: now },
    { id: 'code-fin-taxonomy',    parentId: 'code-fin-priv',     name: 'EU Taxonomy',              description: 'Sustainability classification.',                      color: '#DB2777',           scope: 'master', createdAt: now },
    { id: 'code-fin-tax-mitig',   parentId: 'code-fin-taxonomy', name: 'Climate-mitigation criteria', description: 'Substantial contribution to mitigation.',          color: PALETTE.climate,     scope: 'master', createdAt: now },
    { id: 'code-fin-tax-adapt',   parentId: 'code-fin-taxonomy', name: 'Adaptation criteria',      description: 'Substantial contribution to adaptation.',             color: PALETTE.adaptation,  scope: 'master', createdAt: now },
    { id: 'code-fin-tax-dnsh',    parentId: 'code-fin-taxonomy', name: 'DNSH',                     description: 'Do No Significant Harm principle.',                   color: '#DB2777',           scope: 'master', createdAt: now },
    { id: 'code-fin-sfdr',        parentId: 'code-fin-priv',     name: 'SFDR',                     description: 'Disclosure regulation for asset managers.',           color: '#DB2777',           scope: 'master', createdAt: now },
    { id: 'code-fin-csrd',        parentId: 'code-fin-priv',     name: 'CSRD / ESRS',              description: 'Corporate sustainability reporting.',                 color: '#DB2777',           scope: 'master', createdAt: now },
    { id: 'code-fin-bonds',       parentId: 'code-fin-priv',     name: 'Green bonds',              description: 'EU green bond standard, issuances.',                  color: '#DB2777',           scope: 'master', createdAt: now },
    { id: 'code-fin-trans-plans', parentId: 'code-fin-priv',     name: 'Transition plans',         description: 'Corporate climate-transition plans (CSDDD / CSRD).',  color: '#DB2777',           scope: 'master', createdAt: now },
    { id: 'code-fin-stress',      parentId: 'code-fin-priv',     name: 'Climate stress tests',     description: 'ECB/EBA/EIOPA climate stress tests.',                 color: '#DB2777',           scope: 'master', createdAt: now },
    { id: 'code-fin-insure',      parentId: 'code-fin-priv',     name: 'Insurance gap',            description: 'Climate protection gap, public-private schemes.',     color: '#DB2777',           scope: 'master', createdAt: now },

    { id: 'code-fin-jtf',         parentId: 'root-finance',      name: 'Just Transition Fund',     description: 'JTF and Social Climate Fund.',                        color: '#A855F7',           scope: 'master', createdAt: now },
    { id: 'code-fin-jtm',         parentId: 'code-fin-jtf',      name: 'Just Transition Mechanism', description: 'JTM: JTF + InvestEU JT + Public Sector Loan Facility.', color: '#A855F7',       scope: 'master', createdAt: now },
    { id: 'code-fin-scf',         parentId: 'code-fin-jtf',      name: 'Social Climate Fund',      description: 'SCF from ETS2 revenues, vulnerable households/transport.', color: '#A855F7',     scope: 'master', createdAt: now },
    { id: 'code-fin-needs',       parentId: 'root-finance',      name: 'Investment needs',         description: 'Gap / needs estimates.',                              color: PALETTE.finance,     scope: 'master', createdAt: now },
    { id: 'code-fin-needs-2030',  parentId: 'code-fin-needs',    name: 'To 2030',                  description: 'Investment needs for Fit-for-55.',                    color: PALETTE.finance,     scope: 'master', createdAt: now },
    { id: 'code-fin-needs-2050',  parentId: 'code-fin-needs',    name: 'To 2050',                  description: 'Investment needs on the neutrality pathway.',         color: PALETTE.finance,     scope: 'master', createdAt: now },
    { id: 'code-fin-stateaid',    parentId: 'root-finance',      name: 'State aid',                description: 'CEEAG, TCTF state-aid regimes.',                      color: PALETTE.finance,     scope: 'master', createdAt: now },
    { id: 'code-fin-eib',         parentId: 'root-finance',      name: 'EIB Climate Bank',         description: 'European Investment Bank climate role.',              color: PALETTE.finance,     scope: 'master', createdAt: now },
    { id: 'code-fin-ffsub',       parentId: 'root-finance',      name: 'Fossil-fuel subsidies',    description: 'Phase-out of fossil-fuel subsidies.',                 color: PALETTE.pricing,     scope: 'master', createdAt: now },

    // ── Sectoral policy ──────────────────────────────────────────────
    { id: 'code-sec-elec',        parentId: 'root-sector',       name: 'Electricity',              description: 'Power markets, grid, generation.',                    color: PALETTE.energy,      scope: 'master', createdAt: now },
    { id: 'code-sec-elec-grid',   parentId: 'code-sec-elec',     name: 'Grid & interconnectors',   description: 'Transmission, cross-border grids.',                   color: PALETTE.energy,      scope: 'master', createdAt: now },
    { id: 'code-sec-elec-tyndp',  parentId: 'code-sec-elec-grid',name: 'TEN-E / TYNDP',            description: 'TEN-E regulation, 10-year network development plan.', color: PALETTE.energy,      scope: 'master', createdAt: now },
    { id: 'code-sec-elec-dist',   parentId: 'code-sec-elec-grid',name: 'Distribution / smart',     description: 'DSO upgrades, smart meters, grid digitalisation.',    color: PALETTE.digital,     scope: 'master', createdAt: now },
    { id: 'code-sec-elec-market', parentId: 'code-sec-elec',     name: 'Market design',            description: 'Capacity, PPAs, CfDs, flexibility.',                  color: PALETTE.energy,      scope: 'master', createdAt: now },
    { id: 'code-sec-elec-ppa',    parentId: 'code-sec-elec-market', name: 'PPAs',                  description: 'Power Purchase Agreements.',                          color: PALETTE.energy,      scope: 'master', createdAt: now },
    { id: 'code-sec-elec-cfd',    parentId: 'code-sec-elec-market', name: 'CfDs',                  description: 'Contracts for Difference, two-sided CfDs.',           color: PALETTE.energy,      scope: 'master', createdAt: now },
    { id: 'code-sec-elec-flex',   parentId: 'code-sec-elec-market', name: 'Demand response / flexibility', description: 'Demand-side flexibility, aggregation.',      color: PALETTE.energy,      scope: 'master', createdAt: now },
    { id: 'code-sec-elec-stor',   parentId: 'code-sec-elec',     name: 'Storage',                  description: 'Battery, pumped hydro, LDES.',                        color: '#0369A1',           scope: 'master', createdAt: now },
    { id: 'code-sec-elec-elect',  parentId: 'code-sec-elec',     name: 'Electrification',          description: 'Cross-sector electrification, heat pumps, EVs.',      color: PALETTE.energy,      scope: 'master', createdAt: now },
    { id: 'code-sec-gas',         parentId: 'root-sector',       name: 'Gas',                      description: 'Natural gas and biomethane.',                         color: PALETTE.gas,         scope: 'master', createdAt: now },
    { id: 'code-sec-gas-pkg',     parentId: 'code-sec-gas',      name: 'Gas & Hydrogen package',   description: 'Decarbonised gas & H₂ market package.',               color: PALETTE.gas,         scope: 'master', createdAt: now },
    { id: 'code-sec-gas-lng',     parentId: 'code-sec-gas',      name: 'LNG / imports',            description: 'LNG terminals, supply diversification.',              color: PALETTE.gas,         scope: 'master', createdAt: now },
    { id: 'code-sec-gas-sos',     parentId: 'code-sec-gas',      name: 'Security of supply',       description: 'Gas SoS regulation, storage filling.',                color: PALETTE.security,    scope: 'master', createdAt: now },
    { id: 'code-sec-nuclear',     parentId: 'root-sector',       name: 'Nuclear',                  description: 'Nuclear generation + safety.',                        color: PALETTE.nuclear,     scope: 'master', createdAt: now },
    { id: 'code-sec-nuc-smr',     parentId: 'code-sec-nuclear',  name: 'SMR',                      description: 'Small Modular Reactors initiative.',                  color: PALETTE.nuclear,     scope: 'master', createdAt: now },
    { id: 'code-sec-nuc-waste',   parentId: 'code-sec-nuclear',  name: 'Radioactive waste',        description: 'Spent fuel, deep geological repositories.',           color: PALETTE.nuclear,     scope: 'master', createdAt: now },

    { id: 'code-sec-transp',      parentId: 'root-sector',       name: 'Transport',                description: 'All transport modes.',                                color: PALETTE.transport,   scope: 'master', createdAt: now },
    { id: 'code-sec-road',        parentId: 'code-sec-transp',   name: 'Road',                     description: 'Cars, vans, HGVs, alternative fuels.',                color: PALETTE.transport,   scope: 'master', createdAt: now },
    { id: 'code-sec-road-cars',   parentId: 'code-sec-road',     name: 'CO₂ standards cars/vans',  description: 'Light-duty CO₂ standards, 2035 phase-out.',           color: PALETTE.transport,   scope: 'master', createdAt: now },
    { id: 'code-sec-road-hdv',    parentId: 'code-sec-road',     name: 'HDV CO₂ standards',        description: 'Heavy-duty vehicle CO₂ standards.',                   color: PALETTE.transport,   scope: 'master', createdAt: now },
    { id: 'code-sec-road-ev',     parentId: 'code-sec-road',     name: 'EV uptake',                description: 'Battery electric / plug-in hybrid uptake.',           color: PALETTE.transport,   scope: 'master', createdAt: now },
    { id: 'code-sec-road-logi',   parentId: 'code-sec-road',     name: 'Logistics',                description: 'Urban & freight logistics, modal shift.',             color: PALETTE.transport,   scope: 'master', createdAt: now },
    { id: 'code-sec-rail',        parentId: 'code-sec-transp',   name: 'Rail',                     description: 'Rail freight + passenger.',                           color: PALETTE.transport,   scope: 'master', createdAt: now },
    { id: 'code-sec-rail-hsr',    parentId: 'code-sec-rail',     name: 'High-speed rail',          description: 'HSR network, cross-border services.',                 color: PALETTE.transport,   scope: 'master', createdAt: now },
    { id: 'code-sec-rail-ertms',  parentId: 'code-sec-rail',     name: 'ERTMS',                    description: 'European Rail Traffic Management System rollout.',    color: PALETTE.transport,   scope: 'master', createdAt: now },
    { id: 'code-sec-avi',         parentId: 'code-sec-transp',   name: 'Aviation',                 description: 'Aviation emissions and SAF.',                         color: '#0EA5E9',           scope: 'master', createdAt: now },
    { id: 'code-sec-avi-refuel',  parentId: 'code-sec-avi',      name: 'ReFuelEU Aviation',        description: 'SAF blending mandates for aviation.',                 color: '#0EA5E9',           scope: 'master', createdAt: now },
    { id: 'code-sec-avi-corsia',  parentId: 'code-sec-avi',      name: 'CORSIA',                   description: 'ICAO CORSIA offsetting for international flights.',   color: '#0EA5E9',           scope: 'master', createdAt: now },
    { id: 'code-sec-avi-saf',     parentId: 'code-sec-avi',      name: 'Sustainable aviation fuels', description: 'SAF pathways, e-fuels, hydrogen aircraft.',         color: '#0EA5E9',           scope: 'master', createdAt: now },
    { id: 'code-sec-avi-atm',     parentId: 'code-sec-avi',      name: 'ATM / SES',                description: 'Single European Sky, ATM efficiency.',                color: '#0EA5E9',           scope: 'master', createdAt: now },
    { id: 'code-sec-mari',        parentId: 'code-sec-transp',   name: 'Maritime',                 description: 'Shipping emissions, alternative fuels.',              color: '#0369A1',           scope: 'master', createdAt: now },
    { id: 'code-sec-mari-fueleu', parentId: 'code-sec-mari',     name: 'FuelEU Maritime',          description: 'GHG intensity standard for marine fuels.',            color: '#0369A1',           scope: 'master', createdAt: now },
    { id: 'code-sec-mari-imo',    parentId: 'code-sec-mari',     name: 'IMO interface',            description: 'International Maritime Organization alignment.',      color: '#0369A1',           scope: 'master', createdAt: now },
    { id: 'code-sec-mari-ports',  parentId: 'code-sec-mari',     name: 'Ports / shore-side power', description: 'OPS (onshore power supply) for ships at berth.',      color: '#0369A1',           scope: 'master', createdAt: now },
    { id: 'code-sec-altfuel',     parentId: 'code-sec-transp',   name: 'Alternative fuels infra',  description: 'AFIR, charging, refuelling.',                         color: '#14B8A6',           scope: 'master', createdAt: now },
    { id: 'code-sec-altfuel-ev',  parentId: 'code-sec-altfuel',  name: 'EV charging',              description: 'Public charging, fast chargers, TEN-T.',              color: '#14B8A6',           scope: 'master', createdAt: now },
    { id: 'code-sec-altfuel-h2',  parentId: 'code-sec-altfuel',  name: 'H₂ refuelling',            description: 'Hydrogen refuelling stations.',                       color: PALETTE.hydrogen,    scope: 'master', createdAt: now },
    { id: 'code-sec-active',      parentId: 'code-sec-transp',   name: 'Active mobility',          description: 'Cycling, walking, micromobility.',                    color: '#16A34A',           scope: 'master', createdAt: now },

    { id: 'code-sec-ind',         parentId: 'root-sector',       name: 'Industry',                 description: 'Heavy industry decarbonisation.',                     color: PALETTE.industry,    scope: 'master', createdAt: now },
    { id: 'code-sec-ind-nzia',    parentId: 'code-sec-ind',      name: 'Net-Zero Industry Act',    description: 'NZIA strategic net-zero technologies.',               color: PALETTE.industry,    scope: 'master', createdAt: now },
    { id: 'code-sec-ind-crma',    parentId: 'code-sec-ind',      name: 'Critical Raw Materials',   description: 'CRMA: extraction, processing, recycling benchmarks.', color: PALETTE.industry,    scope: 'master', createdAt: now },
    { id: 'code-sec-ind-steel',   parentId: 'code-sec-ind',      name: 'Steel',                    description: 'Steel decarbonisation.',                              color: PALETTE.industry,    scope: 'master', createdAt: now },
    { id: 'code-sec-ind-steel-h2dri', parentId: 'code-sec-ind-steel', name: 'H₂-DRI',               description: 'Hydrogen direct-reduced iron pathway.',               color: PALETTE.hydrogen,    scope: 'master', createdAt: now },
    { id: 'code-sec-ind-steel-scrap', parentId: 'code-sec-ind-steel', name: 'Scrap / EAF',          description: 'Electric arc furnaces, scrap circularity.',           color: PALETTE.industry,    scope: 'master', createdAt: now },
    { id: 'code-sec-ind-cement',  parentId: 'code-sec-ind',      name: 'Cement',                   description: 'Cement and clinker.',                                 color: PALETTE.industry,    scope: 'master', createdAt: now },
    { id: 'code-sec-ind-chem',    parentId: 'code-sec-ind',      name: 'Chemicals',                description: 'Chemicals, ammonia, fertilisers.',                    color: PALETTE.industry,    scope: 'master', createdAt: now },
    { id: 'code-sec-ind-chem-amm',parentId: 'code-sec-ind-chem', name: 'Ammonia',                  description: 'Low-carbon ammonia production.',                      color: PALETTE.industry,    scope: 'master', createdAt: now },
    { id: 'code-sec-ind-chem-crack', parentId: 'code-sec-ind-chem', name: 'Steam crackers',        description: 'Electrified / H₂ steam crackers.',                    color: PALETTE.industry,    scope: 'master', createdAt: now },
    { id: 'code-sec-ind-alu',     parentId: 'code-sec-ind',      name: 'Aluminium',                description: 'Aluminium / non-ferrous.',                            color: PALETTE.industry,    scope: 'master', createdAt: now },
    { id: 'code-sec-ind-pulp',    parentId: 'code-sec-ind',      name: 'Pulp & paper',             description: 'Pulp, paper and board industry.',                     color: PALETTE.forest,      scope: 'master', createdAt: now },
    { id: 'code-sec-ind-glass',   parentId: 'code-sec-ind',      name: 'Glass & ceramics',         description: 'High-temperature heat industries.',                   color: PALETTE.industry,    scope: 'master', createdAt: now },
    { id: 'code-sec-ind-refine',  parentId: 'code-sec-ind',      name: 'Refining',                 description: 'Oil refining transition.',                            color: PALETTE.industry,    scope: 'master', createdAt: now },
    { id: 'code-sec-ind-ccs',     parentId: 'code-sec-ind',      name: 'CCS / CCUS',               description: 'Carbon capture, use and storage.',                    color: '#6366F1',           scope: 'master', createdAt: now },
    { id: 'code-sec-ind-cdr',     parentId: 'code-sec-ind',      name: 'CDR / negative emissions', description: 'DAC, BECCS, negative-emissions technologies.',        color: '#6366F1',           scope: 'master', createdAt: now },
    { id: 'code-sec-ind-ied',     parentId: 'code-sec-ind',      name: 'IED',                      description: 'Industrial Emissions Directive, BAT.',                color: PALETTE.industry,    scope: 'master', createdAt: now },

    { id: 'code-sec-build',       parentId: 'root-sector',       name: 'Buildings',                description: 'Residential + non-residential.',                      color: PALETTE.buildings,   scope: 'master', createdAt: now },
    { id: 'code-sec-build-epbd',  parentId: 'code-sec-build',    name: 'EPBD (recast)',            description: 'Energy Performance of Buildings Directive.',          color: PALETTE.buildings,   scope: 'master', createdAt: now },
    { id: 'code-sec-build-renov', parentId: 'code-sec-build',    name: 'Renovation Wave',          description: 'Deep-renovation strategy, doubled renovation rate.',  color: PALETTE.buildings,   scope: 'master', createdAt: now },
    { id: 'code-sec-build-mepsr', parentId: 'code-sec-build',    name: 'Minimum performance standards', description: 'MEPS for residential and non-residential stock.',color: PALETTE.buildings,   scope: 'master', createdAt: now },
    { id: 'code-sec-build-heatpump', parentId: 'code-sec-build', name: 'Heat pumps',               description: 'Heat-pump deployment, boiler phase-out.',             color: PALETTE.buildings,   scope: 'master', createdAt: now },
    { id: 'code-sec-build-res',   parentId: 'code-sec-build',    name: 'Residential',              description: 'Dwellings, energy poverty.',                          color: PALETTE.buildings,   scope: 'master', createdAt: now },
    { id: 'code-sec-build-nonres',parentId: 'code-sec-build',    name: 'Non-residential',          description: 'Public and commercial buildings.',                    color: PALETTE.buildings,   scope: 'master', createdAt: now },
    { id: 'code-sec-build-heat',  parentId: 'code-sec-build',    name: 'District heating',         description: 'District heating and cooling.',                       color: PALETTE.buildings,   scope: 'master', createdAt: now },
    { id: 'code-sec-build-emb',   parentId: 'code-sec-build',    name: 'Embodied carbon',          description: 'Whole-life carbon of materials and construction.',    color: PALETTE.buildings,   scope: 'master', createdAt: now },

    { id: 'code-sec-agri',        parentId: 'root-sector',       name: 'Agriculture & food',       description: 'Farming, food systems.',                              color: PALETTE.agriculture, scope: 'master', createdAt: now },
    { id: 'code-sec-agri-cap',    parentId: 'code-sec-agri',     name: 'CAP',                      description: 'Common Agricultural Policy (post-2023 reform).',      color: PALETTE.agriculture, scope: 'master', createdAt: now },
    { id: 'code-sec-agri-f2f',    parentId: 'code-sec-agri',     name: 'Farm to Fork',             description: 'Farm to Fork strategy, sustainable food system.',     color: PALETTE.agriculture, scope: 'master', createdAt: now },
    { id: 'code-sec-agri-live',   parentId: 'code-sec-agri',     name: 'Livestock',                description: 'Methane, manure, herd size.',                         color: PALETTE.agriculture, scope: 'master', createdAt: now },
    { id: 'code-sec-agri-dairy',  parentId: 'code-sec-agri-live',name: 'Dairy',                    description: 'Dairy cattle enteric methane.',                       color: PALETTE.agriculture, scope: 'master', createdAt: now },
    { id: 'code-sec-agri-beef',   parentId: 'code-sec-agri-live',name: 'Beef',                     description: 'Beef cattle systems.',                                color: PALETTE.agriculture, scope: 'master', createdAt: now },
    { id: 'code-sec-agri-crops',  parentId: 'code-sec-agri',     name: 'Crops',                    description: 'Arable, horticulture, biofuels feedstock.',           color: PALETTE.agriculture, scope: 'master', createdAt: now },
    { id: 'code-sec-agri-fert',   parentId: 'code-sec-agri',     name: 'Fertiliser / N₂O',         description: 'Nitrogen fertiliser emissions.',                      color: PALETTE.agriculture, scope: 'master', createdAt: now },
    { id: 'code-sec-agri-organic',parentId: 'code-sec-agri',     name: 'Organic farming',          description: '25% organic land target by 2030.',                    color: PALETTE.agriculture, scope: 'master', createdAt: now },
    { id: 'code-sec-agri-pest',   parentId: 'code-sec-agri',     name: 'Pesticides (SUR)',         description: 'Sustainable Use Regulation, pesticide reduction.',    color: PALETTE.agriculture, scope: 'master', createdAt: now },
    { id: 'code-sec-agri-soil',   parentId: 'code-sec-agri',     name: 'Soil health',              description: 'Soil Monitoring Law, soil carbon.',                   color: PALETTE.agriculture, scope: 'master', createdAt: now },
    { id: 'code-sec-agri-food',   parentId: 'code-sec-agri',     name: 'Food systems',             description: 'Diets, food waste, labelling.',                       color: PALETTE.consumer,    scope: 'master', createdAt: now },
    { id: 'code-sec-agri-fish',   parentId: 'code-sec-agri',     name: 'Fisheries',                description: 'Common Fisheries Policy, ocean sustainability.',      color: PALETTE.water,       scope: 'master', createdAt: now },

    { id: 'code-sec-water',       parentId: 'root-sector',       name: 'Water',                    description: 'Water quality, scarcity, infrastructure.',            color: PALETTE.water,       scope: 'master', createdAt: now },
    { id: 'code-sec-water-wfd',   parentId: 'code-sec-water',    name: 'Water Framework Directive', description: 'WFD river-basin management.',                        color: PALETTE.water,       scope: 'master', createdAt: now },
    { id: 'code-sec-water-marine',parentId: 'code-sec-water',    name: 'Marine Strategy',          description: 'MSFD, good environmental status.',                    color: PALETTE.water,       scope: 'master', createdAt: now },
    { id: 'code-sec-water-uwwtd', parentId: 'code-sec-water',    name: 'Urban waste water',        description: 'UWWTD treatment, resource recovery.',                 color: PALETTE.water,       scope: 'master', createdAt: now },
    { id: 'code-sec-water-reuse', parentId: 'code-sec-water',    name: 'Water reuse',              description: 'Reclaimed water for irrigation and industry.',        color: PALETTE.water,       scope: 'master', createdAt: now },
    { id: 'code-sec-waste',       parentId: 'root-sector',       name: 'Waste / circular',         description: 'Circular economy, waste directives.',                 color: PALETTE.circular,    scope: 'master', createdAt: now },
    { id: 'code-sec-waste-cea',   parentId: 'code-sec-waste',    name: 'Circular Economy Action Plan', description: 'CEAP 2020, circular design.',                     color: PALETTE.circular,    scope: 'master', createdAt: now },
    { id: 'code-sec-waste-esp',   parentId: 'code-sec-waste',    name: 'Ecodesign Sustainable Products', description: 'ESPR, digital product passport.',                color: PALETTE.circular,    scope: 'master', createdAt: now },
    { id: 'code-sec-waste-pkg',   parentId: 'code-sec-waste',    name: 'Packaging (PPWR)',         description: 'Packaging and packaging waste.',                      color: PALETTE.circular,    scope: 'master', createdAt: now },
    { id: 'code-sec-waste-plast', parentId: 'code-sec-waste',    name: 'Plastics',                 description: 'Plastics strategy, SUP directive.',                   color: PALETTE.circular,    scope: 'master', createdAt: now },
    { id: 'code-sec-waste-batt',  parentId: 'code-sec-waste',    name: 'Batteries',                description: 'Batteries Regulation, 2nd-life and recycling.',       color: PALETTE.circular,    scope: 'master', createdAt: now },
    { id: 'code-sec-waste-wee',   parentId: 'code-sec-waste',    name: 'WEEE / electronics',       description: 'Waste electrical and electronic equipment.',          color: PALETTE.circular,    scope: 'master', createdAt: now },
    { id: 'code-sec-waste-textile', parentId: 'code-sec-waste',  name: 'Textiles',                 description: 'EU textile strategy, EPR for textiles.',              color: PALETTE.circular,    scope: 'master', createdAt: now },
    { id: 'code-sec-waste-constr',parentId: 'code-sec-waste',    name: 'Construction waste',       description: 'Construction & demolition waste, CPR interface.',     color: PALETTE.circular,    scope: 'master', createdAt: now },

    // ── Cross-cutting ────────────────────────────────────────────────
    { id: 'code-just-trans',      parentId: 'root-crosscut',     name: 'Just transition',          description: 'Distributional impact, vulnerable households.',       color: PALETTE.justice,     scope: 'master', createdAt: now },
    { id: 'code-jt-workers',      parentId: 'code-just-trans',   name: 'Workers / employment',     description: 'Jobs, skills, labour transitions.',                   color: PALETTE.justice,     scope: 'master', createdAt: now },
    { id: 'code-jt-skills',       parentId: 'code-jt-workers',   name: 'Skills & reskilling',      description: 'Pact for Skills, net-zero skills academy.',           color: PALETTE.education,   scope: 'master', createdAt: now },
    { id: 'code-jt-regions',      parentId: 'code-just-trans',   name: 'Regions',                  description: 'Coal regions, industrial transition.',                color: PALETTE.justice,     scope: 'master', createdAt: now },
    { id: 'code-jt-coal',         parentId: 'code-jt-regions',   name: 'Coal regions',             description: 'Coal Regions in Transition Initiative.',              color: PALETTE.justice,     scope: 'master', createdAt: now },
    { id: 'code-jt-households',   parentId: 'code-just-trans',   name: 'Households / poverty',     description: 'Energy poverty, affordability.',                      color: PALETTE.justice,     scope: 'master', createdAt: now },
    { id: 'code-jt-gender',       parentId: 'code-just-trans',   name: 'Gender equality',          description: 'Gender-responsive climate policy.',                   color: PALETTE.justice,     scope: 'master', createdAt: now },
    { id: 'code-jt-youth',        parentId: 'code-just-trans',   name: 'Youth & future generations', description: 'Intergenerational equity, youth voice.',             color: PALETTE.justice,     scope: 'master', createdAt: now },
    { id: 'code-jt-indigenous',   parentId: 'code-just-trans',   name: 'Indigenous peoples',       description: 'FPIC, rights of indigenous communities.',             color: PALETTE.justice,     scope: 'master', createdAt: now },

    { id: 'code-gov',             parentId: 'root-crosscut',     name: 'Governance',               description: 'Legal framework, planning.',                          color: '#6366F1',           scope: 'master', createdAt: now },
    { id: 'code-gov-climatelaw',  parentId: 'code-gov',          name: 'Climate Law',              description: 'European Climate Law framework.',                     color: '#6366F1',           scope: 'master', createdAt: now },
    { id: 'code-gov-necps',       parentId: 'code-gov',          name: 'NECPs',                    description: 'National Energy & Climate Plans.',                    color: '#6366F1',           scope: 'master', createdAt: now },
    { id: 'code-gov-ltsnz',       parentId: 'code-gov',          name: 'LTS / net-zero strategies',description: 'Long-Term Strategies, net-zero roadmaps.',            color: '#6366F1',           scope: 'master', createdAt: now },
    { id: 'code-gov-gov',         parentId: 'code-gov',          name: 'Governance Regulation',    description: 'EU Governance Regulation 2018/1999.',                 color: '#6366F1',           scope: 'master', createdAt: now },
    { id: 'code-gov-progress',    parentId: 'code-gov',          name: 'Progress reporting',       description: 'Climate Action Progress Reports.',                    color: '#6366F1',           scope: 'master', createdAt: now },
    { id: 'code-gov-enforce',     parentId: 'code-gov',          name: 'Enforcement / infringement', description: 'Infringement proceedings, CJEU cases.',             color: '#6366F1',           scope: 'master', createdAt: now },
    { id: 'code-gov-better',      parentId: 'code-gov',          name: 'Better regulation',        description: 'Impact assessments, RSB, evaluation.',                color: '#6366F1',           scope: 'master', createdAt: now },
    { id: 'code-gov-strategic',   parentId: 'code-gov',          name: 'Strategic foresight',      description: 'JRC strategic foresight, scenario planning.',         color: '#6366F1',           scope: 'master', createdAt: now },
    { id: 'code-gov-climlaw',     parentId: 'code-gov',          name: 'Climate litigation',       description: 'Rights-based climate cases (Urgenda, KlimaSeniorinnen).', color: PALETTE.justice, scope: 'master', createdAt: now },
    { id: 'code-gov-access',      parentId: 'code-gov',          name: 'Access to justice (Aarhus)', description: 'Aarhus Regulation, NGO standing.',                  color: PALETTE.justice,     scope: 'master', createdAt: now },

    { id: 'code-monitoring',      parentId: 'root-crosscut',     name: 'MRV / monitoring',         description: 'Monitoring, reporting and verification duties.',      color: '#6366F1',           scope: 'master', createdAt: now },
    { id: 'code-monitoring-inv',  parentId: 'code-monitoring',   name: 'GHG inventories',          description: 'National GHG inventories, IPCC guidelines.',          color: '#6366F1',           scope: 'master', createdAt: now },
    { id: 'code-monitoring-proj', parentId: 'code-monitoring',   name: 'Projections',              description: 'WEM / WAM GHG projections.',                          color: '#6366F1',           scope: 'master', createdAt: now },
    { id: 'code-monitoring-ind',  parentId: 'code-monitoring',   name: 'Indicators',               description: 'Climate-policy progress indicators.',                 color: '#6366F1',           scope: 'master', createdAt: now },
    { id: 'code-monitoring-data', parentId: 'code-monitoring',   name: 'Data platforms',           description: 'Climate-ADAPT, EDGAR, Copernicus.',                   color: PALETTE.digital,     scope: 'master', createdAt: now },

    { id: 'code-ecology',         parentId: 'root-crosscut',     name: 'Biodiversity & ecology',   description: 'Biodiversity strategy, nature restoration.',          color: PALETTE.ecology,     scope: 'master', createdAt: now },
    { id: 'code-eco-n2000',       parentId: 'code-ecology',      name: 'Natura 2000',              description: 'Habitats & Birds directives, Natura 2000 sites.',     color: PALETTE.ecology,     scope: 'master', createdAt: now },
    { id: 'code-eco-nrl',         parentId: 'code-ecology',      name: 'Nature Restoration Law',   description: 'NRL binding restoration targets.',                    color: PALETTE.ecology,     scope: 'master', createdAt: now },
    { id: 'code-eco-nbs',         parentId: 'code-ecology',      name: 'Nature-based solutions',   description: 'NbS for mitigation and adaptation co-benefits.',      color: PALETTE.ecology,     scope: 'master', createdAt: now },
    { id: 'code-eco-ocean',       parentId: 'code-ecology',      name: 'Ocean & blue carbon',      description: 'Marine ecosystems, blue-carbon habitats.',            color: PALETTE.water,       scope: 'master', createdAt: now },
    { id: 'code-eco-invasive',    parentId: 'code-ecology',      name: 'Invasive species',         description: 'IAS Regulation, biosecurity.',                        color: PALETTE.ecology,     scope: 'master', createdAt: now },
    { id: 'code-eco-defor',       parentId: 'code-ecology',      name: 'Deforestation (EUDR)',     description: 'EUDR on deforestation-free products.',                color: PALETTE.forest,      scope: 'master', createdAt: now },

    { id: 'code-science',         parentId: 'root-crosscut',     name: 'Science & evidence',       description: 'Scientific basis, advisory bodies.',                  color: '#0065A4',           scope: 'master', createdAt: now },
    { id: 'code-sci-ipcc',        parentId: 'code-science',      name: 'IPCC',                     description: 'IPCC reports and assessments.',                       color: '#0065A4',           scope: 'master', createdAt: now },
    { id: 'code-sci-esabcc',      parentId: 'code-science',      name: 'ESABCC',                   description: 'European Scientific Advisory Board on Climate Change.', color: '#0065A4',         scope: 'master', createdAt: now },
    { id: 'code-sci-eea',         parentId: 'code-science',      name: 'EEA',                      description: 'European Environment Agency.',                        color: '#0065A4',           scope: 'master', createdAt: now },
    { id: 'code-sci-jrc',         parentId: 'code-science',      name: 'JRC',                      description: 'Joint Research Centre analyses.',                     color: '#0065A4',           scope: 'master', createdAt: now },
    { id: 'code-sci-uncertainty', parentId: 'code-science',      name: 'Uncertainty & scenarios',  description: 'Scenario uncertainty, Monte-Carlo, deep uncertainty.', color: '#0065A4',          scope: 'master', createdAt: now },

    { id: 'code-intl',            parentId: 'root-crosscut',     name: 'International',            description: 'Multilateral climate diplomacy.',                     color: '#14B8A6',           scope: 'master', createdAt: now },
    { id: 'code-intl-unfccc',     parentId: 'code-intl',         name: 'UNFCCC / Paris',           description: 'Paris Agreement, NDCs.',                              color: '#14B8A6',           scope: 'master', createdAt: now },
    { id: 'code-intl-gst',        parentId: 'code-intl',         name: 'Global Stocktake',         description: 'Paris Article 14 stocktake.',                         color: '#14B8A6',           scope: 'master', createdAt: now },
    { id: 'code-intl-cop',        parentId: 'code-intl',         name: 'COP outcomes',             description: 'Cover decisions and COP presidencies.',               color: '#14B8A6',           scope: 'master', createdAt: now },
    { id: 'code-intl-ndc',        parentId: 'code-intl',         name: 'EU NDC',                   description: 'EU Nationally Determined Contribution.',              color: '#14B8A6',           scope: 'master', createdAt: now },
    { id: 'code-intl-finance',    parentId: 'code-intl',         name: 'International climate finance', description: 'Climate finance pledges, USD 100 bn, NCQG.',      color: PALETTE.finance,     scope: 'master', createdAt: now },
    { id: 'code-intl-bilat',      parentId: 'code-intl',         name: 'Bilateral partnerships',   description: 'JETPs, EU-China, EU-US, EU-Africa partnerships.',     color: '#14B8A6',           scope: 'master', createdAt: now },
    { id: 'code-intl-trade',      parentId: 'code-intl',         name: 'Trade & climate',          description: 'WTO interface, climate clauses in FTAs.',             color: PALETTE.trade,       scope: 'master', createdAt: now },
    { id: 'code-intl-global-ghg', parentId: 'code-intl',         name: 'Global GHG budgets',       description: 'Carbon budgets, 1.5°C / 2°C pathways.',               color: PALETTE.climate,     scope: 'master', createdAt: now },

    { id: 'code-innov',           parentId: 'root-crosscut',     name: 'Innovation & RDI',         description: 'Horizon Europe, innovation fund.',                    color: PALETTE.innovation,  scope: 'master', createdAt: now },
    { id: 'code-innov-horizon',   parentId: 'code-innov',        name: 'Horizon Europe missions',  description: 'Climate-neutral cities, adaptation mission.',         color: PALETTE.research,    scope: 'master', createdAt: now },
    { id: 'code-innov-cleantech', parentId: 'code-innov',        name: 'Cleantech scale-up',       description: 'STEP, scale-up gap, manufacturing.',                  color: PALETTE.innovation,  scope: 'master', createdAt: now },
    { id: 'code-innov-demo',      parentId: 'code-innov',        name: 'First-of-a-kind demo',     description: 'FOAK projects, Innovation Fund demonstration.',       color: PALETTE.innovation,  scope: 'master', createdAt: now },
    { id: 'code-publeng',         parentId: 'root-crosscut',     name: 'Public engagement',        description: 'Citizens panels, communication.',                     color: '#65A30D',           scope: 'master', createdAt: now },
    { id: 'code-publeng-panels',  parentId: 'code-publeng',      name: 'Citizens assemblies',      description: 'European and national citizens panels.',              color: '#65A30D',           scope: 'master', createdAt: now },
    { id: 'code-publeng-comm',    parentId: 'code-publeng',      name: 'Communication',            description: 'Climate communication, media, misinformation.',       color: '#65A30D',           scope: 'master', createdAt: now },

    // Additional cross-cutting themes — surface-level branches that
    // the original seed shipped as root slots on the Code system tree
    // but had no child codes (Digital, Education, Health, Migration,
    // Security, Trade, Consumer, Justice, Environment).
    { id: 'code-health',          parentId: 'root-crosscut',     name: 'Health',                   description: 'Health co-benefits, air quality, climate-sensitive disease.', color: PALETTE.health,  scope: 'master', createdAt: now },
    { id: 'code-health-air',      parentId: 'code-health',       name: 'Air quality',              description: 'AAQD revision, PM2.5, NO₂.',                          color: PALETTE.health,      scope: 'master', createdAt: now },
    { id: 'code-health-cobenefit',parentId: 'code-health',       name: 'Health co-benefits',       description: 'Mitigation co-benefits for public health.',           color: PALETTE.health,      scope: 'master', createdAt: now },
    { id: 'code-health-vector',   parentId: 'code-health',       name: 'Vector-borne disease',     description: 'Warming-induced spread (dengue, WNV).',               color: PALETTE.health,      scope: 'master', createdAt: now },

    { id: 'code-digital',         parentId: 'root-crosscut',     name: 'Digital & data',           description: 'Digital transition, data governance, AI.',            color: PALETTE.digital,     scope: 'master', createdAt: now },
    { id: 'code-digital-twin',    parentId: 'code-digital',      name: 'Digital twins',            description: 'Destination Earth, sector digital twins.',            color: PALETTE.digital,     scope: 'master', createdAt: now },
    { id: 'code-digital-ai',      parentId: 'code-digital',      name: 'AI for climate',           description: 'AI applications; AI-energy footprint.',               color: PALETTE.digital,     scope: 'master', createdAt: now },
    { id: 'code-digital-dc',      parentId: 'code-digital',      name: 'Data centres',             description: 'Data-centre energy & water use.',                     color: PALETTE.digital,     scope: 'master', createdAt: now },
    { id: 'code-digital-dpp',     parentId: 'code-digital',      name: 'Digital Product Passport', description: 'DPP under ESPR.',                                     color: PALETTE.circular,    scope: 'master', createdAt: now },

    { id: 'code-education',       parentId: 'root-crosscut',     name: 'Education & skills',       description: 'Climate literacy, green skills.',                     color: PALETTE.education,   scope: 'master', createdAt: now },
    { id: 'code-edu-greenskills', parentId: 'code-education',    name: 'Green skills',             description: 'Skills agenda, green jobs roadmap.',                  color: PALETTE.education,   scope: 'master', createdAt: now },
    { id: 'code-edu-literacy',    parentId: 'code-education',    name: 'Climate literacy',         description: 'GreenComp, school curricula.',                        color: PALETTE.education,   scope: 'master', createdAt: now },

    { id: 'code-consumer',        parentId: 'root-crosscut',     name: 'Consumer protection',      description: 'Green claims, empowerment, right to repair.',         color: PALETTE.consumer,    scope: 'master', createdAt: now },
    { id: 'code-consumer-claims', parentId: 'code-consumer',     name: 'Green Claims Directive',   description: 'Substantiation of environmental claims.',             color: PALETTE.consumer,    scope: 'master', createdAt: now },
    { id: 'code-consumer-empower',parentId: 'code-consumer',     name: 'Empowering consumers',     description: 'Directive on empowering consumers for green transition.', color: PALETTE.consumer, scope: 'master', createdAt: now },
    { id: 'code-consumer-repair', parentId: 'code-consumer',     name: 'Right to repair',          description: 'R2R Directive, spare-parts, repairability score.',    color: PALETTE.consumer,    scope: 'master', createdAt: now },

    { id: 'code-migration',       parentId: 'root-crosscut',     name: 'Migration',                description: 'Climate-driven mobility.',                            color: PALETTE.migration,   scope: 'master', createdAt: now },
    { id: 'code-migration-clim',  parentId: 'code-migration',    name: 'Climate mobility',         description: 'Climate-induced internal and cross-border mobility.', color: PALETTE.migration,   scope: 'master', createdAt: now },

    { id: 'code-security',        parentId: 'root-crosscut',     name: 'Security',                 description: 'Energy, food, climate security nexus.',               color: PALETTE.security,    scope: 'master', createdAt: now },
    { id: 'code-security-energy', parentId: 'code-security',     name: 'Energy security',          description: 'Supply diversification, critical infrastructure.',    color: PALETTE.security,    scope: 'master', createdAt: now },
    { id: 'code-security-food',   parentId: 'code-security',     name: 'Food security',            description: 'Supply shocks, diet resilience.',                     color: PALETTE.security,    scope: 'master', createdAt: now },
    { id: 'code-security-def',    parentId: 'code-security',     name: 'Defence & climate',        description: 'Climate-security nexus for EU defence.',              color: PALETTE.security,    scope: 'master', createdAt: now },

    { id: 'code-trade',           parentId: 'root-crosscut',     name: 'Trade',                    description: 'Climate-trade interface.',                            color: PALETTE.trade,       scope: 'master', createdAt: now },
    { id: 'code-trade-fta',       parentId: 'code-trade',        name: 'Climate chapters in FTAs', description: 'TSD chapters, Paris-alignment clauses.',              color: PALETTE.trade,       scope: 'master', createdAt: now },
    { id: 'code-trade-wto',       parentId: 'code-trade',        name: 'WTO',                      description: 'CBAM/WTO compatibility, green subsidies.',            color: PALETTE.trade,       scope: 'master', createdAt: now },

    { id: 'code-justice',         parentId: 'root-crosscut',     name: 'Environmental justice',    description: 'Distributional / procedural / recognitional justice.', color: PALETTE.justice,    scope: 'master', createdAt: now },
    { id: 'code-justice-dist',    parentId: 'code-justice',      name: 'Distributional',           description: 'Who bears costs / who captures benefits.',            color: PALETTE.justice,     scope: 'master', createdAt: now },
    { id: 'code-justice-proc',    parentId: 'code-justice',      name: 'Procedural',               description: 'Participation, voice, transparency.',                 color: PALETTE.justice,     scope: 'master', createdAt: now },
    { id: 'code-justice-recog',   parentId: 'code-justice',      name: 'Recognitional',            description: 'Recognition of affected groups and knowledges.',      color: PALETTE.justice,     scope: 'master', createdAt: now },

    { id: 'code-environment',     parentId: 'root-crosscut',     name: 'Environment',              description: 'Environmental co-benefits and impacts.',              color: PALETTE.ecology,     scope: 'master', createdAt: now },
    { id: 'code-env-chem',        parentId: 'code-environment',  name: 'Chemicals (REACH)',        description: 'REACH, CLP, PFAS.',                                   color: PALETTE.ecology,     scope: 'master', createdAt: now },
    { id: 'code-env-soil',        parentId: 'code-environment',  name: 'Soil health',              description: 'Soil strategy, soil monitoring.',                     color: PALETTE.forest,      scope: 'master', createdAt: now },
    { id: 'code-env-noise',       parentId: 'code-environment',  name: 'Noise',                    description: 'Environmental noise directive.',                      color: PALETTE.ecology,     scope: 'master', createdAt: now },
    { id: 'code-env-light',       parentId: 'code-environment',  name: 'Light pollution',          description: 'Astronomical & ecological impacts.',                  color: PALETTE.ecology,     scope: 'master', createdAt: now },

    // ── Objective–delivery checklist ─────────────────────────────────
    // Assessment criteria, not thematic codes: each code is one question
    // in a structured "can this act deliver its own stated objective?"
    // review, mirroring the ESABCC consistency assessments mandated by
    // Climate Law Arts. 5–7 (incl. consistency with climate neutrality
    // and with ensuring progress on adaptation). The description is the
    // rubric an assessor applies. Per-policy verdicts (met / partial /
    // not met / n.a.) live in policy-objective-checklist.ts; annotators
    // can also apply these codes to text segments to pin the evidence.
    { id: 'check-objective',      parentId: 'root-assessment',   name: 'Objective clearly stated', description: 'Met when the act states a specific, verifiable objective (subject-matter article / recitals), not just broad aims.', color: '#0F766E', scope: 'master', createdAt: now },
    { id: 'check-target-quant',   parentId: 'root-assessment',   name: 'Quantified targets',       description: 'Met when numeric targets with baseline and date operationalise the objective.', color: '#0F766E', scope: 'master', createdAt: now },
    { id: 'check-timeline',       parentId: 'root-assessment',   name: 'Timeline & milestones',    description: 'Met when dated milestones / deadlines pace delivery of the objective.', color: '#0F766E', scope: 'master', createdAt: now },
    { id: 'check-instruments',    parentId: 'root-assessment',   name: 'Instruments match objective', description: 'Met when binding obligations or mechanisms are plausibly sufficient to deliver the stated objective — the core objective–content consistency test.', color: '#B45309', scope: 'master', createdAt: now },
    { id: 'check-coverage',       parentId: 'root-assessment',   name: 'Coverage & loopholes',     description: 'Met when scope covers what the objective requires and exemptions / derogations do not undermine it.', color: '#B45309', scope: 'master', createdAt: now },
    { id: 'check-monitoring',     parentId: 'root-assessment',   name: 'Monitoring & reporting',   description: 'Met when MRV / reporting provisions can show whether the objective is on track.', color: '#0F766E', scope: 'master', createdAt: now },
    { id: 'check-enforcement',    parentId: 'root-assessment',   name: 'Enforcement & correction', description: 'Met when penalties or corrective mechanisms kick in if delivery is off-track.', color: '#0F766E', scope: 'master', createdAt: now },
    { id: 'check-financing',      parentId: 'root-assessment',   name: 'Financing identified',     description: 'Met when resources / funding commensurate with the objective are identified.', color: '#0F766E', scope: 'master', createdAt: now },
    { id: 'check-cons-neutrality',parentId: 'root-assessment',   name: 'Consistency: climate neutrality', description: 'Met when the act is consistent with (or actively contributes to) the 2050 climate-neutrality objective — Climate Law Arts. 2, 6–7.', color: '#1B7339', scope: 'master', createdAt: now },
    { id: 'check-cons-adaptation',parentId: 'root-assessment',   name: 'Consistency: adaptation',  description: 'Met when the act is consistent with ensuring progress on adaptation and climate resilience (climate-proofing) — Climate Law Art. 5.', color: '#0E7490', scope: 'master', createdAt: now },
    { id: 'check-just-transition',parentId: 'root-assessment',   name: 'Just-transition safeguards', description: 'Met when distributional impacts of pursuing the objective are assessed and cushioned.', color: '#9333EA', scope: 'master', createdAt: now },
    { id: 'check-review',         parentId: 'root-assessment',   name: 'Review & ratchet',         description: 'Met when a scheduled review can strengthen the act if the objective is at risk.', color: '#0F766E', scope: 'master', createdAt: now },

    // ── Policy coherence (beta) ──────────────────────────────────────
    // The four steps of the beta coherence model, as taggable codes: a
    // SYSTEM-level lens (between policies, vs the world, vs the evidence)
    // complementing the per-act checklist above. Steps ③ and ④ derive
    // their verdicts from the `check-*` criteria (see
    // policy-coherence.ts) — these codes exist so annotators can pin
    // coherence evidence to text segments, not to re-score the criteria.
    { id: 'coh-exante',     parentId: 'root-coherence', name: '① Ex ante vs world development', description: 'Assumption-Based Planning (Dewar et al., RAND): evidence that a falsifiable design assumption of the act is valid, under pressure or violated, tested via a signpost indicator against an explicit violation criterion.', color: '#6D28D9', scope: 'master', createdAt: now },
    { id: 'coh-horizontal', parentId: 'root-coherence', name: '② Across policy goals',          description: 'Goal interactions on the Nilsson et al. (2016) seven-point scale (−3 cancelling … +3 indivisible), with the interaction mechanism and the legal provisions that create it.', color: '#7C3AED', scope: 'master', createdAt: now },
    { id: 'coh-means',      parentId: 'root-coherence', name: '③ Goals vs means',               description: 'Goals/means congruence (Howlett & Rayner): whether instruments, coverage, enforcement, financing and timeline are commensurate with the goals — scored via the objective–delivery checklist.', color: '#8B5CF6', scope: 'master', createdAt: now },
    { id: 'coh-evaluation', parentId: 'root-coherence', name: '④ Evaluation: change & outcomes', description: 'Distance-to-target evaluation (EEA Trends & Projections method): observed recent pace ÷ required pace against the act’s target, plus MRV/review machinery and policy-change facts.', color: '#A78BFA', scope: 'master', createdAt: now },
  ];

  const codes: CodeNode[] = [...rootCodes, ...domainCodes, ...handPicked];

  // ── Documents ─────────────────────────────────────────────────────────
  // The master library mirrors the full policy corpus. Docs without a
  // shipped `full_text` come in with an empty body — they will fill in
  // once the user ingests the EUR-Lex PDF. `truncateText` caps each doc
  // at 24 kB so the full snapshot stays well under localStorage quota.
  const policyDocs: AnalysisDocument[] = policies.map(p => {
    const mapping = DOMAIN_TO_ROOT[p.domain] ?? { rootId: 'root-crosscut', color: PALETTE.default };
    // Curated per-policy tags take priority over the mechanical
    // domain→root fallback. `domain-<x>` is always appended so the
    // horizontal-coherence matrix can still roll up by domain even when
    // the curated tags don't include it explicitly.
    const curated = POLICY_MASTER_TAGS[p.id] ?? [mapping.rootId];
    const aiCodeIds = Array.from(new Set([...curated, `domain-${p.domain}`]));

    // Synthesize an `AiClassification[]` from the curated tags so the
    // workbench's AI-tag panel shows something useful out of the box
    // without consuming Gemini credits. The rationale cites the policy
    // summary so it's actually grounded in the document rather than a
    // generic placeholder. A real Gemini run via the per-doc "AI
    // pre-tag" button will overwrite with an evidence-backed rationale.
    const summaryRationale = summaryToRationale(p.summary, p.domain);
    const aiClassifications: AiClassification[] = curated.map(codeId => ({
      codeId,
      confidence: 0.85,
      rationale: summaryRationale,
      evidenceBlockIds: [],
    }));

    // Derive block cards from the shipped full_text when available;
    // otherwise synthesize a metadata stub so every policy is workable
    // on first paint. The richer prefetched EUR-Lex bodies live in
    // public/content-analysis/policy-bodies.json and get merged in
    // lazily on page mount via `applyPolicyBodies` — keeps the client
    // bundle off the ~15 MB corpus.
    const hasShippedText = typeof p.full_text === 'string' && p.full_text.trim().length >= 200;
    const bodyRaw = hasShippedText ? p.full_text! : synthesizeBodyFromMetadata(p);
    const truncated = truncateText(bodyRaw);
    const derivedBlocks = deriveBlocksFromText(p.id, truncated);

    return {
      id: p.id,
      title: p.title,
      shortTitle: p.short_title,
      kind: kindFor(p.document_type),
      celexNumber: p.celex_number,
      eurlexUrl: p.eurlex_url,
      adoptionDate: p.adoption_date,
      text: truncated,
      blocks: derivedBlocks.length > 0 ? derivedBlocks : undefined,
      aiCodeIds,
      aiClassifications,
      aiTaggedAt: now,
      sourceKind: 'policy',
    };
  });

  // References aren't seeded into localStorage any more — they are loaded
  // live from `@/data/references` + `/api/references/library` by the
  // `useLiveReferences` hook so the workbench mirrors whatever the
  // reference manager shows. Keeping them out of the snapshot avoids
  // a ~2 MB localStorage write and keeps policies + references in sync
  // when the user adds a new paper from the Word add-in.
  const documents: AnalysisDocument[] = policyDocs;

  // In-text checklist annotations: anchor each verdict's cited article /
  // recital as a master-library segment in the policies that ship full text.
  const codeNameById = new Map(codes.map(c => [c.id, c.name] as const));
  const checklistSegments = documents.flatMap(d =>
    buildChecklistSegmentsFor(d, codeNameById, now),
  );

  // ── Projects ─────────────────────────────────────────────────────────
  const projects: Project[] = [
    {
      id: 'project-master',
      name: 'Master library',
      description:
        'All policies with AI-assigned master codes. Use this scope to curate the code system and tag at the highest level of the hierarchy.',
      mode: 'horizontal',
      masterCodeSelection: [],
      documentAllowList: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'project-adaptation-2',
      name: 'Adaptation 2.0',
      description:
        'Direct climate + forest + water policies, selected at the top of the code hierarchy. Illustrates the project-scoping workflow.',
      mode: 'horizontal',
      masterCodeSelection: ['root-adaptation', 'domain-climate', 'domain-forest', 'domain-water'],
      documentAllowList: [],
      createdAt: now,
      updatedAt: now,
    },
  ];

  return {
    version: 1,
    codes,
    documents,
    segments: checklistSegments,
    projects,
    suggestions: [],
    summaries: [],
  };
}
