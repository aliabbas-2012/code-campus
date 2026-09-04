'use client';

import type { SubmissionEvent } from '@/types/api';

const LABELS: Record<SubmissionEvent['type'], string> = {
  SUBMITTED: 'Submitted for review',
  REVISION_REQUESTED: 'Revision requested',
  GRADED: 'Graded',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function SubmissionTimeline({ events }: { events: SubmissionEvent[] }): React.ReactNode {
  if (events.length === 0) {
    return <p className="text-sm text-gray-400">No activity yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {[...events].reverse().map((event) => (
        <li key={event.id} className="border-l-2 border-gray-200 pl-3">
          <div className="flex items-center justify-between text-sm font-medium text-gray-800">
            <span>{LABELS[event.type]}</span>
            <span className="text-xs font-normal text-gray-400">{formatDate(event.created_at)}</span>
          </div>
          <p className="text-xs text-gray-500">by {event.actor.name}</p>
          {event.feedback && <p className="mt-1 text-sm text-gray-700">{event.feedback}</p>}
          {event.score !== null && <p className="mt-1 text-sm text-gray-700">Score: {event.score}</p>}
        </li>
      ))}
    </ol>
  );
}
