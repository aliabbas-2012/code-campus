'use client';

import type { OpenTab } from './types';

interface EditorTabsProps {
  tabs: OpenTab[];
  activeTabId: string | null;
  onSelect: (fileId: string) => void;
  onClose: (fileId: string) => void;
}

function StatusIndicator({ tab }: { tab: OpenTab }): React.ReactNode {
  switch (tab.saveStatus) {
    case 'unsaved':
      return <span className="text-indigo-500" title="Unsaved changes">●</span>;
    case 'saving':
      return (
        <svg className="h-3 w-3 animate-spin text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      );
    case 'conflict':
    case 'error':
      return <span className="text-red-500" title={tab.errorMessage}>⚠</span>;
    default:
      return null;
  }
}

export function EditorTabs({ tabs, activeTabId, onSelect, onClose }: EditorTabsProps): React.ReactNode {
  const handleClose = (e: React.MouseEvent, tab: OpenTab): void => {
    e.stopPropagation();
    if (tab.content !== tab.lastSavedContent) {
      const ok = window.confirm(`Discard unsaved changes to ${tab.name}?`);
      if (!ok) return;
    }
    onClose(tab.fileId);
  };

  if (tabs.length === 0) return null;

  return (
    <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50">
      {tabs.map((tab) => (
        <button
          key={tab.fileId}
          type="button"
          onClick={() => onSelect(tab.fileId)}
          className={`flex shrink-0 items-center gap-2 border-r border-gray-200 px-3 py-2 text-sm ${
            tab.fileId === activeTabId
              ? 'bg-white font-medium text-gray-900'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <StatusIndicator tab={tab} />
          <span>{tab.name}</span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => handleClose(e, tab)}
            className="rounded px-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
          >
            ×
          </span>
        </button>
      ))}
    </div>
  );
}
