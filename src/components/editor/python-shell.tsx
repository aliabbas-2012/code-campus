'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReplResult } from '@/hooks/use-python-worker';

interface ShellLine {
  type: 'input' | 'stdout' | 'stderr';
  text: string;
}

interface PythonShellProps {
  runRepl: (code: string) => Promise<ReplResult>;
  workerReady: boolean;
  mounted: boolean;
}

export function PythonShell({ runRepl, workerReady, mounted }: PythonShellProps): React.ReactNode {
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

  const handleRun = async (): Promise<void> => {
    const code = input.trim();
    if (!code || isRunning || !workerReady) return;

    setLines((prev) => [...prev, { type: 'input', text: code }]);
    setHistory((prev) => [...prev, code]);
    setHistoryIndex(null);
    setInput('');
    setIsRunning(true);

    const result = await runRepl(code);
    setLines((prev) => {
      const next = [...prev];
      if (result.stdout) next.push({ type: 'stdout', text: result.stdout });
      if (result.stderr) next.push({ type: 'stderr', text: result.stderr });
      return next;
    });
    setIsRunning(false);
    inputRef.current?.focus();
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
            Interactive Python shell. Project files are mounted — try <span className="text-emerald-400">exec(open(&quot;solution.py&quot;).read())</span>.
          </p>
        )}
        {lines.map((line, i) => (
          <div key={i} className={line.type === 'stderr' ? 'text-red-400' : line.type === 'input' ? 'text-emerald-400' : 'text-slate-200'}>
            {line.type === 'input' && <span className="text-slate-500">&gt;&gt;&gt; </span>}
            <span className="whitespace-pre-wrap">{line.text}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-slate-800 px-3 py-2">
        <span className="text-slate-500">&gt;&gt;&gt;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!workerReady || isRunning}
          placeholder={workerReady ? 'Type a Python command…' : 'Waiting for Python runtime…'}
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 outline-none disabled:opacity-50"
        />
      </div>
    </div>
  );
}
