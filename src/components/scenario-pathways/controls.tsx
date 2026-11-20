/**
 * Scenarios (M · 55) — screening controls.
 *
 * Native `<input type="range">` elements throughout, so keyboard (arrows,
 * Page Up/Down, Home/End) and screen-reader support come for free. The
 * two-handle 2040 timeline overlays two range inputs on one track; only the
 * thumbs receive pointer events.
 */
'use client';

import { ReactNode } from 'react';

const SLIDER_CSS = `
.sp-range{-webkit-appearance:none;appearance:none;background:transparent;width:100%;height:22px;margin:0}
.sp-range:focus-visible{outline:none}
.sp-range::-webkit-slider-runnable-track{height:4px;background:transparent}
.sp-range::-moz-range-track{height:4px;background:transparent}
.sp-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:18px;height:18px;border-radius:9999px;background:#fff;border:3px solid #3b2468;margin-top:-7px;cursor:grab;pointer-events:auto}
.sp-range::-moz-range-thumb{width:14px;height:14px;border-radius:9999px;background:#fff;border:3px solid #3b2468;cursor:grab;pointer-events:auto}
.sp-range:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px rgba(0,75,127,.45)}
.sp-range:focus-visible::-moz-range-thumb{box-shadow:0 0 0 3px rgba(0,75,127,.45)}
.sp-range:disabled::-webkit-slider-thumb{border-color:#bcbec0;cursor:not-allowed}
.sp-range:disabled::-moz-range-thumb{border-color:#bcbec0;cursor:not-allowed}
.sp-dual .sp-range{position:absolute;inset:0;pointer-events:none}
@media (prefers-reduced-motion:no-preference){.sp-fill{transition:left .12s ease,width .12s ease}}
`;

export function SliderStyles() {
  return <style dangerouslySetInnerHTML={{ __html: SLIDER_CSS }} />;
}

function Track({ from, to, disabled, marks }: { from: number; to: number; disabled?: boolean; marks?: { at: number; label?: string; strong?: boolean }[] }) {
  return (
    <>
      <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-grey-200 dark:bg-[var(--mh-border)]" />
      <div
        className="sp-fill absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
        style={{ left: `${from}%`, width: `${Math.max(0, to - from)}%`, background: disabled ? '#BCBEC0' : '#3b2468' }}
      />
      {marks?.map((m) => (
        <span
          key={m.at}
          aria-hidden
          className={`pointer-events-none absolute top-1/2 w-px -translate-y-1/2 ${m.strong ? 'h-3 bg-[#ec621d]' : 'h-2 bg-tertiary/40'}`}
          style={{ left: `${m.at}%` }}
        />
      ))}
    </>
  );
}

