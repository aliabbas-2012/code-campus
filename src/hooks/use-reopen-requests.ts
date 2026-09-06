'use client';

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AdminReopenRequest } from '@/types/api';

const REOPEN_REQUESTS_KEY = ['admin', 'reopen-requests'] as const;

export function useAdminReopenRequests(): UseQueryResult<AdminReopenRequest[]> {
  return useQuery({
    queryKey: REOPEN_REQUESTS_KEY,
    queryFn: api.admin.reopenRequests.list,
  });
}

export function useResolveReopenRequest(): UseMutationResult<{ success: true }, Error, { id: string; approve: boolean }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approve }) => api.admin.reopenRequests.resolve(id, approve),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: REOPEN_REQUESTS_KEY }),
  });
}
