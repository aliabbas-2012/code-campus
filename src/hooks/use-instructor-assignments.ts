import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type {
  AssignmentDetail,
  AssignmentSummary,
  AddAssignmentStudentsInput,
  CreateAssignmentInput,
} from '@/types/api';

export function useInstructorAssignments(): UseQueryResult<AssignmentSummary[]> {
  return useQuery({
    queryKey: queryKeys.instructorAssignments,
    queryFn: api.instructor.assignments.list,
  });
}

export function useInstructorAssignment(id: string): UseQueryResult<AssignmentDetail> {
  return useQuery({
    queryKey: queryKeys.instructorAssignment(id),
    queryFn: () => api.instructor.assignments.get(id),
    enabled: !!id,
  });
}

export function useCreateAssignment(): UseMutationResult<
  { id: string; title: string },
  Error,
  CreateAssignmentInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssignmentInput) => api.instructor.assignments.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructorAssignments });
    },
  });
}

export function useAddAssignmentStudents(
  assignmentId: string,
): UseMutationResult<{ success: true }, Error, AddAssignmentStudentsInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddAssignmentStudentsInput) =>
      api.instructor.assignments.addStudents(assignmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructorAssignment(assignmentId) });
    },
  });
}
