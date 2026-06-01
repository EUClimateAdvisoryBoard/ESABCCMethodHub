/**
 * Member State × sector matrix for the Project Workspace.
 * -------------------------------------------------------
 * Rows = EU-27 member states, columns = the sectors defined in
 * `@/data/sectoral-policies`. Each cell stores a status pill and a
 * free-text note ("findings"). Cells are persisted to
 * `pw_member_state_cells` on every save.
 *
 * The matrix starts empty — the cell text is filled in over time.
 */
'use client';

import { useMemo, useState } from 'react';
import { EU_MEMBER_STATES } from '@/data/eu-member-states';
import { SECTORS } from '@/data/sectoral-policies';
import { pwApi } from '@/lib/project-workspace/client';

const CELL_STATUSES = ['empty', 'flagged', 'on-track', 'concern'] as const;
type CellStatus = (typeof CELL_STATUSES)[number];

const STATUS_BG: Record<CellStatus, string> = {
  'empty': 'bg-white',
  'flagged': 'bg-blue-50',
  'on-track': 'bg-green-50',
  'concern': 'bg-amber-50',
};

interface SeedCell {
  countryCode: string;
  sectorId: string;
  status: string;
  note: string;
}

interface Props {
  projectId: string;
  initial: SeedCell[];
}

function key(c: string, s: string) {
  return `${c}|${s}`;
}

export default function MemberStatesModule({ projectId, initial }: Props) {
  const cellsByKey = useMemo(() => {
    const m = new Map<string, SeedCell>();
    initial.forEach(c => m.set(key(c.countryCode, c.sectorId), c));
    return m;
  }, [initial]);

  const [cells, setCells] = useState<Map<string, SeedCell>>(cellsByKey);
  const [editing, setEditing] = useState<{ country: string; sector: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(cc: string, sid: string, status: CellStatus, note: string) {
    setBusy(true);
    try {
      await pwApi.upsertMemberStateCell({
        projectId,
        countryCode: cc,
        sectorId: sid,
        status,
        note,
      });
      setCells(prev => {
        const next = new Map(prev);
        next.set(key(cc, sid), { countryCode: cc, sectorId: sid, status, note });
        return next;
      });
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-lg font-bold text-tertiary-dark">Member state space</h2>
        <p className="text-sm text-tertiary mt-1 max-w-2xl">
          EU-27 by the sectors we cover. Click a cell to record a finding,
          tag it with a status, or leave a note for later. Cells start empty
          and fill in as the analysis progresses.
        </p>
      </header>

      <div className="overflow-x-auto bg-white rounded-xl border border-grey-200">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-grey-50">
              <th className="sticky left-0 bg-grey-50 px-2 py-1.5 text-left text-[10px] uppercase tracking-wide text-tertiary z-10 border-r border-grey-200">
                Member state
              </th>
              {SECTORS.map(s => (
                <th
                  key={s.id}
                  className="px-2 py-1.5 text-left text-[10px] uppercase tracking-wide text-tertiary border-r border-grey-100 whitespace-nowrap"
                  style={{ minWidth: '110px' }}
                >
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EU_MEMBER_STATES.map(ms => (
              <tr key={ms.code} className="border-t border-grey-100">
                <td className="sticky left-0 bg-white px-2 py-1.5 font-medium text-tertiary-dark border-r border-grey-100 z-10">
                  {ms.name}{' '}
                  <span className="text-tertiary-light text-[10px]">({ms.code})</span>
                </td>
                {SECTORS.map(sec => {
                  const c = cells.get(key(ms.code, sec.id));
                  const status = (c?.status ?? 'empty') as CellStatus;
                  return (
                    <td
                      key={sec.id}
                      className={`px-1 py-1 border-r border-grey-100 align-top ${STATUS_BG[status]}`}
                    >
                      <button
                        type="button"
                        className="w-full text-left text-[10px] leading-snug min-h-[2.5rem] px-1 py-1 hover:bg-grey-100/70 rounded"
                        onClick={() => setEditing({ country: ms.code, sector: sec.id })}
                      >
                        {c?.note ? (
                          <span className="text-tertiary-dark">{c.note}</span>
                        ) : (
                          <span className="text-tertiary-light italic">+ add</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditCellDialog
          country={EU_MEMBER_STATES.find(m => m.code === editing.country)!.name}
          sector={SECTORS.find(s => s.id === editing.sector)!.name}
          initial={cells.get(key(editing.country, editing.sector))}
          onClose={() => setEditing(null)}
          onSave={(status, note) => save(editing.country, editing.sector, status, note)}
          busy={busy}
        />
      )}
    </div>
  );
}

function EditCellDialog({
  country,
  sector,
  initial,
  onClose,
  onSave,
  busy,
}: {
  country: string;
  sector: string;
  initial?: SeedCell;
  onClose: () => void;
  onSave: (status: CellStatus, note: string) => void;
  busy: boolean;
}) {
  const [status, setStatus] = useState<CellStatus>(
    (initial?.status as CellStatus) ?? 'empty'
  );
  const [note, setNote] = useState(initial?.note ?? '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-grey-200 max-w-lg w-full p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-tertiary-dark">
            {country} · {sector}
          </h3>
          <button type="button" onClick={onClose} className="text-tertiary text-sm">
            ✕
          </button>
        </div>

        <label className="block text-xs text-tertiary mb-2">
          <span className="block mb-1 font-medium text-tertiary-dark">Status</span>
          <div className="flex gap-1 flex-wrap">
            {CELL_STATUSES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`text-[11px] px-2 py-1 rounded border ${
                  status === s
                    ? 'bg-primary text-white border-primary'
                    : 'border-grey-200 text-tertiary'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </label>

        <label className="block text-xs text-tertiary mb-3">
          <span className="block mb-1 font-medium text-tertiary-dark">Note</span>
          <textarea
            className="w-full h-28 px-2 py-1.5 border border-grey-200 rounded text-sm"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border border-grey-200 text-xs text-tertiary-dark hover:bg-grey-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSave(status, note)}
            className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
