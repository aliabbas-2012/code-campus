'use client';

import type { RunResult } from '@/hooks/use-python-worker';

interface OutputPanelProps {
  output: RunResult | null;
  isRunning: boolean;
  workerStatus: 'initializing' | 'ready' | 'error';
  workerErrorMessage: string | null;
}

export function OutputPanel({ output, isRunning, workerStatus, workerErrorMessage }: OutputPanelProps): React.ReactNode {
  return (
    <div className="flex h-full flex-col bg-slate-900 text-sm text-slate-100">
      <div className="border-b border-slate-700 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
        Output
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 font-mono">
        {workerStatus === 'initializing' && !output && (
          <p className="text-slate-400">Starting Python…</p>
        )}
        {workerStatus === 'error' && (
          <p className="text-red-400">
            Failed to start the Python runtime.
            {workerErrorMessage ? ` ${workerErrorMessage}` : ''}
          </p>
        )}
        {isRunning && <p className="text-slate-400">Running…</p>}
        {output && !isRunning && (
          <>
            {output.stdout && <pre className="whitespace-pre-wrap">{output.stdout}</pre>}
            {output.stderr && (
              <pre className="whitespace-pre-wrap text-red-400">{output.stderr}</pre>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Exited with code {output.returnCode} in {output.executionTime}ms
            </p>
          </>
        )}
      </div>
    </div>
  );
}
