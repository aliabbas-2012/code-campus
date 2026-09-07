import { RichTextContent } from '@/components/ui/rich-text-content';

export function StudentProfileCard({ bio, interests }: { bio: string | null; interests: string[] }): React.ReactNode {
  if (!bio && interests.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">This student hasn&apos;t added profile details yet.</p>;
  }

  return (
    <div>
      {interests.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Interests</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {interests.map((tag) => (
              <span key={tag} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
      {bio && (
        <div className={interests.length > 0 ? 'mt-4' : ''}>
          <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">About</h2>
          <RichTextContent html={bio} className="mt-2 text-gray-700 dark:text-gray-300" />
        </div>
      )}
    </div>
  );
}
