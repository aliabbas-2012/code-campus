'use client';

import { useState } from 'react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export function TagInput({ tags, onChange, placeholder = 'Type and press Enter…', maxTags = 20 }: TagInputProps): React.ReactNode {
  const [draft, setDraft] = useState('');

  const addTag = (): void => {
    const value = draft.trim();
    if (!value || tags.includes(value) || tags.length >= maxTags) {
      setDraft('');
      return;
    }
    onChange([...tags, value]);
    setDraft('');
  };

  const removeTag = (tag: string): void => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 px-2 py-1.5 focus-within:border-transparent focus-within:ring-2 focus-within:ring-indigo-500">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-sm text-indigo-700">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            aria-label={`Remove ${tag}`}
            className="text-indigo-400 hover:text-indigo-700"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="min-w-[140px] flex-1 border-none py-0.5 text-sm outline-none focus:ring-0"
      />
    </div>
  );
}
