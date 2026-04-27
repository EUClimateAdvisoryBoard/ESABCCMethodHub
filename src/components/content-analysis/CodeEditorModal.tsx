'use client';

import { useEffect, useRef, useState } from 'react';
import type { CodeNode } from '@/lib/content-analysis/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

export type CodeEditorMode = 'add' | 'rename' | 'recolor';

export interface CodeEditorPayload {
  mode: CodeEditorMode;
  /** For `add`: parent code id or null for root. For `rename`/`recolor`: target id. */
  targetId: string | null;
  /** Optional pre-fill for `add` mode — used by the "+ New tag from
   *  selection" path so the user lands on the modal with the highlighted
   *  text already in the name field, ready to tweak. */
  seedName?: string;
  /** Optional segment to create immediately after the new tag is added.
   *  Caller-supplied so the modal stays presentational. */
  pendingSegmentInput?: {
    startChar: number;
    endChar: number;
    text: string;
    blockId?: string;
  };
}

export interface CodeEditorResult {
  name?: string;
  color?: string;
  description?: string;
}

interface Props {
  open: boolean;
  payload: CodeEditorPayload | null;
  codes: CodeNode[];
  onCancel: () => void;
  onSubmit: (result: CodeEditorResult) => void;
  /** Optional reorganise actions exposed in `rename` mode. */
  onMerge?: (sourceId: string, targetId: string) => void;
  onMove?: (id: string, newParentId: string | null) => void;
  /** Number of segments tagged with the current code — shown in the merge confirm copy. */
  segmentCount?: number;
}

// 36 preset colours organised by hue family — teal/blue/purple/pink/red/
// orange/amber/yellow/lime/green/cyan/slate. Users can still pick any
// hex via the native colour input below; these just anchor a sensible,
// WCAG-decent default set that lines up with the extended PALETTE used
// in the master code-system seed.
const PRESET_COLORS = [
  // row 1 — teals & blues
  '#00928F', '#14B8A6', '#06B6D4', '#0EA5E9', '#0891B2', '#0065A4', '#0369A1', '#38BDF8',
  // row 2 — purples & pinks
  '#6366F1', '#4F46E5', '#7C3AED', '#8B5CF6', '#9333EA', '#A855F7', '#C026D3', '#DB2777',
  // row 3 — reds & oranges & ambers
  '#BE185D', '#E11D48', '#B83230', '#EA580C', '#F97316', '#E87722', '#D97706', '#F59E0B',
  // row 4 — yellows & greens
  '#FACC15', '#CA8A04', '#84CC16', '#65A30D', '#16A34A', '#22C55E', '#15803D', '#0F766E',
  // row 5 — cool neutrals & earth
  '#3D5265', '#475569', '#6B7280', '#7E22CE',
];

/**
 * Radix-Dialog-backed version of the code editor. Handles add / rename /
 * recolour with proper focus trap, keyboard nav, scroll lock and ARIA
 * labelling out of the box.
 */
