import type { Monaco } from '@monaco-editor/react';
import type { editor, Position } from 'monaco-editor';

export interface ModuleMember {
  name: string;
  kind: 'class' | 'function' | 'module' | 'value';
  doc: string;
}

export interface LocalModule {
  name: string;
  fileId: string;
}

export interface PythonIntelliSenseContext {
  stdlibModules: string[];
  installedPackages: string[];
  localModules: LocalModule[];
  introspectModule: (moduleName: string) => Promise<ModuleMember[]>;
  getLocalModuleSymbols: (fileId: string) => Promise<Array<{ name: string; kind: 'class' | 'function' | 'value' }>>;
}

// Mutated in place by whichever editor instance is currently mounted, read fresh on
// every completion request — see registerPythonIntelliSense() for why this indirection
// exists instead of re-registering the provider per editor.
export const pythonIntelliSenseContext: PythonIntelliSenseContext = {
  stdlibModules: [],
  installedPackages: [],
  localModules: [],
  introspectModule: async () => [],
  getLocalModuleSymbols: async () => [],
};

let cachedInstalledPackages: string[] | null = null;

/** The ~300 packages Pyodide can auto-load on import — read from the same static lock
 * file the runtime itself uses, so this list can never drift from what actually works. */
export async function loadInstalledPackageNames(): Promise<string[]> {
  if (cachedInstalledPackages) return cachedInstalledPackages;
  try {
    const res = await fetch('/pyodide/pyodide-lock.json');
    const data = (await res.json()) as { packages?: Record<string, { name: string; imports?: string[] }> };
    const names = new Set<string>();
    for (const pkg of Object.values(data.packages ?? {})) {
      if (pkg.name.endsWith('-tests')) continue;
      for (const imp of pkg.imports ?? []) names.add(imp);
    }
    cachedInstalledPackages = [...names].sort();
  } catch {
    cachedInstalledPackages = [];
  }
  return cachedInstalledPackages;
}

export const PYTHON_KEYWORDS = [
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class',
  'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global',
  'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise',
  'return', 'try', 'while', 'with', 'yield',
];

export const PYTHON_BUILTINS = [
  'abs', 'aiter', 'anext', 'all', 'any', 'ascii', 'bin', 'bool', 'breakpoint',
  'bytearray', 'bytes', 'callable', 'chr', 'classmethod', 'compile', 'complex',
  'delattr', 'dict', 'dir', 'divmod', 'enumerate', 'eval', 'exec', 'filter', 'float',
  'format', 'frozenset', 'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex', 'id',
  'input', 'int', 'isinstance', 'issubclass', 'iter', 'len', 'list', 'locals', 'map',
  'max', 'memoryview', 'min', 'next', 'object', 'oct', 'open', 'ord', 'pow', 'print',
  'property', 'range', 'repr', 'reversed', 'round', 'set', 'setattr', 'slice', 'sorted',
  'staticmethod', 'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip', 'Exception',
  'ValueError', 'TypeError', 'KeyError', 'IndexError', 'AttributeError', 'RuntimeError',
  'StopIteration', 'ZeroDivisionError', 'FileNotFoundError', 'ImportError', 'NotImplementedError',
];

/** Top-level (unindented) def/class/assignment names — a regex pass rather than a real
 * parse, which is enough to offer same-file symbols without running anything. */
