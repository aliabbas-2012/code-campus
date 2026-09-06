'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInstructorRoster } from '@/hooks/use-instructor-roster';
import { StudentAggregateCell } from './student-aggregate-cell';
import type { RosterLink } from '@/types/api';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type SortField = 'name' | 'email';

export function RosterView(): React.ReactNode {
  const { data: roster, isLoading, isError } = useInstructorRoster();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = roster ?? [];
    if (!q) return base;
    return base.filter(
      (link) =>
        link.student.name.toLowerCase().includes(q) || link.student.email.toLowerCase().includes(q),
    );
  }, [roster, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const cmp = a.student[sortBy].localeCompare(b.student[sortBy]);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortBy, sortDir]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const paged = sorted.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  const toggleSort = (field: SortField): void => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const sortArrow = (field: SortField): string => (sortBy === field ? (sortDir === 'asc' ? '▲' : '▼') : '');

  const handleRowClick = (link: RosterLink): void => router.push(`/instructor/students/${link.student.id}`);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Students</h1>
      <p className="mt-1 text-sm text-gray-500">
        Assigned by an admin. Contact an admin to add or remove students from your roster.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name or email…"
          className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <label htmlFor="roster-page-size">Rows per page</label>
          <select
            id="roster-page-size"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm shadow-sm"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading && <p className="p-4 text-sm text-gray-400">Loading…</p>}
        {isError && <p className="p-4 text-sm text-red-600">Failed to load your roster.</p>}
        {!isLoading && !isError && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/60 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="cursor-pointer px-4 py-3 hover:text-gray-700" onClick={() => toggleSort('name')}>
                  Name {sortArrow('name')}
                </th>
                <th className="cursor-pointer px-4 py-3 hover:text-gray-700" onClick={() => toggleSort('email')}>
                  Email {sortArrow('email')}
                </th>
                <th className="px-4 py-3">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map((link) => (
                <tr key={link.id} onClick={() => handleRowClick(link)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{link.student.name}</td>
                  <td className="px-4 py-3 text-gray-600">{link.student.email}</td>
                  <td className="px-4 py-3">
                    <StudentAggregateCell studentId={link.student.id} />
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                    {search ? 'No students match your search.' : 'No students assigned to you yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && !isError && total > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <span>
            {(clampedPage - 1) * pageSize + 1}–{Math.min(clampedPage * pageSize, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={clampedPage <= 1}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-2 py-1 text-xs text-gray-500">
              Page {clampedPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={clampedPage >= totalPages}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
