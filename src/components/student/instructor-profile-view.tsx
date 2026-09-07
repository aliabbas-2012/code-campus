'use client';

import { useRouter } from 'next/navigation';
import { useStudentViewOfInstructorProfile } from '@/hooks/use-instructor-profile';
import { RichTextContent } from '@/components/ui/rich-text-content';

export function InstructorProfileView({ instructorId }: { instructorId: string }): React.ReactNode {
  const { data: profile, isLoading, isError } = useStudentViewOfInstructorProfile(instructorId);
  const router = useRouter();

  if (isLoading) return <div className="mx-auto max-w-2xl text-sm text-gray-400 dark:text-gray-500">Loading…</div>;
  if (isError || !profile) {
    return <div className="mx-auto max-w-2xl text-sm text-red-600">Failed to load instructor profile.</div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button type="button" onClick={() => router.back()} className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700">
        ← Back
      </button>

      <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-xl font-semibold text-indigo-700">
            {profile.name.trim()[0]?.toUpperCase() ?? '?'}
          </span>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{profile.name}</h1>
            {profile.title && <p className="text-sm text-gray-600 dark:text-gray-400">{profile.title}</p>}
            <p className="text-xs text-gray-400 dark:text-gray-500">{profile.email}</p>
          </div>
        </div>

        {profile.specializations.length > 0 && (
          <div className="mt-5">
            <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Specializations</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.specializations.map((tag) => (
                <span key={tag} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {profile.bio && (
          <div className="mt-5">
            <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">About</h2>
            <RichTextContent html={profile.bio} className="mt-2 text-gray-700 dark:text-gray-300" />
          </div>
        )}

        {!profile.title && !profile.bio && profile.specializations.length === 0 && (
          <p className="mt-5 text-sm text-gray-400 dark:text-gray-500">This instructor hasn&apos;t added profile details yet.</p>
        )}
      </div>
    </div>
  );
}
