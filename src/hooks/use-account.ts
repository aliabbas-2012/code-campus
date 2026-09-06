'use client';

import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ChangePasswordInput } from '@/types/api';

export function useChangePassword(): UseMutationResult<{ success: true }, Error, ChangePasswordInput> {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => api.account.changePassword(input),
  });
}
