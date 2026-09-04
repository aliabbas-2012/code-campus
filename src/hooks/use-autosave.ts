import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/components/ui/toast';
import type { OpenTab } from '@/components/editor/types';

const AUTOSAVE_DEBOUNCE_MS = 1500;

export function useAutosave(
  tab: OpenTab | undefined,
  updateTab: (fileId: string, patch: Partial<OpenTab>) => void,
  enabled: boolean = true,
): { flush: () => void } {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const save = useCallback(
    async (targetTab: OpenTab) => {
      const fileId = targetTab.fileId;
      const contentSnapshot = targetTab.content;
      updateTab(fileId, { saveStatus: 'saving' });
      try {
        const result = await api.files.update(fileId, {
          content: contentSnapshot,
          updated_at: targetTab.lastKnownUpdatedAt,
        });
        updateTab(fileId, {
          lastSavedContent: contentSnapshot,
          lastKnownUpdatedAt: result.updated_at,
          saveStatus: 'saved',
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.storage });
      } catch (err) {
        if (err instanceof ApiError && err.code === 'CONFLICT') {
          updateTab(fileId, { saveStatus: 'conflict', errorMessage: err.message });
        } else {
          const message = err instanceof ApiError ? err.message : 'Failed to save file';
          updateTab(fileId, { saveStatus: 'error', errorMessage: message });
          showToast(message);
        }
      }
    },
    [updateTab, showToast, queryClient],
  );

  useEffect(() => {
    if (!enabled) return;
    if (!tab) return;
    if (tab.content === tab.lastSavedContent) return;
    if (tab.saveStatus !== 'unsaved') {
      updateTab(tab.fileId, { saveStatus: 'unsaved' });
    }

    const timer = setTimeout(() => {
      save(tab);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab?.content, tab?.fileId, enabled]);

  const flush = useCallback(() => {
    if (enabled && tab && tab.content !== tab.lastSavedContent && tab.saveStatus !== 'saving') {
      save(tab);
    }
  }, [enabled, tab, save]);

  return { flush };
}
