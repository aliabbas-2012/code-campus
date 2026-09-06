'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInstructorStudentAssignments, useInstructorRoster } from '@/hooks/use-instructor-roster';
import { useCreateAssignment } from '@/hooks/use-instructor-assignments';
import { useInstructorViewOfStudentProfile } from '@/hooks/use-student-profile';
import { AssignmentFormDialog, type AssignmentFormValues } from './assignment-form-dialog';
import { AssignmentStatsCards } from '@/components/shared/assignment-stats-cards';
import { StudentProfileCard } from '@/components/shared/student-profile-card';
import { computeAssignmentStats } from '@/lib/assignment-stats';

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted — awaiting review',
  REVISION_REQUESTED: 'Revision requested',
  GRADED: 'Graded',
};

export function StudentAssignments({ studentId }: { studentId: string }): React.ReactNode {
  const { data: assignments, isLoading, isError } = useInstructorStudentAssignments(studentId);
  const { data: roster } = useInstructorRoster();
  const { data: profile } = useInstructorViewOfStudentProfile(studentId);
  const createAssignment = useCreateAssignment();
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

  const student = useMemo(() => roster?.find((link) => link.student.id === studentId)?.student, [roster, studentId]);
  const stats = useMemo(() => computeAssignmentStats(assignments ?? []), [assignments]);

  const goTo = (a: NonNullable<typeof assignments>[number]): void => {
    if (a.submission) {
      router.push(`/review/${a.submission.project_id}`);
    } else {
      router.push(`/instructor/assignments/${a.id}`);
    }
  };

  const handleCreate = (values: AssignmentFormValues, studentIds: string[]): void => {
    createAssignment.mutate(
      { ...values, student_ids: studentIds },
      { onSuccess: () => setShowCreate(false) },
    );
  };

  return (
    <div>
      <button type="button" onClick={() => router.push('/instructor/students')} className="text-sm font-medium text-gray-500 hover:text-gray-700">
        ← My Students
      </button>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Assignments{student ? ` — ${student.name}` : ''}
        </h1>
        {student && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            New Assignment
          </button>
        )}
      </div>

      {!isLoading && !isError && (
        <div className="mt-6">
          <AssignmentStatsCards stats={stats} />
        </div>
      )}

      {profile && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Profile</h2>
          <div className="mt-3">
            <StudentProfileCard bio={profile.bio} interests={profile.interests} />
          </div>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading && <p className="p-4 text-sm text-gray-400">Loading…</p>}
        {isError && <p className="p-4 text-sm text-red-600">Failed to load assignments for this student.</p>}
        {!isLoading && !isError && (
          <ul className="divide-y divide-gray-100">
            {assignments?.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => goTo(a)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                >
                  <span>
                    <span className="block font-medium text-gray-900">{a.title}</span>
                    <span className="text-xs text-gray-500">pass at {a.pass_threshold}/{a.max_score}</span>
                  </span>
                  <span className="text-sm text-gray-600">
                    {a.submission ? STATUS_LABELS[a.submission.status] : 'Not started'}
                    {a.submission?.status === 'GRADED' && ` — ${a.submission.score}/${a.max_score}`}
                  </span>
                </button>
              </li>
            ))}
            {assignments?.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-gray-400">No assignments given to this student yet.</li>
            )}
          </ul>
        )}
      </div>

      {showCreate && student && (
        <AssignmentFormDialog
          isSubmitting={createAssignment.isPending}
          submitError={createAssignment.error}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
          fixedStudent={student}
        />
      )}
    </div>
  );
}
