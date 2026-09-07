'use client';

import { useRouter } from 'next/navigation';
import { useAdminUserDetail, useDeleteAdmin } from '@/hooks/use-admin-users';
import { useToast } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ApiError } from '@/lib/api';
import { useMemo, useState } from 'react';
import { AssignmentStatsCards } from '@/components/shared/assignment-stats-cards';
import { StudentProfileCard } from '@/components/shared/student-profile-card';
import { PassFailBadge } from '@/components/shared/pass-fail-badge';
import { RichTextContent } from '@/components/ui/rich-text-content';
import { computeAssignmentStats } from '@/lib/assignment-stats';

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  REVISION_REQUESTED: 'Revision requested',
  GRADED: 'Graded',
};

export function UserDetailView({ userId }: { userId: string }): React.ReactNode {
  const { data, isLoading, isError } = useAdminUserDetail(userId);
  const deleteAdmin = useDeleteAdmin();
  const { showToast } = useToast();
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const stats = useMemo(() => computeAssignmentStats(data?.studentAssignments ?? []), [data]);

  if (isLoading) return <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>;
  if (isError || !data) return <p className="text-sm text-red-600">Failed to load user.</p>;

  const { user, students, instructors, assignments, studentAssignments } = data;

  const handleDelete = (): void => {
    deleteAdmin.mutate(userId, {
      onSuccess: () => {
        showToast('Admin removed', 'info');
        router.push('/admin/users');
      },
      onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to delete admin'),
    });
  };

  return (
    <div className="max-w-3xl">
      <button type="button" onClick={() => router.push('/admin/users')} className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700">
        ← Users
      </button>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {user.name}
            {user.is_super_admin && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">SUPER ADMIN</span>
            )}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {user.email} · {user.role} · {user.status}
          </p>
        </div>
        {user.role === 'ADMIN' && !user.is_super_admin && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-50"
          >
            Delete Admin
          </button>
        )}
      </div>

      {user.role === 'INSTRUCTOR' && user.instructor_profile && (
        <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Profile</h2>
          {user.instructor_profile.title && <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{user.instructor_profile.title}</p>}
          {user.instructor_profile.specializations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.instructor_profile.specializations.map((tag) => (
                <span key={tag} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {user.instructor_profile.bio && <RichTextContent html={user.instructor_profile.bio} className="mt-2 text-gray-600 dark:text-gray-400" />}
        </div>
      )}

      {user.role === 'INSTRUCTOR' && (
        <>
          <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Students ({students.length})</h2>
            <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
              {students.map((s) => (
                <li key={s.id} className="py-1.5 text-sm text-gray-700 dark:text-gray-300">
                  {s.name} <span className="text-gray-400 dark:text-gray-500">({s.email})</span>
                </li>
              ))}
              {students.length === 0 && <p className="py-1.5 text-sm text-gray-400 dark:text-gray-500">No students on this roster yet.</p>}
            </ul>
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Assignments ({assignments.length})</h2>
            <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
              {assignments.map((a) => (
                <li key={a.id} className="py-1.5 text-sm text-gray-700 dark:text-gray-300">
                  {a.title} <span className="text-gray-400 dark:text-gray-500">(pass at {a.pass_threshold}/{a.max_score})</span>
                </li>
              ))}
              {assignments.length === 0 && <p className="py-1.5 text-sm text-gray-400 dark:text-gray-500">No assignments created yet.</p>}
            </ul>
          </div>
        </>
      )}

      {user.role === 'STUDENT' && (
        <>
          {user.student_profile && (
            <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Profile</h2>
              <div className="mt-2">
                <StudentProfileCard bio={user.student_profile.bio} interests={user.student_profile.interests} />
              </div>
            </div>
          )}

          <div className="mt-6">
            <AssignmentStatsCards stats={stats} />
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Instructors ({instructors.length})</h2>
            <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
              {instructors.map((i) => (
                <li key={i.id} className="py-1.5 text-sm text-gray-700 dark:text-gray-300">
                  {i.name} <span className="text-gray-400 dark:text-gray-500">({i.email})</span>
                </li>
              ))}
              {instructors.length === 0 && <p className="py-1.5 text-sm text-gray-400 dark:text-gray-500">Not assigned to an instructor yet.</p>}
            </ul>
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Assignments ({studentAssignments.length})</h2>
            <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
              {studentAssignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-1.5 text-sm text-gray-700 dark:text-gray-300">
                  <span>
                    {a.title} <span className="text-gray-400 dark:text-gray-500">— {a.instructor.name}</span>
                  </span>
                  <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    {a.submission ? STATUS_LABELS[a.submission.status] ?? a.submission.status : 'Not started'}
                    {a.submission?.status === 'GRADED' && <PassFailBadge passed={a.submission.passed} />}
                  </span>
                </li>
              ))}
              {studentAssignments.length === 0 && <p className="py-1.5 text-sm text-gray-400 dark:text-gray-500">No assignments given yet.</p>}
            </ul>
          </div>
        </>
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title={`Delete ${user.name}?`}
          message="This admin account will be permanently removed. This cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => {
            setShowDeleteConfirm(false);
            handleDelete();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
