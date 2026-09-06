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
  AdminUser,
  AdminUserDetail,
  AdminUserListParams,
  AdminUserListResult,
  CreateUserInput,
  UserAggregates,
  UserRole,
} from '@/types/api';

export function useAdminUsers(role?: UserRole): UseQueryResult<AdminUser[]> {
  return useQuery({
    queryKey: queryKeys.adminUsers(role),
    queryFn: () => api.admin.users.list(role),
  });
}

export function useAdminUsersPaged(params: AdminUserListParams): UseQueryResult<AdminUserListResult> {
  return useQuery({
    queryKey: queryKeys.adminUsersPaged(params as Record<string, unknown>),
    queryFn: () => api.admin.users.listPaged(params),
  });
}

export function useAdminUserDetail(id: string | null): UseQueryResult<AdminUserDetail> {
  return useQuery({
    queryKey: queryKeys.adminUserDetail(id ?? ''),
    queryFn: () => api.admin.users.get(id as string),
    enabled: !!id,
  });
}

/** Fetched independently per row (and only once the row is scrolled into view) so the main
 * table never waits on it and a full page of rows doesn't fire every aggregate at once. */
export function useAdminUserAggregates(id: string, enabled: boolean): UseQueryResult<UserAggregates> {
  return useQuery({
    queryKey: queryKeys.adminUserAggregates(id),
    queryFn: () => api.admin.users.aggregates(id),
    staleTime: 60_000,
    enabled,
  });
}

export function useCreateUser(): UseMutationResult<AdminUser, Error, CreateUserInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => api.admin.users.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useDeleteAdmin(): UseMutationResult<{ success: true }, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.admin.users.deleteAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}
