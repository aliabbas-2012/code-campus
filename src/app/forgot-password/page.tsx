'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/shared/logo';
import { useForgotPassword } from '@/hooks/use-password-reset';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage(): React.ReactNode {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const forgotPassword = useForgotPassword();

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setFieldError('');
    if (!email.trim()) {
      setFieldError('Email is required');
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setFieldError('Enter a valid email address');
      return;
    }
    forgotPassword.mutate({ email: email.trim() });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
        <div className="mb-8 flex flex-col items-center">
          <Logo size="lg" />
          <p className="mt-2 text-center text-gray-600 dark:text-gray-400">Reset your password</p>
        </div>

        {forgotPassword.isSuccess ? (
          <div className="space-y-4">
            <div className="rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-4 py-3 text-sm">
              {forgotPassword.data.message}
            </div>

            {forgotPassword.data.devResetLink && (
              <div className="rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
                <p className="font-semibold">Development mode — SMTP isn&apos;t configured</p>
                <p className="mt-1">
                  Reset link:{' '}
                  <a href={forgotPassword.data.devResetLink} className="underline break-all">
                    {forgotPassword.data.devResetLink}
                  </a>
                </p>
              </div>
            )}

            <Link href="/login" className="block text-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter the email address for your account and we&apos;ll send you a link to reset your password.
            </p>

            {forgotPassword.isError && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
                Something went wrong. Please try again.
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError('');
                }}
                aria-invalid={!!fieldError}
                className={`mt-1 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-900 dark:text-gray-100 ${fieldError ? 'border-red-400 dark:border-red-700' : 'border-gray-300 dark:border-gray-700'}`}
                placeholder="your@email.com"
                disabled={forgotPassword.isPending}
              />
              {fieldError && <p className="mt-1 text-sm text-red-600">{fieldError}</p>}
            </div>

            <button
              type="submit"
              disabled={forgotPassword.isPending}
              className="w-full bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {forgotPassword.isPending ? 'Sending…' : 'Send reset link'}
            </button>

            <Link href="/login" className="block text-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
