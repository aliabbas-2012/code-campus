'use client';

import { useEffect, useState } from 'react';
import { LAST_PATH_STORAGE_KEY, ROLE_DASHBOARD_PATH } from '@/lib/last-path';

/** Shown on the home page for an already-signed-in visitor — offers to jump back to whatever
 * page they were last on instead of only the generic dashboard link, when that's somewhere more
 * specific (e.g. a project workspace). Reads localStorage client-side, so it renders nothing
 * during the initial server render and appears a moment after hydration — acceptable for a
 * secondary, optional CTA. */
export function ResumeLastPageButton({ role }: { role: string }): React.ReactNode {
  const [lastPath, setLastPath] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem(LAST_PATH_STORAGE_KEY);
        if (stored && stored !== ROLE_DASHBOARD_PATH[role]) setLastPath(stored);
      } catch {
        // Best-effort only.
      }
    });
  }, [role]);

  if (!lastPath) return null;

  return (
    <a
      href={lastPath}
      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
    >
      Resume where you left off →
    </a>
  );
}
