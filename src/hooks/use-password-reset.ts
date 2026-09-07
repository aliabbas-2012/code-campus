'use client';

import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ForgotPasswordInput, ForgotPasswordResult, ResetPasswordInput } from '@/types/api';

export function useForgotPassword(): UseMutationResult<ForgotPasswordResult, Error, ForgotPasswordInput> {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) => api.auth.forgotPassword(input),
  });
}

export function useResetPassword(): UseMutationResult<{ success: true }, Error, ResetPasswordInput> {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => api.auth.resetPassword(input),
  });
}
