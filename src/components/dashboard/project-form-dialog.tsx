'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ApiError } from '@/lib/api';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

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
    control,
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
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white dark:bg-gray-900 p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              id="project-name"
              autoFocus
              {...register('name', { required: 'Project name is required', maxLength: 255 })}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 shadow-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-gray-100"
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
            <p className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description <span className="text-gray-400 dark:text-gray-500">(optional)</span>
            </p>
            <div className="mt-1">
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <RichTextEditor value={field.value} onChange={field.onChange} disabled={isSubmitting} />
                )}
              />
            </div>
          </div>

          {submitError instanceof ApiError && !isDuplicateNameError && (
            <p className="text-sm text-red-600">{submitError.message}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
