'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/lib/api';

export interface UserFormValues {
  name: string;
  email: string;
  password: string;
  role: 'INSTRUCTOR' | 'STUDENT';
}

interface UserFormDialogProps {
  isSubmitting: boolean;
  submitError: unknown;
  onSubmit: (values: UserFormValues) => void;
  onClose: () => void;
}

export function UserFormDialog({ isSubmitting, submitError, onSubmit, onClose }: UserFormDialogProps): React.ReactNode {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormValues>({ defaultValues: { name: '', email: '', password: '', role: 'STUDENT' } });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900">New User</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div>
            <label htmlFor="user-name" className="block text-sm font-medium text-gray-700">Name</label>
            <input
              id="user-name"
              autoFocus
              {...register('name', { required: 'Name is required', maxLength: 255 })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              disabled={isSubmitting}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="user-email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="user-email"
              type="email"
              {...register('email', { required: 'Email is required' })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              disabled={isSubmitting}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="user-password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="user-password"
              type="password"
              {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              disabled={isSubmitting}
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="user-role" className="block text-sm font-medium text-gray-700">Role</label>
            <select
              id="user-role"
              {...register('role')}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              disabled={isSubmitting}
            >
              <option value="STUDENT">Student</option>
              <option value="INSTRUCTOR">Instructor</option>
            </select>
          </div>

          {submitError instanceof ApiError && <p className="text-sm text-red-600">{submitError.message}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
