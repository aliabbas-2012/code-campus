'use client';

import { useState } from 'react';
import { useSubmission, useSubmissionAction } from '@/hooks/use-submission';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { SubmissionTimeline } from '@/components/shared/submission-timeline';

const STATUS_STYLES: Record<string, string> = {
  IN_PROGRESS: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  REVISION_REQUESTED: 'bg-amber-100 text-amber-800',
  GRADED: 'bg-emerald-100 text-emerald-800',
};

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'Not submitted',
  SUBMITTED: 'Submitted — awaiting review',
  REVISION_REQUESTED: 'Revision requested',
  GRADED: 'Graded',
};

export function SubmissionBar({ projectId }: { projectId: string }): React.ReactNode {
  const { data: submission } = useSubmission(projectId);
  const action = useSubmissionAction(projectId);
  const { showToast } = useToast();
  const [showTimeline, setShowTimeline] = useState(false);

  if (!submission) return null;

  const canSubmit = submission.status === 'IN_PROGRESS' || submission.status === 'REVISION_REQUESTED';
  const isResubmit = submission.status === 'REVISION_REQUESTED';

  const handleSubmit = (): void => {
    action.mutate(
      { action: 'submit' },
      {
        onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to submit'),
      },
    );
  };

  return (
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[submission.status]}`}>
          {STATUS_LABELS[submission.status]}
        </span>
        {submission.status === 'GRADED' && (
          <span className="text-sm font-medium text-gray-700">
            {submission.score}/{submission.assignment.max_score} —{' '}
            <span className={submission.passed ? 'text-emerald-700' : 'text-red-700'}>
              {submission.passed ? 'Pass' : 'Fail'}
            </span>
          </span>
        )}
        <button
          type="button"
          onClick={() => setShowTimeline((v) => !v)}
          className="text-xs font-medium text-gray-500 underline hover:text-gray-700"
        >
          {showTimeline ? 'Hide history' : 'Show history'}
        </button>
        {canSubmit && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={action.isPending}
            className="ml-auto rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {action.isPending ? 'Submitting…' : isResubmit ? 'Resubmit' : 'Submit for Review'}
          </button>
        )}
      </div>
      {showTimeline && (
        <div className="mt-3">
          <SubmissionTimeline events={submission.events} />
        </div>
      )}
    </div>
  );
}
