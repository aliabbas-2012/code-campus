'use client';

import { useState } from 'react';
import { useInstructorProfile, useUpdateInstructorProfile } from '@/hooks/use-instructor-profile';
import { useToast } from '@/components/ui/toast';
import { TagInput } from '@/components/ui/tag-input';
import { ApiError } from '@/lib/api';

export function ProfileEditor(): React.ReactNode {
  const { data, isLoading } = useInstructorProfile();
  const update = useUpdateInstructorProfile();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  if (!loaded && data !== undefined) {
    setLoaded(true);
    setTitle(data.title ?? '');
    setBio(data.bio ?? '');
    setSpecializations(data.specializations);
  }

  const handleSave = (): void => {
    update.mutate(
      { title: title.trim() || undefined, bio: bio.trim() || undefined, specializations },
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
        Shown to your students — let them know your background and areas of specialization.
      </p>

      <div className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="profile-title" className="block text-sm font-medium text-gray-700">Title</label>
          <input
            id="profile-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Senior Python Instructor"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="profile-bio" className="block text-sm font-medium text-gray-700">Bio</label>
          <textarea
            id="profile-bio"
            rows={5}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short bio for your students…"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Areas of specialization</label>
          <p className="mt-0.5 text-xs text-gray-400">e.g. Data Science, Web Development, Algorithms</p>
          <div className="mt-1">
            <TagInput tags={specializations} onChange={setSpecializations} placeholder="Type a specialization and press Enter…" />
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
