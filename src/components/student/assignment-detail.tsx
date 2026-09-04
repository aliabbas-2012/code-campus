'use client';

import { useRouter } from 'next/navigation';
import { useStudentAssignment, useStartAssignment } from '@/hooks/use-student-assignments';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { SubmissionTimeline } from '@/components/shared/submission-timeline';

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted — awaiting review',
  REVISION_REQUESTED: 'Revision requested',
  GRADED: 'Graded',
};

export function AssignmentDetail({ assignmentId }: { assignmentId: string }): React.ReactNode {
  const { data: assignment, isLoading, isError } = useStudentAssignment(assignmentId);
  const startAssignment = useStartAssignment(assignmentId);
  const { showToast } = useToast();
  const router = useRouter();

  if (isLoading) return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-gray-400">Loading…</div>;
  if (isError || !assignment) {
    return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-red-600">Failed to load assignment.</div>;
  }

  const handleStart = (): void => {
    startAssignment.mutate(undefined, {
      onSuccess: (result) => router.push(`/projects/${result.project_id}`),
      onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to start assignment'),
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        From {assignment.instructor.name} · pass at {assignment.pass_threshold}/{assignment.max_score}
      </p>
      {assignment.description && <p className="mt-4 text-gray-700">{assignment.description}</p>}

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        {!assignment.project_id ? (
          <button
            type="button"
            onClick={handleStart}
            disabled={startAssignment.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {startAssignment.isPending ? 'Starting…' : 'Start Assignment'}
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Status: {assignment.submission ? STATUS_LABELS[assignment.submission.status] : STATUS_LABELS.IN_PROGRESS}
                {assignment.submission?.status === 'GRADED' && (
                  <span className="ml-2">
                    ({assignment.submission.score}/{assignment.max_score} —{' '}
                    <span className={assignment.submission.passed ? 'text-emerald-700' : 'text-red-700'}>
                      {assignment.submission.passed ? 'Pass' : 'Fail'}
                    </span>
                    )
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => router.push(`/projects/${assignment.project_id}`)}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Continue
              </button>
            </div>
            {assignment.submission && assignment.submission.events.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <SubmissionTimeline events={assignment.submission.events} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
