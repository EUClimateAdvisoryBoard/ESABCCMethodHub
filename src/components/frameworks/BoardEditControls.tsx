/**
 * Shared edit-mode controls for the computed "Advanced" flow-chart views
 * (results-chain v2/v4/v5 and policy-loop v6).
 *
 * These give every computed board the same editing affordances the sector
 * `FrameworkBoard` has — an Edit/Reset toolbar, an indicator picker for linking
 * chips to the catalogue, and small inline text editors — so the four views can
 * be relabelled, restructured and re-wired and the edits persisted per version.
 */
'use client';
import { useState } from 'react';
import type { Indicator } from '@/data/ecno-indicators';

/** The Edit-board / Reset toolbar shown above every editable board. */
export function BoardEditToolbar({
  editing,
  onToggleEditing,
  onReset,
  builtIn,
  children,
}: {
  editing: boolean;
  onToggleEditing: () => void;
  onReset: () => void;
  builtIn: boolean;
  /** Extra edit actions (e.g. "+ add group") rendered when editing. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <button
        onClick={onToggleEditing}
        className={`text-xs font-semibold px-3 py-1.5 rounded-md border ${
          editing
            ? 'bg-primary text-white border-primary'
            : 'border-grey-200 text-tertiary-dark hover:bg-grey-50'
        }`}
      >
        {editing ? '✓ Editing' : '✎ Edit board'}
      </button>
      {editing && children}
      <div className="flex-1" />
      <button
        onClick={onReset}
        className="text-xs font-semibold px-3 py-1.5 rounded-md border border-grey-200 text-red-600 hover:border-red-300"
        title={
          builtIn
            ? 'Restore this version to its published content'
            : 'Restore this version to the copy it was created from'
        }
      >
        {builtIn ? 'Reset to published' : 'Reset to original copy'}
      </button>
    </div>
  );
}

/** The amber "edit mode is on" hint banner. */
export function EditModeHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
      {children}
    </div>
  );
}

/**
 * A "+ link data" button that expands into a searchable indicator picker and
 * calls `onAdd(indicatorId)` with the chosen series. Used to add chips to any
 * column of the computed boards.
 */
export function AddIndicatorControl({
  allIndicators,
  onAdd,
  label = '+ link data',
  tone = 'light',
}: {
  allIndicators: Indicator[];
  onAdd: (indicatorId: string) => void;
  label?: string;
  /** 'light' on white surfaces, 'dark' on coloured cards. */
  tone?: 'light' | 'dark';
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={
          tone === 'dark'
            ? 'inline-flex items-center rounded border border-dashed border-white/70 text-white px-1.5 py-0.5 text-[10px] hover:bg-white/10'
            : 'inline-flex items-center rounded border border-dashed border-grey-300 text-tertiary px-1.5 py-0.5 text-[10px] hover:bg-grey-50'
        }
      >
        {label}
      </button>
    );
  }
  return (
    <select
      autoFocus
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) onAdd(e.target.value);
        setOpen(false);
      }}
      onBlur={() => setOpen(false)}
      className="text-[10px] text-gray-800 border rounded px-1 py-0.5 max-w-[200px]"
    >
      <option value="" disabled>
        Pick an indicator…
      </option>
      {allIndicators.map((i) => (
        <option key={i.id} value={i.id}>
          {i.code ? `${i.code} — ` : ''}
          {i.name}
        </option>
      ))}
    </select>
  );
}

/**
 * A generic "+ add" picker over a list of {id, label} options that expands into
 * a select and calls `onPick(id)`. Used for adding policy instruments and
 * scenario benchmarks to the policy-loop board.
 */
export function AddFromListControl({
  options,
  onPick,
  label,
  tone = 'light',
}: {
  options: { id: string; label: string }[];
  onPick: (id: string) => void;
  label: string;
  tone?: 'light' | 'dark';
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={
          tone === 'dark'
            ? 'inline-flex items-center rounded border border-dashed border-white/70 text-white px-1.5 py-0.5 text-[10px] hover:bg-white/10'
            : 'inline-flex items-center rounded border border-dashed border-grey-300 text-tertiary px-1.5 py-0.5 text-[10px] hover:bg-grey-50'
        }
      >
        {label}
      </button>
    );
  }
  return (
    <select
      autoFocus
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) onPick(e.target.value);
        setOpen(false);
      }}
      onBlur={() => setOpen(false)}
      className="text-[10px] text-gray-800 border rounded px-1 py-0.5 max-w-[200px]"
    >
      <option value="" disabled>
        Pick…
      </option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** A small inline text input for editing a label/title in place. */
export function InlineInput({
  value,
  onChange,
  className = '',
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className={`bg-white/90 text-gray-900 rounded px-1 py-0.5 border border-grey-300 focus:border-primary outline-none text-[11px] ${className}`}
    />
  );
}

/** A small "×" delete button. */
export function DeleteButton({
  onClick,
  tone = 'light',
  label = 'Delete',
}: {
  onClick: () => void;
  tone?: 'light' | 'dark';
  label?: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={
        tone === 'dark'
          ? 'text-white/70 hover:text-white text-base leading-none'
          : 'text-grey-400 hover:text-red-600 text-base leading-none'
      }
      aria-label={label}
    >
      ×
    </button>
  );
}
