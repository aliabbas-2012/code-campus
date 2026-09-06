'use client';

import { useMemo, useRef, useState } from 'react';

export interface SingleSelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface SingleSelectProps {
  options: SingleSelectOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

/** A searchable single-value combobox — filters on both label and sublabel (e.g. name + email). */
export function SingleSelect({ options, value, onChange, placeholder = 'Search…' }: SingleSelectProps): React.ReactNode {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(() => options.find((o) => o.id === value) ?? null, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q));
  }, [options, query]);

  const select = (id: string): void => {
    onChange(id);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const clear = (): void => {
    onChange('');
    setQuery('');
  };

  return (
    <div className="relative max-w-sm">
      <div
        className="flex min-h-[42px] items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 focus-within:border-transparent focus-within:ring-2 focus-within:ring-indigo-500"
        onClick={() => inputRef.current?.focus()}
      >
        {selectedOption && !open ? (
          <span className="flex flex-1 items-center justify-between text-sm">
            <span className="text-gray-900">
              {selectedOption.label}
              {selectedOption.sublabel && <span className="ml-1 text-gray-400">({selectedOption.sublabel})</span>}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              aria-label="Clear selection"
              className="text-gray-400 hover:text-gray-700"
            >
              ×
            </button>
          </span>
        ) : (
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={selectedOption ? selectedOption.label : placeholder}
            className="min-w-0 flex-1 border-none py-0.5 text-sm outline-none focus:ring-0"
          />
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {filtered.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(opt.id)}
                className={`flex w-full flex-col px-3 py-1.5 text-left text-sm hover:bg-indigo-50 ${opt.id === value ? 'bg-indigo-50' : ''}`}
              >
                <span className="text-gray-900">{opt.label}</span>
                {opt.sublabel && <span className="text-xs text-gray-400">{opt.sublabel}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
