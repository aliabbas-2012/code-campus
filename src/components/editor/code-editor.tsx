'use client';

import { useEffect, useRef, useState } from 'react';
import Editor, { type OnMount, type Monaco } from '@monaco-editor/react';
import { useLineComments, useCreateLineComment, useSetLineCommentResolved, useDeleteLineComment } from '@/hooks/use-line-comments';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { registerPythonIntelliSense } from '@/lib/python-intellisense';
import type { LineComment } from '@/types/api';

type MonacoEditorInstance = Parameters<OnMount>[0];
type DecorationsCollection = ReturnType<MonacoEditorInstance['createDecorationsCollection']>;
type ModelDeltaDecoration = NonNullable<Parameters<MonacoEditorInstance['createDecorationsCollection']>[0]>[number];
type RangeCtor = Monaco['Range'];

function languageForFilename(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py':
      return 'python';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    default:
      return 'plaintext';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

interface CodeEditorProps {
  filename: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  fileId?: string;
  canComment?: boolean;
  viewerRole?: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
}

export function CodeEditor({ filename, value, onChange, readOnly = false, fileId, canComment = false, viewerRole }: CodeEditorProps): React.ReactNode {
  const { showToast } = useToast();
  const { data: comments } = useLineComments(fileId ?? null);
  const createComment = useCreateLineComment(fileId ?? '');
  const setResolved = useSetLineCommentResolved(fileId ?? '');
  const deleteComment = useDeleteLineComment(fileId ?? '');

  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const rangeCtorRef = useRef<RangeCtor | null>(null);
  const decorationsRef = useRef<DecorationsCollection | null>(null);
  const hoverDecorationsRef = useRef<DecorationsCollection | null>(null);
  const zoneIdsRef = useRef<Map<number, string>>(new Map());

  const [openLines, setOpenLines] = useState<Set<number>>(new Set());
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);

  const commentsByLine = new Map<number, LineComment[]>();
  for (const c of comments ?? []) {
    const list = commentsByLine.get(c.line_number) ?? [];
    list.push(c);
    commentsByLine.set(c.line_number, list);
  }

  // onMouseDown is registered once in handleMount, so it can't close over fresh
  // render values directly — it reads through this ref, kept current every render.
  const gutterClickStateRef = useRef({ commentsByLine, canComment });
  useEffect(() => {
    gutterClickStateRef.current = { commentsByLine, canComment };
  });

  const toggleLine = (line: number): void => {
    setOpenLines((prev) => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  };

  const handleAddComment = (line: number, text: string): void => {
    if (!text.trim()) return;
    createComment.mutate(
      { line_number: line, comment: text.trim() },
      { onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to post comment') },
    );
  };

  const handleToggleResolved = (commentId: string, resolved: boolean): void => {
    setResolved.mutate(
      { commentId, resolved },
      { onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to update comment') },
    );
  };

  const handleDeleteComment = (commentId: string): void => {
    deleteComment.mutate(commentId, {
      onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to delete comment'),
    });
  };

  const handleMount: OnMount = (editor, monaco): void => {
    editorRef.current = editor;
    rangeCtorRef.current = monaco.Range;

    registerPythonIntelliSense(monaco);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      editor.trigger('intellisense', 'editor.action.triggerSuggest', {});
    });

    const isGutter = (type: number): boolean =>
      type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN || type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS;

    editor.onMouseDown((e) => {
      if (!isGutter(e.target.type)) return;
      const line = e.target.position?.lineNumber;
      if (!line) return;
      const { commentsByLine: latestCommentsByLine, canComment: latestCanComment } = gutterClickStateRef.current;
      const hasComments = (latestCommentsByLine.get(line)?.length ?? 0) > 0;
      if (hasComments || latestCanComment) toggleLine(line);
    });

    editor.onMouseMove((e) => {
      setHoveredLine(isGutter(e.target.type) ? (e.target.position?.lineNumber ?? null) : null);
    });
    editor.onMouseLeave(() => setHoveredLine(null));

    if (canComment) {
      editor.addAction({
        id: 'add-review-comment',
        label: 'Add Review Comment',
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1.5,
        run: (ed) => {
          const position = ed.getPosition();
          if (position) toggleLine(position.lineNumber);
        },
      });
    }
  };

  // Gutter markers: 💬 for lines with an open comment, ✅ for fully-resolved, and a faint
  // "+" affordance on hover for the reviewer, mirroring GitHub's hover-to-comment gutter icon.
  useEffect(() => {
    const editor = editorRef.current;
    const RangeCtor = rangeCtorRef.current;
    if (!editor || !RangeCtor) return;

    const decorations: ModelDeltaDecoration[] = Array.from(commentsByLine.entries()).map(([line, lineComments]) => {
      const allResolved = lineComments.every((c) => c.resolved);
      return {
        range: new RangeCtor(line, 1, line, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: allResolved ? 'line-comment-marker-resolved' : 'line-comment-marker',
          glyphMarginHoverMessage: {
            value: lineComments.map((c) => `${c.resolved ? '✅ ' : ''}**${c.author.name}**: ${c.comment}`).join('\n\n'),
          },
        },
      };
    });

    if (decorationsRef.current) decorationsRef.current.set(decorations);
    else decorationsRef.current = editor.createDecorationsCollection(decorations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments]);

  useEffect(() => {
    const editor = editorRef.current;
    const RangeCtor = rangeCtorRef.current;
    if (!editor || !RangeCtor) return;

    const showHint = canComment && hoveredLine !== null && !commentsByLine.has(hoveredLine) && !openLines.has(hoveredLine);
    const decorations: ModelDeltaDecoration[] = showHint
      ? [
          {
            range: new RangeCtor(hoveredLine as number, 1, hoveredLine as number, 1),
            options: { isWholeLine: true, glyphMarginClassName: 'line-comment-add-hint' },
          },
        ]
      : [];

    if (hoverDecorationsRef.current) hoverDecorationsRef.current.set(decorations);
    else hoverDecorationsRef.current = editor.createDecorationsCollection(decorations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredLine, canComment, comments, openLines]);

  // Inline GitHub-PR-style thread: a view zone pushes the following lines down and shows
  // the full comment thread anchored right under the line it's about, with a reply box.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const measure = (node: HTMLElement): number => {
      node.style.position = 'absolute';
      node.style.visibility = 'hidden';
      node.style.width = `${editor.getLayoutInfo().contentWidth}px`;
      document.body.appendChild(node);
      const height = node.offsetHeight;
      document.body.removeChild(node);
      node.style.position = '';
      node.style.visibility = '';
      node.style.width = '';
      return height;
    };

    const buildThread = (line: number): HTMLElement => {
      const lineComments = commentsByLine.get(line) ?? [];
      const container = document.createElement('div');
      container.className = 'rounded-md border border-indigo-200 bg-indigo-50/50 p-2 text-xs shadow-sm';
      container.style.marginRight = '8px';
      container.style.maxWidth = '480px';
      // Monaco's .view-lines text layer overlaps view-zone DOM in hit-testing order by
      // default, so clicks land on the editor's text layer instead of our widget unless
      // we explicitly raise it above; Monaco already makes the zone container `position:
      // absolute`, so z-index takes effect. We also stop propagation of mouse/keyboard
      // events so the editor's own cursor/keybinding handling doesn't intercept them.
      container.style.position = 'relative';
      container.style.zIndex = '50';
      for (const eventName of ['mousedown', 'mouseup', 'click', 'dblclick', 'keydown', 'keyup', 'keypress']) {
        container.addEventListener(eventName, (e) => e.stopPropagation());
      }

      const header = document.createElement('div');
      header.className = 'mb-1.5 flex items-center justify-between';
      header.innerHTML = `<span class="font-semibold text-gray-500">Review thread — line ${line}</span>`;
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = '✕';
      closeBtn.className = 'px-1 text-gray-400 hover:text-gray-700';
      closeBtn.onclick = () => toggleLine(line);
      header.appendChild(closeBtn);
      container.appendChild(header);

      for (const c of lineComments) {
        const item = document.createElement('div');
        item.className = `mb-1.5 rounded p-2 ${c.resolved ? 'bg-gray-100' : 'border border-gray-200 bg-white'}`;

        const meta = document.createElement('div');
        meta.className = 'mb-0.5 flex items-center justify-between text-[11px] text-gray-500';
        meta.innerHTML = `<span>${escapeHtml(c.author.name)} · ${formatDate(c.created_at)}</span>`;
        if (c.resolved) {
          const badge = document.createElement('span');
          badge.className = 'text-emerald-600';
          badge.textContent = `✓ Resolved${c.resolved_by ? ` by ${c.resolved_by.name}` : ''}`;
          meta.appendChild(badge);
        }
        item.appendChild(meta);

        const body = document.createElement('p');
        body.className = 'whitespace-pre-wrap text-gray-800';
        body.textContent = c.comment;
        item.appendChild(body);

        const actions = document.createElement('div');
        actions.className = 'mt-1 flex gap-1.5';

        if (!c.resolved && viewerRole === 'STUDENT') {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = 'Resolve';
          btn.className = 'rounded border border-emerald-300 px-2 py-0.5 text-emerald-700 hover:bg-emerald-50';
          btn.onclick = () => handleToggleResolved(c.id, true);
          actions.appendChild(btn);
        } else if (c.resolved && viewerRole === 'INSTRUCTOR') {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = 'Reopen';
          btn.className = 'rounded border border-gray-300 px-2 py-0.5 text-gray-600 hover:bg-gray-100';
          btn.onclick = () => handleToggleResolved(c.id, false);
          actions.appendChild(btn);
        }

        if (viewerRole === 'INSTRUCTOR') {
          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.textContent = 'Delete';
          delBtn.className = 'rounded border border-red-200 px-2 py-0.5 text-red-600 hover:bg-red-50';
          delBtn.onclick = () => {
            if (window.confirm('Delete this comment? This cannot be undone.')) handleDeleteComment(c.id);
          };
          actions.appendChild(delBtn);
        }

        if (actions.children.length > 0) item.appendChild(actions);
        container.appendChild(item);
      }

      if (canComment) {
        const textarea = document.createElement('textarea');
        textarea.rows = 2;
        textarea.placeholder = lineComments.length > 0 ? 'Reply…' : 'What should the student notice about this line?';
        textarea.className = 'mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500';
        const actionsRow = document.createElement('div');
        actionsRow.className = 'mt-1 flex gap-2';
        const postBtn = document.createElement('button');
        postBtn.type = 'button';
        postBtn.textContent = 'Comment';
        postBtn.className = 'rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700';
        postBtn.onclick = () => {
          const val = textarea.value;
          if (!val.trim()) return;
          handleAddComment(line, val);
          textarea.value = '';
        };
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'rounded px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100';
        cancelBtn.onclick = () => toggleLine(line);
        actionsRow.append(postBtn, cancelBtn);
        container.append(textarea, actionsRow);
      } else if (lineComments.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-gray-400';
        empty.textContent = 'No comments on this line yet.';
        container.appendChild(empty);
      }

      return container;
    };

    editor.changeViewZones((accessor) => {
      for (const zoneId of zoneIdsRef.current.values()) accessor.removeZone(zoneId);
      zoneIdsRef.current.clear();

      for (const line of openLines) {
        const domNode = buildThread(line);
        const heightInPx = measure(domNode) + 12;
        const zoneId = accessor.addZone({ afterLineNumber: line, heightInPx, domNode });
        zoneIdsRef.current.set(line, zoneId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments, openLines, viewerRole, canComment]);

  const commentCount = comments?.length ?? 0;
  const openCount = comments?.filter((c) => !c.resolved).length ?? 0;

  return (
    <div className="relative h-full">
      <Editor
        height="100%"
        language={languageForFilename(filename)}
        value={value}
        onChange={(v) => onChange?.(v ?? '')}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          automaticLayout: true,
          readOnly,
          glyphMargin: true,
        }}
      />

      {fileId && commentCount > 0 && (
        <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
          💬 {openCount > 0 ? `${openCount} open` : `${commentCount} resolved`}
        </div>
      )}
    </div>
  );
}
