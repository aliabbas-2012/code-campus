import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { RosterLink, CreateInstructorStudentInput } from '@/types/api';

export function useAdminRoster(): UseQueryResult<RosterLink[]> {
  return useQuery({
    queryKey: queryKeys.adminRoster,
    queryFn: api.admin.roster.list,
  });
}

export function useCreateRosterLink(): UseMutationResult<{ id: string }, Error, CreateInstructorStudentInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInstructorStudentInput) => api.admin.roster.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminRoster });
    },
  });
}

export function useRemoveRosterLink(): UseMutationResult<{ success: true }, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.admin.roster.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminRoster });
    },
  });
}
