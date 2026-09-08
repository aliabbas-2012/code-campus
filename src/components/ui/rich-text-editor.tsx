'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
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
  { label: 'Black', value: '#111827' },
  { label: 'Gray', value: '#6b7280' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Teal', value: '#0d9488' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Indigo', value: '#4f46e5' },
  { label: 'Purple', value: '#9333ea' },
  { label: 'Pink', value: '#db2777' },
  { label: 'Slate', value: '#475569' },
];

const HEX_PATTERN = /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/;

// The browser normalizes any color value assigned via .style.color to `rgb(...)` — TipTap's
// stored color attribute comes back in that same normalized form, so a preset defined as a hex
// string has to go through the same normalization before it can be compared for equality.
function normalizeColor(color: string): string {
  const el = document.createElement('div');
  el.style.color = color;
  return el.style.color;
}

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

// A single "A" button with a colored underline bar (the standard Word/Docs "text color" affordance)
// that opens a popover: a preset swatch grid, a hex input for typing an exact color, and a native
// color input for picking from the full spectrum when a preset isn't close enough.
function ColorPicker({ editor, disabled }: { editor: Editor | null; disabled?: boolean }): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const currentColor = editor?.getAttributes('textStyle').color as string | undefined;

  const applyColor = (color: string): void => {
    editor?.chain().focus().setColor(color).run();
  };

  const applyHex = (): void => {
    const cleaned = hexInput.trim().replace(/^#/, '');
    if (!HEX_PATTERN.test(cleaned)) return;
    applyColor(`#${cleaned}`);
    setHexInput('');
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label="Text color"
        title="Text color"
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col items-center rounded px-1.5 py-1 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
      >
        A
        <span
          className="mt-0.5 h-1 w-4 rounded-sm bg-gray-400 dark:bg-gray-500"
          style={currentColor ? { backgroundColor: currentColor } : undefined}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5 shadow-lg">
          <div className="grid grid-cols-6 gap-1.5">
            <button
              type="button"
              title="Default"
              aria-label="Default text color"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor?.chain().focus().unsetColor().run();
                setOpen(false);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 text-xs text-gray-400 dark:text-gray-500"
            >
              ⌀
            </button>
            {TEXT_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                aria-label={`Text color: ${color.label}`}
                title={color.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  applyColor(color.value);
                  setOpen(false);
                }}
                className={`h-6 w-6 rounded-full ring-1 ring-inset ring-black/10 ${
                  currentColor === normalizeColor(color.value) ? 'ring-2 ring-indigo-500' : ''
                }`}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>

          <div className="mt-2.5 flex items-center gap-1.5 border-t border-gray-200 dark:border-gray-800 pt-2.5">
            <span className="text-xs text-gray-400 dark:text-gray-500">#</span>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyHex();
                }
              }}
              placeholder="rrggbb"
              maxLength={7}
              className="w-20 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-1.5 py-0.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={applyHex}
              disabled={!HEX_PATTERN.test(hexInput.trim().replace(/^#/, ''))}
              className="rounded bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              Apply
            </button>
          </div>

          <label className="mt-2.5 flex cursor-pointer items-center gap-2 border-t border-gray-200 dark:border-gray-800 pt-2.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <span
              className="h-5 w-5 shrink-0 rounded-full bg-gradient-to-br from-red-400 via-yellow-300 to-blue-400 ring-1 ring-inset ring-black/10"
            />
            Custom color…
            <input
              type="color"
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => applyColor(e.target.value)}
              className="sr-only"
            />
          </label>
        </div>
      )}
    </div>
  );
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

        <ColorPicker editor={editor} disabled={disabled} />

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
