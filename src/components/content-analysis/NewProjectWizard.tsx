'use client';

import { useMemo, useState } from 'react';
import type { AnalysisDocument, CodeNode, AnalysisMode } from '@/lib/content-analysis/types';
import { documentKindLabel } from '@/lib/content-analysis/source-tier';

interface Props {
  /** Top-level (parentId === null) master codes. The user ticks these to
   *  define the corpus scope of the new project. */
  rootCodes: CodeNode[];
  /** Direct children of each root, so the wizard can preview the subtree
   *  the user is about to include. */
  codesByParent: Map<string | null, CodeNode[]>;
  /** Document counts per master code (for the checkbox badges). */
  docCountsByCode: Record<string, number>;
  /** Full document list — used by Step 1's "ad-hoc add" picker. */
  documents: AnalysisDocument[];
  onCancel: () => void;
  onCreate: (input: {
    name: string;
    description: string;
    mode: AnalysisMode;
    masterCodeSelection: string[];
    documentAllowList: string[];
  }) => void;
}

const MODE_OPTIONS: Array<{ id: AnalysisMode; label: string; hint: string }> = [
  { id: 'horizontal',   label: 'Horizontal coherence',   hint: 'Cross-document consistency of a concept.' },
  { id: 'vertical',     label: 'Vertical coherence',     hint: 'Targets ↔ budgets ↔ implementation alignment.' },
  { id: 'longitudinal', label: 'Longitudinal',           hint: 'How policies evolve across successive versions.' },
  { id: 'outcomes',     label: 'Outcomes',               hint: 'Downstream indicators and implementation.' },
];

type Step = 1 | 2;

/**
 * Two-step wizard for creating a project.
 *
 *   Step 1 — Documents in scope:
 *     * tick top-level master tags to filter the corpus, AND/OR
 *     * pick individual documents ad hoc from a search list.
 *
 *   Step 2 — Project metadata + analysis mode.
 *
 * The two steps separate "what's in" from "what's it about" — reviewers
 * struggled with the previous all-in-one screen because the right-rail
 * scope panel was easy to overlook.
 */
