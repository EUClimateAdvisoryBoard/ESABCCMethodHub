'use client';

/**
 * Strategy & Framework Docs — beta module.
 * ----------------------------------------
 * A documentation-style overview of the Secretariat's internal strategy and
 * project-framework documents. Reads like the MethodHub documentation site
 * itself: a hero with intent, a sectioned library of documents grouped by
 * purpose (strategy, project framework, governance, methodology, change-log),
 * and a right-hand on-this-page index.
 *
 * The actual document files (PDFs, DOCX, signed initiation requests) will be
 * dropped into `public/strategy-docs/` and referenced from the `DOCUMENTS`
 * catalogue below. Until then, every entry renders as a placeholder card with
 * a "coming soon" badge — so the layout, wayfinding and copy can be reviewed
 * before the source material is in the repo.
 *
 * To wire a real document in:
 *   1. Drop the file under `public/strategy-docs/<file>`.
 *   2. Set `status: 'available'` and `href: '/strategy-docs/<file>'` on the
 *      matching entry in `DOCUMENTS`.
 *   3. Update `version`, `updated` and `summary` to match the file.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type DocStatus = 'available' | 'coming-soon' | 'draft';
type DocFormat = 'PDF' | 'DOCX' | 'MD' | 'XLSX' | 'PPTX';

interface DocumentEntry {
  id: string;
  title: string;
  /** Short one-line description — shown under the title on the card. */
  summary: string;
  /** Semantic version label, e.g. v1.0, v0.3-draft. */
  version: string;
  /** Last-updated label, e.g. "23 Apr 2026". */
  updated: string;
  format: DocFormat;
  /** Filed-from author / unit. */
  author: string;
  status: DocStatus;
  /** Public URL once the file is in the repo (under `/strategy-docs/`). */
  href?: string;
  /** Tag chips shown at the bottom of the card. */
  tags: string[];
}

