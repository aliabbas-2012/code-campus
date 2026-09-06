'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { NotificationBell } from '@/components/shared/notification-bell';
import { UserMenu } from '@/components/shared/user-menu';
import { Logo } from '@/components/shared/logo';
import { usePresenceHeartbeat } from '@/hooks/use-presence';

const NAV = [
  { href: '/dashboard', label: 'Assignments' },
  { href: '/dashboard/projects', label: 'Projects' },
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
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/dashboard">
              <Logo />
            </Link>
            <nav className="hidden gap-1 md:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-indigo-50 font-semibold text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <UserMenu
              name={session.user.name ?? ''}
              email={session.user.email ?? ''}
              role={session.user.role}
              profileHref="/dashboard/profile"
            />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2 sm:px-6 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-indigo-50 font-semibold text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
