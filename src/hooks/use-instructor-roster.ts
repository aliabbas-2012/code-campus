import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { InstructorStudentAssignment, RosterLink } from '@/types/api';

export function useInstructorRoster(): UseQueryResult<RosterLink[]> {
  return useQuery({
    queryKey: queryKeys.instructorRoster,
    queryFn: api.instructor.roster.list,
  });
}

export function useInstructorStudentAssignments(
  studentId: string,
  enabled = true,
): UseQueryResult<InstructorStudentAssignment[]> {
  return useQuery({
    queryKey: ['instructor', 'students', studentId, 'assignments'],
    queryFn: () => api.instructor.roster.studentAssignments(studentId),
    enabled: enabled && !!studentId,
  });
}
