'use client';

import { useMemo } from 'react';
import { useInstructorStudentAssignments } from '@/hooks/use-instructor-roster';
import { useInView } from '@/hooks/use-in-view';
import { computeAssignmentStats } from '@/lib/assignment-stats';

export function StudentAggregateCell({ studentId }: { studentId: string }): React.ReactNode {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const { data, isLoading } = useInstructorStudentAssignments(studentId, inView);
  const stats = useMemo(() => computeAssignmentStats(data ?? []), [data]);

  if (!inView || isLoading || !data) {
    return <span ref={ref} className="text-xs text-gray-300">…</span>;
  }

  return (
    <span ref={ref} className="text-xs text-gray-500 dark:text-gray-400">
      {stats.total} assignment{stats.total === 1 ? '' : 's'} · {stats.passed} passed · {stats.failed} failed
    </span>
  );
}
