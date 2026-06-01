'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { pwApi } from '@/lib/project-workspace/client';

export default function NewProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const { project } = await pwApi.createProject({
        name,
        description: desc,
      });
      setOpen(false);
      setName('');
      setDesc('');
      router.push(`/project-workspace/${project.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark"
      >
        + New project
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl border border-grey-200 max-w-md w-full p-5"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-tertiary-dark mb-3">New project</h3>
            <label className="block text-xs text-tertiary mb-3">
              <span className="block mb-1 font-medium text-tertiary-dark">Name</span>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm"
              />
            </label>
            <label className="block text-xs text-tertiary mb-3">
              <span className="block mb-1 font-medium text-tertiary-dark">Description</span>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm h-20"
              />
            </label>
            {error && (
              <p className="text-xs text-red-700 mb-2">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-md border border-grey-200 text-xs text-tertiary-dark hover:bg-grey-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!name || busy}
                onClick={submit}
                className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark disabled:opacity-50"
              >
                {busy ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