const pct = (v: number, min: number, max: number) => ((v - min) / (max - min)) * 100;

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`mh-focus relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors motion-reduce:transition-none ${checked ? 'bg-[#3b2468]' : 'bg-grey-400'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

export function ControlGroup({
  step, title, on, onToggle, children, summary,
}: { step: string; title: string; on?: boolean; onToggle?: (v: boolean) => void; children: ReactNode; summary?: ReactNode }) {
  return (
    <fieldset className="border-t border-grey-200 dark:border-[var(--mh-border)] pt-3">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#ec621d] font-semibold">{step}</p>
          <p className="text-[13px] font-bold text-tertiary-dark dark:text-[var(--mh-fg)]">{title}</p>
          {summary && <p className="mt-0.5 text-[11px] text-tertiary dark:text-[var(--mh-muted)]">{summary}</p>}
        </div>
        {onToggle && <Toggle checked={!!on} onChange={onToggle} label={`Apply step: ${title}`} />}
      </div>
      <div className={`mt-2 ${on === false ? 'opacity-50' : ''}`}>{children}</div>
    </fieldset>
  );
}

export function PresetButtons<T extends string | number>({
  options, value, onPick, disabled,
}: { options: { label: string; value: T; title?: string }[]; value: T | null; onPick: (v: T) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            disabled={disabled}
            title={o.title}
            aria-pressed={active}
            onClick={() => onPick(o.value)}
            className={`mh-focus rounded-full border px-2.5 py-1 font-mono text-[11px] tabular-nums transition-colors motion-reduce:transition-none ${
              active
                ? 'border-[#3b2468] bg-[#3b2468] text-white'
                : 'border-grey-300 bg-white text-tertiary hover:border-[#3b2468] dark:bg-[var(--mh-card)] dark:border-[var(--mh-border)] dark:text-[var(--mh-fg)]'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function SingleSlider({
  label, value, min, max, step, onChange, unit, def, disabled, format,
}: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
  unit?: string; def?: number; disabled?: boolean; format?: (v: number) => string;
}) {
  const f = format ?? ((v: number) => v.toLocaleString('en-GB'));
  const modified = def != null && value !== def;
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[11.5px] font-semibold text-tertiary-dark dark:text-[var(--mh-fg)]">{label}</span>
        <span className={`font-mono text-[11.5px] tabular-nums ${modified ? 'text-[#ec621d] font-bold' : 'text-primary dark:text-[var(--mh-fg)]'}`}>
          {f(value)}{unit ? <span className="text-tertiary"> {unit}</span> : null}
        </span>
      </span>
      <span className="relative mt-1 block h-[22px]">
        <Track from={0} to={pct(value, min, max)} disabled={disabled} marks={def != null ? [{ at: pct(def, min, max), strong: true }] : undefined} />
        <input
          type="range"
          className="sp-range relative"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={label}
          aria-valuetext={`${f(value)}${unit ? ` ${unit}` : ''}`}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </span>
      {def != null && (
        <span className="mt-0.5 flex justify-between text-[10px] text-tertiary dark:text-[var(--mh-muted)]">
          <span>
            <span className="inline-block h-2 w-px bg-[#ec621d] align-middle mr-1" aria-hidden />
            export default {f(def)}{unit ? ` ${unit}` : ''}
          </span>
          {modified && !disabled && (
            <button type="button" onClick={() => onChange(def)} className="mh-focus font-semibold text-[#ec621d] hover:underline">
              reset
            </button>
          )}
        </span>
      )}
    </label>
  );
}

/** Two dots on one timeline: the lower and upper bound of the 2040 cut. */
export function DualSlider({
  label, lo, hi, min, max, step, onChange, disabled, openAtMax, marks,
}: {
  label: string; lo: number; hi: number; min: number; max: number; step: number;
  onChange: (lo: number, hi: number) => void; disabled?: boolean; openAtMax?: boolean; marks?: number[];
}) {
  const fmtHi = (v: number) => (openAtMax && v >= max ? 'open' : `${v}%`);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11.5px] font-semibold text-tertiary-dark dark:text-[var(--mh-fg)]">{label}</span>
        <span className="font-mono text-[11.5px] tabular-nums text-primary dark:text-[var(--mh-fg)]">
          {lo}% – {fmtHi(hi)}
        </span>
      </div>
      <div className="sp-dual relative mt-1 h-[22px]">
        <Track from={pct(lo, min, max)} to={pct(hi, min, max)} disabled={disabled} marks={marks?.map((m) => ({ at: pct(m, min, max) }))} />
        <input
          type="range" className="sp-range" min={min} max={max} step={step} value={lo} disabled={disabled}
          aria-label={`${label}: lower bound`} aria-valuetext={`${lo}%`}
          onChange={(e) => onChange(Math.min(Number(e.target.value), hi), hi)}
          style={{ zIndex: lo > max - (max - min) * 0.1 ? 5 : 3 }}
        />
        <input
          type="range" className="sp-range" min={min} max={max} step={step} value={hi} disabled={disabled}
          aria-label={`${label}: upper bound`} aria-valuetext={fmtHi(hi)}
          onChange={(e) => onChange(lo, Math.max(Number(e.target.value), lo))}
          style={{ zIndex: 4 }}
        />
      </div>
      <div className="mt-0.5 flex justify-between font-mono text-[10px] tabular-nums text-tertiary dark:text-[var(--mh-muted)]">
        {(marks ?? [min, max]).map((m) => (
          <span key={m}>{openAtMax && m >= max ? `${m}+` : m}</span>
        ))}
      </div>
    </div>
  );
}
