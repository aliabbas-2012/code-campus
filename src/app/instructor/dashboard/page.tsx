'use client';

import Link from 'next/link';
import { useInstructorRoster } from '@/hooks/use-instructor-roster';
import { useInstructorAssignments } from '@/hooks/use-instructor-assignments';

export default function InstructorDashboardPage(): React.ReactNode {
  const { data: roster } = useInstructorRoster();
  const { data: assignments } = useInstructorAssignments();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/instructor/students" className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-indigo-300">
          <p className="text-sm text-gray-500">My Students</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{roster?.length ?? 0}</p>
        </Link>
        <Link href="/instructor/assignments" className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-indigo-300">
          <p className="text-sm text-gray-500">Assignments</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{assignments?.length ?? 0}</p>
        </Link>
      </div>
    </div>
  );
}
