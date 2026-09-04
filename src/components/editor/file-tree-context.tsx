'use client';

import { createContext, useContext } from 'react';
import type { FileNode } from '@/types/api';

export interface CreatingState {
  parentId: string | null;
  type: 'file' | 'folder';
}

export interface FileTreeContextValue {
  mode: 'edit' | 'review';
  childrenOf: Map<string | null, FileNode[]>;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onOpenFile: (file: FileNode) => void;
  renamingId: string | null;
  startRename: (id: string) => void;
  submitRename: (id: string, name: string) => void;
  cancelRename: () => void;
  requestDelete: (node: FileNode) => void;
  creating: CreatingState | null;
  submitCreate: (name: string) => void;
  cancelCreate: () => void;
}

export const FileTreeContext = createContext<FileTreeContextValue | null>(null);

export function useFileTreeContext(): FileTreeContextValue {
  const ctx = useContext(FileTreeContext);
  if (!ctx) {
    throw new Error('useFileTreeContext must be used within FileTreeContext.Provider');
  }
  return ctx;
}

export const VALID_FILENAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
