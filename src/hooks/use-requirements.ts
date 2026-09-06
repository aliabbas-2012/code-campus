'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useProjectFiles, useCreateFile } from '@/hooks/use-files';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

/** Shared requirements.txt read/merge logic used by both the Package Manager panel and the shell's `pip install`. */
export function useRequirementsSync(projectId: string): {
  reqFileId: string | undefined;
  /** Merge newly installed package names into requirements.txt (creating it if needed). */
  sync: (installedNames: string[]) => Promise<void>;
} {
  const { data: files } = useProjectFiles(projectId);
  const reqFile = files?.find((f) => f.parent_id === null && f.name === 'requirements.txt');
  const createFile = useCreateFile(projectId);
  const queryClient = useQueryClient();

  const sync = async (installedNames: string[]): Promise<void> => {
    if (installedNames.length === 0) return;
    if (reqFile) {
      const fresh = await api.files.get(reqFile.id);
      const existingLines = (fresh.content ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
      const merged = Array.from(new Set([...existingLines, ...installedNames]));
      await api.files.update(reqFile.id, { content: merged.join('\n') + '\n', updated_at: fresh.updated_at });
      queryClient.invalidateQueries({ queryKey: queryKeys.file(reqFile.id) });
    } else {
      await createFile.mutateAsync({ name: 'requirements.txt', content: installedNames.join('\n') + '\n' });
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.files(projectId) });
  };

  return { reqFileId: reqFile?.id, sync };
}
