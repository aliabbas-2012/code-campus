'use client';

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { NotificationBell } from '@/components/shared/notification-bell';
import { usePresenceHeartbeat } from '@/hooks/use-presence';

const NAV = [
  { href: '/dashboard', label: 'My Projects' },
  { href: '/dashboard/assignments', label: 'Assignments' },
  { href: '/dashboard/report', label: 'Report' },
  { href: '/dashboard/guidelines', label: 'Guidelines' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  usePresenceHeartbeat();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      if (session.user?.role === 'ADMIN') router.push('/admin/dashboard');
      else if (session.user?.role === 'INSTRUCTOR') router.push('/instructor/dashboard');
    }
  }, [status, session, router]);

  if (status === 'loading' || (status === 'authenticated' && session.user?.role !== 'STUDENT')) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-8">
            <span className="font-semibold text-gray-900">Code Campus</span>
            <nav className="flex gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    pathname === item.href
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
