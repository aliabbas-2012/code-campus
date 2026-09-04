'use client';

import { useMemo, useState } from 'react';
import { useAdminUsers } from '@/hooks/use-admin-users';
import { useAdminRoster, useCreateRosterLink, useRemoveRosterLink } from '@/hooks/use-admin-roster';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';

export function RosterManagement(): React.ReactNode {
  const { data: instructors } = useAdminUsers('INSTRUCTOR');
  const { data: students } = useAdminUsers('STUDENT');
  const { data: links } = useAdminRoster();
  const createLink = useCreateRosterLink();
  const removeLink = useRemoveRosterLink();
  const { showToast } = useToast();

  const [instructorId, setInstructorId] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const rosterForInstructor = useMemo(
    () => (links ?? []).filter((link) => link.instructor?.id === instructorId),
    [links, instructorId],
  );

  const availableStudents = useMemo(() => {
    const onRoster = new Set(rosterForInstructor.map((link) => link.student.id));
    return (students ?? []).filter((s) => !onRoster.has(s.id));
  }, [students, rosterForInstructor]);

  const toggleStudent = (id: string): void => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async (): Promise<void> => {
    for (const studentId of selectedStudentIds) {
      try {
        await createLink.mutateAsync({ instructor_id: instructorId, student_id: studentId });
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'Failed to add student');
      }
    }
    setSelectedStudentIds(new Set());
  };

  const handleRemove = (id: string): void => {
    removeLink.mutate(id, {
      onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to remove'),
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Rosters</h1>
      <p className="mt-1 text-sm text-gray-500">Assign which students belong to each instructor.</p>

      <div className="mt-6">
        <label htmlFor="instructor-select" className="block text-sm font-medium text-gray-700">
          Instructor
        </label>
        <select
          id="instructor-select"
          value={instructorId}
          onChange={(e) => setInstructorId(e.target.value)}
          className="mt-1 w-full max-w-sm rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select an instructor…</option>
          {instructors?.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} ({i.email})
            </option>
          ))}
        </select>
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
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
              {availableStudents.map((s) => (
                <li key={s.id}>
                  <label className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.has(s.id)}
                      onChange={() => toggleStudent(s.id)}
                    />
                    {s.name} <span className="text-gray-400">({s.email})</span>
                  </label>
                </li>
              ))}
              {availableStudents.length === 0 && (
                <p className="text-sm text-gray-400">All students are already on this roster.</p>
              )}
            </ul>
            <button
              type="button"
              onClick={handleAdd}
              disabled={selectedStudentIds.size === 0 || createLink.isPending}
              className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Add Selected
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
