'use client';

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { SmtpSettings } from '@/types/api';

export function useSmtpSettings(): UseQueryResult<SmtpSettings | null> {
  return useQuery({ queryKey: queryKeys.adminSmtpSettings, queryFn: api.admin.smtpSettings.get });
}

export function useUpdateSmtpSettings(): UseMutationResult<SmtpSettings, Error, SmtpSettings> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SmtpSettings) => api.admin.smtpSettings.update(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminSmtpSettings }),
  });
}
