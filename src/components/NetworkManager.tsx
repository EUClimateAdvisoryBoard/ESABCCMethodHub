/**
 * Top-of-graph bar for selecting, creating, editing, and deleting policy networks.
 */
'use client';
import { useState } from 'react';
import { useNetworks, type PolicyNetwork } from '@/lib/useNetworks';
import CreateNetworkModal from './CreateNetworkModal';

interface Props {
  activeNetworkId: string | null;
  onChange: (id: string | null) => void;
}

/**
 * Top-of-graph bar that lets the user pick an active network, create a new
 * one, or edit / delete existing ones. When a network is active the graph
 * should be filtered to that network's policy subset.
 */
export default function NetworkManager({ activeNetworkId, onChange }: Props) {
  const { networks, deleteNetwork } = useNetworks();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<PolicyNetwork | null>(null);

  const active = networks.find(n => n.id === activeNetworkId) || null;

  const handleDelete = (net: PolicyNetwork) => {
    const confirmed =
      typeof window !== 'undefined' &&
      window.confirm(`Delete network "${net.name}"? This cannot be undone.`);
    if (!confirmed) return;
    deleteNetwork(net.id);
    if (activeNetworkId === net.id) onChange(null);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 py-2">
        <span className="text-[10px] uppercase tracking-wider text-tertiary-light font-semibold mr-1">
          Network
        </span>

        <select
          value={activeNetworkId ?? ''}
          onChange={e => onChange(e.target.value === '' ? null : e.target.value)}
          className="px-2.5 py-1.5 border border-grey-300 rounded text-[12px] bg-white focus:border-secondary focus:outline-none max-w-[260px]"
          aria-label="Active network"
        >
          <option value="">Full graph (all policies)</option>
          {networks.map(n => (
            <option key={n.id} value={n.id}>
              {n.name} ({n.policyIds.length})
            </option>
          ))}
        </select>

        {active && (
          <>
            <button
              type="button"
              onClick={() => setEditing(active)}
              className="text-[11px] px-2 py-1.5 border border-grey-300 rounded hover:bg-grey-50 text-tertiary-dark"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(active)}
              className="text-[11px] px-2 py-1.5 border border-grey-300 rounded hover:bg-accent-red/5 text-accent-red"
            >
              Delete
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="text-[11px] px-2.5 py-1.5 bg-secondary text-white rounded hover:bg-primary font-medium ml-auto inline-flex items-center gap-1"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New network
        </button>
      </div>

      {active && active.description && (
        <p className="text-[11px] text-tertiary leading-relaxed -mt-1 mb-2">
          {active.description}
        </p>
      )}

      {showCreate && (
        <CreateNetworkModal
          onClose={() => setShowCreate(false)}
          onSaved={net => onChange(net.id)}
        />
      )}
      {editing && (
        <CreateNetworkModal
          editingNetwork={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
