'use client';

import { useState } from 'react';
import { ReferenceLibrary } from '@/lib/references/types';
import { createLibrary, deleteLibrary } from '@/lib/references/reference-service';

interface LibrarySelectorProps {
  libraries: ReferenceLibrary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefreshNeeded: () => void;
}

export default function LibrarySelector({ libraries, selectedId, onSelect, onRefreshNeeded }: LibrarySelectorProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const lib = await createLibrary(newName.trim(), newDesc.trim() || undefined);
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      onRefreshNeeded();
      onSelect(lib.id);
    } catch (err) {
      console.error('Failed to create library:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete library "${name}" and all its references?`)) return;
    await deleteLibrary(id);
    onRefreshNeeded();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-tertiary uppercase tracking-wide">Libraries</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-sm text-primary hover:text-primary-dark"
        >
          {showCreate ? 'Cancel' : '+ New'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-grey-100/50 border border-grey-200 rounded-lg p-3 space-y-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Library name"
            className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-1.5 text-sm text-tertiary-dark"
            autoFocus
          />
          <input
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-1.5 text-sm text-tertiary-dark"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="w-full px-3 py-1.5 bg-primary hover:bg-primary-dark text-white text-sm rounded disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Library'}
          </button>
        </form>
      )}

      {libraries.length === 0 && !showCreate ? (
        <p className="text-sm text-tertiary py-2">No libraries yet. Create one to get started.</p>
      ) : (
        <div className="space-y-1">
          {libraries.map(lib => (
            <div
              key={lib.id}
              onClick={() => onSelect(lib.id)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                selectedId === lib.id
                  ? 'bg-primary/10 border border-primary/40 text-primary'
                  : 'hover:bg-grey-100 text-tertiary-dark'
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{lib.name}</p>
                {lib.description && <p className="text-xs text-tertiary truncate">{lib.description}</p>}
              </div>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(lib.id, lib.name); }}
                className="text-tertiary hover:text-accent-red ml-2 shrink-0"
                title="Delete library"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
