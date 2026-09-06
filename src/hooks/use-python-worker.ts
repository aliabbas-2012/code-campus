import { useCallback, useEffect, useRef, useState } from 'react';

export interface RunResult {
  stdout: string;
  stderr: string;
  returnCode: number;
  executionTime: number;
}

export interface PackageInstallResult {
  package: string;
  success: boolean;
  error?: string;
}

export interface ReplResult {
  stdout: string;
  stderr: string;
  returnCode: number;
}

export interface ModuleMember {
  name: string;
  kind: 'class' | 'function' | 'module' | 'value';
  doc: string;
}

type WorkerStatus = 'initializing' | 'ready' | 'error';

// Generous enough to cover a cold first-time download of a heavy package (pandas + its
// transitive deps can be 10+ MB) alongside loadPackagesFromImports, not just code execution —
// once loaded, Pyodide keeps packages in memory for the rest of the worker's lifetime, so this
// cost is paid at most once per session per package.
const DEFAULT_TIMEOUT_MS = 30_000;
const INTROSPECT_TIMEOUT_MS = 5_000;

export function usePythonWorker(): {
  status: WorkerStatus;
  errorMessage: string | null;
  isRunning: boolean;
  output: RunResult | null;
  run: (code: string) => void;
  installPackages: (packages: string[]) => Promise<PackageInstallResult[]>;
  isInstalling: boolean;
  runRepl: (code: string) => Promise<ReplResult>;
  mountFiles: (files: Array<{ path: string; content: string }>) => Promise<void>;
  listStdlibModules: () => Promise<string[]>;
  introspectModule: (moduleName: string) => Promise<ModuleMember[]>;
} {
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const installResolverRef = useRef<((results: PackageInstallResult[]) => void) | null>(null);
  const replResolverRef = useRef<((result: ReplResult) => void) | null>(null);
  const mountResolverRef = useRef<(() => void) | null>(null);
  const stdlibResolversRef = useRef<Array<(modules: string[]) => void>>([]);
  const introspectResolversRef = useRef<Map<number, (members: ModuleMember[]) => void>>(new Map());
  const nextRequestIdRef = useRef(0);
  const [status, setStatus] = useState<WorkerStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [output, setOutput] = useState<RunResult | null>(null);

  const spawnWorker = useCallback(() => {
    const worker = new Worker('/workers/pyodide-worker.js', { type: 'module' });

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
      } else if (type === 'packages_installed') {
        setIsInstalling(false);
        installResolverRef.current?.(data.results as PackageInstallResult[]);
        installResolverRef.current = null;
      } else if (type === 'repl_result') {
        replResolverRef.current?.(data as ReplResult);
        replResolverRef.current = null;
      } else if (type === 'files_mounted') {
        mountResolverRef.current?.();
        mountResolverRef.current = null;
      } else if (type === 'stdlib_modules') {
        const resolvers = stdlibResolversRef.current;
        stdlibResolversRef.current = [];
        for (const resolve of resolvers) resolve(data.modules as string[]);
      } else if (type === 'introspect_result') {
        const requestId = data.requestId as number;
        const resolve = introspectResolversRef.current.get(requestId);
        introspectResolversRef.current.delete(requestId);
        resolve?.(data.members as ModuleMember[]);
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

  const installPackages = useCallback(
    (packages: string[]): Promise<PackageInstallResult[]> => {
      return new Promise((resolve) => {
        if (status !== 'ready' || !workerRef.current) {
          resolve(packages.map((p) => ({ package: p, success: false, error: 'Python runtime not ready' })));
          return;
        }
        setIsInstalling(true);
        installResolverRef.current = resolve;
        workerRef.current.postMessage({ type: 'install_packages', data: { packages } });
      });
    },
    [status],
  );

  const runRepl = useCallback(
    (code: string): Promise<ReplResult> => {
      return new Promise((resolve) => {
        if (status !== 'ready' || !workerRef.current) {
          resolve({ stdout: '', stderr: 'Python runtime not ready', returnCode: 1 });
          return;
        }
        replResolverRef.current = resolve;
        workerRef.current.postMessage({ type: 'repl', data: { code } });
      });
    },
    [status],
  );

  const mountFiles = useCallback(
    (files: Array<{ path: string; content: string }>): Promise<void> => {
      return new Promise((resolve) => {
        if (status !== 'ready' || !workerRef.current) {
          resolve();
          return;
        }
        mountResolverRef.current = resolve;
        workerRef.current.postMessage({ type: 'mount_files', data: { files } });
      });
    },
    [status],
  );

  const listStdlibModules = useCallback((): Promise<string[]> => {
    return new Promise((resolve) => {
      if (status !== 'ready' || !workerRef.current) {
        resolve([]);
        return;
      }
      stdlibResolversRef.current.push(resolve);
      workerRef.current.postMessage({ type: 'list_stdlib_modules', data: {} });
    });
  }, [status]);

  const introspectModule = useCallback(
    (moduleName: string): Promise<ModuleMember[]> => {
      return new Promise((resolve) => {
        if (status !== 'ready' || !workerRef.current) {
          resolve([]);
          return;
        }
        const requestId = nextRequestIdRef.current++;
        introspectResolversRef.current.set(requestId, resolve);
        setTimeout(() => {
          if (introspectResolversRef.current.delete(requestId)) resolve([]);
        }, INTROSPECT_TIMEOUT_MS);
        workerRef.current.postMessage({ type: 'introspect_module', data: { requestId, module: moduleName } });
      });
    },
    [status],
  );

  return {
    status,
    errorMessage,
    isRunning,
    output,
    run,
    installPackages,
    isInstalling,
    runRepl,
    mountFiles,
    listStdlibModules,
    introspectModule,
  };
}
