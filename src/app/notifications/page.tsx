'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications';
import type { Notification } from '@/types/api';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const HOME_BY_ROLE: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  INSTRUCTOR: '/instructor/dashboard',
  STUDENT: '/dashboard',
};

export default function NotificationsPage(): React.ReactNode {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const homeHref = HOME_BY_ROLE[session.user.role] ?? '/dashboard';

  const handleClick = (n: Notification): void => {
    if (!n.read) markRead.mutate(n.id);
    if (n.link) router.push(n.link);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <button type="button" onClick={() => router.push(homeHref)} className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700">
              ← Back
            </button>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Notifications</h1>
          </div>
          {data && data.unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          {isLoading && <p className="p-4 text-sm text-gray-400 dark:text-gray-500">Loading…</p>}
          {!isLoading && (data?.notifications.length ?? 0) === 0 && (
            <p className="p-8 text-center text-sm text-gray-400 dark:text-gray-500">No notifications yet.</p>
          )}
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {data?.notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`block w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 ${!n.read ? 'bg-indigo-50/50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</span>
                    <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{formatDate(n.created_at)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{n.message}</p>
                  {!n.read && <span className="mt-1 inline-block text-xs font-medium text-indigo-600">Unread</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
