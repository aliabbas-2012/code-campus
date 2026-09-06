'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/components/ui/toast';
import { usePythonWorker } from '@/hooks/use-python-worker';
import { useAutosave } from '@/hooks/use-autosave';
import { useProject } from '@/hooks/use-projects';
import { useProjectFiles } from '@/hooks/use-files';
import { useSubmission } from '@/hooks/use-submission';
import { FileTree } from './file-tree';
import { EditorTabs } from './editor-tabs';
import { CodeEditor } from './code-editor';
import { OutputPanel } from './output-panel';
import { RunButton } from './run-button';
import { SubmissionBar } from './submission-bar';
import { PackageManager } from './package-manager';
import { PythonShell } from './python-shell';
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
  const {
    status: workerStatus,
    errorMessage: workerErrorMessage,
    isRunning,
    output,
    run,
    installPackages,
    isInstalling,
    runRepl,
    mountFiles,
  } = usePythonWorker();
  const { data: project } = useProject(projectId);
  const { data: projectFiles } = useProjectFiles(projectId);
  const { data: submission } = useSubmission(mode === 'edit' && project?.assignment_id ? projectId : null);

  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);
  const [showPackages, setShowPackages] = useState(false);
  const [bottomTab, setBottomTab] = useState<'output' | 'shell'>('output');
  const [shellMounted, setShellMounted] = useState(false);
  const shellMountingRef = useRef(false);
  const autoInstalledRef = useRef(false);
  const autoOpenedRef = useRef(false);

  // Once submitted, a student's own files lock until the instructor grades/requests
  // revision, or the student cancels the review request — matches a real review workflow.
  const isLockedForStudent = mode === 'edit' && (submission?.status === 'SUBMITTED' || submission?.status === 'GRADED');
  const effectiveMode: 'edit' | 'review' = mode === 'review' ? 'review' : isLockedForStudent ? 'review' : 'edit';

  const activeTab = useMemo(() => tabs.find((t) => t.fileId === activeTabId), [tabs, activeTabId]);

  const updateTab = useCallback((fileId: string, patch: Partial<OpenTab>): void => {
    setTabs((prev) => prev.map((t) => (t.fileId === fileId ? { ...t, ...patch } : t)));
  }, []);

  const { flush } = useAutosave(activeTab, updateTab, effectiveMode === 'edit');

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

  const mountProjectFiles = useCallback(async (): Promise<void> => {
    if (shellMounted || shellMountingRef.current || workerStatus !== 'ready' || !projectFiles) return;
    shellMountingRef.current = true;
    try {
      const byId = new Map(projectFiles.map((f) => [f.id, f]));
      const buildPath = (file: FileNode): string => {
        const parent = file.parent_id ? byId.get(file.parent_id) : undefined;
        return parent ? `${buildPath(parent)}/${file.name}` : file.name;
      };
      const files = projectFiles.filter((f) => f.type === 'FILE');
      const contents = await Promise.all(
        files.map(async (f) => ({ path: buildPath(f), content: (await api.files.get(f.id)).content ?? '' })),
      );
      await mountFiles(contents);
      setShellMounted(true);
    } finally {
      shellMountingRef.current = false;
    }
  }, [shellMounted, workerStatus, projectFiles, mountFiles]);

  const handleOpenShell = useCallback((): void => {
    setBottomTab('shell');
    void mountProjectFiles();
  }, [mountProjectFiles]);

  // If the shell tab is open but the worker wasn't ready yet when it was first
  // requested, mount as soon as it becomes ready instead of staying stuck.
  useEffect(() => {
    if (bottomTab === 'shell') {
      void mountProjectFiles();
    }
  }, [bottomTab, workerStatus, mountProjectFiles]);

  // Auto-open the first file in the project once, so the editor isn't blank on load.
  useEffect(() => {
    if (autoOpenedRef.current || !projectFiles) return;

    const firstFile = projectFiles.find((f) => f.parent_id === null && f.type === 'FILE');
    if (!firstFile) return;

    autoOpenedRef.current = true;
    queueMicrotask(() => handleOpenFile(firstFile));
  }, [projectFiles, handleOpenFile]);

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

  // Auto-install requirements.txt once, the first time the worker is ready.
  useEffect(() => {
    if (mode !== 'edit' || autoInstalledRef.current) return;
    if (workerStatus !== 'ready' || !projectFiles) return;

    const reqFile = projectFiles.find((f) => f.parent_id === null && f.name === 'requirements.txt');
    if (!reqFile) return;

    autoInstalledRef.current = true;
    api.files
      .get(reqFile.id)
      .then((file) => {
        const packages = (file.content ?? '')
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#'));
        if (packages.length > 0) {
          showToast(`Installing ${packages.length} package(s) from requirements.txt…`, 'info');
          installPackages(packages);
        }
      })
      .catch(() => {});
  }, [mode, workerStatus, projectFiles, installPackages, showToast]);

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
        <div className="flex items-center gap-2">
          {mode === 'edit' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPackages((v) => !v)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Packages
              </button>
              {showPackages && (
                <div className="absolute right-0 top-full z-20 mt-1">
                  <PackageManager
                    projectId={projectId}
                    installPackages={installPackages}
                    isInstalling={isInstalling}
                    workerReady={workerStatus === 'ready'}
                  />
                </div>
              )}
            </div>
          )}
          <RunButton
            disabled={workerStatus !== 'ready' || isRunning || !activeTab}
            isRunning={isRunning}
            onRun={() => activeTab && run(activeTab.content)}
          />
        </div>
      </div>

      {mode === 'edit' && project?.assignment_id && <SubmissionBar projectId={projectId} />}
      {extraBar}

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 border-r border-gray-200 overflow-y-auto">
          <FileTree projectId={projectId} onOpenFile={handleOpenFile} mode={effectiveMode} />
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
                {effectiveMode === 'edit' && activeTab.saveStatus === 'conflict' && (
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
                    onChange={effectiveMode === 'edit' ? (content) => updateTab(activeTab.fileId, { content }) : undefined}
                    readOnly={effectiveMode === 'review'}
                    fileId={activeTab.fileId}
                    canComment={mode === 'review'}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
                {openingFileId ? 'Opening file…' : 'Select a file to start editing'}
              </div>
            )}
          </div>

          <div className="flex h-56 shrink-0 flex-col border-t border-gray-200">
            <div className="flex shrink-0 gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1">
              <button
                type="button"
                onClick={() => setBottomTab('output')}
                className={`rounded px-2 py-1 text-xs font-medium ${bottomTab === 'output' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Output
              </button>
              <button
                type="button"
                onClick={handleOpenShell}
                className={`rounded px-2 py-1 text-xs font-medium ${bottomTab === 'shell' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Shell
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {bottomTab === 'output' ? (
                <OutputPanel
                  output={output}
                  isRunning={isRunning}
                  workerStatus={workerStatus}
                  workerErrorMessage={workerErrorMessage}
                />
              ) : (
                <PythonShell runRepl={runRepl} workerReady={workerStatus === 'ready'} mounted={shellMounted} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
