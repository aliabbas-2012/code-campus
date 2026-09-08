'use client';

import { useRef } from 'react';

interface ResizeHandleProps {
  /** Called with the pointer's vertical movement (px) since the last event while dragging. */
  onResize: (deltaY: number) => void;
  className?: string;
}

/** A thin draggable divider between two vertically-stacked panels — drag up/down to resize
 * whichever side the caller wired `onResize` to grow/shrink. Purely a drag-delta reporter;
 * the parent owns the actual height state (and any clamping/persistence). */
export function ResizeHandle({ onResize, className = '' }: ResizeHandleProps): React.ReactNode {
  const draggingRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault();
    draggingRef.current = true;
    let lastY = e.clientY;
    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent): void => {
      if (!draggingRef.current) return;
      const deltaY = moveEvent.clientY - lastY;
      lastY = moveEvent.clientY;
      if (deltaY !== 0) onResize(deltaY);
    };
    const stopDragging = (): void => {
      draggingRef.current = false;
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopDragging);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopDragging);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation="horizontal"
      className={`group relative z-10 h-1.5 shrink-0 cursor-row-resize bg-gray-100 dark:bg-gray-800 transition-colors hover:bg-indigo-200 dark:hover:bg-indigo-500/30 ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-0.5 w-8 -translate-y-1/2 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-indigo-400 dark:group-hover:bg-indigo-400" />
    </div>
  );
}
