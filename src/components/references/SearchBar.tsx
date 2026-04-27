'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface ReferenceSearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function ReferenceSearchBar({
  onSearch,
  placeholder = 'Search references (multi-keyword: "fiscal adaptation", use quotes for exact phrase)…',
}: ReferenceSearchBarProps) {
  const [query, setQuery] = useState('');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const debouncedSearch = useCallback((q: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onSearch(q);
    }, 300);
  }, [onSearch]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  const handleClear = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setQuery('');
    // Fire synchronously so the list updates immediately instead of waiting
    // for the debounced path used by handleChange.
    onSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && query) {
      e.preventDefault();
      handleClear();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search references"
          className="w-full pl-10 pr-10 py-2.5 bg-grey-100 border border-grey-200 rounded-lg text-tertiary-dark placeholder-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            title="Clear search (Esc)"
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-tertiary hover:text-tertiary-dark"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {query && (
        <button
          type="button"
          onClick={handleClear}
          title="Reset search (Esc)"
          className="shrink-0 px-3 py-2 bg-grey-200 hover:bg-grey-300 text-tertiary-dark text-sm rounded-lg border border-grey-200"
        >
          Reset
        </button>
      )}
    </div>
  );
}
