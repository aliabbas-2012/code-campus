'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInstructorAssignment, useAddAssignmentStudents } from '@/hooks/use-instructor-assignments';
import { useInstructorRoster } from '@/hooks/use-instructor-roster';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { MultiSelect } from '@/components/ui/multi-select';
import { RichTextContent } from '@/components/ui/rich-text-content';
import { PassFailBadge } from '@/components/shared/pass-fail-badge';

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
  const [selected, setSelected] = useState<string[]>([]);

  const availableOptions = useMemo(() => {
    const already = new Set(assignment?.students.map((s) => s.student.id) ?? []);
    return (roster ?? [])
      .filter((link) => !already.has(link.student.id))
      .map((link) => ({ id: link.student.id, label: link.student.name, sublabel: link.student.email }));
  }, [roster, assignment]);

  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (isError || !assignment) return <p className="text-sm text-red-600">Failed to load assignment.</p>;

  const handleAdd = (): void => {
    addStudents.mutate(
      { student_ids: selected },
      {
        onSuccess: () => {
          setSelected([]);
          setShowAdd(false);
        },
        onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to add students'),
      },
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">{assignment.title}</h1>
      <p className="mt-2 text-sm text-gray-500">
        Pass at {assignment.pass_threshold}/{assignment.max_score}
      </p>

      {assignment.description && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Description</h2>
          <RichTextContent html={assignment.description} className="mt-3 max-w-2xl text-gray-600" />
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Students</h2>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          Add Students
        </button>
      </div>

      {showAdd && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <MultiSelect
            options={availableOptions}
            selected={selected}
            onChange={setSelected}
            placeholder={availableOptions.length === 0 ? 'Everyone on your roster is already assigned' : 'Search students…'}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={selected.length === 0 || addStudents.isPending}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            Add Selected
          </button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50/60 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assignment.students.map(({ student, submission }) => (
              <tr key={student.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                <td className="px-4 py-3 text-gray-600">
                  {submission ? STATUS_LABELS[submission.status] : STATUS_LABELS.IN_PROGRESS}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {submission?.score !== null && submission?.score !== undefined ? (
                    <span className="flex items-center gap-1.5">
                      {submission.score}/{assignment.max_score}
                      <PassFailBadge passed={submission.passed} />
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-right">
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
