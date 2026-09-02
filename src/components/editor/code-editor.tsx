'use client';

import Editor from '@monaco-editor/react';

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

interface CodeEditorProps {
  filename: string;
  value: string;
  onChange: (value: string) => void;
}

export function CodeEditor({ filename, value, onChange }: CodeEditorProps): React.ReactNode {
  return (
    <Editor
      height="100%"
      language={languageForFilename(filename)}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        automaticLayout: true,
      }}
    />
  );
}