export function extractTopLevelSymbols(source: string): Array<{ name: string; kind: 'class' | 'function' | 'value' }> {
  const results: Array<{ name: string; kind: 'class' | 'function' | 'value' }> = [];
  const seen = new Set<string>();
  const lines = source.split('\n');

  for (const line of lines) {
    const def = /^def\s+(\w+)\s*\(/.exec(line);
    const cls = /^class\s+(\w+)\b/.exec(line);
    const asyncDef = /^async\s+def\s+(\w+)\s*\(/.exec(line);
    const assign = /^([A-Za-z_]\w*)\s*(?::[^=]+)?=(?!=)/.exec(line);

    const match = asyncDef ?? def ?? cls ?? assign;
    if (!match) continue;
    const name = match[1];
    if (seen.has(name)) continue;
    seen.add(name);
    results.push({ name, kind: cls ? 'class' : assign && !def && !asyncDef ? 'value' : 'function' });
  }

  return results;
}

function iconFor(monaco: Monaco, kind: 'class' | 'function' | 'module' | 'value'): number {
  switch (kind) {
    case 'class':
      return monaco.languages.CompletionItemKind.Class;
    case 'function':
      return monaco.languages.CompletionItemKind.Function;
    case 'module':
      return monaco.languages.CompletionItemKind.Module;
    default:
      return monaco.languages.CompletionItemKind.Variable;
  }
}

/** Scans the buffer for `import X`, `import X as Y`, `from X import Y` so a bare
 * identifier before a dot (e.g. `np.`) can be traced back to the module it came from. */
function resolveImportedName(source: string, identifier: string): string | null {
  const asImport = new RegExp(`^\\s*import\\s+([\\w.]+)\\s+as\\s+${identifier}\\b`, 'm').exec(source);
  if (asImport) return asImport[1];

  const plainImport = new RegExp(`^\\s*import\\s+(?:[\\w.]+,\\s*)*(${identifier})\\b`, 'm').exec(source);
  if (plainImport) return identifier;

  const fromImportAs = new RegExp(`^\\s*from\\s+([\\w.]+)\\s+import\\s+(?:[\\w, ]+,\\s*)?\\w+\\s+as\\s+${identifier}\\b`, 'm').exec(source);
  if (fromImportAs) return `${fromImportAs[1]}.${identifier}`;

  return null;
}

let registered = false;

/** Registers the completion provider exactly once for the process lifetime; every
 * editor instance shares it and it always reads pythonIntelliSenseContext fresh, so a
 * newly opened file or a newly-ready worker is picked up without re-registering. */
export function registerPythonIntelliSense(monaco: Monaco): void {
  if (registered) return;
  registered = true;

  monaco.languages.registerCompletionItemProvider('python', {
    triggerCharacters: ['.', ' '],
    provideCompletionItems: async (
      model: editor.ITextModel,
      position: Position) => {
        
      const ctx = pythonIntelliSenseContext;
      const textUntil = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const moduleNames = [...ctx.stdlibModules, ...ctx.installedPackages, ...ctx.localModules.map((m) => m.name)];

      // `import <cursor>` / `from <cursor>`
      if (/^\s*(?:import|from)\s+[\w.]*$/.test(textUntil)) {
        return {
          suggestions: [...new Set(moduleNames)].map((name) => ({
            label: name,
            kind: monaco.languages.CompletionItemKind.Module,
            insertText: name,
            range,
            detail: ctx.localModules.some((m) => m.name === name) ? 'local file' : undefined,
          })),
        };
      }

      // `from <module> import <cursor>`
      const fromImportMatch = /^\s*from\s+([\w.]+)\s+import\s+(?:[\w, ]*,\s*)?\w*$/.exec(textUntil);
      if (fromImportMatch) {
        const moduleName = fromImportMatch[1];
        const local = ctx.localModules.find((m) => m.name === moduleName);
        const members = local
          ? await ctx.getLocalModuleSymbols(local.fileId)
          : await ctx.introspectModule(moduleName);
        return {
          suggestions: members.map((m) => ({
            label: m.name,
            kind: iconFor(monaco, m.kind),
            insertText: m.name,
            range,
            documentation: 'doc' in m ? m.doc : undefined,
          })),
        };
      }

      // `<name>.<cursor>` — resolve `<name>` back to a module if we can.
      const dotMatch = /([A-Za-z_]\w*)\.(\w*)$/.exec(textUntil);
      if (dotMatch) {
        const identifier = dotMatch[1];
        const resolved =
          resolveImportedName(model.getValue(), identifier) ??
          (moduleNames.includes(identifier) ? identifier : null);
        if (resolved) {
          const members = await ctx.introspectModule(resolved);
          return {
            suggestions: members.map((m) => ({
              label: m.name,
              kind: iconFor(monaco, m.kind),
              insertText: m.name,
              range,
              documentation: m.doc || undefined,
            })),
          };
        }
        return { suggestions: [] };
      }

      // Plain identifier: builtins, keywords, same-file symbols, and local module names.
      const localSymbols = extractTopLevelSymbols(model.getValue());
      const suggestions = [
        ...PYTHON_KEYWORDS.map((kw) => ({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw,
          range,
        })),
        ...PYTHON_BUILTINS.map((name) => ({
          label: name,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: name,
          range,
          detail: 'builtin',
        })),
        ...localSymbols.map((s) => ({
          label: s.name,
          kind: iconFor(monaco, s.kind),
          insertText: s.name,
          range,
          detail: 'this file',
        })),
        ...ctx.localModules.map((m) => ({
          label: m.name,
          kind: monaco.languages.CompletionItemKind.Module,
          insertText: m.name,
          range,
          detail: 'local file',
        })),
      ];
      return { suggestions };
    },
  });
}
