'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentAssignments } from '@/hooks/use-student-assignments';
import { PassFailBadge } from '@/components/shared/pass-fail-badge';
import { AssignmentStatsCards } from '@/components/shared/assignment-stats-cards';
import { computeAssignmentStats } from '@/lib/assignment-stats';

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  REVISION_REQUESTED: 'Revision requested',
  GRADED: 'Graded',
};

export default function StudentReportPage(): React.ReactNode {
  const { data: assignments, isLoading, isError } = useStudentAssignments();
  const router = useRouter();
  const stats = useMemo(() => computeAssignmentStats(assignments ?? []), [assignments]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Results Report</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your status and score across every assignment.</p>

      {!isLoading && !isError && (
        <div className="mt-6">
          <AssignmentStatsCards stats={stats} />
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        {isLoading && <p className="p-4 text-sm text-gray-400 dark:text-gray-500">Loading…</p>}
        {isError && <p className="p-4 text-sm text-red-600">Failed to load report.</p>}
        {!isLoading && !isError && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/60 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 dark:bg-gray-800/60">
              <tr>
                <th className="px-4 py-3">Assignment</th>
                <th className="px-4 py-3">Instructor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {assignments?.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => router.push(`/dashboard/assignments/${a.id}`)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{a.title}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.instructor.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {a.submission ? STATUS_LABELS[a.submission.status] ?? a.submission.status : 'Not started'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {a.submission?.score !== null && a.submission?.score !== undefined ? `${a.submission.score}/${a.max_score}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <PassFailBadge passed={a.submission?.passed ?? null} />
                  </td>
                </tr>
              ))}
              {assignments?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                    No assignments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
