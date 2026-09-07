'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/shared/logo';
import { ApiError } from '@/lib/api';
import { useResetPassword } from '@/hooks/use-password-reset';

function ResetPasswordForm(): React.ReactNode {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState('');
  const resetPassword = useResetPassword();

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setFieldError('');

    if (newPassword.length < 8) {
      setFieldError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError('Passwords do not match');
      return;
    }

    resetPassword.mutate(
      { token, new_password: newPassword },
      { onSuccess: () => setTimeout(() => router.push('/login'), 2000) },
    );
  };

  if (!token) {
    return (
      <div className="space-y-4">
        <div className="rounded border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 px-4 py-3 text-sm">
          This link is missing its reset token. Request a new one below.
        </div>
        <Link href="/forgot-password" className="block text-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (resetPassword.isSuccess) {
    return (
      <div className="space-y-4">
        <div className="rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-4 py-3 text-sm">
          Your password has been reset. Redirecting you to sign in…
        </div>
      </div>
    );
  }

  const isExpiredOrInvalid = resetPassword.error instanceof ApiError && resetPassword.error.code === 'VALIDATION_ERROR';

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {resetPassword.isError && (
        <div className="space-y-2">
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
            {resetPassword.error instanceof ApiError ? resetPassword.error.message : 'Something went wrong. Please try again.'}
          </div>
          {isExpiredOrInvalid && (
            <Link href="/forgot-password" className="block text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
              Request a new reset link
            </Link>
          )}
        </div>
      )}

      <div>
        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (fieldError) setFieldError('');
          }}
          className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-900 dark:text-gray-100"
          placeholder="••••••••"
          disabled={resetPassword.isPending}
        />
      </div>

      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (fieldError) setFieldError('');
          }}
          className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-900 dark:text-gray-100"
          placeholder="••••••••"
          disabled={resetPassword.isPending}
        />
        {fieldError && <p className="mt-1 text-sm text-red-600">{fieldError}</p>}
      </div>

      <button
        type="submit"
        disabled={resetPassword.isPending}
        className="w-full bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
      >
        {resetPassword.isPending ? 'Resetting…' : 'Reset password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage(): React.ReactNode {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
        <div className="mb-8 flex flex-col items-center">
          <Logo size="lg" />
          <p className="mt-2 text-center text-gray-600 dark:text-gray-400">Choose a new password</p>
        </div>

        <Suspense fallback={<p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
