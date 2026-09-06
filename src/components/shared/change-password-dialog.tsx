'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useChangePassword } from '@/hooks/use-account';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';

export function ChangePasswordDialog({ onClose }: { onClose: () => void }): React.ReactNode {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const changePassword = useChangePassword();
  const { showToast } = useToast();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setFormError(null);

    if (newPassword.length < 8) {
      setFormError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('New password and confirmation do not match');
      return;
    }

    changePassword.mutate(
      { current_password: currentPassword, new_password: newPassword },
      {
        onSuccess: () => {
          showToast('Password changed', 'info');
          onClose();
        },
        onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Failed to change password'),
      },
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">Current password</label>
            <input
              id="current-password"
              type="password"
              autoFocus
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">New password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={changePassword.isPending}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={changePassword.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {changePassword.isPending ? 'Saving…' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
