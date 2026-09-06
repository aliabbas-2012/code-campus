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
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Results Report</h1>
      <p className="mt-1 text-sm text-gray-500">Your status and score across every assignment.</p>

      {!isLoading && !isError && (
        <div className="mt-6">
          <AssignmentStatsCards stats={stats} />
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading && <p className="p-4 text-sm text-gray-400">Loading…</p>}
        {isError && <p className="p-4 text-sm text-red-600">Failed to load report.</p>}
        {!isLoading && !isError && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/60 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Assignment</th>
                <th className="px-4 py-3">Instructor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignments?.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => router.push(`/dashboard/assignments/${a.id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{a.title}</td>
                  <td className="px-4 py-3 text-gray-600">{a.instructor.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {a.submission ? STATUS_LABELS[a.submission.status] ?? a.submission.status : 'Not started'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {a.submission?.score !== null && a.submission?.score !== undefined ? `${a.submission.score}/${a.max_score}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <PassFailBadge passed={a.submission?.passed ?? null} />
                  </td>
                </tr>
              ))}
              {assignments?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
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
