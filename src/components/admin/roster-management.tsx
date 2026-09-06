'use client';

import { useMemo, useState } from 'react';
import { useAdminUsers } from '@/hooks/use-admin-users';
import { useAdminRoster, useCreateRosterLink, useRemoveRosterLink } from '@/hooks/use-admin-roster';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { MultiSelect } from '@/components/ui/multi-select';
import { SingleSelect } from '@/components/ui/single-select';

export function RosterManagement(): React.ReactNode {
  const { data: instructors } = useAdminUsers('INSTRUCTOR');
  const { data: students } = useAdminUsers('STUDENT');
  const { data: links } = useAdminRoster();
  const createLink = useCreateRosterLink();
  const removeLink = useRemoveRosterLink();
  const { showToast } = useToast();

  const [instructorId, setInstructorId] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const rosterForInstructor = useMemo(
    () => (links ?? []).filter((link) => link.instructor?.id === instructorId),
    [links, instructorId],
  );

  const availableOptions = useMemo(() => {
    const onRoster = new Set(rosterForInstructor.map((link) => link.student.id));
    return (students ?? [])
      .filter((s) => !onRoster.has(s.id))
      .map((s) => ({ id: s.id, label: s.name, sublabel: s.email }));
  }, [students, rosterForInstructor]);

  const handleAdd = async (): Promise<void> => {
    for (const studentId of selectedStudentIds) {
      try {
        await createLink.mutateAsync({ instructor_id: instructorId, student_id: studentId });
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'Failed to add student');
      }
    }
    setSelectedStudentIds([]);
  };

  const handleRemove = (id: string): void => {
    removeLink.mutate(id, {
      onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to remove'),
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Rosters</h1>
      <p className="mt-1 text-sm text-gray-500">Assign which students belong to each instructor.</p>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700">Instructor</label>
        <div className="mt-1">
          <SingleSelect
            options={(instructors ?? []).map((i) => ({ id: i.id, label: i.name, sublabel: i.email }))}
            value={instructorId}
            onChange={setInstructorId}
            placeholder="Search instructors by name or email…"
          />
        </div>
      </div>

      {instructorId && (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">Current roster</h2>
            <ul className="mt-3 space-y-2">
              {rosterForInstructor.map((link) => (
                <li key={link.id} className="flex items-center justify-between text-sm">
                  <span>
                    {link.student.name} <span className="text-gray-400">({link.student.email})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(link.id)}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
              {rosterForInstructor.length === 0 && (
                <p className="text-sm text-gray-400">No students assigned yet.</p>
              )}
            </ul>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">Add students</h2>
            <div className="mt-3">
              <MultiSelect
                options={availableOptions}
                selected={selectedStudentIds}
                onChange={setSelectedStudentIds}
                placeholder={availableOptions.length === 0 ? 'All students are already on this roster' : 'Search students…'}
              />
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={selectedStudentIds.length === 0 || createLink.isPending}
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              Add Selected
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
