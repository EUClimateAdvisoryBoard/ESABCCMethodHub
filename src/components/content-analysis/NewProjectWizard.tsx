'use client';

import { useMemo, useState } from 'react';
import type { CodeNode, AnalysisMode } from '@/lib/content-analysis/types';

interface Props {
  /** Top-level (parentId === null) master codes. The user ticks these to
   *  define the corpus scope of the new project. */
  rootCodes: CodeNode[];
  /** Direct children of each root, so the wizard can preview the subtree
   *  the user is about to include. */
  codesByParent: Map<string | null, CodeNode[]>;
  /** Document counts per master code (for the checkbox badges). */
  docCountsByCode: Record<string, number>;
  onCancel: () => void;
  onCreate: (input: {
    name: string;
    description: string;
    mode: AnalysisMode;
    masterCodeSelection: string[];
  }) => void;
}

const MODE_OPTIONS: Array<{ id: AnalysisMode; label: string; hint: string }> = [
  { id: 'horizontal',   label: 'Horizontal coherence',   hint: 'Cross-document consistency of a concept.' },
  { id: 'vertical',     label: 'Vertical coherence',     hint: 'Targets ↔ budgets ↔ implementation alignment.' },
  { id: 'longitudinal', label: 'Longitudinal',           hint: 'How policies evolve across successive versions.' },
  { id: 'outcomes',     label: 'Outcomes',               hint: 'Downstream indicators and implementation.' },
];

/**
 * Two-column wizard for creating a project:
 *   – Left: name / description / analysis mode
 *   – Right: tick top-level master codes to define corpus scope.
 * Documents that carry any of the ticked codes fall into the project.
 */
export default function NewProjectWizard({
  rootCodes,
  codesByParent,
  docCountsByCode,
  onCancel,
  onCreate,
}: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<AnalysisMode>('horizontal');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const totalSelectedDocs = useMemo(() => {
    let total = 0;
    for (const id of selected) total += docCountsByCode[id] ?? 0;
    return total;
  }, [selected, docCountsByCode]);

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      description: description.trim(),
      mode,
      masterCodeSelection: [...selected],
    });
  };

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 lg:py-12">
      <header className="mb-6 flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#E87722] font-semibold">
            <span className="inline-block w-6 border-t border-[#E87722] align-middle mr-2" />
            Step 1 of 1 · Define project scope
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

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start"
      >
        {/* LEFT: metadata */}
        <div className="space-y-5">
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
            <span className="block text-[11.5px] font-semibold text-[#3D5265] mb-2">
              Analysis mode
            </span>
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

        {/* RIGHT: scope selection */}
        <div className="border border-[#E6E7E8] rounded-sm bg-white">
          <header className="px-3 py-2 border-b border-[#E6E7E8] bg-[#FBFBFA] flex items-baseline justify-between">
            <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#8A95A3] font-semibold">
              Corpus scope
            </span>
            <span className="font-mono text-[11px] text-[#3D5265]/80 tabular-nums">
              {selected.size > 0
                ? `${selected.size} tag${selected.size === 1 ? '' : 's'} · ~${totalSelectedDocs} docs`
                : 'No selection = whole library'}
            </span>
          </header>
          <p className="px-3 py-2 text-[11.5px] text-[#3D5265]/70 border-b border-[#E6E7E8]">
            Tick the top-level master tags that define the corpus for this project.
            Documents carrying any of these tags fall in scope; nothing else does.
          </p>
          <ul className="max-h-[56vh] overflow-y-auto divide-y divide-[#E6E7E8]">
            {rootCodes.map(root => {
              const children = codesByParent.get(root.id) ?? [];
              const count = docCountsByCode[root.id] ?? 0;
              const checked = selected.has(root.id);
              return (
                <li key={root.id} className="px-3 py-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(root.id)}
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
                        <span className="block mt-0.5 text-[11.5px] text-[#3D5265]/70">
                          {root.description}
                        </span>
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

        <div className="md:col-span-2 flex items-center justify-between gap-3 pt-2 border-t border-[#E6E7E8]">
          <p className="text-[11.5px] text-[#3D5265]/70">
            You can still edit the scope after creation (Project &gt; Scope panel in the workbench).
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-[12.5px] font-medium text-[#3D5265] hover:bg-[#F3F4F6] rounded-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-1.5 text-[12.5px] font-medium text-white bg-[#00928F] hover:bg-[#006F6C] rounded-sm disabled:bg-[#B8BCC2] disabled:cursor-not-allowed"
            >
              Create project →
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
