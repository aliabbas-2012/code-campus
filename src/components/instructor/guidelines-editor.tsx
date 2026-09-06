'use client';

import { useState } from 'react';
import { useInstructorGuidelines, useUpdateInstructorGuidelines } from '@/hooks/use-guidelines';
import { useToast } from '@/components/ui/toast';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { ApiError } from '@/lib/api';

export function GuidelinesEditor(): React.ReactNode {
  const { data, isLoading } = useInstructorGuidelines();
  const update = useUpdateInstructorGuidelines();
  const { showToast } = useToast();
  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(false);

  if (!loaded && data !== undefined) {
    setLoaded(true);
    setContent(data.content);
  }

  const handleSave = (): void => {
    update.mutate(content, {
      onSuccess: () => showToast('Guidelines saved', 'info'),
      onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to save guidelines'),
    });
  };

  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Guidelines</h1>
      <p className="mt-1 text-sm text-gray-500">
        Shown to every student on your roster. Use it for grading criteria, submission expectations, or house rules.
      </p>
      <div className="mt-4">
        <RichTextEditor value={content} onChange={setContent} placeholder="Write your guidelines for students…" />
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={update.isPending}
        className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {update.isPending ? 'Saving…' : 'Save Guidelines'}
      </button>
    </div>
  );
}
