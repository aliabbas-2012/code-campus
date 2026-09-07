'use client';

import { useRouter } from 'next/navigation';
import { useStudentAssignment, useStartAssignment } from '@/hooks/use-student-assignments';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { SubmissionTimeline } from '@/components/shared/submission-timeline';
import { PassFailBadge } from '@/components/shared/pass-fail-badge';
import { RichTextContent } from '@/components/ui/rich-text-content';

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted — awaiting review',
  REVISION_REQUESTED: 'Revision requested',
  GRADED: 'Graded',
};

const ACTION_LABELS: Record<string, string> = {
  IN_PROGRESS: 'Resume',
  SUBMITTED: 'View Submission',
  REVISION_REQUESTED: 'Resume',
  GRADED: 'View Results',
};

export function AssignmentDetail({ assignmentId }: { assignmentId: string }): React.ReactNode {
  const { data: assignment, isLoading, isError } = useStudentAssignment(assignmentId);
  const startAssignment = useStartAssignment(assignmentId);
  const { showToast } = useToast();
  const router = useRouter();

  if (isLoading) return <div className="mx-auto max-w-3xl text-sm text-gray-400 dark:text-gray-500">Loading…</div>;
  if (isError || !assignment) {
    return <div className="mx-auto max-w-3xl text-sm text-red-600">Failed to load assignment.</div>;
  }

  const handleStart = (): void => {
    startAssignment.mutate(undefined, {
      onSuccess: () => router.push(`/dashboard/assignments/${assignmentId}/workspace`),
      onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to start assignment'),
    });
  };

  const status = assignment.submission?.status ?? 'IN_PROGRESS';
  const actionLabel = ACTION_LABELS[status] ?? 'Resume';

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{assignment.title}</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        From{' '}
        <button
          type="button"
          onClick={() => router.push(`/dashboard/instructors/${assignment.instructor.id}`)}
          className="font-medium text-indigo-600 hover:underline"
        >
          {assignment.instructor.name}
        </button>{' '}
        · pass at {assignment.pass_threshold}/{assignment.max_score}
      </p>

      <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        {!assignment.project_id ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">You haven&apos;t started this assignment yet.</p>
            </div>
            <button
              type="button"
              onClick={handleStart}
              disabled={startAssignment.isPending}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {startAssignment.isPending ? 'Starting…' : 'Start Assignment'}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</h2>
                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-gray-800">
                  {STATUS_LABELS[status]}
                  {status === 'GRADED' && (
                    <span className="inline-flex items-center gap-1.5">
                      ({assignment.submission?.score}/{assignment.max_score})
                      <PassFailBadge passed={assignment.submission?.passed ?? null} />
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/assignments/${assignmentId}/workspace`)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                {actionLabel}
              </button>
            </div>
            {assignment.submission && assignment.submission.events.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-6">
                <SubmissionTimeline events={assignment.submission.events} />
              </div>
            )}
          </>
        )}
      </div>

      {assignment.description && (
        <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Description</h2>
          <RichTextContent html={assignment.description} className="mt-3 text-gray-700 dark:text-gray-300" />
        </div>
      )}
    </div>
  );
}
