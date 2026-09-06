'use client';

import { useEffect, useRef, useState } from 'react';
import type { PackageInstallResult, ReplResult } from '@/hooks/use-python-worker';
import { useProjectFiles, useFile } from '@/hooks/use-files';
import { useRequirementsSync } from '@/hooks/use-requirements';

interface ShellLine {
  type: 'input' | 'stdout' | 'stderr';
  text: string;
}

interface PythonShellProps {
  projectId: string;
  runRepl: (code: string) => Promise<ReplResult>;
  installPackages: (packages: string[]) => Promise<PackageInstallResult[]>;
  workerReady: boolean;
  mounted: boolean;
}

const PIP_INSTALL_RE = /^!?pip3?\s+install\s+(.+)$/i;
const PIP_FREEZE_RE = /^!?pip3?\s+freeze$/i;
const RUN_FILE_RE = /^(?:run|python3?)\s+(\S+)$/i;

export function PythonShell({ projectId, runRepl, installPackages, workerReady, mounted }: PythonShellProps): React.ReactNode {
  const { data: files } = useProjectFiles(projectId);
  const reqFile = files?.find((f) => f.parent_id === null && f.name === 'requirements.txt');
  const { data: reqFileContent } = useFile(reqFile?.id ?? null);
  const { sync } = useRequirementsSync(projectId);

  const [lines, setLines] = useState<ShellLine[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const appendLines = (newLines: ShellLine[]): void => setLines((prev) => [...prev, ...newLines]);

  const handlePipInstall = async (packageNames: string[]): Promise<void> => {
    const results = await installPackages(packageNames);
    appendLines(
      results.map((r) => ({
        type: r.success ? 'stdout' : 'stderr',
        text: `${r.success ? '✓' : '✗'} ${r.package}${!r.success && r.error ? ' — ' + r.error.slice(0, 120) : ''}`,
      })),
    );

    const successful = results.filter((r) => r.success).map((r) => r.package);
    if (successful.length > 0) {
      try {
        await sync(successful);
        appendLines([{ type: 'stdout', text: `Updated requirements.txt (${successful.join(', ')})` }]);
      } catch {
        appendLines([{ type: 'stderr', text: 'Installed, but failed to update requirements.txt' }]);
      }
    }
  };

  const handlePipFreeze = (): void => {
    const content = (reqFileContent?.content ?? '').trim();
    if (!content) {
      appendLines([{ type: 'stdout', text: '# requirements.txt is empty' }]);
    } else {
      appendLines([{ type: 'stdout', text: content }]);
    }
  };

  const handleRun = async (): Promise<void> => {
    const command = input.trim();
    if (!command || isRunning || !workerReady) return;

    appendLines([{ type: 'input', text: command }]);
    setHistory((prev) => [...prev, command]);
    setHistoryIndex(null);
    setInput('');
    setIsRunning(true);

    const pipInstallMatch = command.match(PIP_INSTALL_RE);
    const runFileMatch = command.match(RUN_FILE_RE);

    try {
      if (pipInstallMatch) {
        const packageNames = pipInstallMatch[1].split(/\s+/).filter((p) => p && !p.startsWith('-'));
        await handlePipInstall(packageNames);
      } else if (PIP_FREEZE_RE.test(command)) {
        handlePipFreeze();
      } else {
        const code = runFileMatch
          ? `exec(compile(open(${JSON.stringify(runFileMatch[1])}).read(), ${JSON.stringify(runFileMatch[1])}, 'exec'))`
          : command;
        const result = await runRepl(code);
        if (result.stdout) appendLines([{ type: 'stdout', text: result.stdout }]);
        if (result.stderr) appendLines([{ type: 'stderr', text: result.stderr }]);
      }
    } finally {
      setIsRunning(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleRun();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInput(history[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === null) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(null);
        setInput('');
      } else {
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      }
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-950 font-mono text-xs text-slate-200">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3">
        {!mounted && <p className="text-slate-500">Mounting project files…</p>}
        {mounted && lines.length === 0 && (
          <p className="text-slate-500">
            Interactive Python shell in ~/project. Try <span className="text-emerald-400">run solution.py</span>,{' '}
            <span className="text-emerald-400">pip install requests</span>, or <span className="text-emerald-400">pip freeze</span>.
          </p>
        )}
        {lines.map((line, i) => (
          <div key={i} className={line.type === 'stderr' ? 'text-red-400' : line.type === 'input' ? 'text-emerald-400' : 'text-slate-200'}>
            {line.type === 'input' && <span className="text-slate-500">~/project&gt; </span>}
            <span className="whitespace-pre-wrap">{line.text}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-slate-800 px-3 py-2">
        <span className="text-slate-500">~/project&gt;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!workerReady || isRunning}
          placeholder={workerReady ? 'Python command, run <file>, or pip install <pkg>…' : 'Waiting for Python runtime…'}
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 outline-none disabled:opacity-50"
        />
      </div>
    </div>
  );
}
