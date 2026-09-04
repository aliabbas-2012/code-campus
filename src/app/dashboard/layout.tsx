'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV = [
  { href: '/dashboard', label: 'My Projects' },
  { href: '/dashboard/assignments', label: 'Assignments' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

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
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl gap-1 px-4 pt-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
                pathname === item.href
                  ? 'border-b-2 border-indigo-600 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
