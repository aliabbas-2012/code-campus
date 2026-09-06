'use client';

import { useRouter } from 'next/navigation';
import { useInstructorStudentAssignments } from '@/hooks/use-instructor-roster';

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted — awaiting review',
  REVISION_REQUESTED: 'Revision requested',
  GRADED: 'Graded',
};

export function StudentAssignments({ studentId }: { studentId: string }): React.ReactNode {
  const { data: assignments, isLoading, isError } = useInstructorStudentAssignments(studentId);
  const router = useRouter();

  const goTo = (a: NonNullable<typeof assignments>[number]): void => {
    if (a.submission) {
      router.push(`/review/${a.submission.project_id}`);
    } else {
      router.push(`/instructor/assignments/${a.id}`);
    }
  };

  return (
    <div>
      <button type="button" onClick={() => router.push('/instructor/students')} className="text-sm font-medium text-gray-500 hover:text-gray-700">
        ← My Students
      </button>
      <h1 className="mt-1 text-2xl font-bold text-gray-900">Assignments</h1>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {isLoading && <p className="p-4 text-sm text-gray-400">Loading…</p>}
        {isError && <p className="p-4 text-sm text-red-600">Failed to load assignments for this student.</p>}
        {!isLoading && !isError && (
          <ul className="divide-y divide-gray-100">
            {assignments?.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => goTo(a)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                >
                  <span>
                    <span className="block font-medium text-gray-900">{a.title}</span>
                    <span className="text-xs text-gray-500">pass at {a.pass_threshold}/{a.max_score}</span>
                  </span>
                  <span className="text-sm text-gray-600">
                    {a.submission ? STATUS_LABELS[a.submission.status] : 'Not started'}
                    {a.submission?.status === 'GRADED' && ` — ${a.submission.score}/${a.max_score}`}
                  </span>
                </button>
              </li>
            ))}
            {assignments?.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-gray-400">No assignments given to this student yet.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
