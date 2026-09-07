'use client';

import { useStudentGuidelines } from '@/hooks/use-guidelines';
import { RichTextContent } from '@/components/ui/rich-text-content';

export default function StudentGuidelinesPage(): React.ReactNode {
  const { data, isLoading } = useStudentGuidelines();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Guidelines</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Grading criteria and expectations set by your instructor.</p>

      <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        {isLoading && <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>}
        {!isLoading && (!data || !data.content) && (
          <p className="text-sm text-gray-400 dark:text-gray-500">Your instructor hasn&apos;t published guidelines yet.</p>
        )}
        {data?.content && <RichTextContent html={data.content} />}
      </div>
    </div>
  );
}
