'use client';

import { useAdminUserAggregates } from '@/hooks/use-admin-users';
import { useInView } from '@/hooks/use-in-view';
import type { UserRole } from '@/types/api';

export function UserAggregateCell({ userId, role }: { userId: string; role: UserRole }): React.ReactNode {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const { data, isLoading } = useAdminUserAggregates(userId, inView);

  if (role === 'ADMIN') return <span className="text-gray-300">—</span>;

  if (!inView || isLoading || !data) {
    return <span ref={ref} className="text-xs text-gray-300">…</span>;
  }

  if (role === 'INSTRUCTOR') {
    return (
      <span ref={ref} className="text-xs text-gray-500">
        {data.studentCount ?? 0} students · {data.assignmentCount ?? 0} assignments
      </span>
    );
  }

  return (
    <span ref={ref} className="text-xs text-gray-500">
      {data.assignmentCount ?? 0} assignments
    </span>
  );
}
