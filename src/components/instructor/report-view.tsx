'use client';

import { useInstructorReport } from '@/hooks/use-instructor-assignments';

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  REVISION_REQUESTED: 'Revision requested',
  GRADED: 'Graded',
};

export function ReportView(): React.ReactNode {
  const { data: rows, isLoading, isError } = useInstructorReport();

  const gradedCount = rows?.filter((r) => r.status === 'GRADED').length ?? 0;
  const passCount = rows?.filter((r) => r.passed === true).length ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Results Report</h1>
      <p className="mt-1 text-sm text-gray-500">Every student × assignment result across your roster.</p>

      {rows && (
        <div className="mt-4 flex gap-4 text-sm text-gray-600">
          <span>{rows.length} total</span>
          <span>{gradedCount} graded</span>
          <span>{passCount} passed</span>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {isLoading && <p className="p-4 text-sm text-gray-400">Loading…</p>}
        {isError && <p className="p-4 text-sm text-red-600">Failed to load report.</p>}
        {!isLoading && !isError && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Student</th>
                <th className="px-4 py-2">Assignment</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Score</th>
                <th className="px-4 py-2">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows?.map((r) => (
                <tr key={`${r.assignment_id}:${r.student_id}`}>
                  <td className="px-4 py-2 font-medium text-gray-900">{r.student_name}</td>
                  <td className="px-4 py-2 text-gray-700">{r.assignment_title}</td>
                  <td className="px-4 py-2 text-gray-600">{STATUS_LABELS[r.status] ?? r.status}</td>
                  <td className="px-4 py-2 text-gray-600">{r.score !== null ? `${r.score}/${r.max_score}` : '—'}</td>
                  <td className="px-4 py-2">
                    {r.passed === null ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <span className={r.passed ? 'font-medium text-emerald-700' : 'font-medium text-red-700'}>
                        {r.passed ? 'Pass' : 'Fail'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {rows?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
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