interface DocumentSection {
  id: string;
  label: string;
  kicker: string;
  intro: string;
  items: DocumentEntry[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Catalogue — placeholders for the docs that will be uploaded tomorrow.
// Everything ships with status: 'coming-soon' until the file lands in
// public/strategy-docs/.
// ──────────────────────────────────────────────────────────────────────────────

const SECTIONS: DocumentSection[] = [
  {
    id: 'strategy',
    label: 'Strategy',
    kicker: 'Where we are going',
    intro:
      'Multi-year strategic intent for the Secretariat — research priorities, capability roadmap, and the long-term positioning of MethodHub inside the EEA institutional perimeter.',
    items: [
      {
        id: 'cce5-strategy-2026-2030',
        title: 'CCE5 Multi-Year Strategy 2026–2030',
        summary:
          'Strategic priorities for the unit over the next four years: research outputs, internal tooling, and EEA-wide blueprint role.',
        version: 'v1.0',
        updated: 'Pending upload',
        format: 'PDF',
        author: 'CCE5',
        status: 'coming-soon',
        tags: ['strategy', 'multi-year', 'CCE5'],
      },
      {
        id: 'methodhub-vision-statement',
        title: 'MethodHub Vision Statement',
        summary:
          'Why MethodHub exists, who it serves, and how it relates to the wider EEA digital strategy. Companion to the docs-site vision pages.',
        version: 'v0.9-draft',
        updated: 'Pending upload',
        format: 'PDF',
        author: 'CCE5',
        status: 'coming-soon',
        tags: ['vision', 'positioning'],
      },
      {
        id: 'eea-blueprint-framing',
        title: 'EEA Unit Blueprint — Framing Note',
        summary:
          'How the MethodHub stack generalises to other EEA units: shared scope, hosting model, and stewardship pattern.',
        version: 'v0.5-draft',
        updated: 'Pending upload',
        format: 'PDF',
        author: 'CCE5',
        status: 'coming-soon',
        tags: ['blueprint', 'EEA'],
      },
    ],
  },
  {
    id: 'project-framework',
    label: 'Project Framework',
    kicker: 'How we run projects',
    intro:
      'The project-management framework the Secretariat uses end-to-end: initiation requests, scope locks, milestone definitions, RACI templates, and the standard handoff package to EEA IT.',
    items: [
      {
        id: 'pir-methodhub',
        title: 'Project Initiation Request — MethodHub',
        summary:
          'Signed PIR for the MethodHub product itself: scope, owners, dependencies and the v1.0 acceptance criteria.',
        version: 'vx.x',
        updated: 'Pending upload',
        format: 'DOCX',
        author: 'CCE5',
        status: 'coming-soon',
        tags: ['PIR', 'governance'],
      },
      {
        id: 'pir-eea-data-services',
        title: 'Project Initiation Request — EEA Data Services Simplification',
        summary:
          'Companion PIR positioning MethodHub inside the broader EEA data-services simplification programme.',
        version: 'v1.0',
        updated: 'Pending upload',
        format: 'DOCX',
        author: 'CCE5',
        status: 'coming-soon',
        tags: ['PIR', 'EEA-wide'],
      },
      {
        id: 'pir-infra-assessment-2024',
        title: 'Infrastructure Assessment 2024 — Project Initiation Request',
        summary:
          'Original 2024 PIR that scoped the infrastructure assessment underpinning the current EEA-handoff target architecture.',
        version: 'v1.0',
        updated: 'Pending upload',
        format: 'PDF',
        author: 'CCE5',
        status: 'coming-soon',
        tags: ['PIR', 'infrastructure'],
      },
      {
        id: 'pm-framework-handbook',
        title: 'Secretariat PM Framework Handbook',
        summary:
          'How the Secretariat scopes, runs and closes projects: lifecycle stages, decision gates, RACI, and templates.',
        version: 'v0.8-draft',
        updated: 'Pending upload',
        format: 'PDF',
        author: 'CCE5',
        status: 'coming-soon',
        tags: ['handbook', 'process'],
      },
    ],
  },
  {
    id: 'governance',
    label: 'Governance',
    kicker: 'Roles, decisions, audit',
    intro:
      'Decision-making, roles and review cadence around MethodHub and the wider Secretariat tooling. Aligned with EEA stewardship norms and the CCE5 ↔ EEA IT split.',
    items: [
      {
        id: 'raci-methodhub',
        title: 'MethodHub RACI — CCE5 ↔ EEA IT',
        summary:
          'Who is Responsible, Accountable, Consulted and Informed for code, data, hosting, identity and incident response.',
        version: 'v0.7-draft',
        updated: 'Pending upload',
        format: 'XLSX',
        author: 'CCE5',
        status: 'coming-soon',
        tags: ['RACI', 'stewardship'],
      },
      {
        id: 'review-cadence',
        title: 'Quarterly Review Cadence',
        summary:
          'Calendar of internal reviews: roadmap check-ins, security review windows, and release-readiness gates.',
        version: 'v0.4-draft',
        updated: 'Pending upload',
        format: 'PDF',
        author: 'CCE5',
        status: 'coming-soon',
        tags: ['cadence', 'process'],
      },
    ],
  },
  {
    id: 'methodology',
    label: 'Methodology',
    kicker: 'How we work',
    intro:
      'Methodological notes that explain how the Secretariat produces evidence: literature workflows, scenario screening, qualitative-coding conventions, and AI-assistance ground rules.',
    items: [
      {
        id: 'literature-workflow',
        title: 'Literature Workflow — DOI to Citation',
        summary:
          'How references move from DOI lookup, through annotation, into draft outputs via the Word add-in.',
        version: 'v0.6-draft',
        updated: 'Pending upload',
        format: 'MD',
        author: 'CCE5',
        status: 'coming-soon',
        tags: ['workflow', 'references'],
      },
      {
        id: 'ai-assistance-rules',
        title: 'AI Assistance — Ground Rules',
        summary:
          'When and how Secretariat staff use AI inside MethodHub, the citation requirement, and the audit trail expectations.',
        version: 'v0.5-draft',
        updated: 'Pending upload',
        format: 'PDF',
        author: 'CCE5',
        status: 'coming-soon',
        tags: ['AI', 'ethics'],
      },
    ],
  },
  {
    id: 'change-log',
    label: 'Change log',
    kicker: 'What moved',
    intro:
      'Versioned history of the strategy and framework documents themselves — every signed change, with the document, the date, and a one-line rationale.',
    items: [
      {
        id: 'change-log-2026',
        title: 'Strategy & Framework Change Log — 2026',
        summary:
          'Rolling change log covering all documents in this module for the 2026 calendar year.',
        version: 'v0.1-draft',
        updated: 'Pending upload',
        format: 'MD',
        author: 'CCE5',
        status: 'coming-soon',
        tags: ['changelog'],
      },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function statusChip(status: DocStatus) {
  if (status === 'available') {
    return {
      label: 'Available',
      cls: 'bg-[#E0F2F1] text-[#00928F] border-[#00928F]/40',
    };
  }
  if (status === 'draft') {
    return {
      label: 'Draft',
      cls: 'bg-[#FFF3E0] text-[#B05814] border-[#EF6C00]/40',
    };
  }
  return {
    label: 'Coming soon',
    cls: 'bg-[#F5F6F7] text-[#3D5265]/70 border-[#B8BCC2]',
  };
}

function totalDocs(): number {
  return SECTIONS.reduce((s, sec) => s + sec.items.length, 0);
}

function totalAvailable(): number {
  return SECTIONS.reduce(
    (s, sec) => s + sec.items.filter((i) => i.status === 'available').length,
    0,
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// DocCard — single document tile. Renders as an <a> when the file is in the
// repo (status: 'available' + href), otherwise as a dashed-border placeholder
// so the catalogue stays usable while files are being uploaded.
// ──────────────────────────────────────────────────────────────────────────────

function DocCardBody({ doc, isAvailable }: { doc: DocumentEntry; isAvailable: boolean }) {
  const chip = statusChip(doc.status);
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.14em] text-[#8A95A3]">
          {doc.format} · {doc.version}
        </span>
        <span
          className={`font-mono text-[9.5px] tracking-[0.14em] uppercase px-2 py-0.5 rounded-sm border ${chip.cls}`}
        >
          {chip.label}
        </span>
      </div>

      <h3
        className={`mt-3 text-[14.5px] font-bold leading-snug ${
          isAvailable
            ? 'text-[#3D5265] group-hover:text-[#00928F] transition'
            : 'text-[#3D5265]'
        }`}
      >
        {doc.title}
      </h3>

      <p className="mt-1.5 text-[12.5px] text-[#3D5265]/75 leading-relaxed flex-1">
        {doc.summary}
      </p>

      <dl className="mt-3 pt-2.5 border-t border-[#E6E7E8] font-mono text-[10.5px] text-[#3D5265]/80 grid grid-cols-2 gap-y-1">
        <dt className="tracking-[0.1em] text-[#8A95A3]">AUTHOR</dt>
        <dd className="text-right text-[#3D5265]">{doc.author}</dd>
        <dt className="tracking-[0.1em] text-[#8A95A3]">UPDATED</dt>
        <dd className="text-right text-[#3D5265]">{doc.updated}</dd>
      </dl>

      {doc.tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {doc.tags.map((t) => (
            <li
              key={t}
              className="font-mono text-[9.5px] tracking-[0.08em] uppercase text-[#3D5265]/60 bg-[#F5F6F7] border border-[#E6E7E8] rounded-sm px-1.5 py-0.5"
            >
              {t}
            </li>
          ))}
        </ul>
      )}

      <span
        className={`mt-3 inline-flex items-center gap-1 text-[12px] font-semibold transition-all ${
          isAvailable
            ? 'text-[#E87722] group-hover:gap-2'
            : 'text-[#3D5265]/50'
        }`}
      >
        {isAvailable ? 'Open document' : 'File pending upload'}
        {isAvailable && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        )}
      </span>
    </>
  );
}

function DocCard({ doc }: { doc: DocumentEntry }) {
  const isAvailable = doc.status === 'available' && !!doc.href;

  if (isAvailable && doc.href) {
    return (
      <a
        href={doc.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group block bg-white border border-[#E6E7E8] p-4 rounded-sm hover:border-[#00928F] hover:shadow-md hover:-translate-y-[1px] transition flex flex-col"
      >
        <DocCardBody doc={doc} isAvailable />
      </a>
    );
  }

  return (
    <div className="bg-white border border-dashed border-[#B8BCC2] p-4 rounded-sm flex flex-col opacity-95">
      <DocCardBody doc={doc} isAvailable={false} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export default function StrategyDocsPage() {
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);

  const tally = useMemo(
    () => ({
      total: totalDocs(),
      available: totalAvailable(),
      sections: SECTIONS.length,
    }),
    [],
  );

  return (
    <div className="min-h-screen bg-white text-[#3D5265]">
      <SiteHeader />
      <PageHero
        title="Strategy & Framework Docs"
        subtitle={
          <>
            A documentation-style overview of the Secretariat&rsquo;s internal{' '}
            <strong className="text-[#3D5265]">strategy</strong> and{' '}
            <strong className="text-[#3D5265]">project-framework</strong> documents — the
            same look and wayfinding as the MethodHub documentation site, applied to the
            governing material behind the product. The catalogue below is the final
            structure; the actual files are being prepared and will appear here once
            uploaded to <code className="font-mono text-[12px] bg-[#FBFBFA] border border-[#E6E7E8] px-1.5 py-0.5 rounded-sm">public/strategy-docs/</code>.
          </>
        }
      />

      {/* ───────────────────────── Beta-status banner ───────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-6">
        <div className="border border-dashed border-[#E87722]/60 bg-[#FFF7EE] rounded-sm px-4 py-3 flex flex-wrap items-center gap-3 text-[12px] text-[#3D5265]">
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase px-2 py-0.5 rounded-sm bg-white border border-[#E87722]/40 text-[#E87722] font-semibold">
            Beta · skeleton
          </span>
          <span className="text-[#3D5265]/80">
            Layout and catalogue are in place. <strong>Document files arrive next:</strong>{' '}
            once uploaded, set <code className="font-mono text-[11px] bg-white border border-[#E6E7E8] px-1 py-0.5 rounded-sm">status: &lsquo;available&rsquo;</code>
            {' '}and a <code className="font-mono text-[11px] bg-white border border-[#E6E7E8] px-1 py-0.5 rounded-sm">href</code> on the matching entry.
          </span>
        </div>
      </section>

      {/* ───────────────────────── Quick facts ───────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-6">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#E6E7E8] border border-[#E6E7E8] rounded-sm overflow-hidden">
          {[
            { k: 'Sections', v: String(tally.sections), sub: 'strategy, framework, governance, …' },
            { k: 'Documents catalogued', v: String(tally.total), sub: 'across all sections' },
            { k: 'Available now', v: String(tally.available), sub: 'rest pending upload' },
            { k: 'Owner', v: 'CCE5', sub: 'Secretariat code stewardship' },
          ].map((s) => (
            <div key={s.k} className="bg-white px-3 py-2.5 sm:px-4 sm:py-3">
              <dt className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#8A95A3]">
                {s.k}
              </dt>
              <dd className="mt-1 text-[20px] sm:text-[22px] font-bold text-[#3D5265] tabular-nums leading-none">
                {s.v}
              </dd>
              <dd className="mt-1 text-[11px] text-[#3D5265]/60">{s.sub}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ───────────────────────── Two-column docs layout ───────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 lg:gap-10">
          {/* Sticky on-this-page nav */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#00928F] font-semibold mb-2">
              On this page
            </p>
            <nav className="border-l border-[#E6E7E8]">
              {SECTIONS.map((sec) => {
                const active = sec.id === activeSection;
                return (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={() => setActiveSection(sec.id)}
                    className={`block pl-3 -ml-px py-1.5 text-[12.5px] border-l-2 transition ${
                      active
                        ? 'border-[#00928F] text-[#00928F] font-semibold'
                        : 'border-transparent text-[#3D5265]/75 hover:text-[#00928F] hover:border-[#00928F]/40'
                    }`}
                  >
                    {sec.label}
                  </a>
                );
              })}
            </nav>
            <p className="mt-6 text-[11px] text-[#3D5265]/55 leading-relaxed">
              The structure mirrors the MethodHub docs site so anyone landing here will
              feel oriented in the same way.
            </p>
          </aside>

          {/* Sections */}
          <div className="min-w-0 space-y-12">
            {SECTIONS.map((sec) => (
              <article key={sec.id} id={sec.id} className="scroll-mt-24">
                <header className="border-l-2 border-[#00928F] pl-4 mb-4">
                  <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#00928F] font-semibold">
                    {sec.kicker}
                  </p>
                  <h2 className="mt-1 text-[20px] sm:text-[22px] font-bold text-[#3D5265]">
                    {sec.label}
                  </h2>
                  <p className="mt-2 text-[13px] sm:text-[14px] text-[#3D5265]/80 leading-relaxed max-w-3xl">
                    {sec.intro}
                  </p>
                </header>

                <ul className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                  {sec.items.map((doc) => (
                    <li key={doc.id}>
                      <DocCard doc={doc} />
                    </li>
                  ))}
                </ul>
              </article>
            ))}

            {/* Footer note */}
            <p className="text-[11px] text-[#3D5265]/55 leading-relaxed max-w-3xl border-t border-[#E6E7E8] pt-4">
              This module is intentionally a thin overlay on a folder of documents:
              the source of truth stays in the underlying files, and this page just
              gives them the same wayfinding as the rest of MethodHub. Once a file
              moves out of <em>coming soon</em>, the card links straight to the PDF
              or DOCX served from{' '}
              <code className="font-mono text-[11px] bg-[#FBFBFA] border border-[#E6E7E8] px-1.5 py-0.5 rounded-sm">
                /strategy-docs/&lt;file&gt;
              </code>
              .
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
