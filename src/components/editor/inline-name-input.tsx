'use client';

import { useEffect, useRef, useState } from 'react';
import { VALID_FILENAME_PATTERN } from './file-tree-context';

interface InlineNameInputProps {
  defaultValue?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export function InlineNameInput({ defaultValue = '', onSubmit, onCancel }: InlineNameInputProps): React.ReactNode {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (): void => {
    if (settledRef.current) return;
    const trimmed = value.trim();
    if (!trimmed) {
      settledRef.current = true;
      onCancel();
      return;
    }
    if (!VALID_FILENAME_PATTERN.test(trimmed)) {
      setError('Only letters, numbers, dots, dashes and underscores are allowed');
      return;
    }
    settledRef.current = true;
    onSubmit(trimmed);
  };

  return (
    <div className="flex flex-1 flex-col">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
          if (e.key === 'Escape') {
            settledRef.current = true;
            onCancel();
          }
        }}
        onBlur={handleSubmit}
        className="w-full rounded border border-indigo-400 px-1 py-0.5 text-sm focus:outline-none"
      />
      {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
