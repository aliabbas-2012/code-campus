'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Editable area height in px — bump this for fields that need more room (e.g. an assignment description) vs. a short bio. */
  minHeight?: number;
}

const TEXT_COLORS = [
  { label: 'Gray', value: '#6b7280' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Purple', value: '#9333ea' },
];

const FONT_SIZES = [
  { label: 'Small', value: '12px' },
  { label: 'Normal', value: '' },
  { label: 'Large', value: '18px' },
  { label: 'X-Large', value: '24px' },
];

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
  label,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}): React.ReactNode {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded px-2 py-1 text-sm font-medium ${
        active ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider(): React.ReactNode {
  return <div className="mx-0.5 my-1 w-px self-stretch bg-gray-200 dark:bg-gray-700" />;
}

export function RichTextEditor({ value, onChange, disabled, placeholder, minHeight = 140 }: RichTextEditorProps): React.ReactNode {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextStyleKit.configure({ fontFamily: false, lineHeight: false, backgroundColor: false }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none px-3 py-2 focus:outline-none',
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const headingValue = editor?.isActive('heading', { level: 1 })
    ? '1'
    : editor?.isActive('heading', { level: 2 })
      ? '2'
      : editor?.isActive('heading', { level: 3 })
        ? '3'
        : 'paragraph';

  return (
    <div className="rounded-lg border border-gray-300 dark:border-gray-700 focus-within:border-transparent focus-within:ring-2 focus-within:ring-indigo-500">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 dark:border-gray-800 px-1.5 py-1">
        <select
          aria-label="Text style"
          disabled={disabled}
          value={headingValue}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'paragraph') editor?.chain().focus().setParagraph().run();
            else editor?.chain().focus().toggleHeading({ level: Number(v) as 1 | 2 | 3 }).run();
          }}
          className="rounded border-none bg-white dark:bg-gray-900 px-1.5 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
        >
          <option value="paragraph">Normal text</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>

        <select
          aria-label="Font size"
          disabled={disabled}
          value={editor?.getAttributes('textStyle').fontSize ?? ''}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            const v = e.target.value;
            if (v) editor?.chain().focus().setFontSize(v).run();
            else editor?.chain().focus().unsetFontSize().run();
          }}
          className="rounded border-none bg-white dark:bg-gray-900 px-1.5 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
        >
          {FONT_SIZES.map((size) => (
            <option key={size.label} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>

        <ToolbarDivider />

        <ToolbarButton
          label="Bold"
          active={editor?.isActive('bold')}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor?.isActive('italic')}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor?.isActive('underline')}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={editor?.isActive('strike')}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <span className="line-through">S</span>
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="Bullet list"
          active={editor?.isActive('bulletList')}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          ••
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor?.isActive('orderedList')}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          1.
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={editor?.isActive('blockquote')}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          &ldquo;
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="Link"
          active={editor?.isActive('link')}
          disabled={disabled}
          onClick={() => {
            const url = window.prompt('Link URL');
            if (url) editor?.chain().focus().setLink({ href: url }).run();
            else editor?.chain().focus().unsetLink().run();
          }}
        >
          🔗
        </ToolbarButton>
        <ToolbarButton
          label="Code block"
          active={editor?.isActive('codeBlock')}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        >
          {'</>'}
        </ToolbarButton>
        <ToolbarButton
          label="Horizontal rule"
          disabled={disabled}
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        >
          ―
        </ToolbarButton>

        <ToolbarDivider />

        <div className="flex items-center gap-0.5 px-0.5" role="group" aria-label="Text color">
          {TEXT_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              aria-label={`Text color: ${color.label}`}
              title={color.label}
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor?.chain().focus().setColor(color.value).run()}
              className={`h-5 w-5 shrink-0 rounded-full ring-1 ring-inset ring-black/10 disabled:opacity-40 ${
                editor?.isActive('textStyle', { color: color.value }) ? 'ring-2 ring-gray-900 dark:ring-gray-100' : ''
              }`}
              style={{ backgroundColor: color.value }}
            />
          ))}
          <label
            title="Custom color"
            aria-label="Custom text color"
            className="relative flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-red-400 via-yellow-300 to-blue-400 ring-1 ring-inset ring-black/10"
          >
            <input
              type="color"
              disabled={disabled}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
          <ToolbarButton label="Clear color" disabled={disabled} onClick={() => editor?.chain().focus().unsetColor().run()}>
            <span className="text-xs">⌀</span>
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        <ToolbarButton label="Undo" disabled={disabled} onClick={() => editor?.chain().focus().undo().run()}>
          ↶
        </ToolbarButton>
        <ToolbarButton label="Redo" disabled={disabled} onClick={() => editor?.chain().focus().redo().run()}>
          ↷
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}
