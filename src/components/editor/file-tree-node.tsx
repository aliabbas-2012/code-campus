'use client';

import type { FileNode } from '@/types/api';
import { useFileTreeContext } from './file-tree-context';
import { InlineNameInput } from './inline-name-input';

export const FOLDER_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-amber-500">
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
  </svg>
);

export const FILE_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-gray-400">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const CHEVRON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-gray-400">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
}

export function FileTreeNode({ node, depth }: FileTreeNodeProps): React.ReactNode {
  const ctx = useFileTreeContext();
  const isFolder = node.type === 'FOLDER';
  const isExpanded = ctx.expandedIds.has(node.id);
  const isSelected = isFolder && ctx.selectedFolderId === node.id;
  const isRenaming = ctx.renamingId === node.id;
  const children = isFolder ? ctx.childrenOf.get(node.id) ?? [] : [];
  const isCreatingHere = ctx.creating?.parentId === node.id;

  const handleClick = (): void => {
    if (isFolder) {
      ctx.toggleExpand(node.id);
      ctx.onSelectFolder(node.id);
    } else {
      ctx.onOpenFile(node);
    }
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded px-1 py-1 text-sm hover:bg-gray-100 ${
          isSelected ? 'bg-indigo-50' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {isFolder ? (
          <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>{CHEVRON}</span>
        ) : (
          <span className="w-3.5" />
        )}
        <button
          type="button"
          onClick={handleClick}
          className="flex flex-1 items-center gap-1.5 overflow-hidden text-left"
        >
          {isFolder ? FOLDER_ICON : FILE_ICON}
          {isRenaming ? (
            <InlineNameInput
              defaultValue={node.name}
              onSubmit={(name) => ctx.submitRename(node.id, name)}
              onCancel={ctx.cancelRename}
            />
          ) : (
            <span className="truncate text-gray-800">{node.name}</span>
          )}
        </button>
        {!isRenaming && (
          <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                ctx.startRename(node.id);
              }}
              aria-label="Rename"
              className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                ctx.requestDelete(node);
              }}
              aria-label="Delete"
              className="rounded p-0.5 text-gray-400 hover:bg-red-100 hover:text-red-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {isFolder && isExpanded && (
        <div>
          {children.map((child) => (
            <FileTreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
          {isCreatingHere && (
            <div
              className="flex items-center gap-1.5 px-1 py-1"
              style={{ paddingLeft: `${(depth + 1) * 16 + 4 + 14 + 6}px` }}
            >
              {ctx.creating?.type === 'folder' ? FOLDER_ICON : FILE_ICON}
              <InlineNameInput onSubmit={ctx.submitCreate} onCancel={ctx.cancelCreate} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
