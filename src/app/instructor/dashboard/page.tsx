'use client';

import Link from 'next/link';
import { useInstructorRoster } from '@/hooks/use-instructor-roster';
import { useInstructorAssignments } from '@/hooks/use-instructor-assignments';

export default function InstructorDashboardPage(): React.ReactNode {
  const { data: roster } = useInstructorRoster();
  const { data: assignments } = useInstructorAssignments();

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Dashboard</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/instructor/students" className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
          <p className="text-sm text-gray-500 dark:text-gray-400">My Students</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{roster?.length ?? 0}</p>
        </Link>
        <Link href="/instructor/assignments" className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
          <p className="text-sm text-gray-500 dark:text-gray-400">Assignments</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{assignments?.length ?? 0}</p>
        </Link>
      </div>
    </div>
  );
}
