'use client';

import { useEffect, useRef, useState } from 'react';
import Editor, { type OnMount, type Monaco } from '@monaco-editor/react';
import { useLineComments, useCreateLineComment } from '@/hooks/use-line-comments';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
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

interface CodeEditorProps {
  filename: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  fileId?: string;
  canComment?: boolean;
}

export function CodeEditor({ filename, value, onChange, readOnly = false, fileId, canComment = false }: CodeEditorProps): React.ReactNode {
  const { showToast } = useToast();
  const { data: comments } = useLineComments(fileId ?? null);
  const createComment = useCreateLineComment(fileId ?? '');

  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const rangeCtorRef = useRef<RangeCtor | null>(null);
  const decorationsRef = useRef<DecorationsCollection | null>(null);

  const [addModalLine, setAddModalLine] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  const handleMount: OnMount = (editor, monaco): void => {
    editorRef.current = editor;
    rangeCtorRef.current = monaco.Range;

    if (canComment) {
      editor.addAction({
        id: 'add-review-comment',
        label: 'Add Review Comment',
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1.5,
        run: (ed) => {
          const position = ed.getPosition();
          if (position) {
            setCommentText('');
            setAddModalLine(position.lineNumber);
          }
        },
      });
    }
  };

  useEffect(() => {
    const editor = editorRef.current;
    const RangeCtor = rangeCtorRef.current;
    if (!editor || !RangeCtor) return;

    const byLine = new Map<number, LineComment[]>();
    for (const c of comments ?? []) {
      const list = byLine.get(c.line_number) ?? [];
      list.push(c);
      byLine.set(c.line_number, list);
    }

    const decorations: ModelDeltaDecoration[] = Array.from(byLine.entries()).map(([line, lineComments]) => ({
      range: new RangeCtor(line, 1, line, 1),
      options: {
        isWholeLine: true,
        glyphMarginClassName: 'line-comment-marker',
        glyphMarginHoverMessage: {
          value: lineComments.map((c) => `**${c.author.name}**: ${c.comment}`).join('\n\n'),
        },
      },
    }));

    if (decorationsRef.current) {
      decorationsRef.current.set(decorations);
    } else {
      decorationsRef.current = editor.createDecorationsCollection(decorations);
    }
  }, [comments]);

  const handlePostComment = (): void => {
    if (addModalLine === null || !commentText.trim()) return;
    createComment.mutate(
      { line_number: addModalLine, comment: commentText.trim() },
      {
        onSuccess: () => {
          setAddModalLine(null);
          setCommentText('');
        },
        onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to post comment'),
      },
    );
  };

  const commentCount = comments?.length ?? 0;

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
        <button
          type="button"
          onClick={() => setShowReviewsModal(true)}
          className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          💬 {commentCount} review{commentCount === 1 ? '' : 's'}
        </button>
      )}

      {addModalLine !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setAddModalLine(null)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900">Add Review Comment</h2>
            <p className="mt-1 text-sm text-gray-500">Line {addModalLine} in {filename}</p>
            <textarea
              autoFocus
              rows={4}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="What should the student notice about this line?"
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAddModalLine(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePostComment}
                disabled={!commentText.trim() || createComment.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {createComment.isPending ? 'Posting…' : 'Post comment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReviewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowReviewsModal(false)}>
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Reviews on {filename}</h2>
              <button type="button" onClick={() => setShowReviewsModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <ul className="mt-4 space-y-3">
              {(comments ?? []).map((c) => (
                <li key={c.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium text-gray-700">Line {c.line_number} · {c.author.name}</span>
                    <span>{formatDate(c.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-800">{c.comment}</p>
                </li>
              ))}
              {(comments ?? []).length === 0 && <p className="text-sm text-gray-400">No review comments on this file yet.</p>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
