'use client';

import { useMemo, useState } from 'react';
import {
  useProjectFiles,
  useCreateFile,
  useCreateFolder,
  useRenameFile,
  useDeleteFile,
} from '@/hooks/use-files';
import { ApiError } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { FileTreeContext, type CreatingState } from './file-tree-context';
import { FileTreeNode, FOLDER_ICON, FILE_ICON } from './file-tree-node';
import { InlineNameInput } from './inline-name-input';
import type { FileNode } from '@/types/api';

interface FileTreeProps {
  projectId: string;
  onOpenFile: (file: FileNode) => void;
  mode?: 'edit' | 'review';
}

export function FileTree({ projectId, onOpenFile, mode = 'edit' }: FileTreeProps): React.ReactNode {
  const { data: files, isLoading, isError } = useProjectFiles(projectId);
  const createFile = useCreateFile(projectId);
  const createFolder = useCreateFolder(projectId);
  const renameFile = useRenameFile(projectId);
  const deleteFile = useDeleteFile(projectId);
  const { showToast } = useToast();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [creating, setCreating] = useState<CreatingState | null>(null);
  const [deletingNode, setDeletingNode] = useState<FileNode | null>(null);

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, FileNode[]>();
    for (const file of files ?? []) {
      const key = file.parent_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(file);
    }
    return map;
  }, [files]);

  const toggleExpand = (id: string): void => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startCreate = (type: 'file' | 'folder'): void => {
    if (selectedFolderId) setExpandedIds((prev) => new Set(prev).add(selectedFolderId));
    setCreating({ parentId: selectedFolderId, type });
  };

  const submitCreate = (name: string): void => {
    if (!creating) return;
    const parentId = creating.parentId ?? undefined;
    const mutation = creating.type === 'folder' ? createFolder : createFile;
    mutation.mutate(
      { name, parent_id: parentId },
      {
        onError: (err) => {
          showToast(err instanceof ApiError ? err.message : 'Failed to create item');
        },
      },
    );
    setCreating(null);
  };

  const submitRename = (fileId: string, name: string): void => {
    renameFile.mutate(
      { fileId, name },
      {
        onError: (err) => {
          showToast(err instanceof ApiError ? err.message : 'Failed to rename item');
        },
      },
    );
    setRenamingId(null);
  };

  const confirmDelete = (): void => {
    if (!deletingNode) return;
    deleteFile.mutate(deletingNode.id, {
      onError: (err) => {
        showToast(err instanceof ApiError ? err.message : 'Failed to delete item');
      },
    });
    setDeletingNode(null);
  };

  const rootNodes = childrenOf.get(null) ?? [];

  if (isLoading) {
    return <div className="p-3 text-sm text-gray-400">Loading files…</div>;
  }

  if (isError) {
    return <div className="p-3 text-sm text-red-600">Failed to load files.</div>;
  }

  return (
    <FileTreeContext.Provider
      value={{
        mode,
        childrenOf,
        expandedIds,
        toggleExpand,
        selectedFolderId,
        onSelectFolder: setSelectedFolderId,
        onOpenFile,
        renamingId,
        startRename: setRenamingId,
        submitRename,
        cancelRename: () => setRenamingId(null),
        requestDelete: setDeletingNode,
        creating,
        submitCreate,
        cancelCreate: () => setCreating(null),
      }}
    >
      <div className="flex h-full flex-col">
        {mode === 'edit' && (
          <div className="flex items-center gap-1 border-b border-gray-200 px-2 py-1.5">
            <button
              type="button"
              onClick={() => startCreate('file')}
              className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              + File
            </button>
            <button
              type="button"
              onClick={() => startCreate('folder')}
              className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              + Folder
            </button>
          </div>
        )}
        <div
          className="flex-1 overflow-y-auto py-1"
          onClick={() => setSelectedFolderId(null)}
        >
          {rootNodes.map((node) => (
            <div key={node.id} onClick={(e) => e.stopPropagation()}>
              <FileTreeNode node={node} depth={0} />
            </div>
          ))}
          {creating?.parentId === null && (
            <div className="flex items-center gap-1.5 px-1 py-1" style={{ paddingLeft: '24px' }}>
              {creating.type === 'folder' ? FOLDER_ICON : FILE_ICON}
              <InlineNameInput onSubmit={submitCreate} onCancel={() => setCreating(null)} />
            </div>
          )}
          {rootNodes.length === 0 && !creating && (
            <p className="px-3 py-4 text-xs text-gray-400">No files yet.</p>
          )}
        </div>
      </div>

      {deletingNode && (
        <ConfirmDialog
          title={`Delete "${deletingNode.name}"?`}
          message={
            deletingNode.type === 'FOLDER'
              ? 'All files inside this folder will be deleted too. This cannot be undone.'
              : 'This cannot be undone.'
          }
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setDeletingNode(null)}
        />
      )}
    </FileTreeContext.Provider>
  );
}
