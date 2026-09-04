'use client';

import { useInstructorRoster } from '@/hooks/use-instructor-roster';

export function RosterView(): React.ReactNode {
  const { data: roster, isLoading, isError } = useInstructorRoster();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">My Students</h1>
      <p className="mt-1 text-sm text-gray-500">
        Assigned by an admin. Contact an admin to add or remove students from your roster.
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {isLoading && <p className="p-4 text-sm text-gray-400">Loading…</p>}
        {isError && <p className="p-4 text-sm text-red-600">Failed to load your roster.</p>}
        {!isLoading && !isError && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roster?.map((link) => (
                <tr key={link.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">{link.student.name}</td>
                  <td className="px-4 py-2 text-gray-600">{link.student.email}</td>
                </tr>
              ))}
              {roster?.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-gray-400">
                    No students assigned to you yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
