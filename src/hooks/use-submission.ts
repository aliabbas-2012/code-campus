import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { SubmissionActionInput, SubmissionDetail } from '@/types/api';

export function useSubmission(projectId: string | null): UseQueryResult<SubmissionDetail | null> {
  return useQuery({
    queryKey: queryKeys.submission(projectId ?? ''),
    queryFn: () => api.submissions.get(projectId as string),
    enabled: !!projectId,
  });
}

export function useSubmissionAction(
  projectId: string,
  assignmentIdForInvalidation?: string,
): UseMutationResult<SubmissionDetail, Error, SubmissionActionInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmissionActionInput) => api.submissions.act(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.submission(projectId) });
      if (assignmentIdForInvalidation) {
        queryClient.invalidateQueries({ queryKey: queryKeys.instructorAssignment(assignmentIdForInvalidation) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.studentAssignments });
    },
  });
}