export default function CodeEditorModal({
  open,
  payload,
  codes,
  onCancel,
  onSubmit,
  onMerge,
  onMove,
  segmentCount = 0,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [moveParentId, setMoveParentId] = useState<string>('');

  useEffect(() => {
    if (!open || !payload) return;
    if (payload.mode === 'rename' || payload.mode === 'recolor') {
      const cur = codes.find(c => c.id === payload.targetId);
      setName(cur?.name ?? '');
      setDescription(cur?.description ?? '');
      setColor(cur?.color ?? PRESET_COLORS[0]);
    } else {
      setName(payload.seedName ?? '');
      setDescription('');
      setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    }
    setMergeTargetId('');
    setMoveParentId('');
  }, [open, payload, codes]);

  if (!payload) return null;

  const parentPath = buildParentPath(payload, codes);
  const title =
    payload.mode === 'add'
      ? parentPath.length > 0
        ? `New child tag under "${parentPath[parentPath.length - 1]}"`
        : 'New root tag'
      : payload.mode === 'rename'
        ? 'Rename tag'
        : 'Change tag colour';

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (payload.mode !== 'recolor' && !trimmed) return;
    onSubmit({
      name: trimmed || undefined,
      description: description.trim() || undefined,
      color,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent onOpenAutoFocus={(e) => {
        e.preventDefault();
        inputRef.current?.focus();
      }}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {parentPath.length > 0 && (
              <DialogDescription>{parentPath.join(' ▸ ')}</DialogDescription>
            )}
          </DialogHeader>

          <div className="px-4 py-4 space-y-4">
            {payload.mode !== 'recolor' && (
              <label className="block">
                <span className="block text-[11px] font-medium text-[#3D5265] mb-1">
                  Name <span className="text-[#B83230]">*</span>
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-[#E6E7E8] rounded-sm px-2 py-1.5 text-[13px] text-[#3D5265] focus:border-[#00928F] focus:outline-none"
                  placeholder="e.g. Just transition"
                  autoComplete="off"
                  required
                />
              </label>
            )}

            {payload.mode === 'add' && (
              <label className="block">
                <span className="block text-[11px] font-medium text-[#3D5265] mb-1">
                  Description <span className="text-[#8A95A3]">(optional)</span>
                </span>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full border border-[#E6E7E8] rounded-sm px-2 py-1.5 text-[12.5px] text-[#3D5265] focus:border-[#00928F] focus:outline-none resize-none"
                  placeholder="What does this tag capture? Used to guide AI pre-tagging."
                />
              </label>
            )}

            <div>
              <span className="block text-[11px] font-medium text-[#3D5265] mb-1.5">
                Colour
              </span>
              <div className="grid grid-cols-8 gap-1.5">
                {PRESET_COLORS.map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-6 h-6 rounded-sm border-2 transition"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? '#3D5265' : 'transparent',
                    }}
                    aria-label={c}
                    title={c}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10.5px] text-[#8A95A3]">Custom:</span>
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-8 h-8 rounded-sm border border-[#E6E7E8] cursor-pointer"
                  title="Pick a custom colour"
                />
                <input
                  type="text"
                  value={color}
                  onChange={e => {
                    const v = e.target.value.trim();
                    if (/^#[0-9A-Fa-f]{6}$/.test(v)) setColor(v);
                    else if (/^[0-9A-Fa-f]{6}$/.test(v)) setColor(`#${v}`);
                    else setColor(v);
                  }}
                  className="font-mono text-[10.5px] text-[#3D5265] border border-[#E6E7E8] rounded-sm px-1.5 py-0.5 w-24"
                  placeholder="#RRGGBB"
                  aria-label="Custom hex colour"
                />
              </div>
            </div>
          </div>

          {payload.mode === 'rename' && payload.targetId && (onMerge || onMove) && (
            <div className="px-4 pb-4 -mt-2 border-t border-[#E6E7E8] pt-3">
              <div className="text-[11px] font-medium text-[#3D5265] mb-2">Reorganise</div>
              {onMerge && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] text-[#8A95A3] w-16 shrink-0">Merge into</span>
                  <select
                    value={mergeTargetId}
                    onChange={e => setMergeTargetId(e.target.value)}
                    className="flex-1 border border-[#E6E7E8] rounded-sm px-1.5 py-1 text-[12px] text-[#3D5265]">
                    <option value="">— pick a target tag —</option>
                    {codes
                      .filter(c => c.id !== payload.targetId)
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (!mergeTargetId || !payload.targetId) return;
                      const target = codes.find(c => c.id === mergeTargetId);
                      const ok = window.confirm(
                        `Merge this tag into "${target?.name}"?\n` +
                        `${segmentCount} segment(s) will be reassigned. The original tag will be deleted.`,
                      );
                      if (!ok) return;
                      onMerge(payload.targetId, mergeTargetId);
                      onCancel();
                    }}
                    disabled={!mergeTargetId}>
                    Merge
                  </Button>
                </div>
              )}
              {onMove && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#8A95A3] w-16 shrink-0">Move under</span>
                  <select
                    value={moveParentId}
                    onChange={e => setMoveParentId(e.target.value)}
                    className="flex-1 border border-[#E6E7E8] rounded-sm px-1.5 py-1 text-[12px] text-[#3D5265]">
                    <option value="">— root —</option>
                    {codes
                      .filter(c => c.id !== payload.targetId)
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (!payload.targetId) return;
                      onMove(payload.targetId, moveParentId || null);
                      onCancel();
                    }}>
                    Move
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit" variant="primary">
              {payload.mode === 'add' ? 'Create tag' : payload.mode === 'rename' ? 'Save' : 'Update colour'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function buildParentPath(payload: CodeEditorPayload, codes: CodeNode[]): string[] {
  const out: string[] = [];
  const visited = new Set<string>();
  let cur: string | null;
  if (payload.mode === 'add') {
    cur = payload.targetId;
  } else {
    const target = codes.find(c => c.id === payload.targetId);
    cur = target?.parentId ?? null;
  }
  while (cur && !visited.has(cur)) {
    visited.add(cur);
    const node = codes.find(c => c.id === cur);
    if (!node) break;
    out.unshift(node.name);
    cur = node.parentId;
  }
  return out;
}
