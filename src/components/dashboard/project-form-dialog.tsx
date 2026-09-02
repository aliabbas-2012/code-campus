'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/lib/api';

export interface ProjectFormValues {
  name: string;
  description: string;
}

interface ProjectFormDialogProps {
  title: string;
  submitLabel: string;
  defaultValues?: ProjectFormValues;
  isSubmitting: boolean;
  submitError: unknown;
  onSubmit: (values: ProjectFormValues) => void;
  onClose: () => void;
}

export function ProjectFormDialog({
  title,
  submitLabel,
  defaultValues,
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
}: ProjectFormDialogProps): React.ReactNode {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    defaultValues: defaultValues ?? { name: '', description: '' },
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const isDuplicateNameError =
    submitError instanceof ApiError && submitError.code === 'VALIDATION_ERROR';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="project-name"
              autoFocus
              {...register('name', { required: 'Project name is required', maxLength: 255 })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
            {isDuplicateNameError && (
              <p className="mt-1 text-sm text-red-600">{submitError.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="project-description" className="block text-sm font-medium text-gray-700">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="project-description"
              rows={3}
              {...register('description', { maxLength: 500 })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {submitError instanceof ApiError && !isDuplicateNameError && (
            <p className="text-sm text-red-600">{submitError.message}</p>
          )}

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
              {isSubmitting ? 'Saving…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
