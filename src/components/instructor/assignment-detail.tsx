'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInstructorAssignment, useAddAssignmentStudents } from '@/hooks/use-instructor-assignments';
import { useInstructorRoster } from '@/hooks/use-instructor-roster';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'Not started / in progress',
  SUBMITTED: 'Submitted',
  REVISION_REQUESTED: 'Revision requested',
  GRADED: 'Graded',
};

export function AssignmentDetail({ assignmentId }: { assignmentId: string }): React.ReactNode {
  const { data: assignment, isLoading, isError } = useInstructorAssignment(assignmentId);
  const { data: roster } = useInstructorRoster();
  const addStudents = useAddAssignmentStudents(assignmentId);
  const { showToast } = useToast();
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const availableToAdd = useMemo(() => {
    const already = new Set(assignment?.students.map((s) => s.student.id) ?? []);
    return (roster ?? []).filter((link) => !already.has(link.student.id));
  }, [roster, assignment]);

  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (isError || !assignment) return <p className="text-sm text-red-600">Failed to load assignment.</p>;

  const toggle = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = (): void => {
    addStudents.mutate(
      { student_ids: Array.from(selected) },
      {
        onSuccess: () => {
          setSelected(new Set());
          setShowAdd(false);
        },
        onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to add students'),
      },
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
      {assignment.description && <p className="mt-2 max-w-2xl text-gray-600">{assignment.description}</p>}
      <p className="mt-2 text-sm text-gray-500">
        Pass at {assignment.pass_threshold}/{assignment.max_score}
      </p>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Students</h2>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Add Students
        </button>
      </div>

      {showAdd && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4">
          <ul className="max-h-40 space-y-1 overflow-y-auto">
            {availableToAdd.map((link) => (
              <li key={link.id}>
                <label className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selected.has(link.student.id)}
                    onChange={() => toggle(link.student.id)}
                  />
                  {link.student.name}
                </label>
              </li>
            ))}
            {availableToAdd.length === 0 && (
              <p className="px-1 py-2 text-sm text-gray-400">Everyone on your roster is already assigned.</p>
            )}
          </ul>
          <button
            type="button"
            onClick={handleAdd}
            disabled={selected.size === 0 || addStudents.isPending}
            className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Add Selected
          </button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Score</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assignment.students.map(({ student, submission }) => (
              <tr key={student.id}>
                <td className="px-4 py-2 font-medium text-gray-900">{student.name}</td>
                <td className="px-4 py-2 text-gray-600">
                  {submission ? STATUS_LABELS[submission.status] : STATUS_LABELS.IN_PROGRESS}
                </td>
                <td className="px-4 py-2 text-gray-600">
                  {submission?.score !== null && submission?.score !== undefined
                    ? `${submission.score}/${assignment.max_score} (${submission.passed ? 'Pass' : 'Fail'})`
                    : '—'}
                </td>
                <td className="px-4 py-2 text-right">
                  {submission?.status === 'SUBMITTED' && (
                    <button
                      type="button"
                      onClick={() => router.push(`/review/${submission.project_id}`)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Review
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
