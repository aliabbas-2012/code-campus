'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInstructorAssignments, useCreateAssignment } from '@/hooks/use-instructor-assignments';
import { AssignmentFormDialog, type AssignmentFormValues } from './assignment-form-dialog';

export function AssignmentList(): React.ReactNode {
  const { data: assignments, isLoading, isError } = useInstructorAssignments();
  const createAssignment = useCreateAssignment();
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

  const handleCreate = (values: AssignmentFormValues, studentIds: string[]): void => {
    createAssignment.mutate(
      { ...values, student_ids: studentIds },
      { onSuccess: () => setShowCreate(false) },
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New Assignment
        </button>
      </div>

      {isLoading && <p className="mt-4 text-sm text-gray-400">Loading…</p>}
      {isError && <p className="mt-4 text-sm text-red-600">Failed to load assignments.</p>}

      {!isLoading && !isError && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {assignments?.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => router.push(`/instructor/assignments/${a.id}`)}
              className="rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm hover:border-indigo-300"
            >
              <h3 className="font-semibold text-gray-900">{a.title}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {a._count.assigned_students} student{a._count.assigned_students === 1 ? '' : 's'} · pass at{' '}
                {a.pass_threshold}/{a.max_score}
              </p>
            </button>
          ))}
          {assignments?.length === 0 && (
            <p className="text-sm text-gray-400">No assignments yet — create one to get started.</p>
          )}
        </div>
      )}

      {showCreate && (
        <AssignmentFormDialog
          isSubmitting={createAssignment.isPending}
          submitError={createAssignment.error}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
