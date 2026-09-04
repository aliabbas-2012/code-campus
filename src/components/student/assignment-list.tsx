'use client';

import { useRouter } from 'next/navigation';
import { useStudentAssignments } from '@/hooks/use-student-assignments';

const STATUS_STYLES: Record<string, string> = {
  IN_PROGRESS: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  REVISION_REQUESTED: 'bg-amber-100 text-amber-800',
  GRADED: 'bg-emerald-100 text-emerald-800',
};

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'Not started',
  SUBMITTED: 'Submitted',
  REVISION_REQUESTED: 'Revision requested',
  GRADED: 'Graded',
};

export function AssignmentList(): React.ReactNode {
  const { data: assignments, isLoading, isError } = useStudentAssignments();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>

      {isLoading && <p className="mt-4 text-sm text-gray-400">Loading…</p>}
      {isError && <p className="mt-4 text-sm text-red-600">Failed to load assignments.</p>}

      {!isLoading && !isError && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assignments?.map((a) => {
            const status = a.submission?.status ?? 'IN_PROGRESS';
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => router.push(`/dashboard/assignments/${a.id}`)}
                className="rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm hover:border-indigo-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">{a.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500">From {a.instructor.name}</p>
              </button>
            );
          })}
          {assignments?.length === 0 && (
            <p className="text-sm text-gray-400">No assignments yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
