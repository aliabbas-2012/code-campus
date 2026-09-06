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

  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;
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
      <button type="button" onClick={() => router.push('/admin/users')} className="text-sm font-medium text-gray-500 hover:text-gray-700">
        ← Users
      </button>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
            {user.name}
            {user.is_super_admin && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">SUPER ADMIN</span>
            )}
          </h1>
          <p className="text-sm text-gray-500">
            {user.email} · {user.role} · {user.status}
          </p>
        </div>
        {user.role === 'ADMIN' && !user.is_super_admin && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-50"
          >
            Delete Admin
          </button>
        )}
      </div>

      {user.role === 'INSTRUCTOR' && user.instructor_profile && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Profile</h2>
          {user.instructor_profile.title && <p className="mt-1 text-sm text-gray-700">{user.instructor_profile.title}</p>}
          {user.instructor_profile.specializations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.instructor_profile.specializations.map((tag) => (
                <span key={tag} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {user.instructor_profile.bio && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{user.instructor_profile.bio}</p>}
        </div>
      )}

      {user.role === 'INSTRUCTOR' && (
        <>
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Students ({students.length})</h2>
            <ul className="mt-2 divide-y divide-gray-100">
              {students.map((s) => (
                <li key={s.id} className="py-1.5 text-sm text-gray-700">
                  {s.name} <span className="text-gray-400">({s.email})</span>
                </li>
              ))}
              {students.length === 0 && <p className="py-1.5 text-sm text-gray-400">No students on this roster yet.</p>}
            </ul>
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Assignments ({assignments.length})</h2>
            <ul className="mt-2 divide-y divide-gray-100">
              {assignments.map((a) => (
                <li key={a.id} className="py-1.5 text-sm text-gray-700">
                  {a.title} <span className="text-gray-400">(pass at {a.pass_threshold}/{a.max_score})</span>
                </li>
              ))}
              {assignments.length === 0 && <p className="py-1.5 text-sm text-gray-400">No assignments created yet.</p>}
            </ul>
          </div>
        </>
      )}

      {user.role === 'STUDENT' && (
        <>
          {user.student_profile && (
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">Profile</h2>
              <div className="mt-2">
                <StudentProfileCard bio={user.student_profile.bio} interests={user.student_profile.interests} />
              </div>
            </div>
          )}

          <div className="mt-6">
            <AssignmentStatsCards stats={stats} />
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Instructors ({instructors.length})</h2>
            <ul className="mt-2 divide-y divide-gray-100">
              {instructors.map((i) => (
                <li key={i.id} className="py-1.5 text-sm text-gray-700">
                  {i.name} <span className="text-gray-400">({i.email})</span>
                </li>
              ))}
              {instructors.length === 0 && <p className="py-1.5 text-sm text-gray-400">Not assigned to an instructor yet.</p>}
            </ul>
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Assignments ({studentAssignments.length})</h2>
            <ul className="mt-2 divide-y divide-gray-100">
              {studentAssignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-1.5 text-sm text-gray-700">
                  <span>
                    {a.title} <span className="text-gray-400">— {a.instructor.name}</span>
                  </span>
                  <span className="flex items-center gap-2 text-gray-600">
                    {a.submission ? STATUS_LABELS[a.submission.status] ?? a.submission.status : 'Not started'}
                    {a.submission?.status === 'GRADED' && <PassFailBadge passed={a.submission.passed} />}
                  </span>
                </li>
              ))}
              {studentAssignments.length === 0 && <p className="py-1.5 text-sm text-gray-400">No assignments given yet.</p>}
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
