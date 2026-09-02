import { useCallback, useEffect, useRef, useState } from 'react';

export interface RunResult {
  stdout: string;
  stderr: string;
  returnCode: number;
  executionTime: number;
}

type WorkerStatus = 'initializing' | 'ready' | 'error';

const DEFAULT_TIMEOUT_MS = 10_000;

export function usePythonWorker(): {
  status: WorkerStatus;
  errorMessage: string | null;
  isRunning: boolean;
  output: RunResult | null;
  run: (code: string) => void;
} {
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<WorkerStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<RunResult | null>(null);

  const spawnWorker = useCallback(() => {
    const worker = new Worker(new URL('../workers/pyodide.worker.ts', import.meta.url));

    worker.onmessage = (event: MessageEvent<{ type: string; data: any }>) => {
      const { type, data } = event.data;
      if (type === 'ready') {
        setStatus('ready');
      } else if (type === 'error') {
        setStatus('error');
        setErrorMessage(data?.message ?? 'Unknown error');
        setIsRunning(false);
      } else if (type === 'result') {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setOutput(data as RunResult);
        setIsRunning(false);
      }
    };

    worker.postMessage({ type: 'init' });
    workerRef.current = worker;
  }, []);

  useEffect(() => {
    spawnWorker();
    return () => {
      workerRef.current?.terminate();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = useCallback(
    (code: string): void => {
      if (status !== 'ready' || isRunning || !workerRef.current) return;

      setIsRunning(true);
      setOutput(null);
      workerRef.current.postMessage({
        type: 'execute',
        data: { code, timeout: DEFAULT_TIMEOUT_MS },
      });

      timeoutRef.current = setTimeout(() => {
        // Pyodide can't be interrupted mid-execution from outside; the worker
        // is unrecoverable at this point, so terminate and spin up a fresh one.
        workerRef.current?.terminate();
        setOutput({
          stdout: '',
          stderr: `Execution timed out after ${DEFAULT_TIMEOUT_MS / 1000}s`,
          returnCode: 1,
          executionTime: DEFAULT_TIMEOUT_MS,
        });
        setIsRunning(false);
        setStatus('initializing');
        spawnWorker();
      }, DEFAULT_TIMEOUT_MS);
    },
    [status, isRunning, spawnWorker],
  );

  return { status, errorMessage, isRunning, output, run };
}
