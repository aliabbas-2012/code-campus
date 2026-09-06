'use client';

import { useStudentAssignments } from '@/hooks/use-student-assignments';

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  REVISION_REQUESTED: 'Revision requested',
  GRADED: 'Graded',
};

export default function StudentReportPage(): React.ReactNode {
  const { data: assignments, isLoading, isError } = useStudentAssignments();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Results Report</h1>
      <p className="mt-1 text-sm text-gray-500">Your status and score across every assignment.</p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {isLoading && <p className="p-4 text-sm text-gray-400">Loading…</p>}
        {isError && <p className="p-4 text-sm text-red-600">Failed to load report.</p>}
        {!isLoading && !isError && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Assignment</th>
                <th className="px-4 py-2">Instructor</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Score</th>
                <th className="px-4 py-2">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignments?.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">{a.title}</td>
                  <td className="px-4 py-2 text-gray-600">{a.instructor.name}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {a.submission ? STATUS_LABELS[a.submission.status] ?? a.submission.status : 'Not started'}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {a.submission?.score !== null && a.submission?.score !== undefined ? `${a.submission.score}/${a.max_score}` : '—'}
                  </td>
                  <td className="px-4 py-2">
                    {a.submission?.passed === null || a.submission?.passed === undefined ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <span className={a.submission.passed ? 'font-medium text-emerald-700' : 'font-medium text-red-700'}>
                        {a.submission.passed ? 'Pass' : 'Fail'}
                      </span>
                    )}
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
