import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { StartAssignmentResult, StudentAssignmentDetail, StudentAssignmentSummary } from '@/types/api';

export function useStudentAssignments(): UseQueryResult<StudentAssignmentSummary[]> {
  return useQuery({
    queryKey: queryKeys.studentAssignments,
    queryFn: api.student.assignments.list,
  });
}

export function useStudentAssignment(id: string): UseQueryResult<StudentAssignmentDetail> {
  return useQuery({
    queryKey: queryKeys.studentAssignment(id),
    queryFn: () => api.student.assignments.get(id),
    enabled: !!id,
  });
}

export function useStartAssignment(
  assignmentId: string,
): UseMutationResult<StartAssignmentResult, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.student.assignments.start(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studentAssignment(assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentAssignments });
    },
  });
}
