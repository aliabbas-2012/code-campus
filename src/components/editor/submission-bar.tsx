'use client';

import { useState } from 'react';
import { useSubmission, useSubmissionAction } from '@/hooks/use-submission';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { SubmissionTimeline } from '@/components/shared/submission-timeline';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

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
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarks, setRemarks] = useState('');

  if (!submission) return null;

  const canSubmit = submission.status === 'IN_PROGRESS' || submission.status === 'REVISION_REQUESTED';
  const canCancel = submission.status === 'SUBMITTED';
  const isResubmit = submission.status === 'REVISION_REQUESTED';

  const handleSubmit = (): void => {
    action.mutate(
      { action: 'submit', remarks: remarks.trim() ? remarks : undefined },
      {
        onSuccess: () => {
          setRemarks('');
          setShowRemarks(false);
        },
        onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to submit'),
      },
    );
  };

  const handleCancel = (): void => {
    action.mutate(
      { action: 'cancel' },
      {
        onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to cancel review request'),
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
        {submission.status === 'SUBMITTED' && (
          <span className="text-xs text-gray-500">Your files are locked while this is awaiting review.</span>
        )}
        <button
          type="button"
          onClick={() => setShowTimeline((v) => !v)}
          className="text-xs font-medium text-gray-500 underline hover:text-gray-700"
        >
          {showTimeline ? 'Hide history' : 'Show history'}
        </button>
        <div className="ml-auto flex items-center gap-2">
          {canCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={action.isPending}
              className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel Review Request
            </button>
          )}
          {canSubmit && !showRemarks && (
            <button
              type="button"
              onClick={() => setShowRemarks(true)}
              className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
            >
              {isResubmit ? 'Resubmit' : 'Submit for Review'}
            </button>
          )}
        </div>
      </div>

      {canSubmit && showRemarks && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-gray-500">Remarks for your instructor (optional)</p>
          <div className="mt-1">
            <RichTextEditor value={remarks} onChange={setRemarks} placeholder="Explain your approach, note anything you're unsure about, add code snippets…" />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowRemarks(false)}
              className="rounded-lg px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={action.isPending}
              className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {action.isPending ? 'Submitting…' : isResubmit ? 'Resubmit' : 'Submit for Review'}
            </button>
          </div>
        </div>
      )}

      {showTimeline && (
        <div className="mt-3">
          <SubmissionTimeline events={submission.events} />
        </div>
      )}
    </div>
  );
}
