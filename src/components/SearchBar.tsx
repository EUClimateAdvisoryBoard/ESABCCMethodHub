/**
 * Debounced search input with clear button for filtering policies and annotations.
 */
'use client';
import { useState, useEffect } from 'react';

export default function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value);

  useEffect(() => { setLocal(value); }, [value]);

  useEffect(() => {
    const t = setTimeout(() => { if (local !== value) onChange(local); }, 300);
    return () => clearTimeout(t);
  }, [local, value, onChange]);

  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-grey-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
      <input type="text" value={local} onChange={e => setLocal(e.target.value)}
        placeholder="Search policies, text, annotations..."
        className="w-full pl-10 pr-10 py-3 rounded-lg border border-grey-300 bg-white text-tertiary-dark placeholder:text-grey-400 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition" />
      {local && (
        <button onClick={() => { setLocal(''); onChange(''); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-tertiary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      )}
    </div>
  );
}
