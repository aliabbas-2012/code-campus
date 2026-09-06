'use client';

import { useStudentGuidelines } from '@/hooks/use-guidelines';
import { RichTextContent } from '@/components/ui/rich-text-content';

export default function StudentGuidelinesPage(): React.ReactNode {
  const { data, isLoading } = useStudentGuidelines();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Guidelines</h1>
      <p className="mt-1 text-sm text-gray-500">Grading criteria and expectations set by your instructor.</p>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-5">
        {isLoading && <p className="text-sm text-gray-400">Loading…</p>}
        {!isLoading && (!data || !data.content) && (
          <p className="text-sm text-gray-400">Your instructor hasn&apos;t published guidelines yet.</p>
        )}
        {data?.content && <RichTextContent html={data.content} />}
      </div>
    </div>
  );
}
