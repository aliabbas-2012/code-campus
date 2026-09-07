'use client';

import { useRouter } from 'next/navigation';
import { useInstructorReport } from '@/hooks/use-instructor-assignments';
import { PassFailBadge } from '@/components/shared/pass-fail-badge';

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  REVISION_REQUESTED: 'Revision requested',
  GRADED: 'Graded',
};

export function ReportView(): React.ReactNode {
  const { data: rows, isLoading, isError } = useInstructorReport();
  const router = useRouter();

  const gradedCount = rows?.filter((r) => r.status === 'GRADED').length ?? 0;
  const passCount = rows?.filter((r) => r.passed === true).length ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Results Report</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Every student × assignment result across your roster.</p>

      {rows && (
        <div className="mt-4 flex gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>{rows.length} total</span>
          <span>{gradedCount} graded</span>
          <span>{passCount} passed</span>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        {isLoading && <p className="p-4 text-sm text-gray-400 dark:text-gray-500">Loading…</p>}
        {isError && <p className="p-4 text-sm text-red-600">Failed to load report.</p>}
        {!isLoading && !isError && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/60 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 dark:bg-gray-800/60">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Assignment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows?.map((r) => (
                <tr
                  key={`${r.assignment_id}:${r.student_id}`}
                  onClick={() => router.push(`/instructor/assignments/${r.assignment_id}`)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{r.student_name}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.assignment_title}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{STATUS_LABELS[r.status] ?? r.status}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.score !== null ? `${r.score}/${r.max_score}` : '—'}</td>
                  <td className="px-4 py-3">
                    <PassFailBadge passed={r.passed} />
                  </td>
                </tr>
              ))}
              {rows?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                    No assignment results yet.
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
