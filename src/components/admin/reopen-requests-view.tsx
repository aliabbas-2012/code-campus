'use client';

import { useAdminReopenRequests, useResolveReopenRequest } from '@/hooks/use-reopen-requests';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function ReopenRequestsView(): React.ReactNode {
  const { data: requests, isLoading, isError } = useAdminReopenRequests();
  const resolve = useResolveReopenRequest();
  const { showToast } = useToast();

  const handleResolve = (id: string, approve: boolean): void => {
    resolve.mutate(
      { id, approve },
      { onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to resolve request') },
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Reopen Requests</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        An instructor requests these when a graded submission needs to change. While pending, the student&apos;s
        grade is on hold and hidden from them.
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        {isLoading && <p className="p-4 text-sm text-gray-400 dark:text-gray-500">Loading…</p>}
        {isError && <p className="p-4 text-sm text-red-600">Failed to load reopen requests.</p>}
        {!isLoading && !isError && (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {requests?.map((r) => (
              <li key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{r.submission.assignment.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Student: {r.submission.student.name} ({r.submission.student.email})
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Requested by {r.requested_by.name} · {formatDate(r.created_at)}
                    </p>
                    {r.reason && <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">&quot;{r.reason}&quot;</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleResolve(r.id, false)}
                      disabled={resolve.isPending}
                      className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolve(r.id, true)}
                      disabled={resolve.isPending}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {requests?.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No pending reopen requests.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
