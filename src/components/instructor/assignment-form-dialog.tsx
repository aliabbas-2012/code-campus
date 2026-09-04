'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useInstructorRoster } from '@/hooks/use-instructor-roster';
import { ApiError } from '@/lib/api';

export interface AssignmentFormValues {
  title: string;
  description: string;
  max_score: number;
  pass_threshold: number;
}

interface AssignmentFormDialogProps {
  isSubmitting: boolean;
  submitError: unknown;
  onSubmit: (values: AssignmentFormValues, studentIds: string[]) => void;
  onClose: () => void;
}

export function AssignmentFormDialog({
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
}: AssignmentFormDialogProps): React.ReactNode {
  const { data: roster } = useInstructorRoster();
  const [studentIds, setStudentIds] = useState<Set<string>>(new Set());
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AssignmentFormValues>({
    defaultValues: { title: '', description: '', max_score: 100, pass_threshold: 60 },
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const toggleStudent = (id: string): void => {
    setStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = (values: AssignmentFormValues): void => {
    onSubmit(values, Array.from(studentIds));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900">New Assignment</h2>

        <form onSubmit={handleSubmit(submit)} className="mt-4 space-y-4">
          <div>
            <label htmlFor="assignment-title" className="block text-sm font-medium text-gray-700">Title</label>
            <input
              id="assignment-title"
              autoFocus
              {...register('title', { required: 'Title is required', maxLength: 255 })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              disabled={isSubmitting}
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
          </div>

          <div>
            <label htmlFor="assignment-description" className="block text-sm font-medium text-gray-700">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="assignment-description"
              rows={3}
              {...register('description')}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="max-score" className="block text-sm font-medium text-gray-700">Max score</label>
              <input
                id="max-score"
                type="number"
                {...register('max_score', { required: true, valueAsNumber: true, min: 1 })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="pass-threshold" className="block text-sm font-medium text-gray-700">Pass threshold</label>
              <input
                id="pass-threshold"
                type="number"
                {...register('pass_threshold', { required: true, valueAsNumber: true, min: 0 })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <p className="block text-sm font-medium text-gray-700">Assign to</p>
            <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {roster?.map((link) => (
                <li key={link.id}>
                  <label className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={studentIds.has(link.student.id)}
                      onChange={() => toggleStudent(link.student.id)}
                    />
                    {link.student.name}
                  </label>
                </li>
              ))}
              {roster?.length === 0 && (
                <p className="px-1 py-2 text-sm text-gray-400">No students on your roster yet.</p>
              )}
            </ul>
            {studentIds.size === 0 && (
              <p className="mt-1 text-sm text-gray-400">Select at least one student.</p>
            )}
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
              disabled={isSubmitting || studentIds.size === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
