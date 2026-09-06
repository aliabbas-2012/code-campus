'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useInstructorRoster } from '@/hooks/use-instructor-roster';
import { api, ApiError } from '@/lib/api';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';

export interface AssignmentFormValues {
  title: string;
  description: string;
  max_score: number;
  pass_threshold: number;
  starter_code?: string;
}

const MAX_STARTER_CODE_BYTES = 50000;

function validateStarterCodeFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.py')) {
    return 'Only .py files can be imported as starter code';
  }
  if (file.size > MAX_STARTER_CODE_BYTES) {
    return `File is too large (max ${Math.floor(MAX_STARTER_CODE_BYTES / 1000)}KB)`;
  }
  return null;
}

interface AssignmentFormDialogProps {
  isSubmitting: boolean;
  submitError: unknown;
  onSubmit: (values: AssignmentFormValues, studentIds: string[]) => void;
  onClose: () => void;
  /** When set, this dialog is scoped to one student (e.g. opened from their detail page) — the picker is skipped. */
  fixedStudent?: { id: string; name: string };
}

export function AssignmentFormDialog({
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
  fixedStudent,
}: AssignmentFormDialogProps): React.ReactNode {
  const { data: roster } = useInstructorRoster();
  const [studentIds, setStudentIds] = useState<string[]>(fixedStudent ? [fixedStudent.id] : []);
  const [starterFileName, setStarterFileName] = useState<string | null>(null);
  const [starterFileError, setStarterFileError] = useState<string | null>(null);
  const [starterCode, setStarterCode] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AssignmentFormValues>({
    defaultValues: { title: '', description: '', max_score: 100, pass_threshold: 60 },
  });

  const handleStarterFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validationError = validateStarterCodeFile(file);
    if (validationError) {
      setStarterFileError(validationError);
      return;
    }

    const text = await file.text();
    if (text.includes('\u0000')) {
      setStarterFileError('File looks like a binary file, not Python source');
      return;
    }

    setStarterFileError(null);
    setStarterFileName(file.name);
    setStarterCode(text);
  };

  const handleRemoveStarterFile = (): void => {
    setStarterFileName(null);
    setStarterFileError(null);
    setStarterCode(undefined);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const rosterOptions = useMemo(
    () => (roster ?? []).map((link) => ({ id: link.student.id, label: link.student.name, sublabel: link.student.email })),
    [roster],
  );

  const searchRoster = async (query: string): Promise<MultiSelectOption[]> => {
    const results = await api.instructor.roster.search(query);
    return results.map((link) => ({ id: link.student.id, label: link.student.name, sublabel: link.student.email }));
  };

  const submit = (values: AssignmentFormValues): void => {
    onSubmit({ ...values, starter_code: starterCode }, studentIds);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
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
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isSubmitting}
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
          </div>

          <div>
            <p className="block text-sm font-medium text-gray-700">
              Description <span className="text-gray-400">(optional)</span>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="max-score" className="block text-sm font-medium text-gray-700">Max score</label>
              <input
                id="max-score"
                type="number"
                {...register('max_score', { required: true, valueAsNumber: true, min: 1 })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="pass-threshold" className="block text-sm font-medium text-gray-700">Pass threshold</label>
              <input
                id="pass-threshold"
                type="number"
                {...register('pass_threshold', { required: true, valueAsNumber: true, min: 0 })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <p className="block text-sm font-medium text-gray-700">Assign to</p>
            {fixedStudent ? (
              <p className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {fixedStudent.name}
              </p>
            ) : (
              <>
                <div className="mt-1">
                  <MultiSelect
                    options={rosterOptions}
                    selected={studentIds}
                    onChange={setStudentIds}
                    remoteSearch={searchRoster}
                    placeholder={rosterOptions.length === 0 ? 'No students on your roster yet' : 'Search by name or email…'}
                  />
                </div>
                {studentIds.length === 0 && (
                  <p className="mt-1 text-sm text-gray-400">Select at least one student.</p>
                )}
              </>
            )}
          </div>

          <div>
            <p className="block text-sm font-medium text-gray-700">
              Starter code <span className="text-gray-400">(optional)</span>
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              Import a .py file to seed as solution.py in every student&apos;s project.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".py,text/x-python"
              onChange={handleStarterFileChange}
              className="hidden"
            />
            {!starterCode ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="mt-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Import .py file…
              </button>
            ) : (
              <div className="mt-1 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                <span className="truncate text-sm text-gray-700">
                  {starterFileName} · {starterCode.split('\n').length} lines
                </span>
                <button
                  type="button"
                  onClick={handleRemoveStarterFile}
                  disabled={isSubmitting}
                  className="ml-2 shrink-0 text-xs font-medium text-gray-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            )}
            {starterFileError && <p className="mt-1 text-sm text-red-600">{starterFileError}</p>}
          </div>

          {submitError instanceof ApiError && <p className="text-sm text-red-600">{submitError.message}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || studentIds.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
