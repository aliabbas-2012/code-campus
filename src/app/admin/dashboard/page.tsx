'use client';

import Link from 'next/link';
import { useAdminUsers } from '@/hooks/use-admin-users';
import { useAdminRoster } from '@/hooks/use-admin-roster';

export default function AdminDashboardPage(): React.ReactNode {
  const { data: users } = useAdminUsers();
  const { data: roster } = useAdminRoster();

  const instructorCount = users?.filter((u) => u.role === 'INSTRUCTOR').length ?? 0;
  const studentCount = users?.filter((u) => u.role === 'STUDENT').length ?? 0;
  const rosterCount = roster?.length ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Dashboard</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/admin/users" className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
          <p className="text-sm text-gray-500 dark:text-gray-400">Instructors</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{instructorCount}</p>
        </Link>
        <Link href="/admin/users" className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
          <p className="text-sm text-gray-500 dark:text-gray-400">Students</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{studentCount}</p>
        </Link>
        <Link href="/admin/rosters" className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
          <p className="text-sm text-gray-500 dark:text-gray-400">Roster links</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{rosterCount}</p>
        </Link>
      </div>
    </div>
  );
}
