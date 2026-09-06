'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminUsersPaged, useCreateUser } from '@/hooks/use-admin-users';
import { UserFormDialog, type UserFormValues } from './user-form-dialog';
import { UserAggregateCell } from './user-aggregate-cell';
import type { UserRole } from '@/types/api';

const TABS: Array<{ label: string; role?: UserRole }> = [
  { label: 'All' },
  { label: 'Admins', role: 'ADMIN' },
  { label: 'Instructors', role: 'INSTRUCTOR' },
  { label: 'Students', role: 'STUDENT' },
];

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

type SortField = 'name' | 'email' | 'role' | 'created_at';

export function UserManagement(): React.ReactNode {
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

  const { data, isLoading, isError } = useAdminUsersPaged({
    role: roleFilter,
    page,
    pageSize,
    search: search.trim() || undefined,
    sortBy,
    sortDir,
  });
  const createUser = useCreateUser();

  const handleCreate = (values: UserFormValues): void => {
    createUser.mutate(values, { onSuccess: () => setShowCreate(false) });
  };

  const toggleSort = (field: SortField): void => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const sortArrow = (field: SortField): string => (sortBy === field ? (sortDir === 'asc' ? '▲' : '▼') : '');

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Users</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          New User
        </button>
      </div>

      <div className="mt-4 flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => {
              setRoleFilter(tab.role);
              setPage(1);
            }}
            className={`px-3 py-2 text-sm font-medium ${
              roleFilter === tab.role ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name or email…"
          className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <label htmlFor="page-size">Rows per page</label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
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
        {isError && <p className="p-4 text-sm text-red-600">Failed to load users.</p>}
        {!isLoading && !isError && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/60 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="cursor-pointer px-4 py-2 hover:text-gray-700" onClick={() => toggleSort('name')}>
                  Name {sortArrow('name')}
                </th>
                <th className="cursor-pointer px-4 py-2 hover:text-gray-700" onClick={() => toggleSort('email')}>
                  Email {sortArrow('email')}
                </th>
                <th className="cursor-pointer px-4 py-2 hover:text-gray-700" onClick={() => toggleSort('role')}>
                  Role {sortArrow('role')}
                </th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Activity</th>
                <th className="cursor-pointer px-4 py-2 hover:text-gray-700" onClick={() => toggleSort('created_at')}>
                  Joined {sortArrow('created_at')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.items.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {user.name}
                    {user.is_super_admin && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        SUPER ADMIN
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-gray-600">{user.role}</td>
                  <td className="px-4 py-3 text-gray-600">{user.status}</td>
                  <td className="px-4 py-3">
                    <UserAggregateCell userId={user.id} role={user.role} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No users found.
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
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-2 py-1 text-xs text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <UserFormDialog
          isSubmitting={createUser.isPending}
          submitError={createUser.error}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
