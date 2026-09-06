'use client';

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { NotificationsResponse } from '@/types/api';

export function useNotifications(): UseQueryResult<NotificationsResponse> {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: api.notifications.list,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead(): UseMutationResult<{ success: true }, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}

export function useMarkAllNotificationsRead(): UseMutationResult<{ success: true }, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}
