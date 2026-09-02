/**
 * Pyodide Web Worker for Python code execution
 * Runs in a separate thread to avoid blocking the UI
 */

declare function importScripts(...urls: string[]): void;

let pyodideReady = false;
let pyodide: any = null;

let stdoutChunks: string[] = [];
let stderrChunks: string[] = [];

// Initialize Pyodide on worker load
async function initPyodide(): Promise<void> {
  try {
    const cdnUrl = process.env.NEXT_PUBLIC_PYODIDE_CDN_URL || 'https://cdn.jsdelivr.net/pyodide/v314.0.6/full/';
    importScripts(`${cdnUrl}pyodide.js`);

    // @ts-ignore - pyodide is loaded via importScripts
    pyodide = await loadPyodide({
      indexURL: cdnUrl,
      stdout: (msg: string) => stdoutChunks.push(msg),
      stderr: (msg: string) => stderrChunks.push(msg),
    });

    pyodideReady = true;
    self.postMessage({ type: 'ready', data: { version: pyodide.version } });
  } catch (error) {
    console.error('Failed to initialize Pyodide:', error);
    self.postMessage({
      type: 'error',
      data: { message: `Failed to initialize Pyodide: ${error}` },
    });
  }
}

interface ExecuteMessage {
  type: 'execute';
  data: {
    code: string;
    timeout?: number;
  };
}

interface InitMessage {
  type: 'init';
}

type Message = InitMessage | ExecuteMessage;

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<Message>) => {
  if (event.data.type === 'init') {
    await initPyodide();
  } else if (event.data.type === 'execute') {
    if (!pyodideReady || !pyodide) {
      self.postMessage({
        type: 'error',
        data: { message: 'Pyodide not ready' },
      });
      return;
    }

    const startTime = Date.now();
    stdoutChunks = [];
    stderrChunks = [];

    try {
      await pyodide.runPythonAsync(event.data.data.code);

      self.postMessage({
        type: 'result',
        data: {
          stdout: stdoutChunks.join('\n'),
          stderr: stderrChunks.join('\n'),
          returnCode: 0,
          executionTime: Date.now() - startTime,
        },
      });
    } catch (error: any) {
      self.postMessage({
        type: 'result',
        data: {
          stdout: stdoutChunks.join('\n'),
          stderr: stderrChunks.join('\n') + (stderrChunks.length > 0 ? '\n' : '') + String(error),
          returnCode: 1,
          executionTime: Date.now() - startTime,
        },
      });
    }
  }
};

// Inform main thread that worker is loaded
initPyodide();
