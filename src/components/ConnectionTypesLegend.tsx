'use client';
import { useState } from 'react';
import { CONNECTION_TYPE_LIST } from '@/lib/connectionTypes';

interface Props {
  /**
   * Visual variant.
   *   - `inline`  : compact accordion suitable for sidebars / detail pages.
   *   - `overlay` : card with overflow scroll, suitable for floating panels.
   */
  variant?: 'inline' | 'overlay';
  defaultOpen?: boolean;
}

/**
 * A reference panel that answers "when is a connection made, and what does
 * each type mean?" by surfacing the canonical definitions from
 * `src/lib/connectionTypes.ts`.
 */
export default function ConnectionTypesLegend({ variant = 'inline', defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const container =
    variant === 'overlay'
      ? 'bg-white rounded-md border border-grey-200 shadow-sm'
      : 'bg-white rounded-md border border-grey-200';

  return (
    <div className={container}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-grey-50 transition"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-secondary">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span className="text-sm font-semibold text-tertiary-dark truncate">
            When is a connection made?
          </span>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-tertiary transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-grey-100">
          <p className="text-[11px] text-tertiary leading-relaxed mt-3">
            A connection is recorded only when an explicit legal or operational link can be evidenced in
            the text of the two policies. Each link is assigned one of the six types below based on its
            qualifying criteria. The article references on a connection identify the exact provisions
            that justify the link.
          </p>

          <ul className="mt-3 divide-y divide-grey-100">
            {CONNECTION_TYPE_LIST.map(t => (
              <li key={t.id} className="py-3">
                <div className="flex items-center gap-2 mb-1">
                  <svg width="28" height="8" aria-hidden>
                    <line
                      x1="0"
                      y1="4"
                      x2="22"
                      y2="4"
                      stroke={t.color}
                      strokeWidth="2"
                      strokeDasharray={t.dash}
                    />
                    <polygon points="22,0 28,4 22,8" fill={t.color} />
                  </svg>
                  <span
                    className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold ${t.badge.bg} ${t.badge.text} border ${t.badge.border}`}
                  >
                    {t.label}
                  </span>
                  <span className="text-[10px] text-tertiary-light uppercase tracking-wide">
                    {t.directionality}
                  </span>
                </div>
                <p className="text-[12px] text-tertiary-dark leading-relaxed">
                  {t.definition}
                </p>
                <p className="text-[11px] text-tertiary leading-relaxed mt-1">
                  <span className="font-semibold text-tertiary-dark">When to use: </span>
                  {t.criteria}
                </p>
                <p className="text-[11px] text-tertiary-light italic mt-1">
                  e.g. {t.example}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
