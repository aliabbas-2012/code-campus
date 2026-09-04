'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted — awaiting review',
  REVISION_REQUESTED: 'Revision requested',
  GRADED: 'Graded',
};

export function ReviewPanel({ projectId }: { projectId: string }): React.ReactNode {
  const { data: submission } = useSubmission(projectId);
  const router = useRouter();
  const { showToast } = useToast();
  const action = useSubmissionAction(projectId, submission?.assignment.id);

  const [showTimeline, setShowTimeline] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState('');

  if (!submission) return null;

  const canAct = submission.status === 'SUBMITTED';
  const scoreNumber = Number(score);
  const wouldPass = score !== '' && !Number.isNaN(scoreNumber) && scoreNumber >= submission.assignment.pass_threshold;

  const handleRequestRevision = (): void => {
    if (!feedback.trim()) return;
    action.mutate(
      { action: 'request_revision', feedback: feedback.trim() },
      {
        onSuccess: () => setFeedback(''),
        onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to send revision request'),
      },
    );
  };

  const handleGrade = (): void => {
    if (score === '' || Number.isNaN(scoreNumber)) return;
    action.mutate(
      { action: 'grade', score: scoreNumber },
      {
        onSuccess: () => setScore(''),
        onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to submit grade'),
      },
    );
  };

  return (
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[submission.status]}`}>
          {STATUS_LABELS[submission.status]}
        </span>
        <span className="text-sm text-gray-500">
          {submission.assignment.title} · pass at {submission.assignment.pass_threshold}/{submission.assignment.max_score}
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
          className="ml-auto text-xs font-medium text-gray-500 underline hover:text-gray-700"
        >
          {showTimeline ? 'Hide history' : 'Show history'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/instructor/assignments')}
          className="text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          Back to assignments
        </button>
      </div>

      {showTimeline && (
        <div className="mt-3">
          <SubmissionTimeline events={submission.events} />
        </div>
      )}

      {canAct && (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <label htmlFor="feedback" className="block text-xs font-semibold uppercase text-gray-500">
              Request revision
            </label>
            <textarea
              id="feedback"
              rows={2}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What should the student change?"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-transparent focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={handleRequestRevision}
              disabled={!feedback.trim() || action.isPending}
              className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Send Revision Request
            </button>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <label htmlFor="score" className="block text-xs font-semibold uppercase text-gray-500">
              Grade
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="score"
                type="number"
                min={0}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="0"
                className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-500">/ {submission.assignment.max_score}</span>
              {score !== '' && !Number.isNaN(scoreNumber) && (
                <span className={`text-xs font-medium ${wouldPass ? 'text-emerald-700' : 'text-red-700'}`}>
                  {wouldPass ? 'Would pass' : 'Would fail'}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleGrade}
              disabled={score === '' || Number.isNaN(scoreNumber) || action.isPending}
              className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Submit Grade
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
