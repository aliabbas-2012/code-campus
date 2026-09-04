import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { AdminUser, CreateUserInput, UserRole } from '@/types/api';

export function useAdminUsers(role?: UserRole): UseQueryResult<AdminUser[]> {
  return useQuery({
    queryKey: queryKeys.adminUsers(role),
    queryFn: () => api.admin.users.list(role),
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
