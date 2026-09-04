'use client';

import { useState } from 'react';
import { useAdminUsers, useCreateUser } from '@/hooks/use-admin-users';
import { UserFormDialog, type UserFormValues } from './user-form-dialog';
import type { UserRole } from '@/types/api';

const TABS: Array<{ label: string; role?: UserRole }> = [
  { label: 'All' },
  { label: 'Instructors', role: 'INSTRUCTOR' },
  { label: 'Students', role: 'STUDENT' },
];

export function UserManagement(): React.ReactNode {
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>(undefined);
  const { data: users, isLoading, isError } = useAdminUsers(roleFilter);
  const createUser = useCreateUser();
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = (values: UserFormValues): void => {
    createUser.mutate(values, { onSuccess: () => setShowCreate(false) });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New User
        </button>
      </div>

      <div className="mt-4 flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setRoleFilter(tab.role)}
            className={`px-3 py-2 text-sm font-medium ${
              roleFilter === tab.role ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {isLoading && <p className="p-4 text-sm text-gray-400">Loading…</p>}
        {isError && <p className="p-4 text-sm text-red-600">Failed to load users.</p>}
        {!isLoading && !isError && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users?.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-2 text-gray-600">{user.email}</td>
                  <td className="px-4 py-2 text-gray-600">{user.role}</td>
                  <td className="px-4 py-2 text-gray-600">{user.status}</td>
                </tr>
              ))}
              {users?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

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
