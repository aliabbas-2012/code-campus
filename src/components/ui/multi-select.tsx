'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface MultiSelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  allowCustom?: boolean;
  onCreateCustom?: (value: string) => void;
  /**
   * When provided, typing a query (debounced) fetches matching options from the
   * server instead of filtering the already-loaded `options` locally. Clearing
   * the query falls back to `options` (shown in full, scrollable) so the whole
   * roster stays browsable without typing anything.
   */
  remoteSearch?: (query: string) => Promise<MultiSelectOption[]>;
}

const REMOTE_SEARCH_DEBOUNCE_MS = 300;

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Search…',
  allowCustom = false,
  onCreateCustom,
  remoteSearch,
}: MultiSelectProps): React.ReactNode {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [remoteResults, setRemoteResults] = useState<MultiSelectOption[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchSeqRef = useRef(0);

  const selectedOptions = useMemo(
    () => selected.map((id) => options.find((o) => o.id === id)).filter((o): o is MultiSelectOption => !!o),
    [selected, options],
  );

  useEffect(() => {
    if (!remoteSearch) return;
    const trimmed = query.trim();
    if (!trimmed) {
      queueMicrotask(() => {
        setRemoteResults(null);
        setIsSearching(false);
      });
      return;
    }

    const seq = ++searchSeqRef.current;
    queueMicrotask(() => setIsSearching(true));
    const timer = setTimeout(() => {
      remoteSearch(trimmed)
        .then((results) => {
          if (searchSeqRef.current === seq) {
            setRemoteResults(results);
            setIsSearching(false);
          }
        })
        .catch(() => {
          if (searchSeqRef.current === seq) setIsSearching(false);
        });
    }, REMOTE_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, remoteSearch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = remoteSearch && remoteResults !== null ? remoteResults : options;
    return source
      .filter((o) => !selected.includes(o.id))
      .filter((o) => remoteSearch || !q || o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q));
  }, [options, remoteResults, remoteSearch, selected, query]);

  const exactMatch = filtered.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());
  const canCreate = allowCustom && query.trim().length > 0 && !exactMatch;

  const addOption = (id: string): void => {
    onChange([...selected, id]);
    setQuery('');
  };

  const removeOption = (id: string): void => {
    onChange(selected.filter((s) => s !== id));
  };

  const handleCreate = (): void => {
    const value = query.trim();
    if (!value) return;
    onCreateCustom?.(value);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0) {
        addOption(filtered[0].id);
      } else if (canCreate) {
        handleCreate();
      }
    } else if (e.key === 'Backspace' && query === '' && selectedOptions.length > 0) {
      removeOption(selectedOptions[selectedOptions.length - 1].id);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative">
      <div
        className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 px-2 py-1.5 focus-within:border-transparent focus-within:ring-2 focus-within:ring-indigo-500"
        onClick={() => inputRef.current?.focus()}
      >
        {selectedOptions.map((opt) => (
          <span
            key={opt.id}
            className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-sm text-indigo-700"
          >
            {opt.label}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeOption(opt.id);
              }}
              aria-label={`Remove ${opt.label}`}
              className="text-indigo-400 hover:text-indigo-700"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={selectedOptions.length === 0 ? placeholder : ''}
          className="min-w-[120px] flex-1 border-none py-0.5 text-sm outline-none focus:ring-0"
        />
      </div>

      {open && (filtered.length > 0 || canCreate || isSearching) && (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {isSearching && (
            <li className="px-3 py-1.5 text-xs text-gray-400">Searching…</li>
          )}
          {filtered.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addOption(opt.id)}
                className="flex w-full flex-col px-3 py-1.5 text-left text-sm hover:bg-indigo-50"
              >
                <span className="text-gray-900">{opt.label}</span>
                {opt.sublabel && <span className="text-xs text-gray-400">{opt.sublabel}</span>}
              </button>
            </li>
          ))}
          {canCreate && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCreate}
                className="flex w-full px-3 py-1.5 text-left text-sm text-indigo-600 hover:bg-indigo-50"
              >
                Add &ldquo;{query.trim()}&rdquo;
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
