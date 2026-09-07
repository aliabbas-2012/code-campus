'use client';

import { useRouter } from 'next/navigation';
import { useStudentAssignment } from '@/hooks/use-student-assignments';
import { Workspace } from '@/components/editor/workspace';

export function AssignmentWorkspace({ assignmentId }: { assignmentId: string }): React.ReactNode {
  const router = useRouter();
  const { data: assignment, isLoading, isError } = useStudentAssignment(assignmentId);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-sm text-gray-400 dark:text-gray-500">Loading…</div>;
  }

  if (isError || !assignment || !assignment.project_id) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-red-600">
        This assignment hasn&apos;t been started yet.
      </div>
    );
  }

  return (
    <Workspace
      projectId={assignment.project_id}
      mode="edit"
      backLabel="Assignment"
      canonicalizeUrl={false}
      onBack={() => router.push(`/dashboard/assignments/${assignmentId}`)}
    />
  );
}
