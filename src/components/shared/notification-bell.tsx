'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useNotifications, useMarkNotificationRead } from '@/hooks/use-notifications';
import { useOnClickOutside } from '@/hooks/use-on-click-outside';
import type { Notification } from '@/types/api';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function NotificationBell(): React.ReactNode {
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(containerRef, () => setOpen(false));

  const unreadCount = data?.unreadCount ?? 0;
  const recent = (data?.notifications ?? []).slice(0, 8);

  const handleClickNotification = (n: Notification): void => {
    if (!n.read) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-xs font-semibold uppercase text-gray-500">Notifications</span>
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
              View all
            </Link>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {recent.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => handleClickNotification(n)}
                  className={`block w-full border-b border-gray-50 px-3 py-2 text-left last:border-0 hover:bg-gray-50 ${!n.read ? 'bg-indigo-50/50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900">{n.title}</span>
                    {!n.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{n.message}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{formatDate(n.created_at)}</p>
                </button>
              </li>
            ))}
            {recent.length === 0 && <li className="px-3 py-6 text-center text-sm text-gray-400">No notifications yet.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
