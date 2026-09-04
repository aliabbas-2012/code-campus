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
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/admin/users" className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-indigo-300">
          <p className="text-sm text-gray-500">Instructors</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{instructorCount}</p>
        </Link>
        <Link href="/admin/users" className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-indigo-300">
          <p className="text-sm text-gray-500">Students</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{studentCount}</p>
        </Link>
        <Link href="/admin/rosters" className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-indigo-300">
          <p className="text-sm text-gray-500">Roster links</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{rosterCount}</p>
        </Link>
      </div>
    </div>
  );
}
