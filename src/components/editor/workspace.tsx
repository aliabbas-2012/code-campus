'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/components/ui/toast';
import { usePythonWorker } from '@/hooks/use-python-worker';
import { useAutosave } from '@/hooks/use-autosave';
import { useProject } from '@/hooks/use-projects';
import { FileTree } from './file-tree';
import { EditorTabs } from './editor-tabs';
import { CodeEditor } from './code-editor';
import { OutputPanel } from './output-panel';
import { RunButton } from './run-button';
import { SubmissionBar } from './submission-bar';
import { StorageQuotaBar } from '@/components/dashboard/storage-quota-bar';
import type { OpenTab } from './types';
import type { FileNode } from '@/types/api';

interface WorkspaceProps {
  projectId: string;
  mode?: 'edit' | 'review';
  onBack?: () => void;
  extraBar?: React.ReactNode;
}

export function Workspace({ projectId, mode = 'edit', onBack, extraBar }: WorkspaceProps): React.ReactNode {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { status: workerStatus, errorMessage: workerErrorMessage, isRunning, output, run } = usePythonWorker();
  const { data: project } = useProject(projectId);

  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);

  const activeTab = useMemo(() => tabs.find((t) => t.fileId === activeTabId), [tabs, activeTabId]);

  const updateTab = useCallback((fileId: string, patch: Partial<OpenTab>): void => {
    setTabs((prev) => prev.map((t) => (t.fileId === fileId ? { ...t, ...patch } : t)));
  }, []);

  const { flush } = useAutosave(activeTab, updateTab, mode === 'edit');

  const handleOpenFile = useCallback(
    async (file: FileNode): Promise<void> => {
      const existing = tabs.find((t) => t.fileId === file.id);
      if (existing) {
        flush();
        setActiveTabId(file.id);
        return;
      }

      setOpeningFileId(file.id);
      try {
        const fetched = await queryClient.fetchQuery({
          queryKey: queryKeys.file(file.id),
          queryFn: () => api.files.get(file.id),
        });
        flush();
        setTabs((prev) => [
          ...prev,
          {
            fileId: fetched.id,
            name: fetched.name,
            content: fetched.content ?? '',
            lastSavedContent: fetched.content ?? '',
            lastKnownUpdatedAt: fetched.updated_at,
            saveStatus: 'saved',
          },
        ]);
        setActiveTabId(fetched.id);
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'Failed to open file');
      } finally {
        setOpeningFileId(null);
      }
    },
    [tabs, flush, queryClient, showToast],
  );

  const handleSelectTab = useCallback(
    (fileId: string): void => {
      flush();
      setActiveTabId(fileId);
    },
    [flush],
  );

  const handleCloseTab = useCallback(
    (fileId: string): void => {
      setTabs((prev) => {
        const remaining = prev.filter((t) => t.fileId !== fileId);
        if (activeTabId === fileId) {
          setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].fileId : null);
        }
        return remaining;
      });
    },
    [activeTabId],
  );

  const handleReloadFromServer = useCallback(async (): Promise<void> => {
    if (!activeTab) return;
    try {
      const fresh = await api.files.get(activeTab.fileId);
      updateTab(activeTab.fileId, {
        content: fresh.content ?? '',
        lastSavedContent: fresh.content ?? '',
        lastKnownUpdatedAt: fresh.updated_at,
        saveStatus: 'saved',
        errorMessage: undefined,
      });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to reload file');
    }
  }, [activeTab, updateTab, showToast]);

  // Warn on unload if anything is unsaved — a real save can't be forced reliably during unload.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent): void => {
      const hasUnsaved = tabs.some((t) => t.saveStatus === 'unsaved' || t.saveStatus === 'saving');
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [tabs]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [sessionStatus, router]);

  if (sessionStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (sessionStatus !== 'authenticated') {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <button
          type="button"
          onClick={onBack ?? (() => router.push('/dashboard'))}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {mode === 'review' ? 'Back' : 'Projects'}
        </button>
        {mode === 'edit' && (
          <div className="w-48">
            <StorageQuotaBar />
          </div>
        )}
        <RunButton
          disabled={workerStatus !== 'ready' || isRunning || !activeTab}
          isRunning={isRunning}
          onRun={() => activeTab && run(activeTab.content)}
        />
      </div>

      {mode === 'edit' && project?.assignment_id && <SubmissionBar projectId={projectId} />}
      {extraBar}

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 border-r border-gray-200 overflow-y-auto">
          <FileTree projectId={projectId} onOpenFile={handleOpenFile} mode={mode} />
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          <EditorTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onSelect={handleSelectTab}
            onClose={handleCloseTab}
          />

          <div className="flex flex-1 flex-col overflow-hidden">
            {activeTab ? (
              <>
                {mode === 'edit' && activeTab.saveStatus === 'conflict' && (
                  <div className="flex items-center justify-between bg-amber-50 px-4 py-2 text-sm text-amber-800">
                    <span>This file changed elsewhere since you opened it. Your local changes have not been saved.</span>
                    <button
                      type="button"
                      onClick={handleReloadFromServer}
                      className="ml-4 shrink-0 rounded bg-amber-600 px-3 py-1 text-white hover:bg-amber-700"
                    >
                      Reload from server
                    </button>
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <CodeEditor
                    filename={activeTab.name}
                    value={activeTab.content}
                    onChange={mode === 'edit' ? (content) => updateTab(activeTab.fileId, { content }) : undefined}
                    readOnly={mode === 'review'}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
                {openingFileId ? 'Opening file…' : 'Select a file to start editing'}
              </div>
            )}
          </div>

          <div className="h-48 shrink-0 border-t border-gray-200">
            <OutputPanel
              output={output}
              isRunning={isRunning}
              workerStatus={workerStatus}
              workerErrorMessage={workerErrorMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
