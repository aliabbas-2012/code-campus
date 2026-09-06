'use client';

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { CreateLineCommentInput, LineComment } from '@/types/api';

export function useLineComments(fileId: string | null): UseQueryResult<LineComment[]> {
  return useQuery({
    queryKey: queryKeys.lineComments(fileId ?? ''),
    queryFn: () => api.lineComments.list(fileId as string),
    enabled: !!fileId,
  });
}

export function useCreateLineComment(
  fileId: string,
): UseMutationResult<LineComment, Error, CreateLineCommentInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLineCommentInput) => api.lineComments.create(fileId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lineComments(fileId) });
    },
  });
}

export function useSetLineCommentResolved(
  fileId: string,
): UseMutationResult<LineComment, Error, { commentId: string; resolved: boolean }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, resolved }) => api.lineComments.setResolved(commentId, resolved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lineComments(fileId) });
    },
  });
}

export function useDeleteLineComment(fileId: string): UseMutationResult<{ success: true }, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => api.lineComments.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lineComments(fileId) });
    },
  });
}