export default function NewProjectWizard({
  rootCodes,
  codesByParent,
  docCountsByCode,
  documents,
  onCancel,
  onCreate,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<AnalysisMode>('horizontal');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [allowList, setAllowList] = useState<Set<string>>(new Set());
  const [docQuery, setDocQuery] = useState('');

  const totalDocsByTag = useMemo(() => {
    let total = 0;
    for (const id of selectedTags) total += docCountsByCode[id] ?? 0;
    return total;
  }, [selectedTags, docCountsByCode]);

  const toggleTag = (id: string) =>
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleDoc = (id: string) =>
    setAllowList(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const filteredDocs = useMemo(() => {
    const q = docQuery.trim().toLowerCase();
    if (!q) return documents.slice(0, 50);
    return documents
      .filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.shortTitle.toLowerCase().includes(q) ||
        (d.celexNumber ?? '').toLowerCase().includes(q),
      )
      .slice(0, 80);
  }, [documents, docQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      description: description.trim(),
      mode,
      masterCodeSelection: [...selectedTags],
      documentAllowList: [...allowList],
    });
  };

  const scopeSummary = (() => {
    if (allowList.size > 0) return `${allowList.size} document${allowList.size === 1 ? '' : 's'} (explicit)`;
    if (selectedTags.size > 0) return `${selectedTags.size} tag${selectedTags.size === 1 ? '' : 's'} → ~${totalDocsByTag} docs`;
    return 'Whole library (no scope filter)';
  })();

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 lg:py-12">
      <header className="mb-6 flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#E87722] font-semibold">
            <span className="inline-block w-6 border-t border-[#E87722] align-middle mr-2" />
            Step {step} of 2 · {step === 1 ? 'Define corpus scope' : 'Project metadata'}
          </p>
          <h2 className="mt-3 text-[22px] sm:text-[26px] font-bold text-[#3D5265]">New project</h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-[12.5px] font-medium text-[#8A95A3] hover:text-[#3D5265] -mr-1"
        >
          ← Cancel
        </button>
      </header>

      {/* Stepper indicator */}
      <ol className="mb-6 flex items-center gap-2 text-[11.5px]">
        {[1, 2].map(n => (
          <li key={n} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(n as Step)}
              className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-semibold text-[11px] ${
                step === n
                  ? 'bg-[#00928F] text-white'
                  : 'bg-[#E6E7E8] text-[#3D5265] hover:bg-[#B8BCC2]'
              }`}
              aria-current={step === n ? 'step' : undefined}
            >
              {n}
            </button>
            <span className={`font-medium ${step === n ? 'text-[#3D5265]' : 'text-[#8A95A3]'}`}>
              {n === 1 ? 'Documents in scope' : 'Project details'}
            </span>
            {n === 1 && <span className="mx-2 text-[#B8BCC2]">·</span>}
          </li>
        ))}
      </ol>

      <form
        onSubmit={handleSubmit}
        className="border border-[#E6E7E8] rounded-sm bg-white"
      >
        {/* ── STEP 1: Documents in scope ───────────────────────────── */}
        {step === 1 && (
          <div className="grid gap-0 md:grid-cols-2 divide-x divide-[#E6E7E8]">
            <div className="p-4">
              <h3 className="text-[13px] font-semibold text-[#3D5265]">By master tag</h3>
              <p className="mt-1 text-[11.5px] text-[#3D5265]/70">
                Documents carrying any of the ticked tags fall in scope.
                Pick a few — you can always widen the scope later.
              </p>
              <ul className="mt-3 max-h-[44vh] overflow-y-auto divide-y divide-[#E6E7E8] border border-[#E6E7E8] rounded-sm">
                {rootCodes.map(root => {
                  const children = codesByParent.get(root.id) ?? [];
                  const count = docCountsByCode[root.id] ?? 0;
                  const checked = selectedTags.has(root.id);
                  return (
                    <li key={root.id} className="px-3 py-2">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTag(root.id)}
                          className="mt-0.5 w-3.5 h-3.5 accent-[#00928F]"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="flex items-baseline gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-sm inline-block shrink-0 mt-1"
                              style={{ backgroundColor: root.color }}
                              aria-hidden
                            />
                            <span className="font-semibold text-[13px] text-[#3D5265]">{root.name}</span>
                            <span className="font-mono text-[10.5px] text-[#8A95A3] tabular-nums ml-auto">
                              {count} docs
                            </span>
                          </span>
                          {root.description && (
                            <span className="block mt-0.5 text-[11.5px] text-[#3D5265]/70">{root.description}</span>
                          )}
                          {children.length > 0 && (
                            <span className="block mt-1 font-mono text-[10px] text-[#8A95A3] uppercase tracking-[0.08em]">
                              incl. {children.map(c => c.name).slice(0, 6).join(' · ')}
                              {children.length > 6 ? ` · +${children.length - 6}` : ''}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="p-4">
              <h3 className="text-[13px] font-semibold text-[#3D5265]">Add specific documents</h3>
              <p className="mt-1 text-[11.5px] text-[#3D5265]/70">
                Optional. When set, this list <em>overrides</em> the tag filter
                — only the documents you tick will be in scope.
              </p>
              <input
                type="search"
                value={docQuery}
                onChange={e => setDocQuery(e.target.value)}
                placeholder="Search documents by title or CELEX…"
                className="mt-3 w-full border border-[#E6E7E8] rounded-sm px-2 py-1.5 text-[12px] text-[#3D5265] focus:border-[#00928F] focus:outline-none"
              />
              <div className="mt-2 flex items-center justify-between text-[10.5px] text-[#8A95A3]">
                <span>{filteredDocs.length} shown · {documents.length} total</span>
                {allowList.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setAllowList(new Set())}
                    className="font-medium text-[#B83230] hover:text-[#7F2120]"
                  >
                    Clear ({allowList.size})
                  </button>
                )}
              </div>
              <ul className="mt-2 max-h-[40vh] overflow-y-auto divide-y divide-[#E6E7E8] border border-[#E6E7E8] rounded-sm">
                {filteredDocs.map(d => {
                  const checked = allowList.has(d.id);
                  return (
                    <li key={d.id} className="px-3 py-1.5">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDoc(d.id)}
                          className="mt-0.5 w-3.5 h-3.5 accent-[#00928F]"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[12px] font-medium text-[#3D5265] truncate">{d.shortTitle}</span>
                          <span className="block font-mono text-[10px] text-[#8A95A3] truncate">
                            {d.celexNumber ?? '—'} · {documentKindLabel(d)}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {/* ── STEP 2: Project metadata + mode ─────────────────────── */}
        {step === 2 && (
          <div className="p-4 space-y-5">
            <label className="block">
              <span className="block text-[11.5px] font-semibold text-[#3D5265] mb-1">
                Project name <span className="text-[#B83230]">*</span>
              </span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Adaptation 2.0, Industry decarbonisation, etc."
                className="w-full border border-[#E6E7E8] rounded-sm px-3 py-2 text-[13.5px] text-[#3D5265] focus:border-[#00928F] focus:outline-none"
                autoFocus
                required
              />
            </label>

            <label className="block">
              <span className="block text-[11.5px] font-semibold text-[#3D5265] mb-1">
                Description <span className="text-[#8A95A3] font-normal">(optional)</span>
              </span>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full border border-[#E6E7E8] rounded-sm px-3 py-2 text-[12.5px] text-[#3D5265] focus:border-[#00928F] focus:outline-none resize-none"
                placeholder="What question is this project answering?"
              />
            </label>

            <div>
              <span className="block text-[11.5px] font-semibold text-[#3D5265] mb-2">Analysis mode</span>
              <div className="space-y-2">
                {MODE_OPTIONS.map(m => (
                  <label
                    key={m.id}
                    className={`block border rounded-sm p-2.5 cursor-pointer transition ${
                      mode === m.id
                        ? 'border-[#00928F] bg-[#00928F]/5'
                        : 'border-[#E6E7E8] hover:border-[#B8BCC2]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value={m.id}
                      checked={mode === m.id}
                      onChange={() => setMode(m.id)}
                      className="mr-2 accent-[#00928F]"
                    />
                    <span className="text-[12.5px] font-medium text-[#3D5265]">{m.label}</span>
                    <p className="ml-[22px] mt-0.5 text-[11.5px] text-[#3D5265]/70">{m.hint}</p>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Footer / navigation ────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[#E6E7E8] bg-[#FBFBFA]">
          <p className="text-[11.5px] text-[#3D5265]/70">
            <strong className="text-[#3D5265]">Scope:</strong> {scopeSummary}
          </p>
          <div className="flex items-center gap-2">
            {step === 1 ? (
              <>
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 py-1.5 text-[12.5px] font-medium text-[#3D5265] hover:bg-[#F3F4F6] rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-1.5 text-[12.5px] font-medium text-white bg-[#00928F] hover:bg-[#006F6C] rounded-sm"
                >
                  Next: project details →
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3 py-1.5 text-[12.5px] font-medium text-[#3D5265] hover:bg-[#F3F4F6] rounded-sm"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="px-4 py-1.5 text-[12.5px] font-medium text-white bg-[#00928F] hover:bg-[#006F6C] rounded-sm disabled:bg-[#B8BCC2] disabled:cursor-not-allowed"
                >
                  Create project →
                </button>
              </>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}
