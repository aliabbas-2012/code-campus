'use client';

import { useState } from 'react';
import { useStudentProfile, useUpdateStudentProfile } from '@/hooks/use-student-profile';
import { useToast } from '@/components/ui/toast';
import { TagInput } from '@/components/ui/tag-input';
import { ApiError } from '@/lib/api';

export function StudentProfileEditor(): React.ReactNode {
  const { data, isLoading } = useStudentProfile();
  const update = useUpdateStudentProfile();
  const { showToast } = useToast();

  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  if (!loaded && data !== undefined) {
    setLoaded(true);
    setBio(data.bio ?? '');
    setInterests(data.interests);
  }

  const handleSave = (): void => {
    update.mutate(
      { bio: bio.trim() || undefined, interests },
      {
        onSuccess: () => showToast('Profile saved', 'info'),
        onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to save profile'),
      },
    );
  };

  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Profile</h1>
      <p className="mt-1 text-sm text-gray-500">
        Shown to your instructors — let them know a bit about you and your interests.
      </p>

      <div className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="student-profile-bio" className="block text-sm font-medium text-gray-700">Bio</label>
          <textarea
            id="student-profile-bio"
            rows={5}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short bio for your instructors…"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Interests</label>
          <p className="mt-0.5 text-xs text-gray-400">e.g. Web Development, Game Development, Data Science</p>
          <div className="mt-1">
            <TagInput tags={interests} onChange={setInterests} placeholder="Type an interest and press Enter…" />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={update.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {update.isPending ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
